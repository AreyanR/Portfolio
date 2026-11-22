import { Fragment, useEffect, useRef, useState } from "react";
import { A, Btn, MONO, SEG_CLASSES, SegLegend } from "./ui";

/*
 * What each version of the map coder looks at to guess one pixel. All three go one diagonal at a time.
 * Upgrade 1 and 4: comma-study/my-comma-codec/submission/old_0.3076/06_map_encoder.py (describe_neighbours, describe_more_neighbours).
 * Upgrade 5: solution/map_encoder.py (MapGuesser, NEIGHBOURS, MAPS_BACK = 5).
 * The grid is a real 30 x 14 pixel crop of maps 295-300 (one cell = one pixel).
 */

type Crop = { row: number; col: number; maps: Record<string, number[][]> };

const ROWS = 14;
const COLS = 30;

// (up, left) offsets in the map being decoded
const TALLY_NOW: [number, number][] = [
	[0, 1], // left
	[1, 1], // up-left
	[1, 0], // up
];
const NEURAL_NOW: [number, number][] = [];
for (let up = 0; up < 5; up++) for (let left = -4; left < 5; left++) if (up + left >= 1) NEURAL_NOW.push([up, left]);

type Mode = {
	key: string;
	tab: string;
	bytes: string;
	now: [number, number][];
	// earlier maps: map index back (1 = previous) → offsets, or "window" for the neural guesser's 31 x 31 view
	back: { k: number; cells: [number, number][] | "window" }[];
	band?: boolean;
	lines: string[];
};

const MODES: Mode[] = [
	{
		key: "u1",
		tab: "3.1 · tally coder",
		bytes: "233,316 B",
		now: TALLY_NOW,
		back: [{ k: 1, cells: [[0, 0]] }],
		lines: [
			"4 hints: left, up-left, up, and the same spot in the previous map",
			"5 labels each → one of 625 contexts",
			"a running tally of what came next after each context is the guess",
		],
	},
	{
		key: "u4",
		tab: "3.4 · more context",
		bytes: "197,168 B",
		now: TALLY_NOW,
		back: [
			{
				k: 1,
				cells: [
					[0, 0],
					[0, -1],
					[-1, 0],
				],
			},
			{ k: 2, cells: [[0, 0]] },
		],
		band: true,
		lines: [
			"+ the previous map's right and below spots, the same spot 2 maps back, and which 1/8 of the picture the row is in",
			"rare combinations fall back to the 4-hint tally",
		],
	},
	{
		key: "u5",
		tab: "3.5 · neural guesser",
		bytes: "127,645 B (final, after cleaning)",
		now: NEURAL_NOW,
		back: [1, 2, 3, 4, 5].map((k) => ({ k, cells: "window" as const })),
		lines: [
			"30 known neighbors in this map, plus the last 5 maps",
			"its conv layers see a 31 × 31 window around the spot in each earlier map",
			"a 17,173-weight network turns all of it into a score per class",
		],
	},
];

