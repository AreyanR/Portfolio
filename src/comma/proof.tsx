import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ARCHIVE_FILES, UPGRADES } from "./content";
import { STUDY_ROWS, type Part } from "./studyData";
import { Tile } from "./graphics";
import { A, Btn, PlayBtn, MONO, Panel, PIXELS, Readout } from "./ui";

export type PairData = { seg: number[]; pose: number[] };


/* ------------------------------------------------------------------ */
/* The proof: scrub all 600 pairs                                       */
/* ------------------------------------------------------------------ */

export function Scrubber({
	data,
	pair,
	setPair,
}: {
	data: PairData | null;
	pair: number;
	setPair: (n: number) => void;
}) {
	const [playing, setPlaying] = useState(false);
	const shown = Math.min(596, Math.round(pair / 4) * 4);
	const id = String(shown).padStart(3, "0");

	useEffect(() => {
		if (!playing) return;
		const t = window.setInterval(() => setPair((pair + 4) % 600), 240);
		return () => window.clearInterval(t);
	}, [playing, pair, setPair]);


	const seg = data?.seg[pair];
	const pose = data?.pose[pair];
	const avgAgree = data ? 100 * (1 - data.seg.reduce((a, b) => a + b, 0) / 600) : null;

	const panels: [string, string, boolean][] = [
		["original frame 2", `pairs/${id}_real.jpg`, false],
		["my frame 2", `pairs/${id}_made.jpg`, false],
		["SegNet on original", `pairs/${id}_segreal.png`, true],
		["SegNet on mine", `pairs/${id}_segmade.png`, true],
		["disagreement", `pairs/${id}_disagree.jpg`, false],
	];

	return (
		<Panel
			title="all 600 pairs"
			note={`Numbers for all 600 pairs from comma's evaluator. Pictures every 4th pair (showing ${shown}).`}
		>
			<div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5">
				{panels.map(([label, src, pix]) => (
					<figure key={label} className="cw-fig">
						<Tile key={src} file={src} alt={`${label}, pair ${shown}`} pixel={pix} />
						<figcaption>{label}</figcaption>
					</figure>
				))}
			</div>

			<div className="mt-4 flex flex-wrap items-center gap-2">
				<PlayBtn playing={playing} onClick={() => setPlaying((p) => !p)} />
				<Btn onClick={() => setPair(Math.max(0, pair - 1))}>−1</Btn>
				<Btn onClick={() => setPair(Math.min(599, pair + 1))}>+1</Btn>
				<input
					type="range"
					className="cw-range cw-focus min-w-[140px] flex-1"
					min={0}
					max={599}
					value={pair}
					aria-label="Frame pair"
					onChange={(e) => {
						setPlaying(false);
						setPair(Number(e.target.value));
					}}
				/>
			</div>

			<div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
				<Readout label="pair" value={`${pair} / 599`} />
				<Readout label="pixel-class agreement" value={seg == null ? "…" : `${(100 * (1 - seg)).toFixed(3)}%`} color="var(--seg)" />
				<Readout label="SegNet pixels wrong" value={seg == null ? "…" : Math.round(seg * PIXELS)} sub="of 196,608" color="var(--seg)" />
				<Readout label="PoseNet error" value={pose == null ? "…" : pose.toExponential(1)} color="var(--pose)" />
			</div>

			{data && <AgreementStrip data={data} pair={pair} setPair={setPair} avg={avgAgree!} />}

		</Panel>
	);
}

