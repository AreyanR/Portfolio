"use client";

import { useEffect, useRef } from "react";

/**
 * Animation 1 — whale → monkey v2 → human → rocket → name.
 * (Portfolio :3002 uses this. Animation 2 is a separate component.)
 */

type V2 = readonly [number, number];
type Seg = readonly [V2, V2];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp2 = (a: V2, b: V2, t: number): V2 => [
	lerp(a[0], b[0], t),
	lerp(a[1], b[1], t),
];
const clamp = (x: number, lo: number, hi: number) =>
	Math.min(hi, Math.max(lo, x));
function smoothstep(e0: number, e1: number, x: number) {
	const t = clamp((x - e0) / (e1 - e0), 0, 1);
	return t * t * (3 - 2 * t);
}
function sdSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
	const pax = px - ax;
	const pay = py - ay;
	const bax = bx - ax;
	const bay = by - ay;
	const h = clamp((pax * bax + pay * bay) / (bax * bax + bay * bay || 1e-6), 0, 1);
	return Math.hypot(pax - bax * h, pay - bay * h);
}

const RAMP = " .:-=+*#%@";

type PoseFn = (t: number, moving: number) => Seg[];

/**
 * V2 whale — big almond body + horizontal fluke; same traveling-wave swim
 * that made the fish click, scaled for a cetacean silhouette.
 */
function whaleAt(t: number, moving: number): Seg[] {
	const m = clamp(moving, 0, 1);
	const phase = t * 5.4;
	const bob = Math.sin(t * 2.1) * 0.025 * m;
	const wNose = Math.sin(phase) * 0.015 * m;
	const wMid = Math.sin(phase - 0.65) * 0.05 * m;
	const wRear = Math.sin(phase - 1.3) * 0.09 * m;
	const wTail = Math.sin(phase - 1.95) * 0.13 * m;

	// Longer, deeper body than the fish
	const nose: V2 = [0.72, 0.02 + bob + wNose];
	const jaw: V2 = [0.55, -0.12 + bob + wNose];
	const topF: V2 = [0.4, 0.22 + bob + wNose * 0.5];
	const topM: V2 = [0.05, 0.28 + bob + wMid];
	const topR: V2 = [-0.32, 0.16 + bob + wRear * 0.6];
	const rear: V2 = [-0.48, 0.02 + bob + wRear];
	const botR: V2 = [-0.32, -0.14 + bob + wRear * 0.6];
	const botM: V2 = [0.05, -0.26 + bob + wMid];
	const botF: V2 = [0.4, -0.2 + bob + wNose * 0.5];

	// Horizontal fluke (whale, not fish fork) — swings as one piece
	const flukeC: V2 = [-0.58, 0.02 + bob + wTail];
	const flukeUp: V2 = [-0.78, 0.22 + bob + wTail];
	const flukeDn: V2 = [-0.78, -0.18 + bob + wTail];

	// Small dorsal hump
	const dorsal: V2 = [0.0, 0.4 + bob + wMid];
	// Eye + mouth line
	const eye: V2 = [0.5, 0.08 + bob + wNose];
	const pec: V2 = [0.15, -0.22 + bob + wMid];
	const pecTip: V2 = [0.05, -0.42 + bob + wMid * 0.5];

	return [
		[nose, topF],
		[topF, topM],
		[topM, topR],
		[topR, rear],
		[rear, botR],
		[botR, botM],
		[botM, botF],
		[botF, jaw],
		[jaw, nose],
		// fluke
		[rear, flukeC],
		[flukeC, flukeUp],
		[flukeC, flukeDn],
		[flukeUp, flukeDn],
		[topM, dorsal],
		[pec, pecTip],
		[eye, [eye[0] + 0.06, eye[1]] as V2],
	];
}

/**
 * V2 lizard — slithery mid-body wave; low ground-hugging steps (no hop).
 */