export function CoderCompare({ initial = 2 }: { initial?: number }) {
	const [crop, setCrop] = useState<Crop | null>(null);
	const [mode, setMode] = useState(initial);
	const [d, setD] = useState(16);
	const [auto, setAuto] = useState(false);

	useEffect(() => {
		fetch(A("page/map_crop.json"))
			.then((r) => r.json())
			.then(setCrop)
			.catch(() => setCrop(null));
	}, []);

	useEffect(() => {
		if (!auto) return;
		const t = window.setInterval(() => setD((x) => (x + 1 > ROWS + COLS - 2 ? 6 : x + 1)), 700);
		return () => window.clearInterval(t);
	}, [auto]);

	const m = MODES[mode]!;
	const onDiag: [number, number][] = [];
	for (let r = 0; r < ROWS; r++) if (d - r >= 0 && d - r < COLS) onDiag.push([r, d - r]);
	const [fr, fc] = onDiag[Math.floor(onDiag.length / 2)] ?? [7, 9];
	const nowSet = new Set(m.now.map(([u, l]) => `${fr - u},${fc - l}`));
	const band = Math.floor(((crop?.row ?? 176) + fr) * 8 / 384);

	const S = 20;
	const grid = (
		cells: number[][],
		hi: (r: number, c: number) => boolean,
		done: (r: number, c: number) => boolean,
		focus: boolean,
		size: number,
		windowBox = false,
	) => (
		<svg viewBox={`0 0 ${COLS * size} ${ROWS * size}`} className="block w-full" role="img" aria-label="Map pixels">
			{cells.map((row, r) =>
				row.map((cls, c) => {
					const isF = focus && r === fr && c === fc;
					const h = hi(r, c);
					const known = done(r, c);
					return (
						<rect
							key={`${r}-${c}`}
							x={c * size + 0.5}
							y={r * size + 0.5}
							width={size - 1}
							height={size - 1}
							fill={known ? SEG_CLASSES[cls]![1] : "rgba(255,255,255,0.06)"}
							opacity={isF || h ? 1 : known ? 0.32 : 1}
							stroke={isF || (h && !windowBox) ? "#fff" : "none"}
							strokeWidth={isF ? 2.5 : 1.2}
						/>
					);
				}),
			)}
			{focus && (
				<text x={fc * size + size / 2} y={fr * size + size / 2 + 4} textAnchor="middle" fontSize={size * 0.55} fontWeight={700} fill="#fff" fontFamily={MONO}>
					?
				</text>
			)}
			{windowBox && (
				<rect
					x={Math.max(0, fc - 15) * size}
					y={Math.max(0, fr - 15) * size}
					width={(Math.min(COLS, fc + 16) - Math.max(0, fc - 15)) * size}
					height={(Math.min(ROWS, fr + 16) - Math.max(0, fr - 15)) * size}
					fill="none"
					stroke="#fff"
					strokeWidth={2}
				/>
			)}
			{!focus && <rect x={fc * size} y={fr * size} width={size} height={size} fill="none" stroke="#fcd34d" strokeWidth={1.5} />}
			{m.band && focus && <rect x={0} y={0} width={COLS * size} height={ROWS * size} fill="none" stroke="rgba(252,211,77,0.7)" strokeDasharray="4 4" />}
		</svg>
	);

	const backHi = (cells: [number, number][] | "window") => (r: number, c: number) =>
		cells === "window" ? Math.abs(r - fr) <= 15 && Math.abs(c - fc) <= 15 : cells.some(([u, l]) => r === fr - u && c === fc - l);

	return (
		<figure className="my-8">
			<div className="mb-3 flex flex-wrap gap-1.5">
				{MODES.map((x, i) => (
					<Btn key={x.key} on={mode === i} onClick={() => setMode(i)}>
						{x.tab}
					</Btn>
				))}
			</div>
			<div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_200px]">
				<div>
					<div className="mb-1 font-mono text-[10.5px] text-white/50">map 300 · being decoded, diagonal {d}</div>
					{crop && grid(crop.maps["300"]!, (r, c) => nowSet.has(`${r},${c}`), (r, c) => r + c < d, true, S)}
				</div>
				<div className="flex flex-col gap-2">
					{m.back.map(({ k, cells }) => (
						<div key={k}>
							<div className="mb-0.5 font-mono text-[10px] text-white/45">map {300 - k}</div>
							{crop && grid(crop.maps[String(300 - k)]!, backHi(cells), () => true, false, 8, cells === "window")}
						</div>
					))}
				</div>
			</div>
			<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
				<ul className="list-disc space-y-1 pl-5 text-[0.97rem] text-white/75">
					{m.lines.map((l) => (
						<li key={l}>{l}</li>
					))}
					{m.band && <li className="text-amber-200/80">this crop sits in band {band + 1} of 8 (dashed outline)</li>}
				</ul>
				<div className="text-right">
					<div className="font-mono text-[10px] tracking-[0.12em] text-white/45 uppercase">maps.bin</div>
					<div className="font-mono text-2xl tabular-nums">{m.bytes.split(" ")[0]} B</div>
					<div className="font-mono text-[10px] text-white/40">{m.bytes.includes("(") ? m.bytes.slice(m.bytes.indexOf("(")) : ""}</div>
				</div>
			</div>
			<div className="mt-3 flex flex-wrap items-center gap-2">
				<Btn on={auto} onClick={() => setAuto((a) => !a)}>
					{auto ? "pause" : "play"}
				</Btn>
				<Btn
					onClick={() => {
						setAuto(false);
						setD((x) => (x + 1 > ROWS + COLS - 2 ? 6 : x + 1));
					}}
				>
					next diagonal
				</Btn>
				<div className="ml-auto">
					<SegLegend />
				</div>
			</div>
			<figcaption className="mt-3 font-mono text-[10.5px] leading-relaxed text-white/40">
				A real 30 × 14 pixel crop of maps 295–300, one cell per pixel. White outlines: what this version of the coder looks at to guess the "?" pixel (yellow: the same spot in earlier maps). Dark cells are not decoded yet.
			</figcaption>
		</figure>
	);
}