function AgreementStrip({ data, pair, setPair, avg }: { data: PairData; pair: number; setPair: (n: number) => void; avg: number }) {
	const W = 600;
	const H = 46;
	const agree = useMemo(() => data.seg.map((s) => 100 * (1 - s)), [data]);
	const lo = Math.min(...agree);
	const path = agree.map((v, i) => `${i ? "L" : "M"}${i},${(H - 3 - ((v - lo) / (100 - lo)) * (H - 6)).toFixed(1)}`).join("");
	return (
		<div className="mt-3">
			<svg
				viewBox={`0 0 ${W} ${H}`}
				preserveAspectRatio="none"
				className="block h-12 w-full cursor-pointer rounded bg-black/40"
				role="img"
				aria-label="Pixel-class agreement for each pair. Click to jump."
				onClick={(e) => {
					const r = e.currentTarget.getBoundingClientRect();
					setPair(Math.max(0, Math.min(599, Math.round(((e.clientX - r.left) / r.width) * 599))));
				}}
			>
				<path d={path} fill="none" stroke="var(--seg)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
				<line x1={pair} x2={pair} y1={0} y2={H} stroke="#fff" strokeWidth={2} vectorEffect="non-scaling-stroke" />
			</svg>
			<div className="mt-1 flex justify-between font-mono text-[10px] text-white/40">
				<span>agreement % across all 600 pairs · click to jump</span>
				<span>average {avg.toFixed(3)}%</span>
			</div>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* §01 archive donut (sweeps in on scroll)                              */
/* ------------------------------------------------------------------ */

// maps feed SegNet (seg blue), correction + motions feed PoseNet (pose pinks), weights are the redraw model, ZIP is gray.
const FILE_COLORS = ["#7dd3fc", "#fcd34d", "#c084fc", "#f0abfc", "#9ca3af"];

export function ArchiveDonut() {
	const total = ARCHIVE_FILES.reduce((s, f) => s + f.bytes, 0);
	const [sel, setSel] = useState(-1); // -1 = nothing picked, show the whole score
	const pick = (i: number) => setSel(i);
	// sweep the ring in the first time it scrolls into view
	const ref = useRef<HTMLElement>(null);
	const [p, setP] = useState(0);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			setP(1);
			return;
		}
		let raf = 0;
		let done = 0;
		const io = new IntersectionObserver(
			([e]) => {
				if (!e?.isIntersecting) return;
				io.disconnect();
				const t0 = performance.now();
				const tick = (t: number) => {
					const x = Math.min(1, (t - t0) / 1200);
					setP((q) => Math.max(q, 1 - Math.pow(1 - x, 3)));
					if (x < 1) raf = requestAnimationFrame(tick);
				};
				raf = requestAnimationFrame(tick);
				done = window.setTimeout(() => setP(1), 1500); // never leave the ring empty if frames are paused
			},
			{ threshold: 0.35 },
		);
		io.observe(el);
		return () => {
			io.disconnect();
			cancelAnimationFrame(raf);
			clearTimeout(done);
		};
	}, []);
	const R = 92;
	const r = 60;
	const c = 110;
	let a0 = -Math.PI / 2;
	const pt = (rad: number, a: number) => `${(c + rad * Math.cos(a)).toFixed(2)},${(c + rad * Math.sin(a)).toFixed(2)}`;
	const arcs = ARCHIVE_FILES.map((f, i) => {
		const a1 = a0 + (f.bytes / total) * Math.PI * 2 * p;
		const large = a1 - a0 > Math.PI ? 1 : 0;
		const lift = i === sel && p === 1 ? 6 : 0;
		const d = `M${pt(R + lift, a0)}A${R + lift},${R + lift} 0 ${large} 1 ${pt(R + lift, a1)}L${pt(r, a1)}A${r},${r} 0 ${large} 0 ${pt(r, a0)}Z`;
		a0 = a1;
		return d;
	});
	const f = sel >= 0 ? ARCHIVE_FILES[sel]! : null;
	return (
		<figure ref={ref} className="my-10">
			<svg viewBox="0 0 220 220" className="mx-auto block w-full max-w-[400px]" role="img" aria-label="archive.zip by file" onMouseLeave={() => setSel(-1)}>
				{arcs.map((d, i) => (
					<path
						key={i}
						d={d}
						fill={FILE_COLORS[i]}
						opacity={i === sel || sel < 0 || p < 1 ? 1 : 0.55}
						stroke="#0b0b0d"
						strokeWidth={1.5}
						className="cursor-pointer"
						onMouseEnter={() => pick(i)}
						onClick={() => pick(i)}
					/>
				))}
				<text opacity={Math.max(0, (p - 0.5) * 2)} x={c} y={c - 2} textAnchor="middle" fontSize={24} fontWeight={600} fill="#fff" fontFamily="Barlow">
					{f ? `${((f.bytes / total) * 100).toFixed(1)}%` : "0.1682"}
				</text>
				<text opacity={Math.max(0, (p - 0.5) * 2)} x={c} y={c + 14} textAnchor="middle" fontSize={9} fill={f ? FILE_COLORS[sel] : "rgba(255,255,255,0.7)"} fontFamily={MONO}>
					{f ? f.name : "score"}
				</text>
				<text opacity={Math.max(0, (p - 0.5) * 2)} x={c} y={c + 26} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.5)" fontFamily={MONO}>
					{(f ? f.bytes : total).toLocaleString("en-US")} B
				</text>
			</svg>
			<div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 font-mono text-[11px]">
				{ARCHIVE_FILES.map((g, i) => (
					<button
						key={g.name}
						type="button"
						onMouseEnter={() => pick(i)}
						onClick={() => pick(i)}
						className="cw-focus inline-flex items-center gap-1.5"
						style={{ color: FILE_COLORS[i], opacity: i === sel || sel < 0 ? 1 : 0.55 }}
					>
						<span className="inline-block h-2 w-2 rounded-sm" style={{ background: FILE_COLORS[i] }} />
						{g.name}
					</button>
				))}
			</div>
		</figure>
	);
}

