/**
 * ASCII rocket craft styles for name flybys / lab picker.
 * All upright (nose +y); use rocketStyleNE for the NE diagonal pass.
 */

type V2 = readonly [number, number];
type Seg = readonly [V2, V2];

const clamp = (x: number, lo: number, hi: number) =>
	Math.min(hi, Math.max(lo, x));

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

function rotateSegs(segs: Seg[], ang: number): Seg[] {
	const c = Math.cos(ang);
	const s = Math.sin(ang);
	return segs.map(([a, b]) => [
		[a[0] * c - a[1] * s, a[0] * s + a[1] * c] as V2,
		[b[0] * c - b[1] * s, b[0] * s + b[1] * c] as V2,
	]);
}

export type RocketStyleId =
	| "classic"
	| "heavy"
	| "needle"
	| "shuttle"
	| "ufo"
	| "xwing"
	| "saturn"
	| "satellite"
	| "meteor";

export const ROCKET_STYLE_OPTIONS: {
	id: RocketStyleId;
	label: string;
}[] = [
	{ id: "classic", label: "Classic" },
	{ id: "heavy", label: "Heavy lifter" },
	{ id: "needle", label: "Needle" },
	{ id: "shuttle", label: "Shuttle" },
	{ id: "ufo", label: "UFO" },
	{ id: "xwing", label: "Starfighter" },
	{ id: "saturn", label: "Saturn stack" },
	{ id: "satellite", label: "Satellite" },
	{ id: "meteor", label: "Meteor" },
];

/** Classic pencil rocket (matches existing Anim rocket). */
export function rocketClassicAt(t: number, moving: number): Seg[] {
	const sway = Math.sin(t * 3) * 0.01 * clamp(moving, 0, 1);
	return [
		[[0.0 + sway, -0.55], [0.0 + sway, 0.45]],
		[[-0.16 + sway, -0.45], [-0.16 + sway, 0.32]],
		[[0.16 + sway, -0.45], [0.16 + sway, 0.32]],
		[[-0.16 + sway, -0.45], [0.16 + sway, -0.45]],
		[[-0.16 + sway, 0.32], [0.16 + sway, 0.32]],
		[[-0.16 + sway, 0.32], [0.0 + sway, 0.7]],
		[[0.16 + sway, 0.32], [0.0 + sway, 0.7]],
		[[-0.07 + sway, 0.08], [0.07 + sway, 0.08]],
		[[-0.07 + sway, 0.08], [-0.07 + sway, 0.2]],
		[[0.07 + sway, 0.08], [0.07 + sway, 0.2]],
		[[-0.07 + sway, 0.2], [0.07 + sway, 0.2]],
		[[-0.16 + sway, -0.32], [-0.38 + sway, -0.52]],
		[[0.16 + sway, -0.32], [0.38 + sway, -0.52]],
	];
}

/** Fat booster — wide tanks, chunky fins, engine bells. */
export function rocketHeavyAt(t: number, moving: number): Seg[] {
	const sway = Math.sin(t * 2.4) * 0.012 * clamp(moving, 0, 1);
	const x = sway;
	return [
		// Core body
		[[-0.22 + x, -0.5], [-0.22 + x, 0.28]],
		[[0.22 + x, -0.5], [0.22 + x, 0.28]],
		[[-0.22 + x, -0.5], [0.22 + x, -0.5]],
		[[-0.22 + x, 0.28], [0.22 + x, 0.28]],
		// Nose
		[[-0.22 + x, 0.28], [0 + x, 0.62]],
		[[0.22 + x, 0.28], [0 + x, 0.62]],
		// Side boosters
		[[-0.38 + x, -0.48], [-0.38 + x, 0.12]],
		[[-0.28 + x, -0.48], [-0.28 + x, 0.12]],
		[[-0.38 + x, -0.48], [-0.28 + x, -0.48]],
		[[-0.38 + x, 0.12], [-0.28 + x, 0.12]],
		[[0.28 + x, -0.48], [0.28 + x, 0.12]],
		[[0.38 + x, -0.48], [0.38 + x, 0.12]],
		[[0.28 + x, -0.48], [0.38 + x, -0.48]],
		[[0.28 + x, 0.12], [0.38 + x, 0.12]],
		// Fins
		[[-0.22 + x, -0.35], [-0.48 + x, -0.58]],
		[[0.22 + x, -0.35], [0.48 + x, -0.58]],
		// Engine bells
		[[-0.12 + x, -0.5], [-0.18 + x, -0.68]],
		[[-0.12 + x, -0.5], [-0.06 + x, -0.68]],
		[[0.12 + x, -0.5], [0.06 + x, -0.68]],
		[[0.12 + x, -0.5], [0.18 + x, -0.68]],
		[[0 + x, -0.5], [-0.05 + x, -0.72]],
		[[0 + x, -0.5], [0.05 + x, -0.72]],
	];
}