/*
 * 3.1: a live walkthrough of the first map coder on one pixel, using the exact example in the header of
 * comma-study/my-comma-codec/submission/old_0.3076/06_map_encoder.py:
 * context "sky, sky, sky, sky" → tally sky 9,990 · road 5 · lane 2 · car 2 · hood 1 → guess 99.9% sky;
 * real answer sky ≈ 0.001 bits (−log2 0.999), real answer car ≈ 12 bits (−log2 0.0002).
 */
const TALLY: [string, number][] = [
	["sky", 9990],
	["road", 5],
	["lane", 2],
	["car", 2],
	["hood", 1],
];
const TALLY_TOTAL = TALLY.reduce((t, [, n]) => t + n, 0);
const CLS_COLOR: Record<string, string> = { road: SEG_CLASSES[0]![1], lane: SEG_CLASSES[1]![1], sky: SEG_CLASSES[2]![1], car: SEG_CLASSES[3]![1], hood: SEG_CLASSES[4]![1] };
const STEPS = 9; // 0 focus · 1 left · 2 up-left · 3 up · 4 previous map · 5 context · 6 tally · 7 answer · 8 bits

export function CoderWalkthrough() {
	const [scenario, setScenario] = useState(0); // 0 easy pixel (sky), 1 surprise (car)
	const [step, setStep] = useState(0);
	const [auto, setAuto] = useState(true);
	useEffect(() => {
		if (!auto) return;
		const t = window.setTimeout(
			() => {
				if (step < STEPS - 1) setStep(step + 1);
				else {
					setStep(0);
					setScenario((s) => 1 - s);
				}
			},
			step === STEPS - 1 ? 3500 : 1100,
		);
		return () => window.clearTimeout(t);
	}, [auto, step]);

	const answer = scenario === 0 ? "sky" : "car";
	const bits = scenario === 0 ? "≈ 0.001" : "≈ 12";
	const W = 6;
	const H = 4;
	const fr = 2;
	const fc = 3;
	const hints: [number, number, number][] = [
		[fr, fc - 1, 1],
		[fr - 1, fc - 1, 2],
		[fr - 1, fc, 3],
	];
	const S = 30;
	const cell = (r: number, c: number, prev: boolean) => {
		const decoded = prev || r + c < fr + fc || (r + c === fr + fc && r < fr);
		const isFocus = !prev && r === fr && c === fc;
		const hint = prev ? r === fr && c === fc && step >= 4 : hints.some(([hr, hc, s]) => hr === r && hc === c && step >= s);
		let fill = decoded ? CLS_COLOR.sky! : "rgba(255,255,255,0.05)";
		if (isFocus) fill = step >= 7 ? CLS_COLOR[answer]! : "rgba(255,255,255,0.08)";
		return (
			<g key={`${prev}-${r}-${c}`}>
				<rect
					x={c * S + 1}
					y={r * S + 1}
					width={S - 2}
					height={S - 2}
					rx={3}
					fill={fill}
					opacity={decoded && !hint && !isFocus ? 0.4 : 1}
					stroke={isFocus ? "#fff" : hint ? "#fcd34d" : "none"}
					strokeWidth={isFocus ? 2.5 : 2}
				/>
				{isFocus && step < 7 && (
					<text x={c * S + S / 2} y={r * S + S / 2 + 5} textAnchor="middle" fontSize={15} fontWeight={700} fill="#fff" fontFamily={MONO}>
						?
					</text>
				)}
			</g>
		);
	};
	const grid = (prev: boolean, label: string) => (
		<div>
			<div className="mb-1 font-mono text-[10.5px] tracking-[0.12em] text-white/50 uppercase">{label}</div>
			<svg viewBox={`0 0 ${W * S} ${H * S}`} className="block w-full max-w-[220px]">
				{Array.from({ length: H }, (_, r) => Array.from({ length: W }, (_, c) => cell(r, c, prev)))}
			</svg>
		</div>
	);
	const total = TALLY.reduce((s, [, n]) => s + n, 0);
	const context = "“sky, sky, sky, sky”";
	const stateText = [
		"next pixel to code",
		"hint 1: the pixel to its left",
		"hint 2: up-left",
		"hint 3: up",
		"hint 4: the same spot in the previous map",
		`context: ${context}`,
		"the tally for that context so far",
		`the real answer: ${answer}`,
		scenario === 0 ? "the guess was right, almost free" : "a surprise costs a lot",
	][step];

	return (
		<figure className="my-8 rounded-xl border border-white/12 bg-[#0b0b0d] p-4 sm:p-5">
			<div className="mb-4 flex flex-wrap items-center gap-1.5">
				<Btn
					on={scenario === 0}
					onClick={() => {
						setScenario(0);
						setStep(0);
					}}
				>
					easy pixel
				</Btn>
				<Btn
					on={scenario === 1}
					onClick={() => {
						setScenario(1);
						setStep(0);
					}}
				>
					surprise
				</Btn>
				<span className="mx-1 h-4 w-px bg-white/15" />
				<Btn on={auto} onClick={() => setAuto((a) => !a)}>
					{auto ? "pause" : "play"}
				</Btn>
				<Btn
					onClick={() => {
						setAuto(false);
						setStep((s) => Math.min(STEPS - 1, s + 1));
					}}
				>
					step
				</Btn>
			</div>
			<div className="grid grid-cols-1 gap-5 sm:grid-cols-[220px_1fr]">
				<div className="flex flex-col gap-3">
					{grid(true, "previous map")}
					{grid(false, "current map")}
				</div>
				<div className="flex flex-col gap-3">
					<div className="rounded-lg border border-white/10 px-3 py-2">
						<div className="font-mono text-[10px] tracking-[0.12em] text-white/45 uppercase">now</div>
						<div className="font-mono text-[13px] text-[#fcd34d]">{stateText}</div>
					</div>
					<div className="rounded-lg border border-white/10 px-3 py-2.5">
						<div className="mb-2 font-mono text-[10px] tracking-[0.12em] text-white/45 uppercase">tally after {context}</div>
						{TALLY.map(([k, n]) => (
							<div key={k} className="grid grid-cols-[44px_1fr_64px] items-center gap-2 py-0.5 font-mono text-[11.5px]">
								<span className={answer === k && step >= 7 ? "text-white" : "text-white/55"}>{k}</span>
								<div className="h-2.5 rounded-sm bg-white/[0.05]">
									<div
										className="h-full rounded-sm transition-all duration-500"
										style={{ width: step >= 6 ? `${Math.max((n / total) * 100, 1.2)}%` : "0%", background: k === "car" ? "#6b7cff" : CLS_COLOR[k] }}
									/>
								</div>
								<span className="text-right text-white/60 tabular-nums">{step >= 6 ? n.toLocaleString("en-US") : ""}</span>
							</div>
						))}
						<div className="mt-1.5 min-h-[1rem] font-mono text-[11px] text-white/45">{step >= 6 ? "guess: 99.9% sky · car only 0.02%" : ""}</div>
					</div>
					<div className="rounded-lg border border-white/10 px-3 py-2">
						<div className="font-mono text-[10px] tracking-[0.12em] text-white/45 uppercase">bits paid for this pixel</div>
						<div className={`text-3xl font-semibold tabular-nums ${step >= 8 ? (scenario === 0 ? "text-[#86efac]" : "text-[#ff5a6e]") : "text-white/20"}`}>{step >= 8 ? bits : "…"}</div>
					</div>
				</div>
			</div>
			<figcaption className="mt-4 font-mono text-[10.5px] leading-relaxed text-white/40">
				The example from the header of my old 06_map_encoder.py. Most pixels look like the easy one, which is why 600 maps fit in 233 KB.
			</figcaption>
		</figure>
	);
}