/* ------------------------------------------------------------------ */
/* §08 score journey (auto-cycles)                                      */
/* ------------------------------------------------------------------ */

type Step = { label: string; name: string; score: number; approx?: boolean; desc: string; href?: string };

const JOURNEY: Step[] = [
	{ label: "base", name: "comma baseline", score: 4.39, desc: "comma's H.265 baseline, 2,244,900 B.", href: "#score" },
	{ label: "0", name: "first codec", score: 0.4537, desc: "maps 339 KB bz2, weights 119 KB 16-bit, motions 3.6 KB.", href: "#upgrades" },
	...UPGRADES.map((u) => ({
		label: u.label,
		name: u.short,
		score: u.score,
		approx: u.approx,
		desc: u.title.replace(/^Upgrade \d+: /, ""),
		href: `#${u.id}`,
	})),
];

export function ScoreJourney() {
	// one line: score after each upgrade (comma's baseline 4.39 is off the top, noted below the chart).
	// Reference marks: quantizr #55 (0.333) and the Nov 13 leaderboard neighbours (0.166-0.172), see content.ts.
	const pts = JOURNEY.filter((j) => j.label !== "base");
	const last = pts.length - 1;
	const [hov, setHov] = useState<number | null>(null);
	const W = 640, H = 270, L = 44, R = 626, T = 14, B = 220;
	const lo = 0.14, hi = 0.66;
	const X = (i: number) => L + (i * (R - L)) / last;
	const Y = (v: number) => T + ((hi - v) / (hi - lo)) * (B - T);
	const s = hov === null ? null : pts[hov]!;
	const isFinal = hov === null || hov === last;
	const up = (i: number) => i > 0 && pts[i]!.score > pts[i - 1]!.score;
	const mono = { fontFamily: MONO } as const;
	return (
		<figure className="my-8">
			<div className="mb-2 flex flex-wrap items-end justify-between gap-3">
				<div>
					<div className="font-mono text-[11px] tracking-[0.12em] text-white/50 uppercase">score</div>
					<div className="font-mono text-[34px] leading-tight tabular-nums" style={{ color: isFinal ? "#86efac" : "#fff" }}>
						{(s ?? pts[last]!).score.toFixed(4)}
					</div>
				</div>
				<div className="pb-1.5 text-right font-mono text-[13px] text-white/75">
					{s === null ? "final codec" : s.label === "0" ? "first codec" : `3.${s.label} · ${s.name}`}
				</div>
			</div>
			<svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Score after each upgrade, from 0.4537 to 0.1682" onMouseLeave={() => setHov(null)}>
				{[0.2, 0.3, 0.4, 0.5, 0.6].map((v) => (
					<g key={v}>
						<line x1={L} x2={R} y1={Y(v)} y2={Y(v)} stroke="rgba(255,255,255,0.06)" />
						<text x={L - 6} y={Y(v) + 4} textAnchor="end" fontSize={10.5} fill="rgba(255,255,255,0.4)" {...mono}>{v.toFixed(1)}</text>
					</g>
				))}
				<line x1={L} x2={R} y1={Y(0.333)} y2={Y(0.333)} stroke="rgba(255,255,255,0.35)" strokeDasharray="4 4" />
				<text x={R} y={Y(0.333) - 5} textAnchor="end" fontSize={10.5} fill="rgba(255,255,255,0.55)" {...mono}>Quantizr 0.333</text>
				<rect x={L} width={R - L} y={Y(0.172)} height={Y(0.166) - Y(0.172)} fill="rgba(134,239,172,0.12)" />
				<text x={L + 6} y={Y(0.172) - 5} fontSize={10.5} fill="rgba(134,239,172,0.75)" {...mono}>Nov 13 leaderboard, about 11th</text>
				{pts.slice(1).map((p, k) => (
					<line key={p.label} x1={X(k)} y1={Y(pts[k]!.score)} x2={X(k + 1)} y2={Y(p.score)} stroke={up(k + 1) ? "#ff5a6e" : "rgba(255,255,255,0.85)"} strokeWidth={2} />
				))}
				{hov !== null && <line x1={X(hov)} x2={X(hov)} y1={T} y2={B} stroke="rgba(255,255,255,0.2)" />}
				{pts.map((p, i) => (
					<g key={p.label}>
						<circle cx={X(i)} cy={Y(p.score)} r={i === last ? 5.5 : hov === i ? 5 : 3.5} fill={i === last ? "#86efac" : up(i) ? "#ff5a6e" : "#fff"} />
						<text x={X(i)} y={B + 16} textAnchor="middle" fontSize={10} fill={hov === i ? "#fff" : "rgba(255,255,255,0.45)"} {...mono}>{p.label}</text>
						<rect x={X(i) - (R - L) / last / 2} y={0} width={(R - L) / last} height={B + 22} fill="transparent" onMouseEnter={() => setHov(i)} onClick={() => { const t = p.href ? document.querySelector(p.href) : null; if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); }} style={{ cursor: p.href ? "pointer" : undefined }} />
					</g>
				))}
				<text x={L} y={B + 40} fontSize={10.5} fill="rgba(255,255,255,0.4)" {...mono}>upgrade →</text>
			</svg>
		</figure>
	);
}