/** Slim sounding / probe rocket. */
export function rocketNeedleAt(t: number, moving: number): Seg[] {
	const sway = Math.sin(t * 3.5) * 0.008 * clamp(moving, 0, 1);
	const x = sway;
	return [
		[[-0.07 + x, -0.55], [-0.07 + x, 0.35]],
		[[0.07 + x, -0.55], [0.07 + x, 0.35]],
		[[-0.07 + x, -0.55], [0.07 + x, -0.55]],
		[[-0.07 + x, 0.35], [0 + x, 0.78]],
		[[0.07 + x, 0.35], [0 + x, 0.78]],
		// Tiny fins
		[[-0.07 + x, -0.4], [-0.22 + x, -0.58]],
		[[0.07 + x, -0.4], [0.22 + x, -0.58]],
		// Antenna
		[[0 + x, 0.78], [0 + x, 0.92]],
		[[-0.04 + x, 0.88], [0.04 + x, 0.88]],
		// Engine
		[[-0.04 + x, -0.55], [0 + x, -0.7]],
		[[0.04 + x, -0.55], [0 + x, -0.7]],
	];
}

/** Shuttle-ish orbiter with wings + tank. */
export function rocketShuttleAt(t: number, moving: number): Seg[] {
	const sway = Math.sin(t * 2.6) * 0.01 * clamp(moving, 0, 1);
	const x = sway;
	return [
		// Fuselage
		[[-0.12 + x, -0.35], [-0.12 + x, 0.4]],
		[[0.12 + x, -0.35], [0.12 + x, 0.4]],
		[[-0.12 + x, -0.35], [0.12 + x, -0.35]],
		[[-0.12 + x, 0.4], [0 + x, 0.62]],
		[[0.12 + x, 0.4], [0 + x, 0.62]],
		// Cockpit
		[[-0.08 + x, 0.28], [0.08 + x, 0.28]],
		[[-0.08 + x, 0.28], [-0.08 + x, 0.4]],
		[[0.08 + x, 0.28], [0.08 + x, 0.4]],
		// Wings
		[[-0.12 + x, -0.05], [-0.55 + x, -0.28]],
		[[-0.12 + x, -0.2], [-0.5 + x, -0.38]],
		[[-0.55 + x, -0.28], [-0.5 + x, -0.38]],
		[[0.12 + x, -0.05], [0.55 + x, -0.28]],
		[[0.12 + x, -0.2], [0.5 + x, -0.38]],
		[[0.55 + x, -0.28], [0.5 + x, -0.38]],
		// Vertical stabilizer
		[[0 + x, 0.05], [0 + x, 0.42]],
		[[0 + x, 0.42], [-0.1 + x, 0.22]],
		// Engines
		[[-0.08 + x, -0.35], [-0.14 + x, -0.55]],
		[[-0.02 + x, -0.35], [-0.02 + x, -0.55]],
		[[0.08 + x, -0.35], [0.14 + x, -0.55]],
		[[0.02 + x, -0.35], [0.02 + x, -0.55]],
	];
}