/* 3.1 · one easy pixel and one surprise, same four known neighbors. Probabilities from TALLY above
 * (sky 9,990 of 10,000 → −log2(0.999) ≈ 0.001 bits; car 2 of 10,000 → −log2(0.0002) ≈ 12 bits). */

function GuessCard({ title, answer, bits, good, step }: { title: string; answer: "sky" | "car"; bits: string; good: boolean; step: number }) {
	// step: 0 blank · 1 left · 2 up-left · 3 up · 4 last map · 5 guess · 6 answer · 7 bits
	const S = 26, W = 6, H = 4;
	const GOLD = "#fcd34d";
	const hintAt = (r: number, c: number) => (r === 2 && c === 2 ? 1 : r === 1 && c === 2 ? 2 : r === 1 && c === 3 ? 3 : 0);
	const revealed = step >= 6;
	const cells = [];
	for (let r = 0; r < H; r++)
		for (let c = 0; c < W; c++) {
			const known = r < 2 || (r === 2 && c < 3);
			const q = r === 2 && c === 3;
			const h = hintAt(r, c);
			const lit = h > 0 && step >= h;
			cells.push(
				<rect
					key={`${r},${c}`}
					x={c * S + 1}
					y={r * S + 1}
					width={S - 2}
					height={S - 2}
					rx={3}
					fill={q ? (revealed ? CLS_COLOR[answer] : "#111") : known ? CLS_COLOR.sky : "#1a1a1d"}
					opacity={known || q ? 1 : 0.6}
					stroke={q ? "#fff" : lit ? GOLD : "transparent"}
					strokeWidth={2}
					style={{ transition: "fill 300ms, stroke 300ms" }}
				/>,
			);
		}
	const px = W * S + 26;
	const show = (n: number) => ({ opacity: step >= n ? 1 : 0, transition: "opacity 300ms" });
	return (
		<div className="rounded-xl border border-white/10 p-4">
			<div className="mb-3 text-[13px] text-white/55">{title}</div>
			<svg viewBox={`0 0 ${W * S + 64} ${H * S}`} className="block w-full" role="img" aria-label={`${title}. Neighbors are sky, the answer is ${answer}.`}>
				{cells}
				<text x={3 * S + S / 2} y={2 * S + S / 2 + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill="#fff" style={{ opacity: revealed ? 0 : 1, transition: "opacity 300ms" }}>
					?
				</text>
				<text x={px + (S - 2) / 2} y={2 * S - 6} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.5)" fontFamily={MONO}>
					last map
				</text>
				<rect x={px} y={2 * S + 1} width={S - 2} height={S - 2} rx={3} fill={CLS_COLOR.sky} stroke={step >= 4 ? GOLD : "transparent"} strokeWidth={2} style={{ transition: "stroke 300ms" }} />
			</svg>
			<div className="mt-3 font-mono text-[11px]" style={show(5)}>
				<div className="mb-1.5 text-white/50">the coder's prediction</div>
				<div className="grid grid-cols-[2.6rem_1fr_3.2rem] items-center gap-x-2 gap-y-1.5">
					{TALLY.map(([k, n]) => {
						const isAnswer = k === answer && revealed;
						const p = n / TALLY_TOTAL;
						return (
							<Fragment key={k}>
								<span className={isAnswer ? "font-semibold text-white" : "text-white/70"}>{k}</span>
								<div
									className="h-3 rounded-[2px]"
									style={{ width: `max(2px, ${p * 100}%)`, background: CLS_COLOR[k], outline: isAnswer ? "2px solid #fff" : "none", outlineOffset: 1, transition: "outline-color 300ms" }}
								/>
								<span className={`text-right tabular-nums ${isAnswer ? "text-white" : "text-white/60"}`}>{(p * 100).toFixed(p < 0.01 ? 2 : 1)}%</span>
							</Fragment>
						);
					})}
				</div>
			</div>
			<div className="mt-1.5 font-mono text-[28px] font-semibold tabular-nums" style={{ color: good ? "#86efac" : "#ff5a6e", ...show(7) }}>
				{bits}
			</div>
		</div>
	);
}

