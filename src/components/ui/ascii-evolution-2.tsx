"use client";

/**
 * Animation 2 — whale (NE tilt, leave kelp) → monkey → human → rocket → name.
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
	whaleAt,
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
function rotate2(p: V2, ang: number): V2 {
	const c = Math.cos(ang);
	const s = Math.sin(ang);
	return [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
}
function rotateSegs(segs: Seg[], ang: number): Seg[] {
	return segs.map(([a, b]) => [rotate2(a, ang), rotate2(b, ang)]);
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

type SchoolMember = {
	x: number;
	y: number;
	s: number;
	ph: number;
	hero?: boolean;
};

/** Same whale as Anim 1 — school formation clears the corner seaweed. */
const WHALE_SCHOOL: SchoolMember[] = [
	{ x: 0.38, y: 0.22, s: 0.5, ph: 0, hero: true },
	{ x: -0.45, y: 0.48, s: 0.36, ph: 1.1 },
	{ x: -0.05, y: -0.22, s: 0.3, ph: 2.2 },
];

/** Swaying seaweed — bottom-left & bottom-right, a few extra stalks clustered. */
function seaweedField(t: number, moving: number): Seg[] {
	const m = clamp(moving, 0, 1);
	const segs: Seg[] = [];

	type Stalk = { x: number; h: number; phase: number; lean: number };
	const stalks: Stalk[] = [
		{ x: -1.22, h: 0.68, phase: 0.05, lean: 0.02 },
		{ x: -1.15, h: 0.72, phase: 0.2, lean: 0.03 },
		{ x: -0.95, h: 0.9, phase: 1.1, lean: -0.025 },
		{ x: -0.88, h: 0.7, phase: 1.4, lean: -0.02 },
		{ x: 0.88, h: 0.72, phase: 1.7, lean: 0.025 },
		{ x: 0.95, h: 0.85, phase: 2.0, lean: 0.04 },
		{ x: 1.15, h: 0.68, phase: 2.8, lean: -0.03 },
		{ x: 1.22, h: 0.78, phase: 3.1, lean: -0.02 },
	];

	for (const s of stalks) {
		const baseY = -0.92;
		const steps = 8;
		let prev: V2 = [s.x, baseY];
		for (let i = 1; i <= steps; i++) {
			const u = i / steps;
			const sway =
				Math.sin(t * 1.8 + s.phase + u * 1.6) * 0.07 * m * u +
				Math.sin(t * 2.6 + s.phase * 0.7) * 0.03 * m * u;
			const x = s.x + s.lean * u + sway;
			const y = baseY + s.h * u;
			const cur: V2 = [x, y];
			segs.push([prev, cur]);
			prev = cur;
		}
		const tip: V2 = [
			prev[0] + Math.sin(t * 2.1 + s.phase) * 0.04 * m,
			prev[1] + 0.05,
		];
		segs.push([prev, tip]);
	}

	return segs;
}

function whaleScene(
	t: number,
	moving: number,
	opts?: {
		heroOnly?: boolean;
		skipHero?: boolean;
		heroAdvance?: number;
		heroRise?: number;
		tilt?: number;
	},
): Seg[] {
	return [
		...seaweedField(t, moving),
		...placeSchool(WHALE_SCHOOL, whaleAt, t, moving, opts),
	];
}

/** Shared morph length (s) — whale→monkey, monkey→human, human→rocket. */
const MORPH_DUR = 0.7;
/** Whale swim / monkey walk / human walk — same “two steps” beat. */
const STEP_DUR = 2.0;
const FISH_DUR = STEP_DUR + MORPH_DUR;
const LAND_DUR = STEP_DUR + MORPH_DUR + STEP_DUR;

/** Swim forward + up; camera follows so kelp scrolls away behind. */
const FISH_ADVANCE_END = 2.2;
const FISH_RISE_END = 0.95;
/** Nose tilted along the climb. */
const FISH_NE_TILT = Math.atan2(FISH_RISE_END, FISH_ADVANCE_END);

/** Shorter land human — matches monkey→human morph (not the tall Anim 1 human). */
const LAND_HUMAN_S = 0.56;

/** How far the land camera rolls after fish (world units). */
const LAND_ADVANCE = (FISH_ADVANCE_END * LAND_DUR) / FISH_DUR;

/** Fish local progress where whale→monkey morph begins (during the swim). */
const FISH_MORPH_AT = STEP_DUR / FISH_DUR;

/** Land camera travel 0→1 — linear so pan speed matches fish through the handoff. */
function landCamTravel(p: number): number {
	return clamp(p, 0, 1);
}