function lizardAt(t: number, moving: number): Seg[] {
	const m = clamp(moving, 0, 1);
	const step = t * 3.8;
	const bob = Math.sin(t * 2.2) * 0.012 * m;

	// Traveling S-curve through the torso (slither)
	const w0 = Math.sin(step) * 0.06 * m;
	const w1 = Math.sin(step - 0.55) * 0.09 * m;
	const w2 = Math.sin(step - 1.1) * 0.07 * m;

	const snout: V2 = [0.82, 0.1 + bob + w0 * 0.3];
	const jaw: V2 = [0.78, 0.0 + bob + w0 * 0.3];
	const neck: V2 = [0.62, 0.14 + bob + w0];
	const chest: V2 = [0.42, 0.06 + bob + w1 * 0.6];
	const mid: V2 = [0.14, 0.04 + bob + w1];
	const hip: V2 = [-0.14, 0.02 + bob + w2];
	const shoulder: V2 = [0.28, 0.05 + bob + w1 * 0.8];

	const tw = (lag: number) => Math.sin(step * 0.95 - lag) * 0.14 * m;
	const tail1: V2 = [-0.36, 0.04 + bob + tw(0.5)];
	const tail2: V2 = [-0.58, 0.1 + bob + tw(1.1)];
	const tail3: V2 = [-0.78, 0.2 + bob + tw(1.7)];
	const tail4: V2 = [-0.96, 0.32 + bob + tw(2.3)];

	/** Crawl step — clear plant / swing so hind legs actually stride. */
	function stepLeg(
		root: V2,
		phase: number,
		reach: number,
		liftMax: number,
		groundY: number,
	): Seg[] {
		const s = step + phase;
		const plant = Math.sin(s);
		const swing = Math.max(0, -Math.cos(s));
		const foot: V2 = [
			root[0] - plant * reach,
			groundY + swing * liftMax,
		];
		// Inline knee bend (jointOff lives below; keep lizard self-contained)
		const mx = root[0] + (foot[0] - root[0]) * 0.42;
		const my = root[1] + (foot[1] - root[1]) * 0.42;
		const dx = foot[0] - root[0];
		const dy = foot[1] - root[1];
		const len = Math.hypot(dx, dy) || 1;
		const amt = 0.1 + swing * 0.06;
		const knee: V2 = [mx - (dy / len) * amt, my + (dx / len) * amt];
		const toe: V2 = [foot[0] + 0.11, foot[1]];
		return [
			[root, knee],
			[knee, foot],
			[foot, toe],
		];
	}

	// Front / hind on opposite beats; hind gets real reach + lift
	const frontNear = stepLeg(shoulder, 0, 0.2, 0.08, -0.36);
	const frontFar = stepLeg(
		[shoulder[0] - 0.05, shoulder[1] + 0.02] as V2,
		Math.PI,
		0.18,
		0.07,
		-0.34,
	);
	const hindNear = stepLeg(hip, Math.PI, 0.22, 0.1, -0.36);
	const hindFar = stepLeg(
		[hip[0] - 0.05, hip[1] + 0.02] as V2,
		0,
		0.2,
		0.09,
		-0.34,
	);

	return [
		[hip, mid],
		[mid, shoulder],
		[shoulder, chest],
		[chest, neck],
		[neck, snout],
		[snout, jaw],
		[jaw, chest],
		[
			[0.66, 0.18 + bob + w0] as V2,
			[0.72, 0.18 + bob + w0] as V2,
		],
		[hip, tail1],
		[tail1, tail2],
		[tail2, tail3],
		[tail3, tail4],
		...frontNear,
		...frontFar,
		...hindNear,
		...hindFar,
	];
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

function rotate2(p: V2, ang: number): V2 {
	const c = Math.cos(ang);
	const s = Math.sin(ang);
	return [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
}

function rotateSegs(segs: Seg[], ang: number): Seg[] {
	return segs.map(([a, b]) => [rotate2(a, ang), rotate2(b, ang)]);
}

function jointOff(a: V2, b: V2, tAlong: number, amount: number): V2 {
	const mx = lerp(a[0], b[0], tAlong);
	const my = lerp(a[1], b[1], tAlong);
	const dx = b[0] - a[0];
	const dy = b[1] - a[1];
	const len = Math.hypot(dx, dy) || 1;
	return [mx - (dy / len) * amount, my + (dx / len) * amount];
}

/**
 * V3 monkey — compact chimp, four limbs, arched tail.
 * Gait: bound/gallop (front pair together, hind pair together) — not a trot.
 * To revert to trot, use opposite phases between L/R again (s vs s2 ≈ +0.85π).
 */
function monkeyAt(t: number, moving: number): Seg[] {
	const m = clamp(moving, 0, 1);
	const step = t * 5.2;
	// Bound: one phase for both arms, opposite phase for both legs
	const front = Math.sin(step);
	const hind = Math.sin(step + Math.PI);
	const frontLift = Math.max(0, -Math.cos(step));
	const hindLift = Math.max(0, -Math.cos(step + Math.PI));
	// Extra hop when the body gathers between pair strikes
	const bob =
		(Math.abs(Math.sin(step)) * 0.028 + frontLift * 0.012) * m;

	const hip: V2 = [-0.08, 0.02 + bob];
	const belly: V2 = [0.1, 0.1 + bob];
	const shoulder: V2 = [0.28, 0.18 + bob];

	const headC: V2 = [0.48, 0.42 + bob];
	const headR = 0.16;
	const snout: V2 = [0.66, 0.34 + bob];

	// Both front hands plant / swing together (tiny near/far offset only)
	const handA: V2 = [0.3 - front * 0.22, -0.38 + frontLift * 0.14];
	const elbowA = jointOff(shoulder, handA, 0.45, -0.12);
	const handB: V2 = [0.14 - front * 0.2, -0.36 + frontLift * 0.12];
	const elbowB = jointOff(
		[shoulder[0] - 0.06, shoulder[1]] as V2,
		handB,
		0.45,
		-0.11,
	);

	// Both hind feet together, opposite the arms
	const footA: V2 = [-0.24 + hind * 0.18, -0.38 + hindLift * 0.12];
	const kneeA = jointOff(hip, footA, 0.4, 0.11);
	const footB: V2 = [-0.08 + hind * 0.16, -0.36 + hindLift * 0.1];
	const kneeB = jointOff([hip[0] + 0.05, hip[1]] as V2, footB, 0.4, 0.1);

	const tw = Math.sin(step * 0.9) * 0.06 * m;
	const tail1: V2 = [-0.22, 0.12 + bob];
	const tail2: V2 = [-0.4, 0.28 + bob + tw];
	const tail3: V2 = [-0.48, 0.48 + bob + tw * 1.2];

	return [
		[hip, belly],
		[belly, shoulder],
		[shoulder, [headC[0] - 0.08, headC[1] - 0.12] as V2],
		...circleOutline(headC[0], headC[1], headR, 12),
		[
			[headC[0] + 0.1, headC[1] - 0.04] as V2,
			snout,
		],
		[
			snout,
			[headC[0] + 0.08, headC[1] - 0.1] as V2,
		],
		[
			[headC[0] + 0.04, headC[1] + 0.04] as V2,
			[headC[0] + 0.1, headC[1] + 0.04] as V2,
		],
		[shoulder, elbowA],
		[elbowA, handA],
		[handA, [handA[0] + 0.07, handA[1]] as V2],
		[[shoulder[0] - 0.06, shoulder[1]] as V2, elbowB],
		[elbowB, handB],
		[handB, [handB[0] + 0.06, handB[1]] as V2],
		[hip, kneeA],
		[kneeA, footA],
		[footA, [footA[0] + 0.07, footA[1]] as V2],
		[[hip[0] + 0.05, hip[1]] as V2, kneeB],
		[kneeB, footB],
		[footB, [footB[0] + 0.06, footB[1]] as V2],
		[hip, tail1],
		[tail1, tail2],
		[tail2, tail3],
	];
}

/**
 * Monkey V2 — lab hybrid: lizard’s long S-body + whipping tail,
 * monkey’s round head and long-armed bound. Hold it in the lab to compare.
 */
export function monkeyV2At(t: number, moving: number): Seg[] {
	const m = clamp(moving, 0, 1);
	const step = t * 4.6;
	const bob = Math.sin(t * 2.4) * 0.014 * m;

	// Lizard-style traveling wave through a longer torso
	const w0 = Math.sin(step) * 0.05 * m;
	const w1 = Math.sin(step - 0.5) * 0.08 * m;
	const w2 = Math.sin(step - 1.05) * 0.06 * m;

	const hip: V2 = [-0.2, 0.0 + bob + w2];
	const mid: V2 = [0.06, 0.06 + bob + w1];
	const belly: V2 = [0.22, 0.12 + bob + w1 * 0.7];
	const shoulder: V2 = [0.38, 0.2 + bob + w0];

	// Monkey head on the lizard-leaning body
	const headC: V2 = [0.56, 0.4 + bob + w0 * 0.4];
	const headR = 0.15;
	const snout: V2 = [0.72, 0.32 + bob + w0 * 0.3];

	// Bound gait (monkey) — front pair together, hind opposite
	const front = Math.sin(step);
	const hind = Math.sin(step + Math.PI);
	const frontLift = Math.max(0, -Math.cos(step));
	const hindLift = Math.max(0, -Math.cos(step + Math.PI));

	// Long monkey arms reaching forward/down
	const handA: V2 = [
		0.42 - front * 0.24,
		-0.4 + frontLift * 0.15 + bob * 0.3,
	];
	const elbowA = jointOff(shoulder, handA, 0.42, -0.13);
	const handB: V2 = [
		0.26 - front * 0.22,
		-0.38 + frontLift * 0.13 + bob * 0.3,
	];
	const elbowB = jointOff(
		[shoulder[0] - 0.07, shoulder[1] - 0.02] as V2,
		handB,
		0.42,
		-0.12,
	);

	// Hind legs — lizard crawl reach with monkey knees
	const footA: V2 = [
		-0.32 + hind * 0.2,
		-0.38 + hindLift * 0.11 + bob * 0.2,
	];
	const kneeA = jointOff(hip, footA, 0.4, 0.1);
	const footB: V2 = [
		-0.14 + hind * 0.18,
		-0.36 + hindLift * 0.1 + bob * 0.2,
	];
	const kneeB = jointOff([hip[0] + 0.06, hip[1]] as V2, footB, 0.4, 0.09);

	// Long lizard whipping tail (4 segments)
	const tw = (lag: number) => Math.sin(step * 0.95 - lag) * 0.13 * m;
	const tail1: V2 = [-0.4, 0.06 + bob + tw(0.4)];
	const tail2: V2 = [-0.62, 0.14 + bob + tw(1.0)];
	const tail3: V2 = [-0.82, 0.26 + bob + tw(1.6)];
	const tail4: V2 = [-0.98, 0.4 + bob + tw(2.2)];

	return [
		[hip, mid],
		[mid, belly],
		[belly, shoulder],
		[shoulder, [headC[0] - 0.08, headC[1] - 0.12] as V2],
		...circleOutline(headC[0], headC[1], headR, 12),
		[
			[headC[0] + 0.1, headC[1] - 0.04] as V2,
			snout,
		],
		[
			snout,
			[headC[0] + 0.08, headC[1] - 0.1] as V2,
		],
		[
			[headC[0] + 0.04, headC[1] + 0.04] as V2,
			[headC[0] + 0.1, headC[1] + 0.04] as V2,
		],
		[shoulder, elbowA],
		[elbowA, handA],
		[handA, [handA[0] + 0.07, handA[1]] as V2],
		[[shoulder[0] - 0.07, shoulder[1] - 0.02] as V2, elbowB],
		[elbowB, handB],
		[handB, [handB[0] + 0.06, handB[1]] as V2],
		[hip, kneeA],
		[kneeA, footA],
		[footA, [footA[0] + 0.08, footA[1]] as V2],
		[[hip[0] + 0.06, hip[1]] as V2, kneeB],
		[kneeB, footB],
		[footB, [footB[0] + 0.07, footB[1]] as V2],
		[hip, tail1],
		[tail1, tail2],
		[tail2, tail3],
		[tail3, tail4],
	];
}

/** Original walk cycle — used in the main Anim 1 loop. */
export function humanAt(t: number, moving: number): Seg[] {
	const m = clamp(moving, 0, 1);
	const step = t * 4.0;
	const bob = Math.abs(Math.sin(step)) * 0.02 * m;
	const s = Math.sin(step);
	const c = Math.cos(step);
	const swing = Math.max(0, -c);

	const hipY = -0.06 + bob;
	const shY = 0.34 + bob;

	const nearHip: V2 = [0.04, hipY];
	const farHip: V2 = [-0.04, hipY];
	const nearFoot: V2 = [-s * 0.34 + 0.05, -0.78 + swing * 0.1];
	const farFoot: V2 = [s * 0.34 - 0.05, -0.78 + (1 - swing) * 0.1];
	const nearToe: V2 = [nearFoot[0] + 0.11, nearFoot[1]];
	const farToe: V2 = [farFoot[0] + 0.11, farFoot[1]];

	const nearKnee = jointOff(nearHip, nearFoot, 0.42, 0.12 + swing * 0.04);
	const farKnee = jointOff(farHip, farFoot, 0.42, 0.12 + (1 - swing) * 0.04);

	const nearShoulder: V2 = [0.05, shY];
	const farShoulder: V2 = [-0.05, shY];
	const nearHand: V2 = [s * 0.36 + 0.06, 0.02 + bob];
	const farHand: V2 = [-s * 0.3 - 0.1, 0.06 + bob];
	const nearElbow = jointOff(nearShoulder, nearHand, 0.45, -0.1);
	const farElbow = jointOff(farShoulder, farHand, 0.45, -0.08);

	const headC: V2 = [0.05, 0.62 + bob];
	const pelvis: V2 = [0.0, hipY];
	const chest: V2 = [0.0, 0.22 + bob];
	const neck: V2 = [0.04, 0.44 + bob];

	return [
		[pelvis, chest],
		[chest, [0.0, shY] as V2],
		[[0.0, shY] as V2, neck],
		...circleOutline(headC[0], headC[1], 0.115, 10),
		[nearHip, nearKnee],
		[nearKnee, nearFoot],
		[nearFoot, nearToe],
		[farHip, farKnee],
		[farKnee, farFoot],
		[farFoot, farToe],
		[nearShoulder, nearElbow],
		[nearElbow, nearHand],
		[farShoulder, farElbow],
		[farElbow, farHand],
	];
}

/** Lab-only slow-mo run — not in the main loop. */
export function runningAt(t: number, moving: number): Seg[] {
	const m = clamp(moving, 0, 1);
	const run = 0.85;
	const cadence = 1.45;
	const step = t * cadence;
	const bob = Math.abs(Math.sin(step)) * 0.032 * m;
	const s = Math.sin(step);
	const c = Math.cos(step);
	const nearLift = Math.max(0, c);
	const farLift = Math.max(0, -c);

	const lean = run * 0.16;
	const hipY = -0.06 + bob;
	const shY = 0.34 + bob - run * 0.035;

	const nearHip: V2 = [0.04 + lean * 0.25, hipY];
	const farHip: V2 = [-0.04 + lean * 0.25, hipY];

	const stride = 0.48;
	const kneeLift = 0.18;
	const nearFoot: V2 = [
		s * stride + 0.04 + lean * 0.55,
		-0.78 + nearLift * kneeLift,
	];
	const farFoot: V2 = [
		-s * stride - 0.04 + lean * 0.55,
		-0.78 + farLift * kneeLift,
	];
	const nearToe: V2 = [nearFoot[0] + 0.13, nearFoot[1]];
	const farToe: V2 = [farFoot[0] + 0.13, farFoot[1]];

	const nearKnee = jointOff(
		nearHip,
		nearFoot,
		0.38,
		0.18 + nearLift * 0.07,
	);
	const farKnee = jointOff(
		farHip,
		farFoot,
		0.38,
		0.18 + farLift * 0.07,
	);

	const nearShoulder: V2 = [0.05 + lean * 1.05, shY];
	const farShoulder: V2 = [-0.05 + lean * 1.05, shY];
	// Higher arm carry — more "in it", less sluggish hang
	const armAmp = 0.38;
	const armDrop = 0.12;
	const nearHand: V2 = [
		-s * armAmp + 0.04 + lean,
		armDrop + bob + Math.abs(s) * 0.06,
	];
	const farHand: V2 = [
		s * armAmp - 0.06 + lean,
		armDrop + 0.04 + bob + Math.abs(s) * 0.05,
	];
	const nearElbow = jointOff(nearShoulder, nearHand, 0.38, -0.18);
	const farElbow = jointOff(farShoulder, farHand, 0.38, -0.16);

	const headC: V2 = [0.05 + lean * 1.7, 0.62 + bob - run * 0.045];
	const pelvis: V2 = [lean * 0.45, hipY];
	const chest: V2 = [lean * 1.15, 0.22 + bob - run * 0.02];
	const neck: V2 = [0.04 + lean * 1.45, 0.44 + bob - run * 0.025];

	return [
		[pelvis, chest],
		[chest, [lean * 1.1, shY] as V2],
		[[lean * 1.1, shY] as V2, neck],
		...circleOutline(headC[0], headC[1], 0.115, 10),
		[nearHip, nearKnee],
		[nearKnee, nearFoot],
		[nearFoot, nearToe],
		[farHip, farKnee],
		[farKnee, farFoot],
		[farFoot, farToe],
		[nearShoulder, nearElbow],
		[nearElbow, nearHand],
		[farShoulder, farElbow],
		[farElbow, farHand],
	];
}

/**
 * Side-view hatchback / sedan — long hood, raked windshield, cabin, trunk,
 * round tires. Reads as a car, not a rover.
 */
function carAt(t: number, moving: number): Seg[] {
	const m = clamp(moving, 0, 1);
	const spin = t * 10 * m;
	const y = Math.sin(t * 14) * 0.005 * m;

	function tire(cx: number, cy: number): Seg[] {
		const r = 0.15;
		const hub = 0.05;
		const a0 = spin;
		return [
			...circleOutline(cx, cy, r, 10),
			...circleOutline(cx, cy, hub, 6),
			[
				[cx + Math.cos(a0) * r * 0.85, cy + Math.sin(a0) * r * 0.85],
				[cx - Math.cos(a0) * r * 0.85, cy - Math.sin(a0) * r * 0.85],
			],
		];
	}

	// Ground line of body sits just above tire tops
	const bl = -0.12 + y; // body lower
	const wl = 0.08 + y; // waist / beltline
	const rt = 0.36 + y; // roof

	return [
		// undercarriage / rocker (bumper to bumper)
		[[-0.62, bl] as V2, [0.7, bl] as V2],
		// rear bumper up
		[[-0.62, bl] as V2, [-0.68, -0.02 + y] as V2],
		[[-0.68, -0.02 + y] as V2, [-0.55, wl] as V2],
		// trunk → C-pillar → roof
		[[-0.55, wl] as V2, [-0.28, wl] as V2],
		[[-0.28, wl] as V2, [-0.18, rt] as V2],
		[[-0.18, rt] as V2, [0.2, rt] as V2],
		// A-pillar / windshield rake
		[[0.2, rt] as V2, [0.42, wl] as V2],
		// hood
		[[0.42, wl] as V2, [0.72, 0.02 + y] as V2],
		// nose / grille
		[[0.72, 0.02 + y] as V2, [0.78, -0.04 + y] as V2],
		[[0.78, -0.04 + y] as V2, [0.7, bl] as V2],
		// beltline through doors
		[[-0.28, wl] as V2, [0.42, wl] as V2],
		// side window
		[[-0.12, 0.14 + y] as V2, [0.28, 0.14 + y] as V2],
		[[0.28, 0.14 + y] as V2, [0.14, 0.32 + y] as V2],
		[[-0.1, 0.32 + y] as V2, [0.14, 0.32 + y] as V2],
		[[-0.12, 0.14 + y] as V2, [-0.1, 0.32 + y] as V2],
		// door seam
		[[0.05, bl] as V2, [0.05, wl] as V2],
		// headlight
		[[0.7, 0.0 + y] as V2, [0.76, 0.0 + y] as V2],
		// wheels well clear of body
		...tire(-0.34, -0.28 + y),
		...tire(0.4, -0.28 + y),
	];
}

export function rocketAt(t: number, moving: number): Seg[] {
	const sway = Math.sin(t * 3) * 0.01 * clamp(moving, 0, 1);
	// Built pointing up, then tipped toward northeast (~40°).
	const upright: Seg[] = [
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
	return rotateSegs(upright, -Math.PI / 4.2);
}

export function scaleSegs(segs: Seg[], s: number): Seg[] {
	return segs.map(([a, b]) => [
		[a[0] * s, a[1] * s] as V2,
		[b[0] * s, b[1] * s] as V2,
	]);
}

/** Centered moon disc — modest size. */
function moonDisc(): Seg[] {
	const moonC: V2 = [0, 0];
	const R = 0.52;
	return [
		...circleOutline(moonC[0], moonC[1], R, 28),
		...circleOutline(moonC[0] - 0.16, moonC[1] + 0.12, 0.09, 8),
		...circleOutline(moonC[0] + 0.18, moonC[1] - 0.1, 0.07, 7),
		...circleOutline(moonC[0] + 0.02, moonC[1] + 0.22, 0.05, 6),
	];
}

/** Exact NE fly path shared by moon + name finales. */
function rocketFlyby(
	t: number,
	fly01: number,
): { segs: Seg[]; exhaustAt: V2 | null; rx: number; ry: number } {
	// Fully off-screen before hide — no leftover rocket at cut
	if (fly01 <= 0.02 || fly01 >= 0.97) {
		return { segs: [], exhaustAt: null, rx: 0, ry: 0 };
	}
	const rx = -2.05 + fly01 * 4.35;
	const ry = -1.55 + fly01 * 3.25;
	const rocket = translateSegs(scaleSegs(rocketAt(t, 1), 0.34), rx, ry);
	const exhaustAt: V2 = [rx - 0.14, ry - 0.14];
	return { segs: rocket, exhaustAt, rx, ry };
}

/** Same fly timing for moon + name: in immediately, fully gone by ~88%. */
export function flyProgress(p: number): number {
	if (p >= 0.88) return 1;
	return clamp(0.05 + (p / 0.88) * 0.95, 0, 1);
}

/**
 * Moon + optional rocket flyby.
 * fly01 < 0 → hold-loop; else 0 off SW → 1 off NE (same path as name).
 */
function moonScene(
	t: number,
	moving: number,
	fly01 = -1,
): { segs: Seg[]; exhaustAt: V2 | null } {
	const segs = moonDisc();
	let fly = fly01;
	if (fly < 0) {
		const cyc = ((t * 0.28 * Math.max(0.35, moving)) % 1 + 1) % 1;
		if (cyc < 0.06 || cyc > 0.82) return { segs, exhaustAt: null };
		fly = (cyc - 0.06) / 0.76;
	}
	const flyby = rocketFlyby(t, fly);
	return { segs: [...segs, ...flyby.segs], exhaustAt: flyby.exhaustAt };
}

function moonAt(t: number, moving: number, fly01 = -1): Seg[] {
	return moonScene(t, moving, fly01).segs;
}

/** Stroke glyphs — one weight everywhere (no bitmap thick-bar / thin-stem mix). */
function glyphSegs(ch: string): Seg[] {
	const L = (pts: V2[]): Seg[] => {
		const out: Seg[] = [];
		for (let i = 0; i < pts.length - 1; i++) {
			out.push([pts[i]!, pts[i + 1]!]);
		}
		return out;
	};
	switch (ch.toUpperCase()) {
		case "A":
			return [
				...L([
					[0.06, 0],
					[0.5, 1],
					[0.94, 0],
				]),
				...L([
					[0.26, 0.36],
					[0.74, 0.36],
				]),
			];
		case "R":
			return [
				...L([
					[0.12, 0],
					[0.12, 1],
				]),
				...L([
					[0.12, 1],
					[0.7, 1],
					[0.88, 0.84],
					[0.88, 0.58],
					[0.7, 0.42],
					[0.12, 0.42],
				]),
				...L([
					[0.45, 0.42],
					[0.9, 0],
				]),
			];
		case "E":
			return [
				...L([
					[0.14, 0],
					[0.14, 1],
				]),
				...L([
					[0.14, 1],
					[0.9, 1],
				]),
				...L([
					[0.14, 0.5],
					[0.78, 0.5],
				]),
				...L([
					[0.14, 0],
					[0.9, 0],
				]),
			];
		case "Y":
			return [
				...L([
					[0.06, 1],
					[0.5, 0.48],
					[0.94, 1],
				]),
				...L([
					[0.5, 0.48],
					[0.5, 0],
				]),
			];
		case "N":
			return [
				...L([
					[0.12, 0],
					[0.12, 1],
				]),
				...L([
					[0.12, 1],
					[0.88, 0],
				]),
				...L([
					[0.88, 0],
					[0.88, 1],
				]),
			];
		case "S":
			return [
				...L([
					[0.86, 0.82],
					[0.72, 1],
					[0.28, 1],
					[0.12, 0.82],
					[0.12, 0.62],
					[0.28, 0.5],
					[0.72, 0.5],
					[0.88, 0.38],
					[0.88, 0.18],
					[0.72, 0],
					[0.28, 0],
					[0.12, 0.18],
				]),
			];
		case "T":
			return [
				...L([
					[0.06, 1],
					[0.94, 1],
				]),
				...L([
					[0.5, 1],
					[0.5, 0],
				]),
			];
		case "W":
			return [
				...L([
					[0.02, 1],
					[0.2, 0],
				]),
				...L([
					[0.2, 0],
					[0.5, 0.58],
				]),
				...L([
					[0.5, 0.58],
					[0.8, 0],
				]),
				...L([
					[0.8, 0],
					[0.98, 1],
				]),
			];
		case "I":
			return [
				...L([
					[0.25, 1],
					[0.75, 1],
				]),
				...L([
					[0.5, 1],
					[0.5, 0],
				]),
				...L([
					[0.25, 0],
					[0.75, 0],
				]),
			];
		case "O":
			return [
				...L([
					[0.3, 1],
					[0.7, 1],
					[0.9, 0.75],
					[0.9, 0.25],
					[0.7, 0],
					[0.3, 0],
					[0.1, 0.25],
					[0.1, 0.75],
					[0.3, 1],
				]),
			];
		default:
			return [];
	}
}

const NAME_LINE1 = "AREYAN";
const NAME_LINE2 = "RASTAWAN";

type NameSlot = {
	ch: string;
	cx: number;
	cy: number;
	w: number;
	h: number;
};

function nameSlots(): NameSlot[] {
	// Same letter height on both lines → even stroke weight (AREYAN was taller/thinner)
	const lines = [
		{ text: NAME_LINE1, cy: 0.34, w: 0.3, h: 0.52, gap: 0.085 },
		{ text: NAME_LINE2, cy: -0.36, w: 0.25, h: 0.52, gap: 0.065 },
	];
	const slots: NameSlot[] = [];
	for (const line of lines) {
		const n = line.text.length;
		const total = n * line.w + Math.max(0, n - 1) * line.gap;
		let x0 = -total / 2;
		for (let i = 0; i < n; i++) {
			slots.push({
				ch: line.text[i]!,
				cx: x0 + line.w * 0.5,
				cy: line.cy,
				w: line.w,
				h: line.h,
			});
			x0 += line.w + line.gap;
		}
	}
	return slots;
}

function fattenSegs(segs: Seg[], half: number): Seg[] {
	const out: Seg[] = [];
	for (const [a, b] of segs) {
		const dx = b[0] - a[0];
		const dy = b[1] - a[1];
		const len = Math.hypot(dx, dy) || 1;
		const nx = (-dy / len) * half;
		const ny = (dx / len) * half;
		out.push(
			[
				[a[0] + nx, a[1] + ny] as V2,
				[b[0] + nx, b[1] + ny] as V2,
			],
			[
				[a[0] - nx, a[1] - ny] as V2,
				[b[0] - nx, b[1] - ny] as V2,
			],
			[a, b],
		);
	}
	return out;
}

function letterAtSlot(slot: NameSlot, strokeFrac = 1): Seg[] {
	const g = glyphSegs(slot.ch);
	const f = clamp(strokeFrac, 0, 1);
	if (f <= 0.001) return [];
	const mapPt = (p: V2): V2 =>
		[
			slot.cx + (p[0] - 0.5) * slot.w,
			slot.cy + (p[1] - 0.5) * slot.h,
		] as V2;
	const exact = f * g.length;
	const full = Math.floor(exact);
	const rem = exact - full;
	const mapped: Seg[] = [];
	for (let i = 0; i < full; i++) {
		const [a, b] = g[i]!;
		mapped.push([mapPt(a), mapPt(b)]);
	}
	// Grow the current stroke continuously instead of popping whole segments
	if (rem > 0.002 && full < g.length) {
		const [a, b] = g[full]!;
		const tip: V2 = [lerp(a[0], b[0], rem), lerp(a[1], b[1], rem)];
		mapped.push([mapPt(a), mapPt(tip)]);
	}
	return fattenSegs(mapped, 0.014);
}

/** Soft entrance — letters draw L→R while the name settles into place. */
function nameReveal(progress: number): Seg[] {
	const p = clamp(progress, 0, 1);
	if (p <= 0.001) return [];
	const settle = smoothstep(0, 0.75, p);
	const scale = lerp(0.9, 1, settle);
	const rise = lerp(-0.06, 0, settle);
	const out: Seg[] = [];
	const slots = nameSlots();
	const n = Math.max(1, slots.length - 1);
	slots.forEach((slot, i) => {
		const delay = (i / n) * 0.28;
		const local = smoothstep(delay, Math.min(1, delay + 0.48), p);
		if (local <= 0.01) return;
		out.push(
			...letterAtSlot(
				{
					...slot,
					cx: slot.cx * scale,
					cy: slot.cy * scale + rise,
					w: slot.w * scale,
					h: slot.h * scale,
				},
				local,
			),
		);
	});
	return out;
}

/**
 * Name + rocket flyby (rocket drawn behind via backSegs + AABB cull).
 * fly01 < 0 → hold-loop; else same NE path as the moon pass.
 * reveal 0→1 = soft letter draw-in (1 = full name).
 */
export function nameScene(
	t: number,
	fly01 = -1,
	reveal = 1,
): {
	segs: Seg[];
	backSegs: Seg[];
	exhaustAt: V2 | null;
	rx: number;
	ry: number;
} {
	const name = nameReveal(reveal);
	let fly = fly01;
	if (fly < 0) {
		const cyc = ((t * 0.22) % 1 + 1) % 1;
		if (cyc < 0.08 || cyc > 0.82) {
			return { segs: name, backSegs: [], exhaustAt: null, rx: 0, ry: 0 };
		}
		fly = (cyc - 0.08) / 0.74;
	}
	if (reveal < 0.72 || fly <= 0) {
		return { segs: name, backSegs: [], exhaustAt: null, rx: 0, ry: 0 };
	}
	const flyby = rocketFlyby(t, fly);
	return {
		segs: name,
		backSegs: flyby.segs,
		exhaustAt: flyby.exhaustAt,
		rx: flyby.rx,
		ry: flyby.ry,
	};
}

function nameAt(t: number, _moving: number): Seg[] {
	return nameScene(t).segs;
}

const ROCKET_INDEX = 3;
const MOON_INDEX = 4;
const NAME_INDEX = 5;

const STAGES: { name: string; pose: PoseFn }[] = [
	{ name: "Whale", pose: whaleAt },
	{ name: "Monkey V2", pose: monkeyV2At },
	{ name: "Human", pose: humanAt },
	{ name: "Rocket", pose: rocketAt },
	{ name: "Moon", pose: moonAt },
	{ name: "Name", pose: nameAt },
	// Lab-only holds — not in the main loop
	{ name: "Lizard", pose: lizardAt },
	{ name: "Monkey", pose: monkeyAt },
	{ name: "Running", pose: runningAt },
];

const STAGE_COUNT = STAGES.length;

export function morphSegs(a: Seg[], b: Seg[], t: number): Seg[] {
	const n = Math.max(a.length, b.length);
	const out: Seg[] = [];
	for (let i = 0; i < n; i++) {
		const sa = a[i % a.length];
		const sb = b[i % b.length];
		out.push([lerp2(sa[0], sb[0], t), lerp2(sa[1], sb[1], t)]);
	}
	return out;
}

export function translateSegs(segs: Seg[], dx: number, dy: number): Seg[] {
	return segs.map(([a, b]) => [
		[a[0] + dx, a[1] + dy] as V2,
		[b[0] + dx, b[1] + dy] as V2,
	]);
}

export type AsciiEvolutionConfig = {
	speed: number;
	figureScale: number;
	density: number;
	/** Hold on a stage index 0–6, or -1 to play full loop. */
	holdStage: number;
	showStars: boolean;
	showExhaust: boolean;
	showLabels: boolean;
	colorBright: string;
	colorDim: string;
	colorStar: string;
	colorExhaust: string;
};

/** Shared look for lab (:3003) and portfolio (:3002) — change here, both stay in sync. */
export const ASCII_EVOLUTION_DEFAULTS: AsciiEvolutionConfig = {
	speed: 1,
	figureScale: 0.3,
	density: 1,
	holdStage: -1,
	showStars: true,
	showExhaust: true,
	showLabels: false,
	colorBright: "rgba(255,255,255,0.96)",
	colorDim: "rgba(255,255,255,0.35)",
	colorStar: "rgba(255,255,255,0.42)",
	colorExhaust: "rgba(251,146,60,0.85)",
};

export const EVOLUTION_STAGE_NAMES = STAGES.map((s) => s.name);

export interface AsciiEvolutionProps {
	className?: string;
	config?: Partial<AsciiEvolutionConfig>;
	onStageChange?: (name: string, index: number) => void;
}

export default function AsciiEvolution({
	className,
	config,
	onStageChange,
}: AsciiEvolutionProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const configRef = useRef<AsciiEvolutionConfig>({
		...ASCII_EVOLUTION_DEFAULTS,
		...config,
	});
	const onStageRef = useRef(onStageChange);
	onStageRef.current = onStageChange;
	configRef.current = { ...ASCII_EVOLUTION_DEFAULTS, ...config };

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
		/** Grid origin — centers the char grid so left/right (and top/bottom) clip evenly. */
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
			// Skip no-op resizes — resetting canvas.width clears the frame (looks black).
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

		/**
		 * Journey east → rocket flies off → moon flyby → name reveal.
		 */
		function timeline(tSec: number) {
			const BEAT = 2.5;
			const CREATURE_BEATS = 3; // whale→monkey v2→human→rocket
			const CREATURE_END = BEAT * CREATURE_BEATS;
			const LAUNCH_DUR = 2.8;
			// Moon kept in code / lab hold — skipped in the main loop for now
			const PLAY_MOON = false;
			const MOON_DUR = PLAY_MOON ? 2.6 : 0;
			const NAME_DUR = 7.2;
			const LOOP = CREATURE_END + LAUNCH_DUR + MOON_DUR + NAME_DUR;
			const u = ((tSec % LOOP) + LOOP) % LOOP;
			const cfg = configRef.current;

			if (cfg.holdStage >= 0 && cfg.holdStage < STAGE_COUNT) {
				const moving = 0.85;
				if (cfg.holdStage === MOON_INDEX) {
					const scene = moonScene(tSec, moving);
					return {
						segs: scene.segs,
						stageIndex: MOON_INDEX,
						worldX: 0,
						lift: 0,
						space: 1,
						viewY: 0.5,
						moving,
						label: "Moon",
						exhaustAmt: scene.exhaustAt ? 0.42 : 0,
						exhaustAt: scene.exhaustAt,
					};
				}
				if (cfg.holdStage === NAME_INDEX) {
					const scene = nameScene(tSec);
					return {
						segs: scene.segs,
						backSegs: scene.backSegs,
						stageIndex: NAME_INDEX,
						worldX: 0,
						lift: 0,
						space: 1,
						viewY: 0.5,
						moving,
						label: "Areyan Rastawan",
						exhaustAmt: scene.exhaustAt ? 0.4 : 0,
						exhaustAt: scene.exhaustAt,
						rocketCx: scene.rx,
						rocketCy: scene.ry,
						nameForm: 1,
					};
				}
				const east = 0;
				return {
					segs: translateSegs(
						STAGES[cfg.holdStage].pose(tSec, moving),
						east,
						0,
					),
					stageIndex: cfg.holdStage,
					worldX: east,
					lift: cfg.holdStage === ROCKET_INDEX ? 0.15 : 0,
					space: 0,
					viewY: 0.5,
					moving,
					label: STAGES[cfg.holdStage].name,
				};
			}

			// Creatures stay centered (morph in place) — no east march.
			const sway = Math.sin(tSec * 1.35) * 0.03;

			if (u < CREATURE_END) {
				const beat = Math.min(CREATURE_BEATS - 1, Math.floor(u / BEAT));
				const local = (u - beat * BEAT) / BEAT;
				const travelEnd = 0.58;
				const from = beat;
				const to = Math.min(beat + 1, ROCKET_INDEX);

				let morphT = 0;
				let stageIndex = from;
				let moving = 1;
				let label = STAGES[from].name;

				if (local < travelEnd) {
					moving = 1;
					label = STAGES[from].name;
				} else {
					morphT = smoothstep(0, 1, (local - travelEnd) / (1 - travelEnd));
					moving = 0.45;
					stageIndex = morphT < 0.5 ? from : to;
					label =
						morphT < 0.3
							? STAGES[from].name
							: morphT > 0.7
								? STAGES[to].name
								: `${STAGES[from].name} → ${STAGES[to].name}`;
				}

				const poseA = STAGES[from].pose(tSec, moving);
				const poseB = STAGES[to].pose(tSec, moving * 0.55);
				const segs = morphT > 0 ? morphSegs(poseA, poseB, morphT) : poseA;

				return {
					segs: translateSegs(segs, sway, 0),
					stageIndex,
					worldX: sway,
					lift: 0,
					space: 0,
					viewY: 0.5,
					moving,
					label,
				};
			}

			if (u < CREATURE_END + LAUNCH_DUR) {
				const launchT = u - CREATURE_END;
				const p = clamp(launchT / LAUNCH_DUR, 0, 1);
				// Accel out NE from center — finish exit at end of launch (no empty star hold)
				const travel = Math.min(1, p);
				const ease = travel * travel * (3 - 2 * travel);
				const lift = ease;
				// Stars only at the very end of the rocket exit
				const space = smoothstep(0.84, 0.995, ease);
				const east = sway * (1 - ease) + ease * 2.8;
				const up = ease * 2.1;
				return {
					segs: translateSegs(rocketAt(tSec, 0.55 + ease * 0.35), east, up),
					stageIndex: ROCKET_INDEX,
					worldX: east,
					lift,
					space,
					viewY: lerp(0.5, 0.18, ease),
					moving: 1,
					label: ease < 0.12 ? "Rocket" : "Launch NE",
					exhaustAmt:
						smoothstep(0.06, 0.22, ease) *
						clamp(0.95 - space * 0.45, 0.55, 1),
					exhaustAt: null,
				};
			}

			if (MOON_DUR > 0 && u < CREATURE_END + LAUNCH_DUR + MOON_DUR) {
				const moonT = u - CREATURE_END - LAUNCH_DUR;
				const p = moonT / MOON_DUR;
				const fly = flyProgress(p);
				const scene = moonScene(tSec, 1, fly);
				return {
					segs: scene.segs,
					stageIndex: MOON_INDEX,
					worldX: 0,
					lift: 0,
					space: 1,
					viewY: 0.5,
					moving: 1,
					label: "Moon",
					exhaustAmt: scene.exhaustAt ? 0.4 : 0,
					exhaustAt: scene.exhaustAt,
					rocketCx: scene.exhaustAt ? scene.exhaustAt[0] + 0.14 : 0,
					rocketCy: scene.exhaustAt ? scene.exhaustAt[1] + 0.14 : 0,
				};
			}

			// Name — letter cascade draw-in, then rocket flyby
			const nameT = u - CREATURE_END - LAUNCH_DUR - MOON_DUR;
			const p = nameT / NAME_DUR;
			const pathReveal = smoothstep(0, 0.36, p);
			const nameForm = smoothstep(0.02, 0.42, p);
			const fly =
				p < 0.45 ? 0 : flyProgress(clamp((p - 0.45) / 0.4, 0, 1));
			const scene = nameScene(tSec, fly, pathReveal);
			return {
				segs: scene.segs,
				backSegs: scene.backSegs,
				stageIndex: NAME_INDEX,
				worldX: 0,
				lift: 0,
				space: 1,
				viewY: 0.5,
				moving: 1,
				label: "Areyan Rastawan",
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
				lift,
				space,
				label,
				viewY,
				exhaustAmt = 0,
				exhaustAt = null,
				rocketCx = 0,
				rocketCy = 0,
				nameForm = 1,
			} = timeline(t);

			if (stageIndex !== lastStage) {
				lastStage = stageIndex;
				onStageRef.current?.(STAGES[stageIndex].name, stageIndex);
			}

			const nameScaleBoost = stageIndex === NAME_INDEX ? 1.38 : 1;
			let S = H * cfg.figureScale * nameScaleBoost;
			// Keep the name inside the viewport on wide/short heroes.
			if (stageIndex === NAME_INDEX) {
				S = Math.min(S, (W * 0.42) / 1.35);
			}
			const figCx = W * 0.5;
			const figCy = H * viewY;
			// Keep strokes ≥ ~1 cell so large lab canvases don't go invisible.
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

					// Ambient stars — fade in with a soft twinkle (no long pause)
					let starChar = " ";
					const wantStars =
						(cfg.showStars || stageIndex === NAME_INDEX) && space > 0.08;
					if (wantStars) {
						const dens = 0.992 - space * 0.045;
						const hs = hash(c, r);
						if (hs > dens) {
							// Slow twinkle — mostly steady, occasional soft pulse
							const tw = 0.5 + 0.5 * Math.sin(t * 0.55 + hs * 40);
							starChar = tw > 0.82 ? "+" : tw > 0.18 ? "." : " ";
						}
					}

					// Soft name fade alongside the letter draw-in
					let nameI = brightI;
					if (stageIndex === NAME_INDEX) {
						nameI = brightI * Math.pow(clamp(nameForm, 0, 1), 0.75);
					}

					// Rocket behind name — AABB cull so motion stays smooth like moon
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

					// Exhaust: diagonal SW plume (launch + lighter moon flyby)
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
						const plumeLen =
							stageIndex === MOON_INDEX || stageIndex === NAME_INDEX
								? 0.36 + exhaustAmt * 0.32
								: 0.9 + exhaustAmt * 0.85;
						const flicker =
							0.75 + 0.25 * Math.sin(t * 22 + along * 14 + fx * 9);
						if (along > 0.02 && along < plumeLen) {
							const taper = 1 - along / plumeLen;
							const slim =
								stageIndex === MOON_INDEX || stageIndex === NAME_INDEX;
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
				drawLayer(
					cfg.colorStar === "rgba(255,255,255,0.0)"
						? "rgba(255,255,255,0.42)"
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
		// Re-measure once the mono font loads so cell advance matches fillText.
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
			style={{ display: "block", width: "100%", height: "100%", background: "#000000" }}
		/>
	);
}