export function PixelGuessFig() {
	const ref = useRef<HTMLElement>(null);
	const [on, setOn] = useState(false);
	const [step, setStep] = useState(0);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			setStep(7);
			return;
		}
		const io = new IntersectionObserver(([e]) => setOn(!!e?.isIntersecting), { threshold: 0.4 });
		io.observe(el);
		return () => io.disconnect();
	}, []);
	useEffect(() => {
		if (!on) return;
		const t = window.setTimeout(() => setStep((s) => (s >= 7 ? 0 : s + 1)), step === 7 ? 3500 : step === 0 ? 600 : 700);
		return () => window.clearTimeout(t);
	}, [on, step]);
	return (
		<figure ref={ref} className="my-8">
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<GuessCard title="Easy pixel" answer="sky" bits="0.001 bits" good step={step} />
				<GuessCard title="Surprise" answer="car" bits="12 bits" good={false} step={step} />
			</div>
		</figure>
	);
}

/* 3.4 · the 8 hints, drawn like 3.1. Gold: the 4 hints from 3.1 (left, up-left, up, same spot in the last map).
 * Green: the 4 added in 3.4 (right and below that spot in the last map, same spot 2 maps back, the row's eighth of
 * the picture), from old_0.3076/06_map_encoder.py describe_more_neighbours. Map sizes: 233,316 B → 197,168 B (commit 78034f9 in comma-study/my-comma-codec; checkpoints/v1_0.3076/archive.zip holds maps.bin at 197,168 B). */