function camXAtLand(p: number): number {
	const hero = WHALE_SCHOOL.find((m) => m.hero) ?? WHALE_SCHOOL[0]!;
	return hero.x + FISH_ADVANCE_END + landCamTravel(p) * LAND_ADVANCE;
}

/** Engine nozzle under an upright rocket at (rx, ry). */
function rocketExhaustAt(rx: number, ry: number): V2 {
	return [rx, ry - 0.42];
}

/**
 * Land beat: monkey → human. Camera pans at fish speed (no tree / clouds).
 */
function landSequence(
	t: number,
	progress01: number,
): {
	segs: Seg[];
	label: string;
	underwater: number;
	stageIndex: number;
	camX: number;
} {
	const p = clamp(progress01, 0, 1);
	const hero = WHALE_SCHOOL.find((m) => m.hero) ?? WHALE_SCHOOL[0]!;

	const MONKEY_WALK_END = STEP_DUR / LAND_DUR;
	const MORPH_H_END = (STEP_DUR + MORPH_DUR) / LAND_DUR;

	const morphHP = smoothstep(MONKEY_WALK_END, MORPH_H_END, p);

	const camX = camXAtLand(p);

	const schoolAmt = 1 - smoothstep(0.0, 0.1, p);
	const seaweedAmt = 1 - smoothstep(0.0, 0.06, p);

	const seaweed =
		seaweedAmt > 0.05
			? translateSegs(seaweedField(t, seaweedAmt), -camX - p * 0.2, 0)
			: [];
	const others =
		schoolAmt > 0.05
			? translateSegs(
					placeSchool(WHALE_SCHOOL, whaleAt, t, 0.35 * schoolAmt, {
						skipHero: true,
					}),
					-camX - p * 0.5,
					0,
				)
			: [];

	const monkHero = translateSegs(
		scaleSegs(monkeyV2At(t, 1), hero.s * 0.92),
		0,
		0.05,
	);
	const humHero = translateSegs(
		scaleSegs(humanAt(t, 1), LAND_HUMAN_S),
		0,
		0.02,
	);

	let figure: Seg[];
	let label: string;
	let stageIndex: number;

	if (p < MONKEY_WALK_END) {
		figure = monkHero;
		label = "Monkey";
		stageIndex = 2;
	} else if (p < MORPH_H_END) {
		figure = morphSegs(monkHero, humHero, morphHP);
		label = "Monkey → Human";
		stageIndex = 3;
	} else {
		figure = humHero;
		label = "Human";
		stageIndex = 4;
	}

	return {
		segs: [...seaweed, ...others, ...figure],
		label,
		underwater: 0,
		stageIndex,
		camX,
	};
}

function placeSchool(
	members: SchoolMember[],
	pose: (t: number, moving: number) => Seg[],
	t: number,
	moving: number,
	opts?: {
		heroOnly?: boolean;
		skipHero?: boolean;
		heroAdvance?: number;
		heroRise?: number;
		tilt?: number;
	},
): Seg[] {
	const out: Seg[] = [];
	const tilt = opts?.tilt ?? 0;
	for (const m of members) {
		if (opts?.heroOnly && !m.hero) continue;
		if (opts?.skipHero && m.hero) continue;
		const drift = Math.sin(t * 0.7 + m.ph) * 0.02 * moving;
		const advance = m.hero ? (opts?.heroAdvance ?? 0) : 0;
		const rise = m.hero ? (opts?.heroRise ?? 0) : 0;
		let poseSegs = scaleSegs(pose(t + m.ph, moving), m.s);
		if (tilt !== 0) poseSegs = rotateSegs(poseSegs, tilt);
		out.push(
			...translateSegs(poseSegs, m.x + drift + advance, m.y + rise),
		);
	}
	return out;
}

export type AsciiEvolution2Config = {
	speed: number;
	figureScale: number;
	density: number;
	/**
	 * Jump into the full loop at this stage (−1 = from the start).
	 * Always plays the real timeline — never an isolated hold pose.
	 */
	seekStage: number;
	/** Bump to re-seek (Full loop / stage click). */
	seekGen: number;
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
	seekStage: -1,
	seekGen: 0,
	showStars: true,
	showExhaust: true,
	showLabels: true,
	// Match Anim 1 palette (esp. name / stars)
	colorBright: "rgba(255,255,255,0.96)",
	colorDim: "rgba(255,255,255,0.35)",
	colorStar: "rgba(255,255,255,0.42)",
	colorExhaust: "rgba(251,146,60,0.85)",
};