/* ------------------------------------------------------------------ */
/* Unseen-drives study                                                  */
/* ------------------------------------------------------------------ */

type Metric = keyof Part;

export function StudyChart() {
	const [metric, setMetric] = useState<Metric>("score");
	const [hov, setHov] = useState<number | null>(null);
	const W = 760;
	const H = 300;
	const padL = 46;
	const padB = 40;
	const padT = 14;
	const lo = 0.01;
	const hi = 20;
	const ly = (v: number) => padT + (H - padT - padB) * (1 - (Math.log10(Math.max(v, lo)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)));
	const n = STUDY_ROWS.length;
	const gw = (W - padL - 8) / n;
	const row = hov == null ? null : STUDY_ROWS[hov]!;
	let info: ReactNode = <span className="text-white/40">hover or tap a drive for its numbers</span>;
	if (row)
		info = (
			<>
				<div className="text-white">
					{row.drive}
					{hov === 0 ? " (video 0)" : ""}
				</div>
				<div>
					<span className="text-[#f0abfc]">video-0 AI</span> {row.v0.score.toFixed(4)} (seg {row.v0.seg.toFixed(4)}, pose {row.v0.pose.toFixed(4)}, size {row.v0.size.toFixed(4)}) ·{" "}
					<span className="text-[#7dd3fc]">shared AI</span> {row.shared.score.toFixed(4)} (seg {row.shared.seg.toFixed(4)}, pose {row.shared.pose.toFixed(4)}, size {row.shared.size.toFixed(4)})
				</div>
			</>
		);
	return (
		<Panel title="12 hidden drives · video-0 AI vs shared AI" note="log scale · lower is better">
			<div className="mb-3 flex flex-wrap items-center gap-1.5">
				{(["score", "seg", "pose", "size"] as Metric[]).map((m) => (
					<Btn key={m} on={metric === m} onClick={() => setMetric(m)}>
						{m === "score" ? "score" : `${m} part`}
					</Btn>
				))}
				<span className="ml-auto flex items-center gap-3 font-mono text-[11px] text-white/60">
					<span className="inline-flex items-center gap-1.5">
						<span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#f0abfc]" />
						video-0 AI
					</span>
					<span className="inline-flex items-center gap-1.5">
						<span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#7dd3fc]" />
						shared AI (38 drives)
					</span>
				</span>
			</div>
			<div className="cw-scroll">
				<svg viewBox={`0 0 ${W} ${H}`} className="block w-full min-w-[560px]" role="img" aria-label={`${metric} per hidden drive, log scale`} onMouseLeave={() => setHov(null)}>
					{[0.01, 0.1, 1, 10].map((t) => (
						<g key={t}>
							<line x1={padL} x2={W - 6} y1={ly(t)} y2={ly(t)} stroke="rgba(255,255,255,0.07)" />
							<text x={padL - 6} y={ly(t) + 3} textAnchor="end" fontSize={10} fill="rgba(255,255,255,0.35)" fontFamily={MONO}>
								{t}
							</text>
						</g>
					))}
					{STUDY_ROWS.map((rw, i) => {
						const x0 = padL + i * gw;
						const bw = (gw - 10) / 2;
						const a = rw.v0[metric];
						const b = rw.shared[metric];
						return (
							<g key={rw.drive} onMouseEnter={() => setHov(i)} onClick={() => setHov(i)}>
								<rect x={x0} y={padT} width={gw} height={H - padT - padB} fill={hov === i ? "rgba(255,255,255,0.04)" : "transparent"} />
								<rect x={x0 + 4} y={ly(a)} width={bw} height={ly(lo) - ly(a)} fill="#f0abfc" rx={2} />
								<rect x={x0 + 6 + bw} y={ly(b)} width={bw} height={ly(lo) - ly(b)} fill="#7dd3fc" rx={2} />
								<text x={x0 + gw / 2} y={H - padB + 15} textAnchor="middle" fontSize={10} fill={i === 0 ? "#fff" : "rgba(255,255,255,0.5)"} fontFamily={MONO}>
									{i === 0 ? "video 0" : `d${i}`}
								</text>
							</g>
						);
					})}
				</svg>
			</div>
			<div className="mt-2 min-h-[3.2rem] rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[11.5px] text-white/70">{info}</div>
		</Panel>
	);
}