/** Saucer UFO with dome + rim lights. */
export function rocketUfoAt(t: number, moving: number): Seg[] {
	const sway = Math.sin(t * 2.2) * 0.015 * clamp(moving, 0, 1);
	const spin = t * 1.8;
	const x = sway;
	const rim = circleOutline(x, 0.05, 0.42, 16);
	const dome = circleOutline(x, 0.22, 0.18, 10);
	const lights: Seg[] = [];
	for (let i = 0; i < 6; i++) {
		const a = spin + (i / 6) * Math.PI * 2;
		const lx = x + Math.cos(a) * 0.34;
		const ly = 0.05 + Math.sin(a) * 0.12;
		lights.push([
			[lx - 0.03, ly],
			[lx + 0.03, ly],
		]);
	}
	return [
		...rim,
		...dome,
		// Cabin cross
		[[-0.08 + x, 0.22], [0.08 + x, 0.22]],
		[[x, 0.14], [x, 0.3]],
		// Landing studs / beam
		[[-0.2 + x, -0.08], [-0.26 + x, -0.28]],
		[[0.2 + x, -0.08], [0.26 + x, -0.28]],
		[[x, -0.08], [x, -0.32]],
		...lights,
	];
}

/** X-wing / starfighter silhouette. */
export function rocketXwingAt(t: number, moving: number): Seg[] {
	const sway = Math.sin(t * 3.1) * 0.01 * clamp(moving, 0, 1);
	const x = sway;
	return [
		// Nose / cockpit
		[[-0.08 + x, 0.15], [0 + x, 0.55]],
		[[0.08 + x, 0.15], [0 + x, 0.55]],
		[[-0.08 + x, 0.15], [0.08 + x, 0.15]],
		[[-0.06 + x, 0.25], [0.06 + x, 0.25]],
		// Body
		[[-0.1 + x, -0.25], [-0.1 + x, 0.15]],
		[[0.1 + x, -0.25], [0.1 + x, 0.15]],
		[[-0.1 + x, -0.25], [0.1 + x, -0.25]],
		// S-foils (X wings)
		[[-0.1 + x, 0.0], [-0.48 + x, 0.28]],
		[[-0.1 + x, -0.08], [-0.5 + x, -0.32]],
		[[0.1 + x, 0.0], [0.48 + x, 0.28]],
		[[0.1 + x, -0.08], [0.5 + x, -0.32]],
		// Wing cannons
		[[-0.48 + x, 0.28], [-0.55 + x, 0.34]],
		[[-0.5 + x, -0.32], [-0.57 + x, -0.38]],
		[[0.48 + x, 0.28], [0.55 + x, 0.34]],
		[[0.5 + x, -0.32], [0.57 + x, -0.38]],
		// Engines
		[[-0.06 + x, -0.25], [-0.1 + x, -0.48]],
		[[0.06 + x, -0.25], [0.1 + x, -0.48]],
		[[-0.02 + x, -0.25], [0.02 + x, -0.45]],
	];
}