/** Full-loop durations (seconds). This is the only Anim 2 timeline. */
export const EVOLUTION_2_DUR = {
	FISH: FISH_DUR,
	LAND: LAND_DUR,
	H2R: MORPH_DUR,
	LAUNCH: 2.0,
	NAME: 7.2,
} as const;

export const EVOLUTION_2_LOOP =
	EVOLUTION_2_DUR.FISH +
	EVOLUTION_2_DUR.LAND +
	EVOLUTION_2_DUR.H2R +
	EVOLUTION_2_DUR.LAUNCH +
	EVOLUTION_2_DUR.NAME;

/** Land progress marks (0–1 within LAND) — kept in sync with landSequence. */
const LAND_MARK = {
	morphM: 0.0,
	monkey: 0.0,
	morphH: STEP_DUR / LAND_DUR,
	human: (STEP_DUR + MORPH_DUR) / LAND_DUR,
} as const;

/** Absolute loop time where each Jump-to button starts. */
export function evolution2SeekTime(stage: number): number {
	const D = EVOLUTION_2_DUR;
	const L0 = D.FISH;
	switch (stage) {
		case 0:
			return 0;
		case 1:
			return D.FISH * FISH_MORPH_AT;
		case 2:
			return D.FISH;
		case 3:
			return L0 + D.LAND * LAND_MARK.morphH;
		case 4:
			return L0 + D.LAND * LAND_MARK.human;
		case 5:
			return L0 + D.LAND;
		case 6:
			return L0 + D.LAND + D.H2R + D.LAUNCH;
		default:
			return 0;
	}
}