type HintCell = { fill?: string; hint?: number; q?: boolean };

function HintGrid({ x0, label, cells, step }: { x0: number; label: string; cells: Record<string, HintCell>; step: number }) {
	const S = 24;
	const out = [];
	for (let r = 0; r < 4; r++)
		for (let c = 0; c < 6; c++) {
			const o = cells[`${r},${c}`] ?? {};
			const h = o.hint ?? 0;
			const lit = h > 0 && step >= h;
			out.push(
				<rect
					key={`${r},${c}`}
					x={x0 + c * S + 1}
					y={22 + r * S + 1}
					width={S - 2}
					height={S - 2}
					rx={3}
					fill={o.fill ?? CLS_COLOR.sky}
					stroke={o.q ? "#fff" : lit ? (h <= 4 ? "#fcd34d" : "#86efac") : "transparent"}
					strokeWidth={2}
					style={{ transition: "stroke 300ms" }}
				/>,
			);
			if (o.q)
				out.push(
					<text key={`${r},${c}q`} x={x0 + c * S + S / 2} y={22 + r * S + S / 2 + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill="#fff">
						?
					</text>,
				);
		}
	return (
		<g>
			<text x={x0} y={12} fontSize={11} fill="rgba(255,255,255,0.5)" fontFamily={MONO}>
				{label}
			</text>
			{out}
		</g>
	);
}

export function HintsFig() {
	const ref = useRef<HTMLElement>(null);
	const [on, setOn] = useState(false);
	const [step, setStep] = useState(0);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			setStep(8);
			return;
		}
		const io = new IntersectionObserver(([e]) => setOn(!!e?.isIntersecting), { threshold: 0.4 });
		io.observe(el);
		return () => io.disconnect();
	}, []);
	useEffect(() => {
		if (!on) return;
		const t = window.setTimeout(() => setStep((s) => (s >= 8 ? 0 : s + 1)), step === 8 ? 3500 : step === 0 ? 600 : 650);
		return () => window.clearTimeout(t);
	}, [on, step]);
	const dark = "#1a1a1d";
	const now: Record<string, HintCell> = { "2,3": { fill: "#111", q: true }, "2,2": { hint: 1 }, "1,2": { hint: 2 }, "1,3": { hint: 3 } };
	for (const c of [4, 5]) now[`2,${c}`] = { fill: dark };
	for (let c = 0; c < 6; c++) now[`3,${c}`] = { fill: dark };
	return (
		<figure ref={ref} className="my-8">
			<div className="rounded-xl border border-white/10 p-4">
				<svg viewBox="0 0 560 140" className="block w-full" role="img" aria-label="The 4 hints from 3.1 and the 4 added: right and below in the last map, the same spot 2 maps back, and the row's eighth of the picture">
					<HintGrid x0={8} label="current map" cells={now} step={step} />
					<HintGrid x0={208} label="previous map" cells={{ "2,3": { hint: 4 }, "2,4": { hint: 5 }, "3,3": { hint: 6 } }} step={step} />
					<HintGrid x0={408} label="two maps back" cells={{ "2,3": { hint: 7 } }} step={step} />
				</svg>
			</div>
		</figure>
	);
}