/** Multi-stage stack with fuel tanks / banding. */
export function rocketSaturnAt(t: number, moving: number): Seg[] {
	const sway = Math.sin(t * 2.5) * 0.01 * clamp(moving, 0, 1);
	const x = sway;
	return [
		// Lower stage (wide)
		[[-0.2 + x, -0.55], [-0.2 + x, -0.05]],
		[[0.2 + x, -0.55], [0.2 + x, -0.05]],
		[[-0.2 + x, -0.55], [0.2 + x, -0.55]],
		[[-0.2 + x, -0.05], [0.2 + x, -0.05]],
		// Fuel band lines
		[[-0.2 + x, -0.4], [0.2 + x, -0.4]],
		[[-0.2 + x, -0.25], [0.2 + x, -0.25]],
		// Upper stage
		[[-0.14 + x, -0.05], [-0.14 + x, 0.32]],
		[[0.14 + x, -0.05], [0.14 + x, 0.32]],
		[[-0.14 + x, 0.32], [0.14 + x, 0.32]],
		[[-0.14 + x, 0.12], [0.14 + x, 0.12]],
		// Capsule / tower
		[[-0.09 + x, 0.32], [-0.09 + x, 0.48]],
		[[0.09 + x, 0.32], [0.09 + x, 0.48]],
		[[-0.09 + x, 0.48], [0 + x, 0.68]],
		[[0.09 + x, 0.48], [0 + x, 0.68]],
		[[0 + x, 0.68], [0 + x, 0.82]],
		// Fins
		[[-0.2 + x, -0.45], [-0.42 + x, -0.62]],
		[[0.2 + x, -0.45], [0.42 + x, -0.62]],
		// Engine cluster
		[[-0.1 + x, -0.55], [-0.14 + x, -0.72]],
		[[0 + x, -0.55], [0 + x, -0.75]],
		[[0.1 + x, -0.55], [0.14 + x, -0.72]],
	];
}

/** Box bus + solar wings + dish antenna. */
export function rocketSatelliteAt(t: number, moving: number): Seg[] {
	const sway = Math.sin(t * 2.1) * 0.01 * clamp(moving, 0, 1);
	const flap = Math.sin(t * 1.4) * 0.02 * clamp(moving, 0, 1);
	const x = sway;
	return [
		// Bus body
		[[-0.16 + x, -0.18], [-0.16 + x, 0.28]],
		[[0.16 + x, -0.18], [0.16 + x, 0.28]],
		[[-0.16 + x, -0.18], [0.16 + x, -0.18]],
		[[-0.16 + x, 0.28], [0.16 + x, 0.28]],
		[[-0.16 + x, 0.05], [0.16 + x, 0.05]],
		// Solar panel — left
		[[-0.16 + x, 0.02], [-0.58 + x, 0.02 + flap]],
		[[-0.16 + x, -0.08], [-0.58 + x, -0.08 + flap]],
		[[-0.58 + x, 0.02 + flap], [-0.58 + x, -0.08 + flap]],
		[[-0.37 + x, 0.02 + flap * 0.5], [-0.37 + x, -0.08 + flap * 0.5]],
		// Solar panel — right
		[[0.16 + x, 0.02], [0.58 + x, 0.02 - flap]],
		[[0.16 + x, -0.08], [0.58 + x, -0.08 - flap]],
		[[0.58 + x, 0.02 - flap], [0.58 + x, -0.08 - flap]],
		[[0.37 + x, 0.02 - flap * 0.5], [0.37 + x, -0.08 - flap * 0.5]],
		// Dish
		[[0 + x, 0.28], [0 + x, 0.42]],
		[[-0.14 + x, 0.42], [0.14 + x, 0.42]],
		[[-0.14 + x, 0.42], [-0.1 + x, 0.55]],
		[[0.14 + x, 0.42], [0.1 + x, 0.55]],
		[[-0.1 + x, 0.55], [0.1 + x, 0.55]],
		// Antenna tip
		[[0 + x, 0.55], [0 + x, 0.68]],
		[[-0.05 + x, 0.64], [0.05 + x, 0.64]],
		// Thruster
		[[-0.06 + x, -0.18], [0 + x, -0.38]],
		[[0.06 + x, -0.18], [0 + x, -0.38]],
	];
}

