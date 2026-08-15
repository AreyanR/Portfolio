"use client";

/**
 * Animation 3 — March of Progress: H1 → H3 → H4 → rocket → name.
 * H1 = monkey, H3 = hunched spear hominid, H4 = human.
 */

import { useEffect, useRef } from "react";
import {
	flyProgress,
	humanAt,
	monkeyV2At,
	morphSegs,
	nameScene,
	rocketUprightAt,
	scaleSegs,
	translateSegs,
} from "@/components/ui/ascii-evolution";

type V2 = readonly [number, number];
type Seg = readonly [V2, V2];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (x: number, lo: number, hi: number) =>
	Math.min(hi, Math.max(lo, x));
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
function jointOff(a: V2, b: V2, tAlong: number, amount: number): V2 {
	const mx = lerp(a[0], b[0], tAlong);
	const my = lerp(a[1], b[1], tAlong);
	const dx = b[0] - a[0];
	const dy = b[1] - a[1];
	const len = Math.hypot(dx, dy) || 1;
	return [mx - (dy / len) * amount, my + (dx / len) * amount];
}
function circleOutline(cx: number, cy: number, r: number, n = 10): Seg[] {
	const segs: Seg[] = [];
	for (let i = 0; i < n; i++) {
		const a0 = (i / n) * Math.PI * 2;
		const a1 = ((i + 1) / n) * Math.PI * 2;
		segs.push([
			[cx + Math.cos(a0) * r, cy + Math.sin(a0) * r],
			[cx + Math.cos(a1) * r, cy + Math.sin(a1) * r],
		]);
	}
	return segs;
}

const RAMP = " .:-=+*#%@";

/** H1 — knuckle-walking monkey (current Anim monkey). */
export function h1At(t: number, moving: number): Seg[] {
	return monkeyV2At(t, moving);
}

/**
 * H3 — hunched biped (merged former H2/H3): deeper lean, long arms, spear.
 * H4-like skeleton — not knuckle-walk monkey.
 */
export function h3At(t: number, moving: number): Seg[] {
	const m = clamp(moving, 0, 1);
	const step = t * 3.9;
	const bob = Math.abs(Math.sin(step)) * 0.02 * m;
	const s = Math.sin(step);
	const c = Math.cos(step);
	const swing = Math.max(0, -c);

	const lean = 0.3; // clearer hunch than mild caveman, less than old H2
	const hipY = -0.08 + bob;
	const shY = 0.26 + bob;

	const nearHip: V2 = [0.04 + lean * 0.2, hipY];
	const farHip: V2 = [-0.04 + lean * 0.2, hipY];
	const nearFoot: V2 = [-s * 0.32 + 0.04 + lean * 0.25, -0.76 + swing * 0.1];
	const farFoot: V2 = [s * 0.32 - 0.04 + lean * 0.18, -0.76 + (1 - swing) * 0.1];
	const nearToe: V2 = [nearFoot[0] + 0.11, nearFoot[1]];
	const farToe: V2 = [farFoot[0] + 0.11, farFoot[1]];
	const nearKnee = jointOff(nearHip, nearFoot, 0.4, 0.14 + swing * 0.04);
	const farKnee = jointOff(farHip, farFoot, 0.4, 0.14);

	const nearShoulder: V2 = [0.06 + lean * 0.65, shY];
	const farShoulder: V2 = [-0.06 + lean * 0.65, shY - 0.01];
	// Longer dangling arms
	const farHand: V2 = [
		-s * 0.28 - 0.08 + lean * 0.2,
		-0.22 + bob + Math.max(0, -s) * 0.05,
	];
	const farElbow = jointOff(farShoulder, farHand, 0.42, -0.12);
	const spearHand: V2 = [0.16 + lean * 0.35 + s * 0.1, -0.18 + bob];
	const spearElbow = jointOff(nearShoulder, spearHand, 0.42, -0.12);
	const spearSway = s * 0.1 * m;
	// Spear: long shaft + small tip (not a short walking stick)
	const spearTip: V2 = [
		spearHand[0] + 0.08 + spearSway * 0.3,
		spearHand[1] + 0.58,
	];
	const spearMid: V2 = [
		spearHand[0] + 0.02 + spearSway * 0.15,
		spearHand[1] + 0.12,
	];
	const spearBot: V2 = [
		spearHand[0] - 0.06 - spearSway * 0.2,
		spearHand[1] - 0.42,
	];
	const tipL: V2 = [spearTip[0] - 0.04, spearTip[1] - 0.06];
	const tipR: V2 = [spearTip[0] + 0.04, spearTip[1] - 0.06];

	const headC: V2 = [0.02 + lean * 0.9, 0.52 + bob];
	const pelvis: V2 = [lean * 0.18, hipY];
	const chest: V2 = [lean * 0.45, 0.14 + bob];
	const neck: V2 = [0.02 + lean * 0.75, 0.38 + bob];

	return [
		[pelvis, chest],
		[chest, [lean * 0.45, shY] as V2],
		[[lean * 0.45, shY] as V2, neck],
		...circleOutline(headC[0], headC[1], 0.115, 10),
		[nearHip, nearKnee],
		[nearKnee, nearFoot],
		[nearFoot, nearToe],
		[farHip, farKnee],
		[farKnee, farFoot],
		[farFoot, farToe],
		[nearShoulder, spearElbow],
		[spearElbow, spearHand],
		[farShoulder, farElbow],
		[farElbow, farHand],
		[spearBot, spearMid],
		[spearMid, spearTip],
		[tipL, spearTip],
		[tipR, spearTip],
	];
}