/* 5.2 · the study result as section 4's score row: both AIs, video 0 or the average of the 11 unseen drives
 * (STUDY_ROWS from writeup/study_final; row 0 = video 0; averages match the study's 1.1498 / 0.4199). */
export function StudyScoreFig() {
	const [view, setView] = useState<"unseen" | "v0">("unseen");
	const avg = (m: "v0" | "shared") => {
		const rs = STUDY_ROWS.slice(1);
		const k = (p: keyof Part) => rs.reduce((t, r) => t + r[m][p], 0) / rs.length;
		return { score: k("score"), seg: k("seg"), pose: k("pose"), size: k("size") };
	};
	const pick = (m: "v0" | "shared") => (view === "v0" ? STUDY_ROWS[0]![m] : avg(m));
	const rows = [
		{ name: "video 0 model", p: pick("v0") },
		{ name: "shared model", p: pick("shared") },
	];
	const best = Math.min(rows[0]!.p.score, rows[1]!.p.score);
	const parts: { k: keyof Part; c: string }[] = [
		{ k: "seg", c: "#7dd3fc" },
		{ k: "pose", c: "#f0abfc" },
		{ k: "size", c: "#fcd34d" },
	];
	return (
		<figure className="my-8 font-mono tabular-nums">
			<div className="mb-3 flex flex-wrap gap-1.5">
				<Btn on={view === "v0"} onClick={() => setView("v0")}>
					video 0
				</Btn>
				<Btn on={view === "unseen"} onClick={() => setView("unseen")}>
					11 test drives
				</Btn>
			</div>
			{rows.map((r) => (
				<div key={r.name} className="grid grid-cols-2 items-end gap-x-4 gap-y-3 border-t border-white/12 py-4 sm:grid-cols-[1.6fr_1fr_1fr_1fr]">
					<div className="col-span-2 sm:col-span-1">
						<div className="text-[10.5px] tracking-[0.12em] text-white/50 uppercase">{r.name}</div>
						<div className="text-[34px] leading-tight" style={{ color: r.p.score === best ? "#86efac" : "#ff5a6e" }}>
							{r.p.score.toFixed(4)}
						</div>
					</div>
					{parts.map((pt) => (
						<div key={pt.k}>
							<div className="text-[10.5px] tracking-[0.12em] uppercase" style={{ color: pt.c }}>
								{pt.k}
							</div>
							<div className="text-xl">{r.p[pt.k].toFixed(4)}</div>
						</div>
					))}
				</div>
			))}
		</figure>
	);
}