/** Slightly lumpy rock (not a perfect ball), nose toward +y. */
export function rocketMeteorAt(t: number, moving: number): Seg[] {
	const sway = Math.sin(t * 4.2) * 0.014 * clamp(moving, 0, 1);
	const x = sway;
	const cx = x;
	const cy = 0.08;
	const rx = 0.3;
	const ry = 0.26;
	const n = 12;
	const body: Seg[] = [];
	for (let i = 0; i < n; i++) {
		const a0 = (i / n) * Math.PI * 2;
		const a1 = ((i + 1) / n) * Math.PI * 2;
		// Mild radial bumps so it reads as rock, not a ball
		const bump0 = 1 + 0.08 * Math.sin(a0 * 3 + 0.4);
		const bump1 = 1 + 0.08 * Math.sin(a1 * 3 + 0.4);
		body.push([
			[cx + Math.cos(a0) * rx * bump0, cy + Math.sin(a0) * ry * bump0],
			[cx + Math.cos(a1) * rx * bump1, cy + Math.sin(a1) * ry * bump1],
		]);
	}
	return [
		...body,
		// Facet cracks
		[[-0.1 + x, 0.2], [0.12 + x, 0.14]],
		[[0.06 + x, 0.24], [-0.04 + x, -0.02]],
		[[-0.14 + x, 0.02], [0.08 + x, -0.06]],
		// Ember trail at −y
		[[-0.1 + x, -0.18], [-0.16 + x, -0.48]],
		[[0 + x, -0.2], [0 + x, -0.56]],
		[[0.1 + x, -0.18], [0.15 + x, -0.5]],
		[[-0.04 + x, -0.2], [-0.07 + x, -0.4]],
		[[0.05 + x, -0.2], [0.08 + x, -0.42]],
	];
}

export function rocketStyleUprightAt(
	id: RocketStyleId,
	t: number,
	moving = 1,
): Seg[] {
	switch (id) {
		case "heavy":
			return rocketHeavyAt(t, moving);
		case "needle":
			return rocketNeedleAt(t, moving);
		case "shuttle":
			return rocketShuttleAt(t, moving);
		case "ufo":
			return rocketUfoAt(t, moving);
		case "xwing":
			return rocketXwingAt(t, moving);
		case "saturn":
			return rocketSaturnAt(t, moving);
		case "satellite":
			return rocketSatelliteAt(t, moving);
		case "meteor":
			return rocketMeteorAt(t, moving);
		case "classic":
		default:
			return rocketClassicAt(t, moving);
	}
}

/** Same NE tilt as the existing name/moon flyby craft. */
export function rocketStyleNEAt(
	id: RocketStyleId,
	t: number,
	moving = 1,
): Seg[] {
	return rotateSegs(rocketStyleUprightAt(id, t, moving), -Math.PI / 4.2);
}

/** Per-craft palette (body + exhaust plume). */
export type RocketStyleLook = {
	craft: string;
	exhaust: string;
};

export const ROCKET_STYLE_LOOKS: Record<RocketStyleId, RocketStyleLook> = {
	classic: {
		craft: "rgba(255,255,255,0.96)",
		exhaust: "rgba(251,146,60,0.9)",
	},
	heavy: {
		craft: "rgba(252,165,165,0.95)",
		exhaust: "rgba(239,68,68,0.92)",
	},
	needle: {
		craft: "rgba(165,243,252,0.95)",
		exhaust: "rgba(34,211,238,0.88)",
	},
	shuttle: {
		craft: "rgba(186,230,253,0.95)",
		exhaust: "rgba(59,130,246,0.88)",
	},
	ufo: {
		craft: "rgba(167,243,208,0.95)",
		exhaust: "rgba(52,211,153,0.8)",
	},
	xwing: {
		craft: "rgba(253,186,116,0.95)",
		exhaust: "rgba(248,113,113,0.9)",
	},
	saturn: {
		craft: "rgba(253,224,71,0.95)",
		exhaust: "rgba(249,115,22,0.9)",
	},
	satellite: {
		craft: "rgba(191,219,254,0.95)",
		exhaust: "rgba(125,211,252,0.85)",
	},
	meteor: {
		craft: "rgba(168, 116, 72, 0.96)",
		exhaust: "rgba(217, 119, 56, 0.92)",
	},
};

