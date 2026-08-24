"use client";

/**
 * Name beats for the lab / hero:
 * - appear: name draws in, holds, no rocket (loops for observe)
 * - fade: full name fades out (loops for observe)
 * - rocket: name + occasional rocket flyby
 * - sequence: appear → hold (no rocket) → rocket loop forever
 */

import { useEffect, useRef } from "react";
import { flyProgress, nameIdleGlow, nameScene } from "@/components/ui/ascii-evolution";
import type { NameIdleId } from "@/components/ui/ascii-evolution";
import {
	DEFAULT_ENABLED_PATHS,
	rocketStyleLook,
	type RocketStyleId,
} from "@/components/ui/ascii-rockets";

export type { NameIdleId } from "@/components/ui/ascii-evolution";
export { NAME_IDLE_OPTIONS } from "@/components/ui/ascii-evolution";

const clamp = (x: number, lo: number, hi: number) =>
	Math.min(hi, Math.max(lo, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function smoothstep(e0: number, e1: number, x: number) {
	const t = clamp((x - e0) / (e1 - e0), 0, 1);
	return t * t * (3 - 2 * t);
}
function sdSeg(
	px: number,
	py: number,
	ax: number,
	ay: number,
	bx: number,
	by: number,
) {
	const pax = px - ax;
	const pay = py - ay;
	const bax = bx - ax;
	const bay = by - ay;
	const h = clamp(
		(pax * bax + pay * bay) / (bax * bax + bay * bay || 1e-6),
		0,
		1,
	);
	return Math.hypot(pax - bax * h, pay - bay * h);
}

const RAMP = " .:-=+*#%@";
const APPEAR_DUR = 1.8;
const FADE_DUR = 2.0;

export type NameBeat =
	| "current"
	| "appear"
	| "hold"
	| "fade"
	| "fadeOut"
	| "rocket"
	| "sequence"
	| "heroIntro";

export type AsciiNameLoopConfig = {
	speed: number;
	figureScale: number;
	density: number;
	/**
	 * height — lab style (scales with canvas height).
	 * fill — keep the name large in a shorter hero by sizing from width + height budget.
	 */
	figureFit: "height" | "fill";
	/** Vertical anchor 0–1 (0.5 = center). Higher = name sits lower. */
	viewY: number;
	/** Which name beat to play. */
	beat: NameBeat;
	/** Craft style for flybys. */
	rocketStyle: RocketStyleId;
	/** Lab: hide name and loop ships on randomized paths. */
	shipOnly: boolean;
	/** Which flight corridors can be picked (checkboxes in lab). */
	enabledPaths: number[];
	/** Each flyby picks a random craft style (portfolio). */
	rotateCraft: boolean;
	/** Name idle animation while held. */
	idleStyle: NameIdleId;
	/** sequence / heroIntro: seconds to hold name (no rocket) before next beat. */
	holdBeforeRocket: number;
	showStars: boolean;
	showExhaust: boolean;
	showLabels: boolean;
	/** Clear canvas to transparent so a page starfield shows through. */
	transparentBg: boolean;
	colorBright: string;
	colorDim: string;
	colorStar: string;
	colorExhaust: string;
};

export const ASCII_NAME_LOOP_DEFAULTS: AsciiNameLoopConfig = {
	speed: 1,
	figureScale: 0.36,
	density: 1,
	figureFit: "height",
	viewY: 0.5,
	beat: "current",
	rocketStyle: "classic",
	shipOnly: false,
	enabledPaths: [...DEFAULT_ENABLED_PATHS],
	rotateCraft: false,
	idleStyle: "idle4",
	holdBeforeRocket: 14,
	showStars: true,
	showExhaust: true,
	showLabels: true,
	transparentBg: false,
	colorBright: "rgba(255,255,255,0.96)",
	colorDim: "rgba(255,255,255,0.35)",
	colorStar: "rgba(255,255,255,0.28)",
	colorExhaust: "rgba(251,146,60,0.85)",
};

export const NAME_BEAT_LABELS: Record<NameBeat, string> = {
	current: "Current (name + rocket)",
	appear: "Appear (no rocket)",
	hold: "Appear + hold",
	fade: "Fade out (loop)",
	fadeOut: "Fade out (once)",
	rocket: "Name + rocket",
	sequence: "Appear → rocket",
	heroIntro: "Hero intro → fade",
};

/** Shared timing for hero handoffs. */
export const NAME_APPEAR_DUR = APPEAR_DUR;
export const NAME_FADE_DUR = FADE_DUR;

export interface AsciiNameLoopProps {
	className?: string;
	config?: Partial<AsciiNameLoopConfig>;
	onStageChange?: (name: string, index: number) => void;
}

type BeatFrame = {
	reveal: number;
	nameForm: number;
	fly01: number;
	sceneT: number;
	label: string;
	stageIndex: number;
	/** 0–1 star field strength (avoids flash on beat changes). */
	starAmt?: number;
	pathSeed?: number;
	/** Force a specific corridor; -1 = pick from seed. */
	pathIndex?: number;
};

function resolveBeat(
	t: number,
	beat: NameBeat,
	holdBeforeRocket: number,
	shipOnly: boolean,
	pathSeedBase = 0,
): BeatFrame {
	if (shipOnly) {
		// Preview selected corridors (random among checked)
		const PERIOD = 8;
		const FLY_DUR = 5;
		const phase = ((t % PERIOD) + PERIOD) % PERIOD;
		const pathSeed = Math.floor(t / PERIOD) + pathSeedBase;
		if (phase < FLY_DUR) {
			return {
				reveal: 0,
				nameForm: 0,
				fly01: flyProgress(phase / FLY_DUR),
				sceneT: t,
				label: "Ship preview",
				stageIndex: 0,
				starAmt: 1,
				pathSeed,
			};
		}
		return {
			reveal: 0,
			nameForm: 0,
			fly01: 0,
			sceneT: t,
			label: "Ship preview",
			stageIndex: 0,
			starAmt: 1,
			pathSeed,
		};
	}

	if (beat === "current") {
		// Name fades in; one rocket as it appears; then periodic flybys
		const INTRO_FLY = 5;
		const introStart = APPEAR_DUR * 0.7;
		const introEnd = introStart + INTRO_FLY;
		let reveal = 1;
		let nameForm = 1;
		// Stars track the name draw — full by end of appear, no late dump
		let starAmt = 1;
		if (t < APPEAR_DUR) {
			const p = t / APPEAR_DUR;
			reveal = smoothstep(0, 1, p);
			nameForm = smoothstep(0.05, 0.85, p);
			starAmt = smoothstep(0.08, 0.92, p);
		}
		if (t < introStart) {
			return {
				reveal,
				nameForm,
				fly01: 0,
				sceneT: t,
				label: "Name appear",
				stageIndex: 0,
				starAmt,
			};
		}
		if (t < introEnd) {
			return {
				reveal,
				nameForm,
				fly01: flyProgress((t - introStart) / INTRO_FLY),
				sceneT: t,
				label: "Name · intro rocket",
				stageIndex: 1,
				starAmt,
				pathSeed: pathSeedBase,
			};
		}
		return {
			reveal: 1,
			nameForm: 1,
			fly01: -1,
			sceneT: t - introEnd,
			label: "Name · rocket flyby",
			stageIndex: 2,
			starAmt: 1,
		};
	}

	if (beat === "heroIntro") {
		// One continuous timeline: appear → hold → fade (no remount)
		const hold = Math.max(1, holdBeforeRocket);
		if (t < APPEAR_DUR) {
			const p = t / APPEAR_DUR;
			return {
				reveal: smoothstep(0, 1, p),
				nameForm: smoothstep(0.05, 0.85, p),
				fly01: 0,
				sceneT: t,
				label: "Name appear",
				stageIndex: 0,
				starAmt: smoothstep(0.15, 1, p),
			};
		}
		if (t < APPEAR_DUR + hold) {
			const hp = (t - APPEAR_DUR) / hold;
			const starAmt = lerp(1, 0.28, smoothstep(0, 1, hp));
			return {
				reveal: 1,
				nameForm: 1,
				fly01: 0,
				sceneT: t,
				label: "Name hold",
				stageIndex: 1,
				starAmt,
			};
		}
		if (t < APPEAR_DUR + hold + FADE_DUR) {
			const fp = (t - APPEAR_DUR - hold) / FADE_DUR;
			const out = 1 - smoothstep(0, 1, fp);
			return {
				reveal: out,
				nameForm: out,
				fly01: 0,
				sceneT: t,
				label: "Name fade out",
				stageIndex: 2,
				starAmt: lerp(0.28, 0, smoothstep(0, 1, fp)),
			};
		}
		return {
			reveal: 0,
			nameForm: 0,
			fly01: 0,
			sceneT: t,
			label: "Name clear",
			stageIndex: 3,
			starAmt: 0,
		};
	}

	if (beat === "hold") {
		// Appear once, then stay (no rocket, no loop) — for hero handoff
		if (t < APPEAR_DUR) {
			const p = t / APPEAR_DUR;
			return {
				reveal: smoothstep(0, 1, p),
				nameForm: smoothstep(0.05, 0.85, p),
				fly01: 0,
				sceneT: t,
				label: "Name appear",
				stageIndex: 0,
			};
		}
		return {
			reveal: 1,
			nameForm: 1,
			fly01: 0,
			sceneT: t,
			label: "Name hold",
			stageIndex: 1,
		};
	}

	if (beat === "appear") {
		// Loop: draw in → hold → brief gap (so you can rewatch appear)
		const CYCLE = APPEAR_DUR + 3.2 + 0.8;
		const u = ((t % CYCLE) + CYCLE) % CYCLE;
		if (u < APPEAR_DUR) {
			const p = u / APPEAR_DUR;
			return {
				reveal: smoothstep(0, 1, p),
				nameForm: smoothstep(0.05, 0.85, p),
				fly01: 0,
				sceneT: t,
				label: "Name appear",
				stageIndex: 0,
			};
		}
		if (u < APPEAR_DUR + 3.2) {
			return {
				reveal: 1,
				nameForm: 1,
				fly01: 0,
				sceneT: t,
				label: "Name hold",
				stageIndex: 1,
			};
		}
		return {
			reveal: 0,
			nameForm: 0,
			fly01: 0,
			sceneT: t,
			label: "Name clear",
			stageIndex: 2,
		};
	}

	if (beat === "fadeOut") {
		// One-shot handoff: fade from full → clear, stay clear
		if (t < FADE_DUR) {
			const out = 1 - smoothstep(0, 1, t / FADE_DUR);
			return {
				reveal: out,
				nameForm: out,
				fly01: 0,
				sceneT: t,
				label: "Name fade out",
				stageIndex: 0,
			};
		}
		return {
			reveal: 0,
			nameForm: 0,
			fly01: 0,
			sceneT: t,
			label: "Name clear",
			stageIndex: 1,
		};
	}

	if (beat === "fade") {
		// Loop: hold full → fade out → empty beat
		const CYCLE = 1.2 + FADE_DUR + 1.6;
		const u = ((t % CYCLE) + CYCLE) % CYCLE;
		if (u < 1.2) {
			return {
				reveal: 1,
				nameForm: 1,
				fly01: 0,
				sceneT: t,
				label: "Name full",
				stageIndex: 0,
			};
		}
		if (u < 1.2 + FADE_DUR) {
			const p = (u - 1.2) / FADE_DUR;
			const out = 1 - smoothstep(0, 1, p);
			return {
				reveal: out,
				nameForm: out,
				fly01: 0,
				sceneT: t,
				label: "Name fade out",
				stageIndex: 1,
			};
		}
		return {
			reveal: 0,
			nameForm: 0,
			fly01: 0,
			sceneT: t,
			label: "Name clear",
			stageIndex: 2,
		};
	}

	if (beat === "sequence") {
		const hold = Math.max(2, holdBeforeRocket);
		if (t < APPEAR_DUR) {
			const p = t / APPEAR_DUR;
			return {
				reveal: smoothstep(0, 1, p),
				nameForm: smoothstep(0.05, 0.85, p),
				fly01: 0,
				sceneT: t,
				label: "Name appear",
				stageIndex: 0,
			};
		}
		if (t < APPEAR_DUR + hold) {
			return {
				reveal: 1,
				nameForm: 1,
				fly01: 0,
				sceneT: t,
				label: "Name hold",
				stageIndex: 1,
			};
		}
		// Rocket loop — clock from rocket start so first pass isn't immediate
		const rocketT = t - (APPEAR_DUR + hold) + 8;
		return {
			reveal: 1,
			nameForm: 1,
			fly01: -1,
			sceneT: rocketT,
			label: "Name · rocket flyby",
			stageIndex: 2,
		};
	}

	// rocket (default): appear once, then flybys forever
	if (t < APPEAR_DUR) {
		const p = t / APPEAR_DUR;
		return {
			reveal: smoothstep(0, 1, p),
			nameForm: smoothstep(0.05, 0.85, p),
			fly01: 0,
			sceneT: t,
			label: "Name appear",
			stageIndex: 0,
		};
	}
	return {
		reveal: 1,
		nameForm: 1,
		fly01: -1,
		sceneT: t,
		label: "Name · rocket flyby",
		stageIndex: 1,
	};
}

export default function AsciiNameLoop({
	className,
	config,
	onStageChange,
}: AsciiNameLoopProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const configRef = useRef<AsciiNameLoopConfig>({
		...ASCII_NAME_LOOP_DEFAULTS,
		...config,
	});
	const onStageRef = useRef(onStageChange);
	/** Stable per mount so the intro fly isn't locked to classic. */
	const pathSeedBaseRef = useRef(Math.floor(Math.random() * 1e6));
	onStageRef.current = onStageChange;
	configRef.current = { ...ASCII_NAME_LOOP_DEFAULTS, ...config };

	useEffect(() => {
		if (!canvasRef.current) return;
		const view = canvasRef.current;
		const ctx2d = view.getContext("2d", {
			alpha: configRef.current.transparentBg,
		});
		if (!ctx2d) return;
		const g = ctx2d;

		const reduced =
			typeof window !== "undefined" &&
			window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

		let raf = 0;
		let cols = 0;
		let rows = 0;
		let cellW = 0;
		let cellH = 0;
		let originX = 0;
		let originY = 0;
		let fontSize = 14;
		let W = 0;
		let H = 0;
		let lastDensity = -1;
		let lastLabel = "";
		let brightRow: string[] = [];
		let dimRow: string[] = [];
		let starRow: string[] = [];
		let exhaustRow: string[] = [];
		let craftRow: string[] = [];
		const t0 = performance.now();

		const dpr = () => Math.min(2, window.devicePixelRatio || 1);
		const monoFont = (px: number) =>
			`${px}px "IBM Plex Mono", ui-monospace, monospace`;

		function resize() {
			const parent = view.parentElement;
			const rect = parent?.getBoundingClientRect();
			const nextW = Math.max(
				1,
				Math.round(rect?.width || parent?.clientWidth || window.innerWidth),
			);
			const nextH = Math.max(
				1,
				Math.round(rect?.height || parent?.clientHeight || window.innerHeight),
			);
			const density = configRef.current.density;
			const ratio = dpr();
			if (
				nextW === W &&
				nextH === H &&
				density === lastDensity &&
				view.width === Math.floor(nextW * ratio)
			) {
				return;
			}
			W = nextW;
			H = nextH;
			view.width = Math.max(1, Math.floor(W * ratio));
			view.height = Math.max(1, Math.floor(H * ratio));
			view.style.width = `${W}px`;
			view.style.height = `${H}px`;
			g.setTransform(ratio, 0, 0, ratio, 0, 0);

			lastDensity = density;
			fontSize = clamp(Math.round((Math.min(W, H) / 46) * density), 8, 22);
			g.font = monoFont(fontSize);
			const measured = Math.max(6, g.measureText("M").width);
			const measuredH = Math.max(8, fontSize * 1.2);
			cols = Math.max(1, Math.ceil(W / measured));
			rows = Math.max(1, Math.ceil(H / measuredH));
			cellW = W / cols;
			cellH = H / rows;
			originX = 0;
			originY = 0;
			brightRow = new Array(rows).fill("");
			dimRow = new Array(rows).fill("");
			starRow = new Array(rows).fill("");
			exhaustRow = new Array(rows).fill("");
			craftRow = new Array(rows).fill("");
		}

		function hash(c: number, r: number) {
			const s = Math.sin(c * 127.1 + r * 311.7) * 43758.5453;
			return s - Math.floor(s);
		}

		function frame(now: number) {
			const cfg = configRef.current;
			if (cfg.density !== lastDensity) resize();

			const t = reduced
				? APPEAR_DUR + 4
				: ((now - t0) / 1000) * cfg.speed;
			const beat = resolveBeat(
				t,
				cfg.beat,
				cfg.holdBeforeRocket,
				cfg.shipOnly,
				pathSeedBaseRef.current,
			);
			const scene = nameScene(
				beat.sceneT,
				beat.fly01,
				beat.reveal,
				cfg.rocketStyle,
				beat.pathSeed,
				{
					pathIndex: beat.pathIndex,
					allowedPaths:
						cfg.enabledPaths.length > 0
							? cfg.enabledPaths
							: DEFAULT_ENABLED_PATHS,
					rotateCraft: cfg.rotateCraft,
					idleStyle: cfg.idleStyle,
				},
			);
			const segs = cfg.shipOnly ? [] : scene.segs;
			const backSegs = scene.backSegs;
			const exhaustAt = scene.exhaustAt;
			const exhaustDir = scene.exhaustDir;
			const rocketCx = scene.rx;
			const rocketCy = scene.ry;
			const exhaustAmt = exhaustAt ? 0.4 : 0;
			const nameForm = beat.nameForm;
			const starAmt = clamp(beat.starAmt ?? 1, 0, 1);
			const look = rocketStyleLook(scene.rocketStyle);

			if (beat.label !== lastLabel) {
				lastLabel = beat.label;
				onStageRef.current?.(beat.label, beat.stageIndex);
			}

			// Same camera as name mode so craft silhouette matches flybys-with-name
			let S: number;
			if (cfg.figureFit === "fill") {
				// Big name in a shorter hero: prefer width, clamp so it still fits vertically
				S = Math.min((W * 0.56) / 1.35, H * 0.82);
			} else {
				S = H * cfg.figureScale * 1.38;
				S = Math.min(S, (W * 0.42) / 1.35);
			}
			const figCx = W * 0.5;
			const figCy = H * clamp(cfg.viewY, 0.2, 0.85);
			const stroke = Math.max(cellH * 0.58, cellW * 0.85);

			g.font = monoFont(fontSize);
			g.textBaseline = "top";
			g.textAlign = "left";

			for (let r = 0; r < rows; r++) {
				const fy = (figCy - (originY + r * cellH + cellH * 0.5)) / S;
				let bright = "";
				let dim = "";
				let star = "";
				let exhaust = "";
				let craft = "";

				for (let c = 0; c < cols; c++) {
					const fx = (originX + c * cellW + cellW * 0.5 - figCx) / S;

					let dMin = 1e9;
					for (const [a, b] of segs) {
						const d = sdSeg(fx, fy, a[0], a[1], b[0], b[1]);
						if (d < dMin) dMin = d;
					}
					const brightI = 1 - smoothstep(0, stroke / S, dMin);
					const idleGlow = nameIdleGlow(t, nameForm, cfg.idleStyle);
					const nameI =
						brightI * Math.pow(clamp(nameForm, 0, 1), 0.75) * idleGlow;

					let starChar = " ";
					if (cfg.showStars && starAmt > 0.02) {
						// Fewer, quieter stars than before — soft twinkle only
						const row01 = rows > 1 ? r / (rows - 1) : 0;
						const bottomFade = 1 - smoothstep(0.55, 0.92, row01);
						if (bottomFade > 0.04) {
							const dens = 0.978; // sparser (~half prior density)
							const hs = hash(c, r);
							if (hs > dens) {
								const birth = (hs - dens) / (1 - dens);
								const appear = smoothstep(
									birth * 0.75,
									Math.min(1, birth * 0.75 + 0.28),
									starAmt,
								);
								const fade = appear * bottomFade;
								if (fade > 0.02) {
									// Gentle twinkle (was 0.5±0.5 — too flashy)
									const tw =
										0.72 + 0.28 * Math.sin(t * 0.4 + hs * 40);
									const lit = tw * fade * 0.75;
									starChar =
										lit > 0.78 ? "+" : lit > 0.22 ? "." : " ";
								}
							}
						}
					}

					let backI = 0;
					if (
						backSegs.length &&
						nameI < 0.2 &&
						Math.abs(fx - rocketCx) < 1.1 &&
						Math.abs(fy - rocketCy) < 1.1
					) {
						let dBack = 1e9;
						for (const [a, b] of backSegs) {
							const d = sdSeg(fx, fy, a[0], a[1], b[0], b[1]);
							if (d < dBack) dBack = d;
						}
						backI =
							(1 - smoothstep(0, (stroke * 0.9) / S, dBack)) * 0.55;
					}

					let exhaustI = 0;
					if (cfg.showExhaust && exhaustAmt > 0.04 && exhaustAt) {
						const engX = exhaustAt[0];
						const engY = exhaustAt[1];
						const ux = exhaustDir[0];
						const uy = exhaustDir[1];
						const along = (fx - engX) * ux + (fy - engY) * uy;
						const across = (fx - engX) * -uy + (fy - engY) * ux;
						const plumeLen = 0.75 + exhaustAmt * 0.7;
						const flicker =
							0.75 + 0.25 * Math.sin(t * 22 + along * 14 + fx * 9);
						if (along > 0.02 && along < plumeLen) {
							const taper = 1 - along / plumeLen;
							const halfW = 0.1 + along * 0.32 * flicker;
							const core = clamp(1 - Math.abs(across) / halfW, 0, 1);
							exhaustI =
								Math.pow(core, 0.7) * taper * exhaustAmt * flicker;
						}
					}

					if (nameI > 0.18) {
						const idx = clamp(
							Math.floor(nameI ** 1.05 * RAMP.length),
							2,
							RAMP.length - 1,
						);
						bright += RAMP[idx];
						craft += " ";
						dim += " ";
						star += " ";
						exhaust += " ";
						continue;
					}

					if (backI > 0.22) {
						const idx = clamp(
							Math.floor(backI ** 1.05 * RAMP.length),
							1,
							RAMP.length - 1,
						);
						craft += RAMP[idx];
						bright += " ";
						dim += " ";
						star += " ";
						exhaust += " ";
						continue;
					}
					bright += " ";
					craft += " ";

					if (exhaustI > 0.2) {
						const idx = clamp(
							Math.floor(exhaustI * RAMP.length),
							1,
							RAMP.length - 1,
						);
						exhaust += RAMP[idx];
						dim += " ";
						star += " ";
						continue;
					}
					exhaust += " ";
					dim += " ";
					star += starChar;
				}
				brightRow[r] = bright;
				craftRow[r] = craft;
				dimRow[r] = dim;
				starRow[r] = star;
				exhaustRow[r] = exhaust;
			}

			if (cfg.transparentBg) {
				g.clearRect(0, 0, W, H);
			} else {
				g.fillStyle = "#000";
				g.fillRect(0, 0, W, H);
			}
			const drawLayer = (color: string, rowsText: string[]) => {
				g.fillStyle = color;
				g.font = monoFont(fontSize);
				g.textBaseline = "top";
				g.textAlign = "left";
				for (let r = 0; r < rows; r++) {
					const line = rowsText[r];
					if (!line || !line.trim()) continue;
					const y = originY + r * cellH;
					for (let c = 0; c < line.length; c++) {
						const ch = line[c];
						if (ch === " ") continue;
						g.fillText(ch, originX + c * cellW, y);
					}
				}
			};
			if (cfg.showStars && starAmt > 0.02) drawLayer(cfg.colorStar, starRow);
			drawLayer(cfg.colorDim, dimRow);
			if (cfg.showExhaust) drawLayer(look.exhaust, exhaustRow);
			drawLayer(look.craft, craftRow);
			if (!cfg.shipOnly) drawLayer(cfg.colorBright, brightRow);

			if (cfg.showLabels) {
				g.fillStyle = "rgba(255,255,255,0.45)";
				g.font = monoFont(12);
				g.fillText(beat.label.toUpperCase(), 16, 16);
			}

			if (!reduced) raf = requestAnimationFrame(frame);
		}

		resize();
		const ro = new ResizeObserver(() => resize());
		if (view.parentElement) ro.observe(view.parentElement);
		window.addEventListener("resize", resize);
		void document.fonts?.ready?.then(() => resize());

		if (reduced) frame(performance.now());
		else raf = requestAnimationFrame(frame);

		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
			window.removeEventListener("resize", resize);
		};
	}, []);

	return (
		<canvas
			ref={canvasRef}
			className={className}
			style={{
				display: "block",
				width: "100%",
				height: "100%",
				background: config?.transparentBg ? "transparent" : "#000",
			}}
		/>
	);
}
