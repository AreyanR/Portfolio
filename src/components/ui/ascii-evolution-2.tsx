"use client";

/**
 * Animation 2 — underwater fish school → one fish becomes monkey →
 * monkey school → one becomes human → rocket → name.
 *
 * Separate from Animation 1 (ascii-evolution.tsx). Portfolio :3002 stays on Anim 1.
 */

import { useEffect, useRef } from "react";
import {
	flyProgress,
	humanAt,
	monkeyV2At,
	morphSegs,
	nameScene,
	rocketAt,
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

const RAMP = " .:-=+*#%@";

/** Small side-view fish — school member. */
function fishAt(t: number, moving: number): Seg[] {
	const m = clamp(moving, 0, 1);
	const phase = t * 6.2;
	const bob = Math.sin(t * 2.4) * 0.02 * m;
	const wBody = Math.sin(phase) * 0.04 * m;
	const wTail = Math.sin(phase - 1.1) * 0.1 * m;

	const nose: V2 = [0.55, 0.02 + bob];
	const top: V2 = [0.1, 0.18 + bob + wBody];
	const rear: V2 = [-0.28, 0.02 + bob + wBody * 0.5];
	const bot: V2 = [0.1, -0.16 + bob - wBody];
	const jaw: V2 = [0.42, -0.06 + bob];
	const tailC: V2 = [-0.38, 0.02 + bob + wTail * 0.3];
	const tailUp: V2 = [-0.58, 0.16 + bob + wTail];
	const tailDn: V2 = [-0.58, -0.12 + bob + wTail];
	const eye: V2 = [0.32, 0.06 + bob];
	const fin: V2 = [0.05, -0.12 + bob];
	const finTip: V2 = [-0.02, -0.28 + bob];

	return [
		[nose, top],
		[top, rear],
		[rear, bot],
		[bot, jaw],
		[jaw, nose],
		[rear, tailC],
		[tailC, tailUp],
		[tailC, tailDn],
		[tailUp, tailDn],
		[fin, finTip],
		[eye, [eye[0] + 0.05, eye[1]] as V2],
	];
}

type SchoolMember = {
	x: number;
	y: number;
	s: number;
	ph: number;
	hero?: boolean;
};

const FISH_SCHOOL: SchoolMember[] = [
	{ x: 0.05, y: 0.05, s: 0.62, ph: 0, hero: true },
	{ x: -0.95, y: 0.42, s: 0.34, ph: 1.1 },
	{ x: -1.15, y: -0.28, s: 0.3, ph: 2.4 },
	{ x: 0.85, y: 0.48, s: 0.28, ph: 0.7 },
	{ x: 1.05, y: -0.38, s: 0.32, ph: 3.1 },
	{ x: -0.55, y: 0.72, s: 0.26, ph: 1.8 },
	{ x: 0.55, y: -0.7, s: 0.27, ph: 2.6 },
];

const MONKEY_SCHOOL: SchoolMember[] = [
	{ x: 0.0, y: 0.05, s: 0.55, ph: 0, hero: true },
	{ x: -0.85, y: 0.4, s: 0.32, ph: 0.9 },
	{ x: -0.95, y: -0.35, s: 0.3, ph: 2.0 },
	{ x: 0.9, y: 0.45, s: 0.28, ph: 1.4 },
	{ x: 0.95, y: -0.4, s: 0.3, ph: 2.8 },
];

function placeSchool(
	members: SchoolMember[],
	pose: (t: number, moving: number) => Seg[],
	t: number,
	moving: number,
	opts?: { heroOnly?: boolean; skipHero?: boolean },
): Seg[] {
	const out: Seg[] = [];
	for (const m of members) {
		if (opts?.heroOnly && !m.hero) continue;
		if (opts?.skipHero && m.hero) continue;
		const drift = Math.sin(t * 0.7 + m.ph) * 0.04 * moving;
		out.push(
			...translateSegs(
				scaleSegs(pose(t + m.ph, moving), m.s),
				m.x + drift,
				m.y,
			),
		);
	}
	return out;
}

export type AsciiEvolution2Config = {
	speed: number;
	figureScale: number;
	density: number;
	holdStage: number;
	showStars: boolean;
	showExhaust: boolean;
	showLabels: boolean;
	colorBright: string;
	colorDim: string;
	colorStar: string;
	colorExhaust: string;
};

export const ASCII_EVOLUTION_2_DEFAULTS: AsciiEvolution2Config = {
	speed: 1,
	figureScale: 0.34,
	density: 1,
	holdStage: -1,
	showStars: true,
	showExhaust: true,
	showLabels: true,
	colorBright: "rgba(255,255,255,0.96)",
	colorDim: "rgba(125,211,252,0.35)",
	colorStar: "rgba(165,243,252,0.38)",
	colorExhaust: "rgba(251,146,60,0.85)",
};

export const EVOLUTION_2_STAGE_NAMES = [
	"Fish school",
	"Fish → Monkey",
	"Monkey school",
	"Monkey → Human",
	"Human",
	"Rocket",
	"Name",
] as const;

const NAME_INDEX = 6;
const ROCKET_INDEX = 5;

export interface AsciiEvolution2Props {
	className?: string;
	config?: Partial<AsciiEvolution2Config>;
	onStageChange?: (name: string, index: number) => void;
}

export default function AsciiEvolution2({
	className,
	config,
	onStageChange,
}: AsciiEvolution2Props) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const configRef = useRef<AsciiEvolution2Config>({
		...ASCII_EVOLUTION_2_DEFAULTS,
		...config,
	});
	const onStageRef = useRef(onStageChange);
	onStageRef.current = onStageChange;
	configRef.current = { ...ASCII_EVOLUTION_2_DEFAULTS, ...config };

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
			g.textBaseline = "top";
			g.textAlign = "left";
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

		function timeline(tSec: number) {
			const FISH = 4.0;
			const F2M = 2.2;
			const MONK = 3.0;
			const M2H = 2.0;
			const HUM = 1.6;
			const H2R = 1.4;
			const LAUNCH = 2.6;
			const NAME = 7.0;
			const LOOP = FISH + F2M + MONK + M2H + HUM + H2R + LAUNCH + NAME;
			const u = ((tSec % LOOP) + LOOP) % LOOP;
			const cfg = configRef.current;

			const hold = cfg.holdStage;
			if (hold >= 0 && hold < EVOLUTION_2_STAGE_NAMES.length) {
				if (hold === NAME_INDEX) {
					const scene = nameScene(tSec);
					return {
						segs: scene.segs,
						backSegs: scene.backSegs,
						stageIndex: NAME_INDEX,
						space: 1,
						viewY: 0.5,
						label: "Areyan Rastawan",
						exhaustAmt: scene.exhaustAt ? 0.4 : 0,
						exhaustAt: scene.exhaustAt,
						rocketCx: scene.rx,
						rocketCy: scene.ry,
						nameForm: 1,
						underwater: 0,
					};
				}
				if (hold === 0) {
					return {
						segs: placeSchool(FISH_SCHOOL, fishAt, tSec, 0.9),
						stageIndex: 0,
						space: 0,
						viewY: 0.5,
						label: "Fish school",
						underwater: 1,
					};
				}
				if (hold === 2) {
					return {
						segs: placeSchool(MONKEY_SCHOOL, monkeyV2At, tSec, 0.85),
						stageIndex: 2,
						space: 0,
						viewY: 0.52,
						label: "Monkey school",
						underwater: 0,
					};
				}
				if (hold === 4) {
					return {
						segs: humanAt(tSec, 0.85),
						stageIndex: 4,
						space: 0,
						viewY: 0.5,
						label: "Human",
						underwater: 0,
					};
				}
				if (hold === ROCKET_INDEX) {
					return {
						segs: rocketAt(tSec, 0.7),
						stageIndex: ROCKET_INDEX,
						space: 0,
						viewY: 0.45,
						label: "Rocket",
						underwater: 0,
						exhaustAmt: 0.35,
					};
				}
				// morph holds
				if (hold === 1) {
					const mt = 0.55;
					const fish = placeSchool(FISH_SCHOOL, fishAt, tSec, 0.5, {
						heroOnly: true,
					});
					const monk = placeSchool(MONKEY_SCHOOL, monkeyV2At, tSec, 0.5, {
						heroOnly: true,
					});
					const crowd = placeSchool(FISH_SCHOOL, fishAt, tSec, 0.4, {
						skipHero: true,
					});
					return {
						segs: [...crowd, ...morphSegs(fish, monk, mt)],
						stageIndex: 1,
						space: 0,
						viewY: 0.5,
						label: "Fish → Monkey",
						underwater: 0.35,
					};
				}
				if (hold === 3) {
					const mt = 0.55;
					const monk = monkeyV2At(tSec, 0.5);
					const hum = humanAt(tSec, 0.5);
					const crowd = placeSchool(MONKEY_SCHOOL, monkeyV2At, tSec, 0.4, {
						skipHero: true,
					});
					return {
						segs: [...crowd, ...morphSegs(monk, hum, mt)],
						stageIndex: 3,
						space: 0,
						viewY: 0.5,
						label: "Monkey → Human",
						underwater: 0,
					};
				}
			}

			let t0 = 0;
			if (u < (t0 += FISH)) {
				return {
					segs: placeSchool(FISH_SCHOOL, fishAt, tSec, 1),
					stageIndex: 0,
					space: 0,
					viewY: 0.5,
					label: "Fish school",
					underwater: 1,
				};
			}
			if (u < (t0 += F2M)) {
				const local = (u - (t0 - F2M)) / F2M;
				const mt = smoothstep(0.1, 0.9, local);
				const fishH = placeSchool(FISH_SCHOOL, fishAt, tSec, 0.55, {
					heroOnly: true,
				});
				const monkH = placeSchool(MONKEY_SCHOOL, monkeyV2At, tSec, 0.55, {
					heroOnly: true,
				});
				const fishCrowd = placeSchool(FISH_SCHOOL, fishAt, tSec, 0.45, {
					skipHero: true,
				});
				const monkCrowd = placeSchool(MONKEY_SCHOOL, monkeyV2At, tSec, 0.45, {
					skipHero: true,
				});
				const crowd = morphSegs(fishCrowd, monkCrowd, mt);
				return {
					segs: [...crowd, ...morphSegs(fishH, monkH, mt)],
					stageIndex: 1,
					space: 0,
					viewY: 0.5,
					label: "Fish → Monkey",
					underwater: 1 - mt,
				};
			}
			if (u < (t0 += MONK)) {
				return {
					segs: placeSchool(MONKEY_SCHOOL, monkeyV2At, tSec, 1),
					stageIndex: 2,
					space: 0,
					viewY: 0.52,
					label: "Monkey school",
					underwater: 0,
				};
			}
			if (u < (t0 += M2H)) {
				const local = (u - (t0 - M2H)) / M2H;
				const mt = smoothstep(0.1, 0.9, local);
				const monkH = placeSchool(MONKEY_SCHOOL, monkeyV2At, tSec, 0.5, {
					heroOnly: true,
				});
				const hum = scaleSegs(humanAt(tSec, 0.55), 0.55);
				const crowd = placeSchool(MONKEY_SCHOOL, monkeyV2At, tSec, 0.35 * (1 - mt), {
					skipHero: true,
				});
				return {
					segs: [...crowd, ...morphSegs(monkH, hum, mt)],
					stageIndex: 3,
					space: 0,
					viewY: 0.5,
					label: "Monkey → Human",
					underwater: 0,
				};
			}
			if (u < (t0 += HUM)) {
				return {
					segs: humanAt(tSec, 1),
					stageIndex: 4,
					space: 0,
					viewY: 0.5,
					label: "Human",
					underwater: 0,
				};
			}
			if (u < (t0 += H2R)) {
				const local = (u - (t0 - H2R)) / H2R;
				const mt = smoothstep(0.05, 0.95, local);
				return {
					segs: morphSegs(humanAt(tSec, 0.4), rocketAt(tSec, 0.5), mt),
					stageIndex: 4,
					space: 0,
					viewY: lerp(0.5, 0.42, mt),
					label: "Human → Rocket",
					underwater: 0,
					exhaustAmt: mt * 0.25,
				};
			}
			if (u < (t0 += LAUNCH)) {
				const local = (u - (t0 - LAUNCH)) / LAUNCH;
				const travel = Math.min(1, local);
				const ease = travel * travel * (3 - 2 * travel);
				const space = smoothstep(0.84, 0.995, ease);
				const east = ease * 2.8;
				const up = ease * 2.1;
				return {
					segs: translateSegs(rocketAt(tSec, 0.55 + ease * 0.35), east, up),
					stageIndex: ROCKET_INDEX,
					space,
					viewY: lerp(0.5, 0.18, ease),
					label: "Launch NE",
					underwater: 0,
					exhaustAmt:
						smoothstep(0.06, 0.22, ease) *
						clamp(0.95 - space * 0.45, 0.55, 1),
				};
			}

			const nameT = u - (LOOP - NAME);
			const p = nameT / NAME;
			const pathReveal = lerp(0.72, 1, smoothstep(0, 0.08, p));
			const nameForm = smoothstep(0, 0.06, p);
			const fly =
				p < 0.12 ? 0 : flyProgress(clamp((p - 0.12) / 0.55, 0, 1));
			const scene = nameScene(tSec, fly, pathReveal);
			return {
				segs: scene.segs,
				backSegs: scene.backSegs,
				stageIndex: NAME_INDEX,
				space: 1,
				viewY: 0.5,
				label: "Areyan Rastawan",
				exhaustAmt: scene.exhaustAt ? 0.4 : 0,
				exhaustAt: scene.exhaustAt,
				rocketCx: scene.rx,
				rocketCy: scene.ry,
				nameForm,
				underwater: 0,
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
				space,
				label,
				viewY,
				exhaustAmt = 0,
				exhaustAt = null,
				rocketCx = 0,
				rocketCy = 0,
				nameForm = 1,
				underwater = 0,
			} = timeline(t);

			if (stageIndex !== lastStage) {
				lastStage = stageIndex;
				onStageRef.current?.(EVOLUTION_2_STAGE_NAMES[stageIndex] ?? label, stageIndex);
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

					// Bubbles underwater / stars in space
					let starChar = " ";
					const wantAmbient =
						(cfg.showStars || stageIndex === NAME_INDEX) &&
						(space > 0.08 || underwater > 0.15);
					if (wantAmbient) {
						const dens =
							underwater > 0.2
								? 0.988 - underwater * 0.02
								: 0.992 - space * 0.045;
						const hs = hash(c, r);
						if (hs > dens) {
							if (underwater > 0.2) {
								const rise = (t * 0.35 + hs * 10) % 1;
								starChar = rise > 0.7 ? "o" : rise > 0.35 ? "." : " ";
							} else {
								const tw = 0.5 + 0.5 * Math.sin(t * 0.55 + hs * 40);
								starChar = tw > 0.82 ? "+" : tw > 0.18 ? "." : " ";
							}
						}
					}

					let nameI = brightI;
					if (stageIndex === NAME_INDEX) {
						nameI = brightI * smoothstep(0.05, 0.9, nameForm);
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
						let engX: number;
						let engY: number;
						if (exhaustAt) {
							engX = exhaustAt[0];
							engY = exhaustAt[1];
						} else {
							let cx = 0;
							let cy = 0;
							let nPts = 0;
							for (const [a, b] of segs) {
								cx += a[0] + b[0];
								cy += a[1] + b[1];
								nPts += 2;
							}
							cx /= nPts || 1;
							cy /= nPts || 1;
							engX = cx - 0.28;
							engY = cy - 0.32;
						}
						const ux = -Math.SQRT1_2;
						const uy = -Math.SQRT1_2;
						const along = (fx - engX) * ux + (fy - engY) * uy;
						const across = (fx - engX) * -uy + (fy - engY) * ux;
						const plumeLen = 0.9 + exhaustAmt * 0.85;
						const flicker =
							0.75 + 0.25 * Math.sin(t * 22 + along * 14 + fx * 9);
						if (along > 0.02 && along < plumeLen) {
							const taper = 1 - along / plumeLen;
							const halfW = 0.12 + along * 0.38 * flicker;
							const core = clamp(1 - Math.abs(across) / halfW, 0, 1);
							exhaustI = Math.pow(core, 0.7) * taper * exhaustAmt * flicker;
						}
					}

					if (nameI > (stageIndex === NAME_INDEX ? 0.28 : 0.18)) {
						const power = stageIndex === NAME_INDEX ? 1.15 : 1.05;
						const minIdx = stageIndex === NAME_INDEX ? 4 : 1;
						const idx = clamp(
							Math.floor(nameI ** power * RAMP.length),
							minIdx,
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
			if (cfg.showStars || stageIndex === NAME_INDEX || space > 0.12 || underwater > 0.15) {
				drawLayer(
					underwater > 0.2
						? "rgba(125,211,252,0.4)"
						: cfg.colorStar,
					starRow,
				);
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