/* ------------------------------------------------------------------ */
/* §4.1 what the codec draws + where SegNet disagrees (one scrubber)     */
/* Pictures exist for every 4th pair (pairs/NNN_*.{jpg,png}). The red    */
/* overlay is computed here: pixels where pairs/NNN_segreal.png and      */
/* NNN_segmade.png differ (SegNet on the original vs on my frame), drawn  */
/* 3 px wide on my frame. Counts match pairs.json (pair 300: 54 px).     */
/* ------------------------------------------------------------------ */

export function DrawsFig({ data, pair, setPair }: { data: PairData | null; pair: number; setPair: (n: number) => void }) {
	// real speed: two 2x2 videos (20 fps, one frame per pair), with and without the red changed pixels
	const [playing, setPlaying] = useState(false);
	const [show, setShow] = useState(true);
	const plain = useRef<HTMLVideoElement>(null);
	const red = useRef<HTMLVideoElement>(null);
	const refs = [useRef<HTMLCanvasElement>(null), useRef<HTMLCanvasElement>(null), useRef<HTMLCanvasElement>(null), useRef<HTMLCanvasElement>(null)];
	const active = () => (show ? red.current : plain.current);
	const draw = () => {
		const v = active();
		if (!v || v.readyState < 2) return;
		refs.forEach((r, k) => {
			const c = r.current;
			if (!c) return;
			if (c.width !== 512) {
				c.width = 512;
				c.height = 384;
			}
			c.getContext("2d")!.drawImage(v, (k % 2) * 512, Math.floor(k / 2) * 384, 512, 384, 0, 0, 512, 384);
		});
	};
	const seek = (n: number) => {
		for (const v of [plain.current, red.current]) if (v) v.currentTime = (n + 0.5) / 20;
	};
	useEffect(() => {
		seek(pair);
		const v = active();
		if (v) v.onseeked = draw;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [show]);
	useEffect(() => {
		const v = active();
		const other = show ? plain.current : red.current;
		if (!v) return;
		if (!playing) {
			v.pause();
			return;
		}
		other?.pause();
		void v.play();
		let id = 0;
		const tick = () => {
			draw();
			setPair(Math.min(599, Math.floor(v.currentTime * 20)));
			id = requestAnimationFrame(tick);
		};
		id = requestAnimationFrame(tick);
		return () => {
			cancelAnimationFrame(id);
			v.pause();
			if (other) other.currentTime = v.currentTime;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [playing, show]);
	const wrong = data ? Math.round(data.seg[pair]! * PIXELS) : null;
	const labels = ["original frame 2", "SegNet on the original", "inflated frame 2", "SegNet on the inflated"];
	return (
		<figure className="my-8">
			<video ref={plain} src={A("vid/score_plain.mp4")} muted playsInline loop preload="auto" className="hidden" onLoadedData={() => { seek(pair); }} onSeeked={() => !show && draw()} />
			<video ref={red} src={A("vid/score_red.mp4")} muted playsInline loop preload="auto" className="hidden" onLoadedData={() => { seek(pair); }} onSeeked={() => show && draw()} />
			<div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 font-mono text-[12px]">
				<span className="text-white/55">
					pair <span className="text-white">{pair}</span> of 600{wrong !== null && <> · <span style={{ color: "#ff5a6e" }}>{wrong}</span> pixels changed</>}
				</span>
				<label className="flex cursor-pointer items-center gap-1.5" style={{ color: "#ff5a6e" }}>
					<input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
					<span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#ff5a6e" }} />
					changed pixel
				</label>
			</div>
			<div className="grid grid-cols-2 gap-2">
				{labels.map((l, k) => (
					<div key={k}>
						<canvas ref={refs[k]} width={512} height={384} className="block aspect-[4/3] w-full rounded bg-black" style={{ imageRendering: k % 2 ? "pixelated" : undefined }} aria-label={l} />
						<div className="mt-1 font-mono text-[11px] text-white/50">{l}</div>
					</div>
				))}
			</div>
			<div className="mt-3 flex items-center gap-2">
				<PlayBtn playing={playing} onClick={() => setPlaying((p) => !p)} />
				<input
					type="range"
					className="cw-range cw-focus min-w-[140px] flex-1"
					min={0}
					max={599}
					value={pair}
					aria-label="Frame pair"
					onChange={(e) => {
						setPlaying(false);
						setPair(Number(e.target.value));
						seek(Number(e.target.value));
					}}
				/>
			</div>
		</figure>
	);
}