/** H4 — modern upright human (current Anim human). */
export function h4At(t: number, moving: number): Seg[] {
	return humanAt(t, moving);
}

const HOLD = 2.0;
const MORPH = 1.25;
const H2R = 0.75;
const LAUNCH = 2.0;
const NAME = 7.2;

/** Beat: H1 → morph → H3 → morph → H4 → rocket → name. */
export const EVOLUTION_3_DUR = {
	H1: HOLD,
	M13: MORPH,
	H3: HOLD,
	M34: MORPH,
	H4: HOLD,
	H2R,
	LAUNCH,
	NAME,
} as const;

export const EVOLUTION_3_LOOP = Object.values(EVOLUTION_3_DUR).reduce(
	(a, b) => a + b,
	0,
);

export const EVOLUTION_3_STAGE_NAMES = [
	"H1 Monkey",
	"H1 → H3",
	"H3 Hominid",
	"H3 → H4",
	"H4 Human",
	"Rocket",
	"Name",
] as const;

export function evolution3SeekTime(stage: number): number {
	const D = EVOLUTION_3_DUR;
	const marks = [
		0,
		D.H1,
		D.H1 + D.M13,
		D.H1 + D.M13 + D.H3,
		D.H1 + D.M13 + D.H3 + D.M34,
		D.H1 + D.M13 + D.H3 + D.M34 + D.H4,
		D.H1 + D.M13 + D.H3 + D.M34 + D.H4 + D.H2R + D.LAUNCH,
	];
	return marks[clamp(stage, 0, marks.length - 1)] ?? 0;
}

function rocketExhaustAt(rx: number, ry: number): V2 {
	return [rx, ry - 0.42];
}

export type AsciiEvolution3Config = {
	speed: number;
	figureScale: number;
	density: number;
	seekStage: number;
	seekGen: number;
	showStars: boolean;
	showExhaust: boolean;
	showLabels: boolean;
	/** When true, freeze on the finished name instead of looping. */
	pauseOnName: boolean;
	colorBright: string;
	colorDim: string;
	colorStar: string;
	colorExhaust: string;
};

export const ASCII_EVOLUTION_3_DEFAULTS: AsciiEvolution3Config = {
	speed: 1,
	figureScale: 0.36,
	density: 1,
	seekStage: -1,
	seekGen: 0,
	showStars: true,
	showExhaust: true,
	showLabels: true,
	pauseOnName: false,
	colorBright: "rgba(255,255,255,0.96)",
	colorDim: "rgba(255,255,255,0.35)",
	colorStar: "rgba(255,255,255,0.42)",
	colorExhaust: "rgba(251,146,60,0.85)",
};