/* 3.5 · the neural guesser on one real pixel. neural_pixel.json from writeup/build/neural_guess_pixel.py: the shipped
 * whole-number guesser run over map 300 of the final cleaned maps; the pixel is the median-cost car-edge pixel of
 * that map (206 of them), so it's typical, not picked. Odds are the network's real output there. */
type NeuralPx = { odds: Record<string, number>; bits: number; true: number; now: number[][]; back1: number[][]; back2: number[][]; back3: number[][]; back4: number[][]; back5: number[][] };
// "wrong" is a second pixel by the same median rule, among the car-edge pixels where the network's top class isn't car
type NeuralPixel = NeuralPx & { wrong: NeuralPx };
const CLASS_NAMES = ["road", "lane", "sky", "car", "hood"];
const NEURAL_KNOWN = new Map<string, number>();
for (let up = 0; up < 5; up++) for (let left = -4; left < 5; left++) if (up + left >= 1) NEURAL_KNOWN.set(`${4 - up},${4 - left}`, Math.hypot(up, left));

export function NeuralGuessFig() {
	const [all, setD] = useState<NeuralPixel | null>(null);
	const ref = useRef<HTMLElement>(null);
	const [on, setOn] = useState(false);
	const [t, setT] = useState(0);
	useEffect(() => {
		fetch(A("fig/neural_pixel.json"))
			.then((r) => r.json())
			.then(setD)
			.catch(() => setD(null));
	}, []);
	useEffect(() => {
		const el = ref.current;
		if (!all || !el) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			setT(13);
			return;
		}
		const io = new IntersectionObserver(([e]) => setOn(!!e?.isIntersecting), { threshold: 0.35 });
		io.observe(el);
		return () => io.disconnect();
	}, [all]);
	useEffect(() => {
		if (!on) return;
		const id = window.setTimeout(() => setT((x) => (x >= 13 ? 0 : x + 1)), t === 13 ? 3500 : t === 0 ? 600 : 450);
		return () => window.clearTimeout(id);
	}, [on, t]);
	if (!all) return null;
	const d = all;
	const GREEN = "#86efac";
	const S = 20;
	const color = (v: number) => SEG_CLASSES[v]![1];
	const answered = t >= 13;
	const backs = [d.back1, d.back2, d.back3, d.back4, d.back5];
	const odds = CLASS_NAMES.map((n, i) => [n, d.odds[n === "car" ? "vehicle" : n]!, i] as const).sort((a, b) => b[1] - a[1]);
	const pct = (p: number) => (p < 0.001 ? "<0.1%" : `${(p * 100).toFixed(1)}%`);
	const cells = [];
	for (let r = 0; r < 9; r++)
		for (let c = 0; c < 9; c++) {
			const q = r === 4 && c === 4;
			const dist = NEURAL_KNOWN.get(`${r},${c}`);
			const known = dist !== undefined;
			cells.push(
				<rect
					key={`${r},${c}`}
					x={c * S + 1}
					y={22 + r * S + 1}
					width={S - 2}
					height={S - 2}
					rx={2}
					fill={q ? (answered ? color(d.true) : "#111") : known ? color(d.now[r]![c]!) : "#1a1a1d"}
					stroke={q ? "#fff" : known && t > 0 && dist <= t * 0.9 ? GREEN : "transparent"}
					strokeWidth={2}
					style={{ transition: "stroke 250ms, fill 300ms" }}
				/>,
			);
		}
	return (
		<figure ref={ref} className="my-8">
			<div className="rounded-xl border border-white/10 p-4">
				<svg viewBox="0 0 640 262" className="block w-full" role="img" aria-label="The neural guesser on one car-edge pixel: 30 known neighbors, the last 5 maps, then its odds for each class">
					<text x={0} y={12} fontSize={11} fill="rgba(255,255,255,0.5)" fontFamily={MONO}>
						current map, 30 known neighbors
					</text>
					{cells}
					<text x={4 * S + S / 2} y={22 + 4 * S + S / 2 + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill="#fff" opacity={answered ? 0 : 1}>
						?
					</text>
					{backs.map((m, k) => {
						const ox = 214 + k * 86;
						const lit = t >= 7 + k;
						return (
							<g key={k} opacity={lit ? 1 : 0.2} style={{ transition: "opacity 300ms" }}>
								<text x={ox} y={12} fontSize={11} fill="rgba(255,255,255,0.5)" fontFamily={MONO}>
									{k + 1} {k === 0 ? "map" : "maps"} back
								</text>
								{m.flatMap((row, r) => row.map((v, c) => <rect key={`${r},${c}`} x={ox + c * 8} y={22 + r * 8} width={7} height={7} rx={1} fill={color(v)} />))}
								<rect x={ox - 3} y={19} width={77} height={77} rx={3} fill="none" stroke={GREEN} strokeWidth={1.5} />
							</g>
						);
					})}
					<g opacity={t >= 12 ? 1 : 0} style={{ transition: "opacity 300ms" }}>
						<text x={214} y={128} fontSize={11} fill="rgba(255,255,255,0.5)" fontFamily={MONO}>
							network prediction
						</text>
						{odds.map(([n, p, i], j) => {
							const y = 140 + j * 23;
							return (
								<g key={n}>
									<text x={214} y={y + 11} fontSize={11} fill="rgba(255,255,255,0.75)" fontFamily={MONO}>
										{n}
									</text>
									<rect x={260} y={y} width={Math.max(2, p * 300)} height={13} rx={2} fill={color(i)} stroke="rgba(255,255,255,0.3)" />
									<text x={266 + p * 300} y={y + 11} fontSize={11} fill="rgba(255,255,255,0.6)" fontFamily={MONO}>
										{pct(p)}
									</text>
								</g>
							);
						})}
					</g>
					<g opacity={answered ? 1 : 0} style={{ transition: "opacity 300ms" }}>
						<text x={0} y={22 + 9 * S + 22} fontSize={12} fill="rgba(255,255,255,0.7)" fontFamily={MONO}>
							true class {CLASS_NAMES[d.true]}
						</text>
						<text x={0} y={22 + 9 * S + 54} fontSize={26} fontWeight={600} fill={GREEN} fontFamily={MONO}>
							{d.bits.toFixed(2)} bits
						</text>
					</g>
				</svg>
			</div>
		</figure>
	);
}