export function rocketStyleLook(id: RocketStyleId): RocketStyleLook {
	return ROCKET_STYLE_LOOKS[id] ?? ROCKET_STYLE_LOOKS.classic;
}

/** Exhaust offset in craft-local upright space (nose +y); rotated with craft. */
function exhaustLocal(id: RocketStyleId): V2 {
	switch (id) {
		case "ufo":
			return [0, -0.32];
		case "heavy":
			return [0, -0.7];
		case "shuttle":
			return [0, -0.52];
		case "xwing":
			return [0, -0.45];
		case "saturn":
			return [0, -0.72];
		case "needle":
			return [0, -0.68];
		case "satellite":
			return [0, -0.36];
		case "meteor":
			return [0, -0.55];
		default:
			return [0, -0.52];
	}
}

type PathSample = { x: number; y: number };

/** Flight corridors — u goes 0→1 across the pass (world, y-up). */
const FLIGHT_PATHS: ((u: number) => PathSample)[] = [
	// Classic SW → NE
	(u) => ({ x: -2.05 + u * 4.35, y: -1.55 + u * 3.25 }),
	// NW → SE
	(u) => ({ x: -2.1 + u * 4.4, y: 1.45 - u * 3.15 }),
	// Bottom climb → top
	(u) => ({ x: -0.8 + u * 1.7, y: -1.9 + u * 3.9 }),
	// High dive SE
	(u) => ({ x: -1.6 + u * 3.6, y: 1.7 - u * 3.5 }),
	// NE → SW (reverse classic)
	(u) => ({ x: 2.3 - u * 4.35, y: 1.7 - u * 3.25 }),
	// SE → NW (reverse NW→SE)
	(u) => ({ x: 2.3 - u * 4.4, y: -1.7 + u * 3.15 }),
];

export const FLIGHT_PATH_COUNT = FLIGHT_PATHS.length;

export const FLIGHT_PATH_OPTIONS: { id: number; label: string }[] = [
	{ id: 0, label: "SW → NE (classic)" },
	{ id: 1, label: "NW → SE" },
	{ id: 2, label: "Climb up" },
	{ id: 3, label: "Dive SE" },
	{ id: 4, label: "NE → SW" },
	{ id: 5, label: "SE → NW" },
];

/** All silhouette-friendly corridors. */
export const DEFAULT_ENABLED_PATHS = [0, 1, 2, 3, 4, 5];

function pathHash(n: number): number {
	const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return s - Math.floor(s);
}

export function pickFlightPathIndex(
	seed: number,
	allowed?: readonly number[],
): number {
	const pool = (
		allowed && allowed.length > 0 ? [...allowed] : DEFAULT_ENABLED_PATHS
	).filter((id) => id >= 0 && id < FLIGHT_PATH_COUNT);
	const safe = pool.length > 0 ? pool : DEFAULT_ENABLED_PATHS;
	const pick = Math.floor(pathHash(seed + 0.37) * safe.length);
	return safe[pick % safe.length]!;
}

function samplePath(
	pathFn: (u: number) => PathSample,
	u: number,
): { x: number; y: number; heading: number } {
	const uu = clamp(u, 0, 1);
	const p = pathFn(uu);
	const eps = 0.012;
	const a = pathFn(clamp(uu - eps, 0, 1));
	const b = pathFn(clamp(uu + eps, 0, 1));
	const heading = Math.atan2(b.y - a.y, b.x - a.x);
	return { x: p.x, y: p.y, heading };
}

/**
 * Flat E/W headings lay the upright ASCII craft on its side (blob).
 * Pull shallow headings toward ~40° diagonals so the silhouette stays readable.
 */