export const EVOLUTION_2_STAGE_NAMES = [
	"Whale school",
	"Whale → Monkey",
	"Monkey",
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

		let seekGenSeen = -1;
		let seekEpochSec = 0;
		let seekOriginU = 0;

		function loopTime(tSec: number): number {
			const cfg = configRef.current;
			if (cfg.seekGen !== seekGenSeen) {
				seekGenSeen = cfg.seekGen;
				seekOriginU =
					cfg.seekStage < 0 ? 0 : evolution2SeekTime(cfg.seekStage);
				seekEpochSec = tSec;
			}
			const elapsed = tSec - seekEpochSec;
			return (
				(((seekOriginU + elapsed) % EVOLUTION_2_LOOP) + EVOLUTION_2_LOOP) %
				EVOLUTION_2_LOOP
			);
		}

		function timeline(tSec: number) {
			const D = EVOLUTION_2_DUR;
			const u = loopTime(tSec);
			const hero = WHALE_SCHOOL.find((m) => m.hero) ?? WHALE_SCHOOL[0]!;

			let t0 = 0;
			if (u < (t0 += D.FISH)) {
				// Camera follows: fish stays framed, points NE, kelp scrolls away → morph to monkey.
				const local = u / D.FISH;
				const heroAdvance = clamp(local, 0, 1) * FISH_ADVANCE_END;
				const heroRise = clamp(local, 0, 1) * FISH_RISE_END;
				const morphMP = smoothstep(FISH_MORPH_AT, 1, local);
				const camX = hero.x + heroAdvance;
				const camY = lerp(hero.y + heroRise, 0.05, morphMP);
				const tilt = FISH_NE_TILT * (1 - morphMP);

				if (morphMP < 0.02) {
					return {
						segs: translateSegs(
							whaleScene(tSec, 1, {
								heroAdvance,
								heroRise,
								tilt,
							}),
							-camX,
							-camY,
						),
						stageIndex: 0,
						space: 0,
						viewY: 0.5,
						label: "Whale school",
						underwater: 1,
					};
				}

				const fade = 1 - morphMP;
				const seaweed =
					fade > 0.05
						? translateSegs(seaweedField(tSec, fade), -camX, -camY)
						: [];
				const others =
					fade > 0.05
						? translateSegs(
								placeSchool(WHALE_SCHOOL, whaleAt, tSec, 0.4 * fade, {
									skipHero: true,
									tilt: tilt * 0.7,
								}),
								-camX - morphMP * 0.35,
								-camY,
							)
						: [];
				const whaleHero = translateSegs(
					rotateSegs(scaleSegs(whaleAt(tSec, 0.9), hero.s), tilt),
					0,
					0,
				);
				const monkHero = translateSegs(
					scaleSegs(monkeyV2At(tSec, 1), hero.s * 0.92),
					0,
					0.05,
				);
				return {
					segs: [
						...seaweed,
						...others,
						...morphSegs(whaleHero, monkHero, morphMP),
					],
					stageIndex: 1,
					space: 0,
					viewY: 0.5,
					label: "Whale → Monkey",
					underwater: 1 - morphMP,
				};
			}
			if (u < (t0 += D.LAND)) {
				const local = (u - (t0 - D.LAND)) / D.LAND;
				const beat = landSequence(tSec, local);
				return {
					segs: beat.segs,
					stageIndex: beat.stageIndex,
					space: 0,
					viewY: 0.5,
					label: beat.label,
					underwater: beat.underwater,
				};
			}
			if (u < (t0 += D.H2R)) {
				// Morph into upright rocket (no sky props).
				const local = (u - (t0 - D.H2R)) / D.H2R;
				const mt = smoothstep(0.0, 1.0, local);
				const shortHum = translateSegs(
					scaleSegs(humanAt(tSec, 1), LAND_HUMAN_S),
					0,
					0.02,
				);
				const rock0 = rocketUprightAt(tSec, 0.35 + mt * 0.45);
				const up = mt * 0.08;
				const figure = translateSegs(morphSegs(shortHum, rock0, mt), 0, up);
				return {
					segs: figure,
					stageIndex: mt > 0.5 ? ROCKET_INDEX : 4,
					space: 0,
					viewY: 0.5,
					label: mt < 0.25 ? "Human" : "Human → Rocket",
					underwater: 0,
					exhaustAmt: 0,
					exhaustAt: null,
					exhaustUp: false,
				};
			}
			if (u < (t0 += D.LAUNCH)) {
				// Blast-off straight up; exhaust plume down
				const local = (u - (t0 - D.LAUNCH)) / D.LAUNCH;
				const travel = Math.min(1, local);
				const ease = travel * travel * (3 - 2 * travel);
				const space = smoothstep(0.84, 0.995, ease);
				const up = 0.08 + ease * 2.85;
				return {
					segs: translateSegs(rocketUprightAt(tSec, 0.55 + ease * 0.35), 0, up),
					stageIndex: ROCKET_INDEX,
					space,
					viewY: 0.5,
					label: "Launch",
					underwater: 0,
					exhaustAmt:
						smoothstep(0.04, 0.18, ease) *
						clamp(0.95 - space * 0.45, 0.55, 1),
					exhaustAt: rocketExhaustAt(0, up),
					exhaustUp: true,
				};
			}

			// Name — same timing / reveal as Anim 1
			const nameT = u - (EVOLUTION_2_LOOP - D.NAME);
			const p = nameT / D.NAME;
			const pathReveal = smoothstep(0, 0.36, p);
			const nameForm = smoothstep(0.02, 0.42, p);
			const fly =
				p < 0.45 ? 0 : flyProgress(clamp((p - 0.45) / 0.4, 0, 1));
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
				exhaustUp = false,
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

					// Stars in space only — no underwater bubble particles
					let starChar = " ";
					const wantAmbient =
						(cfg.showStars || stageIndex === NAME_INDEX) && space > 0.08;
					if (wantAmbient) {
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
						const ux = exhaustUp ? 0 : -Math.SQRT1_2;
						const uy = exhaustUp ? -1 : -Math.SQRT1_2;
						const along = (fx - engX) * ux + (fy - engY) * uy;
						const across = (fx - engX) * -uy + (fy - engY) * ux;
						const plumeLen =
							stageIndex === NAME_INDEX
								? 0.36 + exhaustAmt * 0.32
								: exhaustUp
									? 1.05 + exhaustAmt * 0.95
									: 0.9 + exhaustAmt * 0.85;
						const flicker =
							0.75 + 0.25 * Math.sin(t * 22 + along * 14 + fx * 9);
						if (along > 0.02 && along < plumeLen) {
							const taper = 1 - along / plumeLen;
							const slim = stageIndex === NAME_INDEX;
							const halfW =
								(slim ? 0.08 : 0.12) +
								along * (slim ? 0.28 : 0.38) * flicker;
							const core = clamp(1 - Math.abs(across) / halfW, 0, 1);
							exhaustI = Math.pow(core, 0.7) * taper * exhaustAmt * flicker;
						}
					}

					if (nameI > (stageIndex === NAME_INDEX ? 0.18 : 0.18)) {
						const power = stageIndex === NAME_INDEX ? 1.08 : 1.05;
						const minIdx = stageIndex === NAME_INDEX ? 2 : 1;
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