const NAME_INDEX = 6;
const ROCKET_INDEX = 5;

export interface AsciiEvolution3Props {
	className?: string;
	config?: Partial<AsciiEvolution3Config>;
	onStageChange?: (name: string, index: number) => void;
}

export default function AsciiEvolution3({
	className,
	config,
	onStageChange,
}: AsciiEvolution3Props) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const configRef = useRef<AsciiEvolution3Config>({
		...ASCII_EVOLUTION_3_DEFAULTS,
		...config,
	});
	const onStageRef = useRef(onStageChange);
	onStageRef.current = onStageChange;
	configRef.current = { ...ASCII_EVOLUTION_3_DEFAULTS, ...config };

	useEffect(() => {
		if (!canvasRef.current) return;
		const view = canvasRef.current;
		const ctx2d = view.getContext("2d", { alpha: false });
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
		let lastStage = -1;
		let brightRow: string[] = [];
		let dimRow: string[] = [];
		let starRow: string[] = [];
		let exhaustRow: string[] = [];

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
		}

		function hash(c: number, r: number) {
			const s = Math.sin(c * 127.1 + r * 311.7) * 43758.5453;
			return s - Math.floor(s);
		}

		let seekGenSeen = -1;
		let seekEpochSec = 0;
		let seekOriginU = 0;

		function loopTime(tSec: number): number {
			const cfg = configRef.current;
			if (cfg.seekGen !== seekGenSeen) {
				seekGenSeen = cfg.seekGen;
				seekOriginU =
					cfg.seekStage < 0 ? 0 : evolution3SeekTime(cfg.seekStage);
				seekEpochSec = tSec;
			}
			const elapsed = tSec - seekEpochSec;
			const total = seekOriginU + elapsed;
			// Hold on fully-set name (end of NAME beat) — no restart
			if (cfg.pauseOnName) {
				return Math.min(total, EVOLUTION_3_LOOP - 0.001);
			}
			return (
				((total % EVOLUTION_3_LOOP) + EVOLUTION_3_LOOP) % EVOLUTION_3_LOOP
			);
		}

		function figureAt(
			pose: (t: number, m: number) => Seg[],
			t: number,
			s: number,
			dy = 0.03,
		): Seg[] {
			return translateSegs(scaleSegs(pose(t, 1), s), 0, dy);
		}

		function timeline(tSec: number) {
			const D = EVOLUTION_3_DUR;
			const u = loopTime(tSec);
			let t0 = 0;

			// Keep scales close so morphs read as shape-change, not "standing up taller"
			const S1 = 0.88;
			const S3 = 0.78;
			const S4 = 0.72;

			type Beat = {
				segs: Seg[];
				stageIndex: number;
				label: string;
				space?: number;
				exhaustAmt?: number;
				exhaustAt?: V2 | null;
				exhaustUp?: boolean;
				nameForm?: number;
				backSegs?: Seg[];
				rocketCx?: number;
				rocketCy?: number;
			};

			const hold = (
				pose: (t: number, m: number) => Seg[],
				s: number,
				stageIndex: number,
				label: string,
			): Beat => ({
				segs: figureAt(pose, tSec, s),
				stageIndex,
				label,
			});

			/** Walk-morph — both gaits keep moving while silhouettes blend (like Anim 1/2). */
			const morph = (
				a: (t: number, m: number) => Seg[],
				b: (t: number, m: number) => Seg[],
				sa: number,
				sb: number,
				local: number,
				stageIndex: number,
				label: string,
			): Beat => {
				const mt = smoothstep(0.08, 0.92, local);
				const s = lerp(sa, sb, mt);
				return {
					segs: morphSegs(
						figureAt(a, tSec, s),
						figureAt(b, tSec, s),
						mt,
					),
					stageIndex,
					label,
				};
			};

			if (u < (t0 += D.H1)) return hold(h1At, S1, 0, "H1 Monkey");
			if (u < (t0 += D.M13))
				return morph(h1At, h3At, S1, S3, (u - (t0 - D.M13)) / D.M13, 1, "H1 → H3");
			if (u < (t0 += D.H3)) return hold(h3At, S3, 2, "H3 Hominid");
			if (u < (t0 += D.M34))
				return morph(h3At, h4At, S3, S4, (u - (t0 - D.M34)) / D.M34, 3, "H3 → H4");
			if (u < (t0 += D.H4)) return hold(h4At, S4, 4, "H4 Human");

			if (u < (t0 += D.H2R)) {
				const local = (u - (t0 - D.H2R)) / D.H2R;
				const mt = smoothstep(0.05, 0.95, local);
				const hum = figureAt(h4At, tSec, S4);
				const rock = translateSegs(
					rocketUprightAt(tSec, 0.35 + mt * 0.45),
					0,
					mt * 0.08,
				);
				return {
					segs: morphSegs(hum, rock, mt),
					stageIndex: mt > 0.5 ? ROCKET_INDEX : 4,
					label: mt < 0.25 ? "H4 Human" : "Human → Rocket",
				};
			}

			if (u < (t0 += D.LAUNCH)) {
				const local = (u - (t0 - D.LAUNCH)) / D.LAUNCH;
				const ease = local * local * (3 - 2 * local);
				const space = smoothstep(0.84, 0.995, ease);
				const up = 0.08 + ease * 2.85;
				return {
					segs: translateSegs(rocketUprightAt(tSec, 0.55 + ease * 0.35), 0, up),
					stageIndex: ROCKET_INDEX,
					label: "Launch",
					space,
					exhaustAmt:
						smoothstep(0.04, 0.18, ease) *
						clamp(0.95 - space * 0.45, 0.55, 1),
					exhaustAt: rocketExhaustAt(0, up),
					exhaustUp: true,
				};
			}

			const nameT = u - (EVOLUTION_3_LOOP - D.NAME);
			const p = nameT / D.NAME;
			const pathReveal = smoothstep(0, 0.36, p);
			const nameForm = smoothstep(0.02, 0.42, p);
			// While paused on the finished name, switch to looping flybys
			const pauseName = configRef.current.pauseOnName;
			const fly =
				pauseName && p > 0.82
					? -1
					: p < 0.45
						? 0
						: flyProgress(clamp((p - 0.45) / 0.4, 0, 1));
			const scene = nameScene(tSec, fly, pathReveal);
			return {
				segs: scene.segs,
				backSegs: scene.backSegs,
				stageIndex: NAME_INDEX,
				label: "Areyan Rastawan",
				space: 1,
				exhaustAmt: scene.exhaustAt ? 0.4 : 0,
				exhaustAt: scene.exhaustAt,
				rocketCx: scene.rx,
				rocketCy: scene.ry,
				nameForm,
			};
		}

		function frame(now: number) {
			const cfg = configRef.current;
			if (cfg.density !== lastDensity) resize();

			const t = reduced ? 8 : (now / 1000) * cfg.speed;
			const {
				segs,
				backSegs = [],
				stageIndex,
				space = 0,
				label,
				exhaustAmt = 0,
				exhaustAt = null,
				exhaustUp = false,
				rocketCx = 0,
				rocketCy = 0,
				nameForm = 1,
			} = timeline(t);
			const viewY = 0.5;

			if (stageIndex !== lastStage) {
				lastStage = stageIndex;
				onStageRef.current?.(
					EVOLUTION_3_STAGE_NAMES[stageIndex] ?? label,
					stageIndex,
				);
			}

			const nameScaleBoost = stageIndex === NAME_INDEX ? 1.38 : 1;
			let S = H * cfg.figureScale * nameScaleBoost;
			if (stageIndex === NAME_INDEX) {
				S = Math.min(S, (W * 0.42) / 1.35);
			}
			const figCx = W * 0.5;
			const figCy = H * viewY;
			const stroke = Math.max(
				cellH * (stageIndex === NAME_INDEX ? 0.58 : 0.36),
				cellW * 0.85,
			);

			g.font = monoFont(fontSize);
			g.textBaseline = "top";
			g.textAlign = "left";

			for (let r = 0; r < rows; r++) {
				const fy = (figCy - (originY + r * cellH + cellH * 0.5)) / S;
				let bright = "";
				let dim = "";
				let star = "";
				let exhaust = "";

				for (let c = 0; c < cols; c++) {
					const fx = (originX + c * cellW + cellW * 0.5 - figCx) / S;

					let dMin = 1e9;
					for (const [a, b] of segs) {
						const d = sdSeg(fx, fy, a[0], a[1], b[0], b[1]);
						if (d < dMin) dMin = d;
					}
					const brightI = 1 - smoothstep(0, stroke / S, dMin);

					let starChar = " ";
					if ((cfg.showStars || stageIndex === NAME_INDEX) && space > 0.08) {
						const dens = 0.992 - space * 0.045;
						const hs = hash(c, r);
						if (hs > dens) {
							const tw = 0.5 + 0.5 * Math.sin(t * 0.55 + hs * 40);
							starChar = tw > 0.82 ? "+" : tw > 0.18 ? "." : " ";
						}
					}

					let nameI = brightI;
					if (stageIndex === NAME_INDEX) {
						nameI = brightI * Math.pow(clamp(nameForm, 0, 1), 0.75);
					}

					let backI = 0;
					if (
						backSegs.length &&
						nameI < 0.2 &&
						Math.abs(fx - rocketCx) < 0.85 &&
						Math.abs(fy - rocketCy) < 0.85
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
					if (cfg.showExhaust && exhaustAmt > 0.04) {
						const engX = exhaustAt ? exhaustAt[0] : 0;
						const engY = exhaustAt ? exhaustAt[1] : -0.3;
						const ux = exhaustUp ? 0 : -Math.SQRT1_2;
						const uy = exhaustUp ? -1 : -Math.SQRT1_2;
						const along = (fx - engX) * ux + (fy - engY) * uy;
						const across = (fx - engX) * -uy + (fy - engY) * ux;
						const plumeLen = exhaustUp
							? 1.05 + exhaustAmt * 0.95
							: 0.9 + exhaustAmt * 0.85;
						const flicker =
							0.75 + 0.25 * Math.sin(t * 22 + along * 14 + fx * 9);
						if (along > 0.02 && along < plumeLen) {
							const taper = 1 - along / plumeLen;
							const halfW = 0.12 + along * 0.38 * flicker;
							const core = clamp(1 - Math.abs(across) / halfW, 0, 1);
							exhaustI =
								Math.pow(core, 0.7) * taper * exhaustAmt * flicker;
						}
					}

					if (nameI > 0.18) {
						const idx = clamp(
							Math.floor(nameI ** 1.05 * RAMP.length),
							stageIndex === NAME_INDEX ? 2 : 1,
							RAMP.length - 1,
						);
						bright += RAMP[idx];
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
						bright += RAMP[idx];
						dim += " ";
						star += " ";
						exhaust += " ";
						continue;
					}
					bright += " ";

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
				dimRow[r] = dim;
				starRow[r] = star;
				exhaustRow[r] = exhaust;
			}

			g.fillStyle = "#000";
			g.fillRect(0, 0, W, H);
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
			if (cfg.showStars || stageIndex === NAME_INDEX || space > 0.12) {
				drawLayer(cfg.colorStar, starRow);
			}
			drawLayer(cfg.colorDim, dimRow);
			if (cfg.showExhaust) drawLayer(cfg.colorExhaust, exhaustRow);
			drawLayer(cfg.colorBright, brightRow);

			if (cfg.showLabels) {
				g.fillStyle = "rgba(255,255,255,0.45)";
				g.font = monoFont(12);
				g.fillText(label.toUpperCase(), 16, 16);
			}

			if (!reduced) raf = requestAnimationFrame(frame);
		}

		resize();
		const ro = new ResizeObserver(() => resize());
		if (view.parentElement) ro.observe(view.parentElement);
		window.addEventListener("resize", resize);
		void document.fonts?.ready?.then(() => resize());

		if (reduced) frame(0);
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
				background: "#000000",
			}}
		/>
	);
}