function readableCraftHeading(heading: number): number {
	let h = heading;
	while (h > Math.PI) h -= Math.PI * 2;
	while (h < -Math.PI) h += Math.PI * 2;

	const minFromHoriz = Math.PI / 4.5; // ~40°
	let fromHoriz = Math.abs(h);
	if (fromHoriz > Math.PI / 2) fromHoriz = Math.PI - fromHoriz;
	if (fromHoriz >= minFromHoriz) return h;

	const goingRight = Math.cos(h) >= 0;
	const goingUp = Math.sin(h) >= 0;
	if (goingRight) return goingUp ? minFromHoriz : -minFromHoriz;
	return goingUp ? Math.PI - minFromHoriz : -(Math.PI - minFromHoriz);
}

function scaleSegs(segs: Seg[], s: number): Seg[] {
	return segs.map(([a, b]) => [
		[a[0] * s, a[1] * s] as V2,
		[b[0] * s, b[1] * s] as V2,
	]);
}

function translateSegs(segs: Seg[], dx: number, dy: number): Seg[] {
	return segs.map(([a, b]) => [
		[a[0] + dx, a[1] + dy] as V2,
		[b[0] + dx, b[1] + dy] as V2,
	]);
}

/**
 * Place a styled craft on a flight path.
 * pathIndex < 0 → randomize from seed (pass index).
 * Upright nose is +y; rotate by heading − π/2 so nose follows travel.
 */
export function styledRocketFlyby(
	t: number,
	fly01: number,
	style: RocketStyleId = "classic",
	pathIndex = -1,
	pathSeed = 0,
	opts?: { scale?: number; allowedPaths?: readonly number[] },
): {
	segs: Seg[];
	exhaustAt: V2 | null;
	exhaustDir: V2;
	rx: number;
	ry: number;
	pathIndex: number;
} {
	const emptyDir: V2 = [-Math.SQRT1_2, -Math.SQRT1_2];
	if (fly01 <= 0.02 || fly01 >= 0.97) {
		return {
			segs: [],
			exhaustAt: null,
			exhaustDir: emptyDir,
			rx: 0,
			ry: 0,
			pathIndex: 0,
		};
	}
	const pi =
		pathIndex >= 0
			? pathIndex % FLIGHT_PATH_COUNT
			: pickFlightPathIndex(pathSeed, opts?.allowedPaths);
	const sample = samplePath(FLIGHT_PATHS[pi]!, fly01);
	const rx = sample.x;
	const ry = sample.y;
	const base =
		opts?.scale ??
		(style === "ufo"
			? 0.38
			: style === "heavy"
				? 0.32
				: style === "satellite"
					? 0.36
					: style === "meteor"
						? 0.4
						: 0.34);
	// Nose (+y) → readable bank (not flat sideways on E/W)
	const craftHeading = readableCraftHeading(sample.heading);
	const ang = craftHeading - Math.PI / 2;
	const craft = translateSegs(
		rotateSegs(scaleSegs(rocketStyleUprightAt(style, t, 1), base), ang),
		rx,
		ry,
	);
	const el = exhaustLocal(style);
	const c = Math.cos(ang);
	const s = Math.sin(ang);
	const exhaustAt: V2 = [
		rx + (el[0] * c - el[1] * s) * base,
		ry + (el[0] * s + el[1] * c) * base,
	];
	// Plume trails the craft silhouette (same bank)
	const exhaustDir: V2 = [
		-Math.cos(craftHeading),
		-Math.sin(craftHeading),
	];
	return { segs: craft, exhaustAt, exhaustDir, rx, ry, pathIndex: pi };
}

/** @deprecated — fixed NE tilt; prefer styledRocketFlyby */
export function rocketStyleExhaustOffset(id: RocketStyleId): V2 {
	switch (id) {
		case "ufo":
			return [0.02, -0.12];
		case "heavy":
			return [-0.08, -0.22];
		case "shuttle":
			return [0, -0.18];
		case "xwing":
			return [0, -0.16];
		case "saturn":
			return [0, -0.2];
		case "needle":
			return [0, -0.18];
		case "satellite":
			return [0, -0.14];
		case "meteor":
			return [0, -0.2];
		default:
			return [-0.14, -0.14];
	}
}
