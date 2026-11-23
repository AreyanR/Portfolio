import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { A, Btn, PlayBtn, SEG_CLASSES, SegLegend } from "./ui";
import { STUDY_ROWS } from "./studyData";

/*
 * Figures built from the final 0.1682 run. Images in comma-assets/fig/ and the numbers in fig.json
 * come from comma-lab/writeup/build/make_page_assets.py (figure_data.npz: frames, SegNet labels,
 * PoseNet motion for pairs 300 / 247 / 541, the pose correction on pair 300, map 175 before / after cleaning).
 */

type Pair = { pair: number; wrong: number; wrong_px?: [number, number][]; seg: number; pose: number; real_motion: number[]; made_motion: number[]; stored_motion?: number[]; target_motion?: number[] };
type FigData = {
	demo: Pair;
	best: Pair;
	worst: Pair;
	correction: { motion_before: number[]; motion_after: number[]; target: number[]; mean_pixel_change: number };
	cleaning: { map: number; total_changed: number; changed: [number, number, number, number][] };
};

const F = (p: string) => A(`fig/${p}`);
/** Class colour for text: the vehicle navy is too dark to read on black. */
const textColor = (c: number) => (c === 3 ? "#7c8cff" : SEG_CLASSES[c]![1]);
const MOTION = ["forward", "sideways", "up/down", "roll", "pitch", "yaw"];

let cache: Promise<FigData> | null = null;
function useFig() {
	const [d, setD] = useState<FigData | null>(null);
	useEffect(() => {
		cache ??= fetch(F("fig.json")).then((r) => r.json());
		cache.then(setD).catch(() => setD(null));
	}, []);
	return d;
}

function Label({ children }: { children: ReactNode }) {
	return <div className="mb-1.5 font-mono text-[10.5px] tracking-[0.12em] text-white/50 uppercase">{children}</div>;
}

function Img({ src, alt, pixel }: { src: string; alt: string; pixel?: boolean }) {
	return <img src={F(src)} alt={alt} className={`block w-full rounded-md ${pixel ? "cw-pixel" : ""}`} />;
}

function Caption({ children }: { children: ReactNode }) {
	return <figcaption className="mt-3 text-[0.92rem] leading-relaxed text-white/50">{children}</figcaption>;
}

/* Section 1 · what the judges say about pair 300 ---------------------------- */

function MotionList({ values, digits = 4, tall }: { values: number[]; digits?: number; tall?: boolean }) {
	return (
		<div className={`rounded-md border border-white/10 px-4 ${tall ? "flex flex-1 flex-col justify-around py-2" : "py-1.5"}`}>
			{MOTION.map((name, i) => (
				<div
					key={name}
					className={`flex items-baseline justify-between border-b border-white/[0.06] font-mono last:border-0 ${tall ? "py-1.5 text-[16px]" : "py-1 text-[12px]"}`}
				>
					<span className="text-white/55">{name}</span>
					<span className="tabular-nums">{values[i]!.toFixed(digits)}</span>
				</div>
			))}
		</div>
	);
}

/* Section 2 · how it works, start to finish, on pair 300 ------------------- */

function Step({ n, title, children, text, last }: { n: number; title: string; children: ReactNode; text?: ReactNode; last?: boolean }) {
	// one step on section 2's spine: big number in the margin, a line down to the next step, lit once scrolled to
	const ref = useRef<HTMLDivElement>(null);
	const [lit, setLit] = useState(false);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const io = new IntersectionObserver(([e]) => {
			if (e?.isIntersecting) {
				setLit(true);
				io.disconnect();
			}
		}, { rootMargin: "0px 0px -40% 0px" });
		io.observe(el);
		return () => io.disconnect();
	}, []);
	return (
		<div ref={ref} className="grid grid-cols-[36px_1fr] gap-x-3 sm:grid-cols-[52px_1fr] sm:gap-x-4 lg:-ml-16">
			<div className="flex flex-col items-center">
				<div className={`text-[24px] leading-none font-bold tabular-nums transition-colors duration-500 sm:text-[30px] ${lit ? "text-white" : "text-white/20"}`}>{String(n).padStart(2, "0")}</div>
				<div className={`mt-2 w-[2px] flex-1 rounded-full transition-colors duration-700 ${lit ? "bg-white/50" : "bg-white/10"}`} />
			</div>
			<div className={`min-w-0 ${last ? "pb-2 [&>figure:last-child]:mb-0" : "pb-14"}`}>
				<div className="pt-0.5 text-xl font-semibold tracking-tight">{title}</div>
				{text && <div className="cw-prose mt-2 mb-4 text-white/70">{text}</div>}
				{children}
			</div>
		</div>
	);
}

/* 2, step 1 · the original video as a still strip: frame 2 of five pairs spread across the minute (pairs/NNN_real.jpg) */
function VideoStripFig() {
	const frames = [0, 148, 300, 448, 596];
	return (
		<div className="grid grid-cols-5 gap-1.5">
			{frames.map((p) => (
				<img key={p} src={A(`pairs/${String(p).padStart(3, "0")}_real.jpg`)} alt={`The original video, pair ${p}`} className="block w-full rounded" />
			))}
		</div>
	);
}

/* step 4 · pair 300 learning through the real seg stage (vid/seg_learning.mp4 + .json: snapshot steps, each held `hold` frames) */
function LearningVideo() {
	const [info, setInfo] = useState<{ fps: number; hold: number; steps_per_epoch: number; steps: number[] } | null>(null);
	useEffect(() => {
		fetch(A("vid/seg_learning.json"))
			.then((r) => r.json())
			.then(setInfo)
			.catch(() => setInfo(null));
	}, []);
	const badge = (t: number) => {
		if (!info) return "";
		const i = Math.min(info.steps.length - 1, Math.floor((t * info.fps) / info.hold));
		const step = info.steps[i]!;
		return `epoch ${Math.floor(step / info.steps_per_epoch)}`;
	};
	return <VideoFig src="seg_learning.mp4" labels={["model's frame 2", "SegNet on it"]} framesPerPair={1} bigLabels hidePair badge={badge} />;
}

export function HowItWorksFig({ video, input, targets, training, inflation, compared, scoreFig }: { video: ReactNode; input: ReactNode; targets: ReactNode; training: ReactNode; inflation: ReactNode; compared: ReactNode; scoreFig?: ReactNode }) {
	const d = useFig();
	const p = d?.demo;
	return (
		<figure className="my-10">
			<Step n={1} title="Start from the video" text={video}>
				<VideoStripFig />
			</Step>
			<Step n={2} title="Take one pair" text={input}>
				<div className="grid grid-cols-2 gap-3">
					<div>
						<Label>frame 1</Label>
						<Img src="p300_real1.jpg" alt="Pair 300, frame 1" />
					</div>
					<div>
						<Label>frame 2</Label>
						<Img src="p300_real2.jpg" alt="Pair 300, frame 2" />
					</div>
				</div>
			</Step>
			<Step n={3} title="Run the judges" text={targets}>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.4fr_1fr]">
					<div>
						<Label>SegNet map</Label>
						<Img src="p300_stored_map.png" alt="SegNet map, pair 300" pixel />
					</div>
					<div className="flex flex-col">
						<Label>PoseNet motion</Label>
						{p?.stored_motion && <MotionList values={p.stored_motion} digits={3} tall />}
					</div>
				</div>
			</Step>
			<Step n={4} title="Train and pack" text={training}>
				<TrainLoopsFig />
				<div className="mt-8">
					<LearningVideo />
				</div>
			</Step>
			<Step n={5} title="Inflate" text={inflation}>
				<VideoFig src="frame2_side_by_side.mp4" labels={["original video", "inflated video"]} framesPerPair={1} bigLabels />
			</Step>
			<Step n={6} title="Score" text={compared} last>
				{scoreFig ?? <GradeFlip />}
			</Step>
		</figure>
	);
}

/* G11 · original vs final model, drag to compare ----------------------- */

export function CompareFig({ pair = 300 }: { pair?: number }) {
	const [frame, setFrame] = useState<1 | 2>(2);
	const [x, setX] = useState(50);
	const box = useRef<HTMLDivElement>(null);
	const drag = (clientX: number) => {
		const r = box.current!.getBoundingClientRect();
		setX(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
	};
	return (
		<figure className="my-8">
			<div className="mb-2 flex items-center justify-between">
				<Label>
					pair {pair} · frame {frame} · original | final model
				</Label>
				<div className="flex gap-1.5">
					<Btn on={frame === 1} onClick={() => setFrame(1)}>
						frame 1
					</Btn>
					<Btn on={frame === 2} onClick={() => setFrame(2)}>
						frame 2
					</Btn>
				</div>
			</div>
			<div
				ref={box}
				className="relative cursor-ew-resize overflow-hidden rounded-md select-none"
				onMouseMove={(e) => e.buttons === 1 && drag(e.clientX)}
				onMouseDown={(e) => drag(e.clientX)}
				onTouchMove={(e) => drag(e.touches[0]!.clientX)}
			>
				<img src={F(`p${pair}_made${frame}.jpg`)} alt={`Final model, frame ${frame}`} className="block w-full" draggable={false} />
				<img
					src={F(`p${pair}_real${frame}.jpg`)}
					alt={`Original, frame ${frame}`}
					className="absolute inset-0 block h-full w-full"
					style={{ clipPath: `inset(0 ${100 - x}% 0 0)` }}
					draggable={false}
				/>
				<div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white" style={{ left: `${x}%` }} />
				<div className="pointer-events-none absolute top-2 left-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white/80">original</div>
				<div className="pointer-events-none absolute top-2 right-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white/80">final model</div>
			</div>
			<input type="range" className="cw-range cw-focus mt-1" min={0} max={100} value={Math.round(x)} onChange={(e) => setX(Number(e.target.value))} aria-label="Compare original and final model" />
		</figure>
	);
}

/* G4 · best and worst pair --------------------------------------------- */

export function BestWorstFig() {
	const d = useFig();
	const [k, setK] = useState<"best" | "worst">("worst");
	const views = [
		["original", "real2.jpg", false],
		["mine", "made2.jpg", false],
		["SegNet on original", "seg_real.png", true],
		["SegNet on mine", "seg_made.png", true],
		["disagreement", "disagree.png", true],
	] as const;
	const [v, setV] = useState(4);
	const p = d?.[k];
	return (
		<figure className="my-8">
			<div className="mb-3 flex flex-wrap items-center gap-1.5">
				<Btn on={k === "best"} onClick={() => setK("best")}>
					best · pair 247
				</Btn>
				<Btn on={k === "worst"} onClick={() => setK("worst")}>
					worst · pair 541
				</Btn>
				<span className="mx-1 h-4 w-px bg-white/15" />
				{views.map(([l], i) => (
					<Btn key={l} on={v === i} onClick={() => setV(i)}>
						{l}
					</Btn>
				))}
			</div>
			{p && (
				<>
					<Img src={`p${p.pair}_${views[v]![1]}`} alt={`Pair ${p.pair}, ${views[v]![0]}`} pixel={views[v]![2]} />
					<div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[12px]">
						<div className="rounded-md border border-white/10 px-3 py-2">
							<div className="text-[10px] tracking-[0.1em] text-white/45 uppercase">pixels wrong</div>
							<div className="text-[var(--seg)] tabular-nums">
								{p.wrong} ({(p.seg * 100).toFixed(3)}%)
							</div>
						</div>
						<div className="rounded-md border border-white/10 px-3 py-2">
							<div className="text-[10px] tracking-[0.1em] text-white/45 uppercase">pose error</div>
							<div className="text-[var(--pose)] tabular-nums">{p.pose.toExponential(1)}</div>
						</div>
						<div className="rounded-md border border-white/10 px-3 py-2">
							<div className="text-[10px] tracking-[0.1em] text-white/45 uppercase">forward, real → mine</div>
							<div className="tabular-nums">
								{p.real_motion[0]!.toFixed(3)} → {p.made_motion[0]!.toFixed(3)}
							</div>
						</div>
					</div>
				</>
			)}
			<Caption>Red marks every pixel where SegNet's label on my frame differs from its label on the original (drawn 3 pixels wide so it shows).</Caption>
		</figure>
	);
}

/* 3.7 · map 175 before and after cleaning (make_cleaning_view.py, using clean_maps.py's own helpers) ---- */

type CleanPx = { y: number; x: number; from: number; to: number; bits_before: number; bits_after: number };
type CleanData = { map: number; before: { wrong: number; bits: number }; after: { wrong: number; bits: number }; changed: CleanPx[] };

export function CleaningFig() {
	const [d, setD] = useState<CleanData | null>(null);
	const [view, setView] = useState<"map" | "frame" | "seg">("map");
	const [state, setState] = useState<"before" | "after">("after");
	const [sel, setSel] = useState(0);
	const [maps, setMaps] = useState<{ before: ImageData; after: ImageData } | null>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	useEffect(() => {
		fetch(F("clean175.json"))
			.then((r) => r.json())
			.then((j: CleanData) => {
				// most expensive pixels first, so the first one you see makes the point
				j.changed.sort((a, b) => b.bits_before - b.bits_after - (a.bits_before - a.bits_after));
				setD(j);
			})
			.catch(() => setD(null));
		const load = (src: string) =>
			new Promise<ImageData>((res) => {
				const im = new Image();
				im.onload = () => {
					const c = document.createElement("canvas");
					c.width = im.width;
					c.height = im.height;
					const ctx = c.getContext("2d")!;
					ctx.drawImage(im, 0, 0);
					res(ctx.getImageData(0, 0, im.width, im.height));
				};
				im.src = F(src);
			});
		Promise.all([load("clean175_map_before.png"), load("clean175_map_after.png")]).then(([before, after]) => setMaps({ before, after }));
	}, []);
	const pt = d?.changed[sel];
	useEffect(() => {
		if (!maps || !pt || !canvasRef.current) return;
		const ctx = canvasRef.current.getContext("2d")!;
		const R = 8;
		const S = 16;
		const W1 = (2 * R + 1) * S;
		ctx.fillStyle = "#000";
		ctx.fillRect(0, 0, 2 * W1 + S, W1);
		(["before", "after"] as const).forEach((which, k) => {
			const img = maps[which];
			for (let dy = -R; dy <= R; dy++)
				for (let dx = -R; dx <= R; dx++) {
					const y = pt.y + dy;
					const x = pt.x + dx;
					if (y < 0 || x < 0 || y >= img.height || x >= img.width) continue;
					const o = (y * img.width + x) * 4;
					ctx.fillStyle = `rgb(${img.data[o]},${img.data[o + 1]},${img.data[o + 2]})`;
					ctx.fillRect(k * (W1 + S) + (dx + R) * S, (dy + R) * S, S - 1, S - 1);
				}
			ctx.strokeStyle = "#fff";
			ctx.lineWidth = 2;
			ctx.strokeRect(k * (W1 + S) + R * S - 1, R * S - 1, S + 1, S + 1);
		});
	}, [maps, pt]);

	const src = `clean175_${view}_${state}.${view === "frame" ? "jpg" : "png"}`;
	const names = SEG_CLASSES.map((c) => c[0]);
	const n = (v: number) => Math.round(v).toLocaleString("en-US");
	return (
		<figure className="my-8">
			<div className="mb-3 flex flex-wrap items-center gap-1.5">
				<Btn on={view === "map"} onClick={() => setView("map")}>
					stored map
				</Btn>
				<Btn on={view === "frame"} onClick={() => setView("frame")}>
					frame drawn from it
				</Btn>
				<Btn on={view === "seg"} onClick={() => setView("seg")}>
					SegNet on that frame
				</Btn>
				<span className="mx-1 h-4 w-px bg-white/15" />
				<Btn on={state === "before"} onClick={() => setState("before")}>
					before cleaning
				</Btn>
				<Btn on={state === "after"} onClick={() => setState("after")}>
					after cleaning
				</Btn>
			</div>
			<div className="relative">
				<Img src={src} alt={`Map ${d?.map ?? 175}, ${view}, ${state} cleaning`} pixel={view !== "frame"} />
				{d && (
					<svg viewBox="0 0 512 384" className="absolute inset-0 h-full w-full">
						{d.changed.map((c, i) => (
							<circle
								key={i}
								cx={c.x + 0.5}
								cy={c.y + 0.5}
								r={i === sel ? 9 : 6}
								fill="none"
								stroke={i === sel ? "#fff" : "rgba(255,255,255,0.7)"}
								strokeWidth={i === sel ? 2 : 1.2}
								className="cursor-pointer"
								onClick={() => setSel(i)}
							/>
						))}
					</svg>
				)}
			</div>
			<div className="mt-2">
				<SegLegend />
			</div>
			{d && (
				<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
					{(
						[
							["SegNet pixels wrong on this frame", d.before.wrong, d.after.wrong],
							["bits to store this map", d.before.bits, d.after.bits],
						] as const
					).map(([label, a, b]) => (
						<div key={label} className="rounded-md border border-white/10 px-3 py-2">
							<div className="font-mono text-[10px] tracking-[0.1em] text-white/45 uppercase">{label}</div>
							<div className="font-mono text-[15px] tabular-nums">
								<span className={state === "before" ? "text-white" : "text-white/40"}>{n(a)}</span>
								<span className="text-white/30"> → </span>
								<span className={state === "after" ? "text-[#86efac]" : "text-white/40"}>{n(b)}</span>
							</div>
						</div>
					))}
				</div>
			)}
			{pt && (
				<div className="mt-4 grid grid-cols-1 items-center gap-4 rounded-lg border border-white/10 p-3 sm:grid-cols-[1.2fr_1fr]">
					<div>
						<canvas ref={canvasRef} width={2 * 17 * 16 + 16} height={17 * 16} className="block w-full rounded" />
						<div className="mt-1 flex justify-between font-mono text-[10px] text-white/45">
							<span>before</span>
							<span>after</span>
						</div>
					</div>
					<div className="font-mono text-[12.5px]">
						<div className="text-[10px] tracking-[0.1em] text-white/45 uppercase">
							changed pixel {sel + 1} of {d!.changed.length}
						</div>
						<div className="mt-1.5">
							<span style={{ color: textColor(pt.from) }}>{names[pt.from]}</span> → <span style={{ color: textColor(pt.to) }}>{names[pt.to]}</span>
						</div>
						<div className="mt-1 tabular-nums">
							cost {pt.bits_before.toFixed(2)} bits → <span className="text-[#86efac]">{pt.bits_after.toFixed(2)} bits</span>
						</div>
						<div className="mt-3 flex gap-1.5">
							<Btn onClick={() => setSel((s) => (s + d!.changed.length - 1) % d!.changed.length)}>←</Btn>
							<Btn onClick={() => setSel((s) => (s + 1) % d!.changed.length)}>→</Btn>
						</div>
					</div>
				</div>
			)}
			<Caption>
				Map {d?.map ?? 175}, the most-edited map, had 22 pixels changed. SegNet is compared with SegNet on the real video. Bits are what the map guesser spends on the map, with the 5 maps before it as shipped.
			</Caption>
		</figure>
	);
}

/* G18 · lab version vs the rewrite -------------------------------------- */

export function RewriteFig() {
	// lab v13c vs the rewrite (WRITEUP_PLAN.md "Lab v13c" table; rewrite = solution/report.txt)
	const rows: { l: string; col: string; lab: number; re: number; labB?: string; reB?: string }[] = [
		{ l: "seg part", col: "var(--seg)", lab: 0.0269, re: 0.0289 },
		{ l: "pose part", col: "var(--pose)", lab: 0.031, re: 0.0197 },
		{ l: "size part", col: "var(--size)", lab: 0.1196, re: 0.1196, labB: "179,564 B", reB: "179,609 B" },
	];
	const max = 0.1196;
	const tone = (lab: number, re: number) => (re > lab + 1e-9 ? "#ff5a6e" : re < lab - 1e-9 ? "#86efac" : "rgba(255,255,255,0.85)");
	const cell = (v: number, col: string, color: string, bytes?: string) => (
		<div>
			<div className="h-2 rounded-sm" style={{ width: `${(v / max) * 100}%`, background: col }} />
			<div className="mt-1 text-[18px]" style={{ color }}>
				{v.toFixed(4)} {bytes && <span className="text-[12px] text-white/45">{bytes}</span>}
			</div>
		</div>
	);
	return (
		<figure className="my-8">
			<div className="grid grid-cols-[90px_1fr_1fr] items-center gap-x-5 gap-y-3 font-mono tabular-nums">
				<span />
				<span className="text-[12px] text-white/55">after the upgrades</span>
				<span className="text-[12px] text-white/55">retrained from scratch</span>
				{rows.map((r) => (
					<Fragment key={r.l}>
						<span className="text-[12px]" style={{ color: r.col }}>{r.l}</span>
						{cell(r.lab, r.col, "rgba(255,255,255,0.85)", r.labB)}
						{cell(r.re, r.col, tone(r.lab, r.re), r.reB)}
					</Fragment>
				))}
				<span className="border-t border-white/10 pt-3 text-[12px] text-white/80">score</span>
				<span className="border-t border-white/10 pt-3 text-[28px]">0.1774</span>
				<span className="border-t border-white/10 pt-3 text-[28px]" style={{ color: "#86efac" }}>0.1682</span>
			</div>
		</figure>
	);
}


/* Videos: labels and the pair counter are drawn by the page, not burned into the video ---------- */

export function VideoFig({
	src,
	labels,
	framesPerPair,
	warning,
	caption,
	stacked = false,
	bigLabels = false,
	hidePair = false,
	badge,
}: {
	src: string;
	labels: string[];
	framesPerPair: 1 | 2;
	warning?: boolean;
	caption?: ReactNode;
	stacked?: boolean; // panels on top of each other instead of side by side
	bigLabels?: boolean; // larger panel labels, for the section 2 inflate video
	hidePair?: boolean; // no pair counter, for the training video (one pair, many steps)
	badge?: (t: number) => string; // corner text in place of the pair counter
}) {
	const ref = useRef<HTMLVideoElement>(null);
	const [t, setT] = useState(0);
	const [dur, setDur] = useState(0);
	const [playing, setPlaying] = useState(false);
	const pair = Math.min(599, Math.floor((t * 20) / framesPerPair));
	return (
		<figure className="my-8">
			{warning && (
				<div className="mb-2 font-mono text-[10.5px] text-amber-200/70">⚠ Flashing: frame 1 and frame 2 of my output look different, so the right side flickers.</div>
			)}
			<div className="relative overflow-hidden rounded-md bg-black">
				<video
					ref={ref}
					src={A(`vid/${src}`)}
					muted
					playsInline
					loop
					preload="metadata"
					className="block w-full"
					onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
					onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
					onPlay={() => setPlaying(true)}
					onPause={() => setPlaying(false)}
				/>
				{labels.map((l, i) => (
					<div
						key={l}
						className={`pointer-events-none absolute top-2 ml-2 rounded bg-black/70 font-mono text-white/85 ${bigLabels ? "px-2 py-1 text-[13px]" : "px-1.5 py-0.5 text-[10px]"}`}
						style={stacked ? { left: 0, top: `calc(${(i / labels.length) * 100}% + 0.5rem)` } : { left: `${(i / labels.length) * 100}%` }}
					>
						{l}
					</div>
				))}
				{(badge || !hidePair) && <div className="pointer-events-none absolute right-2 bottom-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white/85 tabular-nums">{badge ? badge(t) : `pair ${pair}`}</div>}
			</div>
			<div className="mt-2 flex items-center gap-3">
				<PlayBtn playing={playing} onClick={() => (playing ? ref.current?.pause() : void ref.current?.play())} />
				<input
					type="range"
					className="cw-range cw-focus flex-1"
					min={0}
					max={Math.max(dur, 0.01)}
					step={0.05}
					value={t}
					aria-label="Seek"
					onChange={(e) => {
						if (ref.current) ref.current.currentTime = Number(e.target.value);
						setT(Number(e.target.value));
					}}
				/>
				<span className="font-mono text-[11px] text-white/45 tabular-nums">
					{t.toFixed(0)}s / {dur.toFixed(0)}s
				</span>
			</div>
			{caption && <Caption>{caption}</Caption>}
		</figure>
	);
}

/* 5.2 · the study video with a drive picker (writeup/build/make_unseen_video_final.py via run_drive_videos.sh:
 * vid/drive_NN.mp4, NN = index in STUDY_ROWS, 00 = video 0). Each drive drawn exactly as the study ran it. */
export function StudyVideoFig() {
	const [i, setI] = useState(8); // the hardest unseen drive opens the figure
	return (
		<div>
			<div className="mb-2 flex flex-wrap gap-1.5">
				{STUDY_ROWS.map((_, k) => (
					<Btn key={k} on={k === i} onClick={() => setI(k)}>
						{k === 0 ? "video 0" : `d${k}`}
					</Btn>
				))}
			</div>
			<VideoFig
				key={i}
				src={`drive_${String(i).padStart(2, "0")}.mp4`}
				labels={["original", "video 0 model", "shared model"]}
				framesPerPair={1}
			/>
		</div>
	);
}

/* G9 · training from flat grey (checkpoint slider) ---------------------- */

type TrainData = { pair: number; steps_per_epoch: number; snapshots: { step: number; wrong: number }[] };

export function TrainingFig({ bare }: { bare?: boolean }) {
	const [d, setD] = useState<TrainData | null>(null);
	const [i, setI] = useState(0);
	const [playing, setPlaying] = useState(false);
	// plays through the checkpoints when started, holding on the last one before looping
	useEffect(() => {
		if (!playing || !d) return;
		const last = i === d.snapshots.length - 1;
		const t = window.setTimeout(() => setI(last ? 0 : i + 1), last ? 2500 : 650);
		return () => window.clearTimeout(t);
	}, [playing, i, d]);
	useEffect(() => {
		fetch(F("train/train.json"))
			.then((r) => r.json())
			.then((j: TrainData) => {
				setD(j);
				// open on the trained result, play replays it from step 0
				setI(j.snapshots.length - 1);
				j.snapshots.forEach((s) => {
					const n = String(s.step).padStart(4, "0");
					new Image().src = F(`train/step_${n}.jpg`);
					new Image().src = F(`train/seg_${n}.png`);
				});
			})
			.catch(() => setD(null));
	}, []);
	if (!d) return null;
	const s = d.snapshots[i]!;
	const n = String(s.step).padStart(4, "0");
	return (
		<figure className={bare ? "" : "my-10"}>
			{bare ? null : (
				<div className="mb-4">
					<div className="text-lg font-semibold tracking-tight">Watching it learn</div>
					<div className="font-mono text-[11px] text-white/45">pair {d.pair} during training</div>
				</div>
			)}
			<div className="grid grid-cols-2 gap-3">
				<div>
					<Label>model's frame 2</Label>
					<Img src={`train/step_${n}.jpg`} alt={`Frame 2 after ${s.step} steps`} />
				</div>
				<div>
					<Label>SegNet on it</Label>
					<Img src={`train/seg_${n}.png`} alt={`SegNet after ${s.step} steps`} pixel />
				</div>
			</div>
			<div className="mt-2">
				<SegLegend />
			</div>
			<div className="mt-3 flex items-center gap-3">
				<PlayBtn
						playing={playing}
						onClick={() => {
							if (!playing && i === d.snapshots.length - 1) setI(0);
							setPlaying((p) => !p);
						}}
					/>
				<input
					type="range"
					className="cw-range cw-focus flex-1"
					min={0}
					max={d.snapshots.length - 1}
					value={i}
					onChange={(e) => {
						setPlaying(false);
						setI(Number(e.target.value));
					}}
					aria-label="Training step"
				/>
				<span className="shrink-0 font-mono text-[12px] text-white/60 tabular-nums">
					step {s.step} · epoch {(s.step / d.steps_per_epoch).toFixed(2)}
				</span>
			</div>
		</figure>
	);
}

/* G19 · the weights, as pack.py writes them --------------------------- */

type WeightsData = {
	five_bit_hist: number[];
	eight_bit_hist: number[];
	five_bit_count: number;
	eight_bit_count: number;
	mismatch: {
		rows_total: number;
		rows_differ: number;
		weights_total: number;
		weights_moved: number;
		examples: { layer: string; row: number; steps: number; biggest: number; x64: number; x32: number; k64: number; k32: number }[];
	};
};

function useWeights() {
	const [d, setD] = useState<WeightsData | null>(null);
	useEffect(() => {
		fetch(F("weights.json"))
			.then((r) => r.json())
			.then(setD)
			.catch(() => setD(null));
	}, []);
	return d;
}

function Hist({ counts, lo, color, label }: { counts: number[]; lo: number; color: string; label: string }) {
	const max = Math.max(...counts);
	const n = counts.length;
	return (
		<div>
			<Label>{label}</Label>
			<svg viewBox={`0 0 ${n} 100`} preserveAspectRatio="none" className="block h-32 w-full rounded-md bg-white/[0.02]">
				{counts.map((c, i) => (
					<rect key={i} x={i + 0.08} y={100 - (c / max) * 96} width={0.84} height={(c / max) * 96} fill={color} />
				))}
			</svg>
			<div className="mt-1 flex justify-between font-mono text-[10px] text-white/40">
				<span>{lo}</span>
				<span>0</span>
				<span>{lo + n - 1}</span>
			</div>
		</div>
	);
}

export function WeightsFig() {
	const d = useWeights();
	const sizes: [string, number][] = [
		["16-bit", 119],
		["8-bit", 57],
		["5-bit", 44.0],
	];
	return (
		<figure className="my-8">
			<div className="mb-6 flex flex-col gap-2">
				{sizes.map(([l, kb]) => (
					<div key={l} className="grid grid-cols-[60px_1fr] items-center gap-3">
						<span className="font-mono text-[12px] text-white/60">{l}</span>
						<div className="flex items-center gap-2">
							<div className="h-4 rounded-sm bg-[var(--size)]" style={{ width: `${(kb / 119) * 100}%`, opacity: l === "5-bit" ? 1 : 0.4 }} />
							<span className="font-mono text-[11px] whitespace-nowrap text-white/70">{kb} KB</span>
						</div>
					</div>
				))}
			</div>
			{d && (
				<div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_1.4fr]">
					<Hist counts={d.five_bit_hist} lo={-15} color="var(--seg)" label={`5-bit values · ${d.five_bit_count.toLocaleString("en-US")} weights`} />
					<Hist counts={d.eight_bit_hist} lo={-127} color="var(--pose)" label={`8-bit values · ${d.eight_bit_count.toLocaleString("en-US")} (frame 1's parts, biases, norms)`} />
				</div>
			)}
			<Caption>weights.bin size at each step, then how often each whole number appears in the final archive, counted from what pack.py writes.</Caption>
		</figure>
	);
}

/* 3.10 · animated. One real weight of the lab's trained trunk (CommaAI-Learning/prototype/out/stage_qXpose.pt, the model
 * v13a packed: down.dw, row 7, weight 8), divided by its row's step size: training (float32) gets exactly 4.5, a tie, and
 * rounds to the even 4; packing (float64) gets 4.50000017 and rounds to 5. The number line zooms in to show it. Then all
 * 51,008 5-bit weights of that model as one strip, the 225 that pack stored differently from training in red
 * (writeup/build/rounding_mismatch.py -> rounding_mismatch.json). PoseNet figures from the lab's notes (PIVOT_NOTES.md
 * 3.10); scores from the v13a and v13b reports. */
export function RoundingTieFig() {
	const [d, setD] = useState<{ weights: number; weights_diff: number; diff_idx: number[] } | null>(null);
	const [t, setT] = useState(0); // 0..1 animation progress
	const [run, setRun] = useState(0);
	const [seen, setSeen] = useState(false);
	const ref = useRef<HTMLElement>(null);
	useEffect(() => {
		fetch(F("rounding_mismatch.json"))
			.then((r) => r.json())
			.then(setD)
			.catch(() => setD(null));
	}, []);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const io = new IntersectionObserver(([e]) => e && e.isIntersecting && setSeen(true), { threshold: 0.35 });
		io.observe(el);
		return () => io.disconnect();
	}, []);
	useEffect(() => {
		if (!seen) return;
		const t0 = performance.now();
		let raf = 0;
		const tick = (now: number) => {
			const k = Math.min(1, (now - t0) / 9000);
			setT(k);
			if (k < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [seen, run]);

	const X32 = 4.5, X64 = 4.500000172561627;
	const clamp = (v: number) => Math.max(0, Math.min(1, v));
	const ease = (v: number) => 1 - Math.pow(1 - clamp(v), 3);
	// timeline: training lands on 4.5 and rounds to 4; zoom in; packing lands past halfway and rounds to 5; the strip fills
	const land32 = ease(t / 0.12);
	const round32 = ease((t - 0.14) / 0.1);
	const zoom = ease((t - 0.3) / 0.18);
	const land64 = ease((t - 0.46) / 0.08);
	const round64 = ease((t - 0.55) / 0.08);
	const strip = clamp((t - 0.66) / 0.3);
	const W = 640, L = 40, R = 600;
	const half = Math.exp(Math.log(0.62) + (Math.log(3e-7) - Math.log(0.62)) * zoom);
	const xv = (v: number) => L + ((v - (4.5 - half)) / (2 * half)) * (R - L);
	const inView = (v: number) => xv(v) >= L - 1 && xv(v) <= R + 1;
	const yLine = 70;
	const dot = (v: number, k: number, rk: number, to: number, color: string, label: string, dy: number) => {
		if (k <= 0) return null;
		const x = xv(v);
		const y = yLine - 30 * (1 - k) + dy;
		const tx = inView(to) ? xv(to) : to > v ? R : L;
		return (
			<g>
				{rk > 0 && <line x1={x} x2={x + (tx - x) * rk} y1={y} y2={y} stroke={color} strokeWidth={2} strokeOpacity={0.7} />}
				<circle cx={x} cy={y} r={6} fill={color} />
				<text x={x} y={y - 12} textAnchor="middle" fontSize={11} fill={color} fontFamily="monospace">
					{label}
				</text>
			</g>
		);
	};
	const GW = 400, GH = 128; // 51,200 cells
	const gridRef = useRef<HTMLCanvasElement>(null);
	useEffect(() => {
		const c = gridRef.current;
		const g = c?.getContext("2d");
		if (!c || !g || !d) return;
		g.fillStyle = "#0b0b0d";
		g.fillRect(0, 0, GW, GH);
		const n = Math.floor(d.weights * strip);
		g.fillStyle = "rgba(255,255,255,0.16)";
		const rows = Math.floor(n / GW);
		g.fillRect(0, 0, GW, rows);
		g.fillRect(0, rows, n % GW, 1);
		g.fillStyle = "#ff5a6e";
		for (const i of d.diff_idx) if (i < n) g.fillRect((i % GW) - 1, Math.floor(i / GW) - 1, 3, 3);
	}, [d, strip]);
	const total = d ? d.weights.toLocaleString("en-US") : "51,008";
	return (
		<figure ref={ref} className="my-8">
			<div className="mb-2 flex items-baseline justify-between gap-3">
				<span className="font-mono text-[11.5px] text-white/55">one real weight, divided by its row's step size, then rounded to a whole number</span>
				<button type="button" onClick={() => { setSeen(true); setRun((r) => r + 1); }} className="cw-focus shrink-0 font-mono text-[11px] text-white/50 hover:text-white">
					↻ replay
				</button>
			</div>
			<svg viewBox={`0 0 ${W} 150`} className="block w-full" role="img" aria-label="Training computes exactly 4.5 and rounds to 4; packing computes 4.50000017 and rounds to 5">
				<line x1={L} x2={R} y1={yLine} y2={yLine} stroke="rgba(255,255,255,0.35)" />
				{[4, 4.5, 5].filter(inView).map((v) => (
					<g key={v}>
						<line x1={xv(v)} x2={xv(v)} y1={yLine - (v === 4.5 ? 6 : 10)} y2={yLine + (v === 4.5 ? 6 : 10)} stroke={v === 4.5 ? "rgba(255,255,255,0.45)" : "white"} strokeDasharray={v === 4.5 ? "2 2" : undefined} />
						<text x={xv(v)} y={yLine + 26} textAnchor="middle" fontSize={v === 4.5 ? 11 : 14} fill={v === 4.5 ? "rgba(255,255,255,0.5)" : "white"} fontFamily="monospace">
							{v === 4.5 ? (zoom > 0.9 ? "exactly 4.5" : "halfway") : v}
						</text>
					</g>
				))}
				{zoom > 0.9 && (
					<>
						<text x={L} y={yLine + 26} fontSize={11} fill="rgba(255,255,255,0.45)" fontFamily="monospace">
							← to 4
						</text>
						<text x={R} y={yLine + 26} textAnchor="end" fontSize={11} fill="rgba(255,255,255,0.45)" fontFamily="monospace">
							to 5 →
						</text>
						<text x={(L + R) / 2} y={yLine + 46} textAnchor="middle" fontSize={10.5} fill="rgba(255,255,255,0.4)" fontFamily="monospace">
							zoomed in two million times
						</text>
					</>
				)}
				{dot(X32, land32, round32, 4, "white", round32 > 0.95 ? "training: 4.5 → 4" : "training: 4.5", 0)}
				{dot(X64, land64, round64, 5, "#ff5a6e", round64 > 0.95 ? "packing: 4.50000017 → 5" : "packing: 4.50000017", -26)}
			</svg>
			<div className="mt-3 font-mono text-[11.5px] text-white/55">all {total} weights of the main model, one pixel each (red ones drawn larger)</div>
			<canvas ref={gridRef} width={GW} height={GH} className="mt-1 block w-full rounded-sm" style={{ imageRendering: "pixelated" }} aria-label="One pixel per weight; the ones packing stored differently from training in red" />
			<div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 font-mono tabular-nums">
				<div>
					<div className="text-[10.5px] tracking-[0.12em] text-[#ff5a6e] uppercase">weights shipped one step off</div>
					<div className="text-2xl">
						{d ? d.diff_idx.filter((i) => i / d.weights <= strip).length : 0} of {total}
					</div>
				</div>
				<div>
					<div className="text-[10.5px] tracking-[0.12em] text-white/55 uppercase">score once both match</div>
					<div className="text-2xl">0.1798 → 0.1775</div>
				</div>
			</div>
			<Caption>Training rounded the weights with 32-bit numbers, packing redid it with 64-bit numbers. Training leaves many weights exactly on a halfway point, and there the two disagree. 32-bit sees exactly 4.5 and rounds to the even 4, while 64-bit sees a hair more and rounds to 5. Only 225 weights (0.44%) shipped one step off, but PoseNet noticed. Its error on the shipped model was about 9× what it was on the trained one (3.8e-3 vs 4.4e-4). Measured on the lab's trained model from 3.9.</Caption>
		</figure>
	);
}

/* G16 · the rounding mismatch, reproduced on the final weights ----------- */

export function RoundingFig() {
	const d = useWeights();
	const e = d?.mismatch.examples[0];
	if (!d || !e) return null;
	const row = (bits: string, x: number, k: number, hi: boolean) => (
		<div className={`rounded-md border px-3 py-2.5 ${hi ? "border-[#f0abfc]/60" : "border-white/10"}`}>
			<div className="font-mono text-[10px] tracking-[0.12em] text-white/45 uppercase">{bits}</div>
			<div className="mt-1 font-mono text-[13px] text-white/80 tabular-nums">
				log2({e.biggest.toFixed(6)} / {e.steps}) × 8 = <span className="text-white">{x.toFixed(8)}</span>
			</div>
			<div className="mt-1 font-mono text-[13px] tabular-nums">
				round up → k = <span className={hi ? "text-[var(--pose)]" : "text-white"}>{k}</span>
				<span className="text-white/45"> · scale 2^({k}/8)</span>
			</div>
		</div>
	);
	return (
		<figure className="my-8">
			<Label>
				{e.layer}, row {e.row}
			</Label>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{row("64-bit numbers", e.x64, e.k64, false)}
				{row("32-bit numbers", e.x32, e.k32, true)}
			</div>
			<Caption>
				The same row's scale, computed both ways. Reproduced on the final weights, where {d.mismatch.rows_differ} of {d.mismatch.rows_total.toLocaleString("en-US")} rows sit on a boundary like this and{" "}
				{d.mismatch.weights_moved} weights would round differently.
			</Caption>
		</figure>
	);
}

/* Section 2, step 3 · how training and packing work ----------------------- */

/* 2 · training, drawn top to bottom with its two stages (replaces the ring on the page; TrainStagesDiagram and the
 * original TrainDiagram are kept). Stage 1 (600 epochs): every weight learns, graded by SegNet on frame 2 with wrong
 * pixels counted 10x. Stage 2 (500 epochs): the shared trunk and the frame 2 layer freeze; only frame 1's 11,235 weights
 * learn, graded by PoseNet on the pair (log of the squared motion error). Numbers from solution/frame_model.py, train_frame_model.py.
 * Images: pair 300 as the final model draws it. Plays stage 1 then stage 2 until a stage is clicked. */
export function TrainFlowFig() {
	const [stage, setStage] = useState<1 | 2>(1);
	const [auto, setAuto] = useState(true);
	useEffect(() => {
		if (!auto) return;
		const t = window.setInterval(() => setStage((s) => (s === 1 ? 2 : 1)), 6000);
		return () => window.clearInterval(t);
	}, [auto]);
	const pick = (s: 1 | 2) => {
		setAuto(false);
		setStage(s);
	};
	const one = stage === 1;
	const C = one ? "#7dd3fc" : "#f0abfc"; // the grading judge's colour
	const mono = "IBM Plex Mono";
	const W = 640, H = 740;
	const ease = "all 450ms ease";
	// a block of the model: live (its judge's colour) or frozen (hatched, dim, locked)
	const block = (x: number, y: number, w: number, h: number, title: string, sub: string, live: boolean) => (
		<g>
			<rect x={x} y={y} width={w} height={h} rx={10} fill={live ? `${C}1f` : "url(#tf-hatch)"} stroke={live ? C : "rgba(255,255,255,0.22)"} strokeWidth={live ? 1.6 : 1.2} style={{ transition: ease }} />
			<text x={x + w / 2} y={y + h / 2 - 3} textAnchor="middle" fontSize={15} fontWeight={600} fill={live ? "#fff" : "rgba(255,255,255,0.45)"} fontFamily="Barlow" style={{ transition: ease }}>
				{title}
			</text>
			<text x={x + w / 2} y={y + h / 2 + 15} textAnchor="middle" fontSize={11} fill={live ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.3)"} fontFamily={mono} style={{ transition: ease }}>
				{sub}
			</text>
			<g opacity={live ? 0 : 1} style={{ transition: ease }}>
				<rect x={x + w - 70} y={y - 9} width={58} height={18} rx={9} fill="#0b0b0d" stroke="rgba(255,255,255,0.3)" />
				<path d={`M${x + w - 60},${y - 1} v-2.5 a3.5,3.5 0 0 1 7,0 v2.5`} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={1.2} />
				<rect x={x + w - 61.5} y={y - 1} width={10} height={7} rx={1.5} fill="rgba(255,255,255,0.7)" />
				<text x={x + w - 47} y={y + 4} fontSize={9.5} fill="rgba(255,255,255,0.75)" fontFamily={mono}>
					frozen
				</text>
			</g>
		</g>
	);
	const flow = (d: string, on = true) => (
		<path d={d} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.6} strokeDasharray="5 6" markerEnd="url(#tf-arrow)" opacity={on ? 1 : 0.12} style={{ transition: ease }}>
			{on && <animate attributeName="stroke-dashoffset" from="22" to="0" dur="0.9s" repeatCount="indefinite" />}
		</path>
	);
	const back = one ? "M220,642 L36,642 L36,177 L90,177" : "M220,642 L36,642 L36,260 L90,260";
	const label = (x: number, y: number, t: string) => (
		<text x={x} y={y} textAnchor="middle" fontSize={12} fill="rgba(255,255,255,0.7)" fontFamily={mono}>
			{t}
		</text>
	);
	return (
		<figure className="my-10">
			<div className="mb-4 grid grid-cols-2 gap-2">
				{([1, 2] as const).map((s) => (
					<button
						key={s}
						type="button"
						onClick={() => pick(s)}
						className="cw-focus rounded-lg border px-4 py-3 text-left transition-colors"
						style={{ borderColor: stage === s ? (s === 1 ? "#7dd3fc" : "#f0abfc") : "rgba(255,255,255,0.12)", background: stage === s ? "rgba(255,255,255,0.04)" : "transparent" }}
					>
						<div className="font-mono text-[11px] tracking-[0.12em] uppercase" style={{ color: s === 1 ? "#7dd3fc" : "#f0abfc" }}>
							stage {s} · {s === 1 ? "600" : "500"} epochs
						</div>
						<div className="mt-1 text-[15px] text-white">{s === 1 ? "Train everything for SegNet" : "Train frame 1 for PoseNet"}</div>
						<div className="mt-2 h-0.5 overflow-hidden rounded bg-white/10">
							{auto && stage === s && <div key={`${s}-${stage}`} className="h-full" style={{ background: s === 1 ? "#7dd3fc" : "#f0abfc", animation: "tf-fill 6s linear forwards" }} />}
							{!auto && stage === s && <div className="h-full w-full" style={{ background: s === 1 ? "#7dd3fc" : "#f0abfc" }} />}
						</div>
					</button>
				))}
			</div>
			<style>{"@keyframes tf-fill { from { width: 0 } to { width: 100% } }"}</style>
			<svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={one ? "Stage 1: every weight learns, graded by SegNet on frame 2" : "Stage 2: only frame 1's weights learn, graded by PoseNet on the pair"}>
				<defs>
					<pattern id="tf-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
						<rect width="8" height="8" fill="rgba(255,255,255,0.02)" />
						<line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
					</pattern>
					<marker id="tf-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
						<path d="M0,0 L10,5 L0,10 z" fill="rgba(255,255,255,0.7)" />
					</marker>
					<marker id="tf-arrow-c" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
						<path d="M0,0 L10,5 L0,10 z" fill={C} />
					</marker>
				</defs>

				{/* in: the stored outputs */}
				<rect x={170} y={8} width={300} height={58} rx={12} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.3)" />
				<image href={F("p300_stored_map.png")} x={182} y={17} width={53} height={40} preserveAspectRatio="xMidYMid slice" />
				<text x={248} y={33} fontSize={15} fontWeight={600} fill="#fff" fontFamily="Barlow">
					stored outputs
				</text>
				<text x={248} y={51} fontSize={11} fill="rgba(255,255,255,0.55)" fontFamily={mono}>
					map + 6 motion values
				</text>
				{flow("M320,66 L320,98")}

				{/* the frame model */}
				<rect x={60} y={104} width={520} height={200} rx={18} fill="#0b0b0d" stroke="rgba(255,255,255,0.5)" strokeWidth={1.3} />
				<text x={80} y={128} fontSize={13} fill="rgba(255,255,255,0.8)" fontFamily={mono}>
					frame model
				</text>
				<text x={560} y={128} textAnchor="end" fontSize={13} fill="rgba(255,255,255,0.5)" fontFamily={mono}>
					64,358 weights
				</text>
				{block(90, 142, 460, 70, "shared trunk", "U-Net · 53,123 weights", one)}
				{flow("M200,212 L200,226")}
				{flow("M440,212 L440,226", one)}
				{block(90, 228, 220, 64, "frame 1 head", "11,235 weights · motion in", true)}
				{block(330, 228, 220, 64, "frame 2 layer", "part of the trunk", one)}

				{/* the two frames it draws */}
				{flow("M200,292 L200,326")}
				{flow("M440,292 L440,326")}
				<image href={F("p300_made1.jpg")} x={110} y={332} width={180} height={135} style={{ opacity: one ? 0.55 : 1, transition: ease }} />
				<image href={F("p300_made2.jpg")} x={350} y={332} width={180} height={135} />
				<rect x={110} y={332} width={180} height={135} rx={4} fill="none" stroke={one ? "rgba(255,255,255,0.15)" : C} strokeWidth={1.4} style={{ transition: ease }} />
				<rect x={350} y={332} width={180} height={135} rx={4} fill="none" stroke={one ? C : "rgba(255,255,255,0.35)"} strokeWidth={1.4} style={{ transition: ease }} />
				{label(200, 486, "frame 1")}
				{label(440, 486, "frame 2")}

				{/* the judge */}
				{flow("M200,494 L200,526", !one)}
				{flow("M440,494 L440,526")}
				<rect x={one ? 330 : 90} y={530} width={one ? 220 : 460} height={64} rx={32} fill="#0b0b0d" stroke={C} strokeWidth={1.6} style={{ transition: ease }} />
				<text x={one ? 440 : 320} y={557} textAnchor="middle" fontSize={15} fontWeight={600} fill="#fff" fontFamily="Barlow" style={{ transition: ease }}>
					{one ? "SegNet labels frame 2" : "PoseNet reads the pair"}
				</text>
				<text x={one ? 440 : 320} y={575} textAnchor="middle" fontSize={11} fill="rgba(255,255,255,0.6)" fontFamily={mono} style={{ transition: ease }}>
					{one ? "wrong pixels count 10×" : "log of the squared motion error"}
				</text>

				{/* how wrong, and the update flowing back into only the parts that learn */}
				{flow(one ? "M440,594 L440,607 L330,607 L330,618" : "M320,594 L320,618")}
				<rect x={220} y={620} width={200} height={44} rx={22} fill="#0b0b0d" stroke={C} strokeWidth={1.4} style={{ transition: ease }} />
				<text x={320} y={647} textAnchor="middle" fontSize={14} fontWeight={600} fill="#fff" fontFamily="Barlow">
					how wrong?
				</text>
				<path key={`back-${stage}`} d={back} fill="none" stroke={C} strokeWidth={1.8} strokeDasharray="5 6" markerEnd="url(#tf-arrow-c)">
					<animate attributeName="stroke-dashoffset" from="22" to="0" dur="0.9s" repeatCount="indefinite" />
				</path>
				<g className="cw-anim" key={`dot-${stage}`}>
					<circle r={4.5} fill={C}>
						<animateMotion dur="2.2s" repeatCount="indefinite" path={back} />
					</circle>
				</g>
				<text x={24} y={420} fontSize={11} fill={C} fontFamily={mono} transform="rotate(-90 24 420)" textAnchor="middle" style={{ transition: ease }}>
					{one ? "update every weight" : "update frame 1 only"}
				</text>

				{/* out */}
				<path d="M420,642 L470,642 L470,688" fill="none" stroke="#fcd34d" strokeWidth={1.4} strokeDasharray="3 4" opacity={one ? 0.25 : 1} style={{ transition: ease }} />
				<g opacity={one ? 0.35 : 1} style={{ transition: ease }}>
					<rect x={380} y={692} width={200} height={44} rx={10} fill="rgba(252,211,77,0.06)" stroke="#fcd34d" strokeWidth={1.3} />
					<text x={394} y={711} fontSize={14} fontWeight={600} fill="#fff" fontFamily="Barlow">
						archive.zip
					</text>
					<text x={394} y={727} fontSize={10.5} fill="rgba(255,255,255,0.6)" fontFamily={mono}>
						after stage 2
					</text>
				</g>
			</svg>
		</figure>
	);
}

/* 2 · the training ring with its two stages. Same layout as TrainDiagram (kept below, unused) plus a stage switch:
 * stage 1 trains every weight against SegNet on frame 2 (wrong pixels counted 10x, 600 epochs), stage 2 freezes the
 * trunk and trains only frame 1's 11,235 weights against PoseNet (log of the squared motion error, 500 epochs).
 * Green = trains in this stage, grey = frozen. Numbers from solution/train_frame_model.py and frame_model.py. */
export function TrainStagesDiagram() {
	const [stage, setStage] = useState<1 | 2>(1);
	const one = stage === 1;
	const mono = "IBM Plex Mono";
	const cx = 280;
	const cy = 188;
	const r = 136;
	const k = r / 118; // the arc stubs below were laid out for r = 118
	const ring = `M${cx},${cy - r} A${r},${r} 0 1 1 ${cx - 0.01},${cy - r}`;
	const LEARN = "#86efac";
	const judge = one ? "rgba(125,211,252,0.85)" : "rgba(240,171,252,0.9)";
	const node = (x: number, y: number, w: number, title: string, sub: string, stroke: string) => (
		<g>
			<rect x={x - w / 2} y={y - 28} width={w} height={56} rx={28} fill="#0b0b0d" stroke={stroke} strokeWidth={1.5} style={{ transition: "stroke 300ms" }} />
			<text x={x} y={y - 3} textAnchor="middle" fontSize={17} fontWeight={600} fill="#fff" fontFamily="Barlow">
				{title}
			</text>
			<text x={x} y={y + 16} textAnchor="middle" fontSize={13} fill="rgba(255,255,255,0.6)" fontFamily={mono}>
				{sub}
			</text>
		</g>
	);
	const part = (x: number, w: number, label: string, sub: string, learning: boolean) => (
		<g>
			<rect x={x} y={cy - r - 6} width={w} height={38} rx={7} fill={learning ? "rgba(134,239,172,0.16)" : "rgba(255,255,255,0.03)"} stroke={learning ? LEARN : "rgba(255,255,255,0.25)"} strokeWidth={1.3} style={{ transition: "all 300ms" }} />
			<text x={x + w / 2} y={cy - r + 9} textAnchor="middle" fontSize={12} fill={learning ? "#fff" : "rgba(255,255,255,0.45)"} fontFamily={mono}>
				{label}
			</text>
			<text x={x + w / 2} y={cy - r + 25} textAnchor="middle" fontSize={11.5} fill={learning ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.45)"} fontFamily={mono}>
				{sub}
			</text>
		</g>
	);
	const pill = (x: number, y: number, w: number, title: string, sub: string, stroke: string, fill: string) => (
		<g>
			<rect x={x} y={y} width={w} height={58} rx={11} fill={fill} stroke={stroke} strokeWidth={1.4} />
			<text x={x + 16} y={y + 25} fontSize={17} fontWeight={600} fill="#fff" fontFamily="Barlow">
				{title}
			</text>
			<text x={x + 16} y={y + 44} fontSize={13} fill="rgba(255,255,255,0.6)" fontFamily={mono}>
				{sub}
			</text>
		</g>
	);
	const arc = (x1: number, y1: number, x2: number, y2: number, stroke: string, w = 1.6) => (
		<path d={`M${cx + x1 * k},${cy + y1 * k} A${r},${r} 0 0 1 ${cx + x2 * k},${cy + y2 * k}`} fill="none" stroke={stroke} strokeWidth={w} markerEnd="url(#cw-ring2-w)" />
	);
	const tab = (s: 1 | 2, text: string) => (
		<button
			type="button"
			onClick={() => setStage(s)}
			className="cw-focus rounded-full px-3 py-1 font-mono text-[11.5px] transition-colors"
			style={{ background: stage === s ? "rgba(255,255,255,0.92)" : "transparent", color: stage === s ? "#0b0b0d" : "rgba(255,255,255,0.6)" }}
		>
			{text}
		</button>
	);
	return (
		<div>
			<div className="mb-2 inline-flex gap-1 rounded-full border border-white/15 p-0.5">
				{tab(1, "stage 1 · SegNet")}
				{tab(2, "stage 2 · PoseNet")}
			</div>
			<svg viewBox="-50 -6 660 372" className="block w-full" role="img" aria-label={one ? "Stage 1: every weight trains against SegNet on frame 2" : "Stage 2: only frame 1's weights train against PoseNet"}>
				<defs>
					<marker id="cw-ring2-w" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
						<path d="M0,0 L10,5 L0,10 z" fill="rgba(255,255,255,0.7)" />
					</marker>
					<marker id="cw-ring2-y" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
						<path d="M0,0 L10,5 L0,10 z" fill="#fcd34d" />
					</marker>
				</defs>

				{/* the loop */}
				<circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} />
				{arc(70, -96, 104, -52, "rgba(255,255,255,0.6)")}
				{arc(104, 52, 70, 96, "rgba(255,255,255,0.6)")}
				{arc(-70, 96, -104, 52, "rgba(255,255,255,0.6)")}
				{arc(-104, -52, -92, -74, "rgba(255,255,255,0.6)")}
				<g className="cw-anim">
					<circle r={4.5} fill="#fff">
						<animateMotion dur="4s" repeatCount="indefinite" path={ring} />
					</circle>
				</g>
				<text x={cx} y={cy + 5} textAnchor="middle" fontSize={12.5} fill="rgba(255,255,255,0.65)" fontFamily={mono}>
					{one ? "600 epochs" : "500 epochs"}
				</text>

				{/* the frame model, split into the part that draws frame 1 and the rest */}
				<rect x={cx - 112} y={cy - r - 48} width={224} height={92} rx={16} fill="#0b0b0d" stroke="#ffffff" strokeWidth={1.5} />
				<text x={cx} y={cy - r - 22} textAnchor="middle" fontSize={17} fontWeight={600} fill="#fff" fontFamily="Barlow">
					frame model
				</text>
				{part(cx - 102, 116, "frame 2", one ? "53,123 weights" : "frozen", one)}
				{part(cx + 20, 82, "frame 1", "11,235", true)}

				{node(cx + r, cy, 172, "draws", one ? "frame 2" : "frame 1 + frame 2", "rgba(255,255,255,0.35)")}
				{node(cx, cy + r, 200, one ? "SegNet grades" : "PoseNet grades", one ? "wrong pixels × 10" : "log motion error", judge)}
				{node(cx - r, cy, 172, "update weights", one ? "every weight" : "frame 1 only", "rgba(255,255,255,0.35)")}

				{/* what goes in */}
				{pill(0, 4, 150, "stored outputs", "map + 6 values", "rgba(255,255,255,0.3)", "rgba(255,255,255,0.03)")}
				<path d={`M150,33 L${cx - 114},33`} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1.4} markerEnd="url(#cw-ring2-w)" />
				<path d={`M60,62 C60,130 30,${cy} ${cx - r - 92},${cy}`} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.3} strokeDasharray="4 4" markerEnd="url(#cw-ring2-w)" />
				<text x={70} y={112} fontSize={12} fill="rgba(255,255,255,0.45)" fontFamily={mono}>
					compared
				</text>
				<text x={70} y={128} fontSize={12} fill="rgba(255,255,255,0.45)" fontFamily={mono}>
					against
				</text>

				{/* what comes out */}
				<path d={`M${cx + 112},33 L${cx + 128},33`} fill="none" stroke="#fcd34d" strokeWidth={1.5} markerEnd="url(#cw-ring2-y)" />
				{pill(410, 4, 150, "archive.zip", "after stage 2", "#fcd34d", "rgba(252,211,77,0.06)")}
			</svg>
		</div>
	);
}

// the original one-loop ring, kept so the page can switch back
export function TrainDiagram() {
	const mono = "IBM Plex Mono";
	const cx = 330;
	const cy = 170;
	const r = 118;
	const ring = `M${cx},${cy - r} A${r},${r} 0 1 1 ${cx - 0.01},${cy - r}`;
	const node = (x: number, y: number, w: number, title: string, sub: string, stroke: string, fill = "#0b0b0d") => (
		<g>
			<rect x={x - w / 2} y={y - 24} width={w} height={48} rx={24} fill={fill} stroke={stroke} strokeWidth={1.4} />
			<text x={x} y={y - 3} textAnchor="middle" fontSize={14} fontWeight={600} fill="#fff" fontFamily="Barlow">
				{title}
			</text>
			<text x={x} y={y + 13} textAnchor="middle" fontSize={11} fill="rgba(255,255,255,0.55)" fontFamily={mono}>
				{sub}
			</text>
		</g>
	);
	const pill = (x: number, y: number, w: number, title: string, sub: string, stroke: string, fill: string) => (
		<g>
			<rect x={x} y={y} width={w} height={50} rx={10} fill={fill} stroke={stroke} strokeWidth={1.3} />
			<text x={x + 14} y={y + 21} fontSize={14} fontWeight={600} fill="#fff" fontFamily="Barlow">
				{title}
			</text>
			<text x={x + 14} y={y + 38} fontSize={11} fill="rgba(255,255,255,0.55)" fontFamily={mono}>
				{sub}
			</text>
		</g>
	);
	return (
		<svg viewBox="0 0 760 320" className="block w-full" role="img" aria-label="The training loop as a ring, then the archive">
			<defs>
				<marker id="cw-ring-w" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M0,0 L10,5 L0,10 z" fill="rgba(255,255,255,0.7)" />
				</marker>
				<marker id="cw-ring-y" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M0,0 L10,5 L0,10 z" fill="#fcd34d" />
				</marker>
			</defs>

			{/* the loop */}
			<circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} />
			<path d={`M${cx + 70},${cy - 96} A${r},${r} 0 0 1 ${cx + 104},${cy - 52}`} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={1.5} markerEnd="url(#cw-ring-w)" />
			<path d={`M${cx + 104},${cy + 52} A${r},${r} 0 0 1 ${cx + 70},${cy + 96}`} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={1.5} markerEnd="url(#cw-ring-w)" />
			<path d={`M${cx - 70},${cy + 96} A${r},${r} 0 0 1 ${cx - 104},${cy + 52}`} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={1.5} markerEnd="url(#cw-ring-w)" />
			<path d={`M${cx - 104},${cy - 52} A${r},${r} 0 0 1 ${cx - 70},${cy - 96}`} fill="none" stroke="#f0abfc" strokeWidth={1.8} markerEnd="url(#cw-ring-w)" />
			<g className="cw-anim">
				<circle r={4} fill="#fff">
					<animateMotion dur="4s" repeatCount="indefinite" path={ring} />
				</circle>
			</g>
			<text x={cx} y={cy - 6} textAnchor="middle" fontSize={12} fill="rgba(255,255,255,0.6)" fontFamily={mono}>
				repeat for
			</text>
			<text x={cx} y={cy + 12} textAnchor="middle" fontSize={12} fill="rgba(255,255,255,0.6)" fontFamily={mono}>
				every pair
			</text>

			{node(cx, cy - r, 150, "frame model", "64,358 weights", "#ffffff")}
			{node(cx + r, cy, 150, "draws 2 frames", "frame 1 · frame 2", "rgba(255,255,255,0.35)")}
			{node(cx, cy + r, 170, "the judges grade", "SegNet · PoseNet", "rgba(125,211,252,0.85)")}
			{node(cx - r, cy, 150, "how wrong?", "nudge the weights", "rgba(240,171,252,0.9)")}

			{/* what goes in */}
			<text x={0} y={22} fontSize={11} letterSpacing={1.4} fill="rgba(255,255,255,0.45)" fontFamily={mono}>
				IN
			</text>
			{pill(0, 32, 150, "stored outputs", "map + 6 values", "rgba(255,255,255,0.3)", "rgba(255,255,255,0.03)")}
			<path d={`M150,57 C200,57 220,${cy - r} ${cx - 78},${cy - r}`} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1.3} markerEnd="url(#cw-ring-w)" />
			<path d={`M75,82 C75,130 120,${cy} ${cx - r - 78},${cy}`} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.2} strokeDasharray="4 4" markerEnd="url(#cw-ring-w)" />
			<text x={20} y={150} fontSize={10.5} fill="rgba(255,255,255,0.4)" fontFamily={mono}>
				compared
			</text>
			<text x={20} y={164} fontSize={10.5} fill="rgba(255,255,255,0.4)" fontFamily={mono}>
				against
			</text>

			{/* what comes out */}
			<path d={`M${cx + 75},${cy - r} L660,${cy - r} L660,140`} fill="none" stroke="#fcd34d" strokeWidth={1.4} markerEnd="url(#cw-ring-y)" />
			<text x={500} y={cy - r - 10} fontSize={11} fill="rgba(252,211,77,0.95)" fontFamily={mono}>
				when training is done
			</text>
			{pill(560, 144, 200, "archive.zip", "maps + motions + weights", "#fcd34d", "rgba(252,211,77,0.06)")}
		</svg>
	);
}

/* Section 2, step 5 · grade: one big image, flip between the two SegNet maps and the differences --- */

type RescoreData = { pixels: number; wrong: number[]; fwd_real: number[]; fwd_made: number[] };

function GradeFlip() {
	const [d, setD] = useState<RescoreData | null>(null);
	const [t, setT] = useState(15.025); // open on pair 300, the pair section 2 follows
	const [playing, setPlaying] = useState(false);
	const vid = useRef<HTMLVideoElement>(null);
	const box = useRef<HTMLDivElement>(null);
	const bar = useRef<SVGSVGElement>(null);

	useEffect(() => {
		fetch(A("rescore.json"))
			.then((r) => r.json())
			.then(setD)
			.catch(() => setD(null));
	}, []);
	// start playing once it scrolls into view
	useEffect(() => {
		const el = box.current;
		if (!el) return;
		const io = new IntersectionObserver(([e]) => {
			if (e?.isIntersecting) {
				io.disconnect();
				if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) void vid.current?.play().catch(() => {});
			}
		}, { threshold: 0.5 });
		io.observe(el);
		return () => io.disconnect();
	}, []);
	// follow the video smoothly while it plays
	useEffect(() => {
		if (!playing) return;
		let raf = 0;
		const tick = () => {
			if (vid.current) setT(vid.current.currentTime);
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [playing]);

	const pair = Math.min(599, Math.max(0, Math.floor(t * 20 + 1e-3)));
	const seek = (clientX: number) => {
		const r = bar.current!.getBoundingClientRect();
		const p = Math.max(0, Math.min(599, Math.round(((clientX - r.left) / r.width) * 599)));
		if (vid.current) vid.current.currentTime = (p + 0.5) / 20;
		setT((p + 0.5) / 20);
	};

	const W = 600, H = 44;
	const max = d ? Math.max(...d.wrong) : 1;
	const area = d ? `M0,${H} ` + d.wrong.map((w, i) => `L${i},${(H - (w / max) * (H - 4)).toFixed(1)}`).join(" ") + ` L599,${H} Z` : "";
	const mono = "font-mono tabular-nums";

	return (
		<div>
			<div ref={box} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
				<video
					ref={vid}
					src={A("vid/rescore.mp4#t=15.025")}
					muted
					playsInline
					loop
					preload="metadata"
					className="absolute inset-0 h-full w-full"
					onPlay={() => setPlaying(true)}
					onPause={() => setPlaying(false)}
					onSeeked={(e) => setT(e.currentTarget.currentTime)}
				/>
				<div className="pointer-events-none absolute top-3 left-3 flex max-w-[70%] flex-col gap-1.5">
					<div className="flex flex-wrap gap-x-3 gap-y-1 self-start rounded-md bg-black/55 px-2.5 py-1 font-mono text-[11px] text-white/75">
						{SEG_CLASSES.map(([n, c]) => (
							<span key={n} className="inline-flex items-center gap-1.5">
								<span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
								{n}
							</span>
						))}
					</div>
				</div>
				<div className={`pointer-events-none absolute top-3 right-3 rounded-md bg-black/70 px-2.5 py-1 text-[12px] text-white/60 ${mono}`}>pair {pair}</div>
			</div>

			<div className="mt-3 flex items-center gap-3">
				<button
					type="button"
					aria-label={playing ? "Pause" : "Play"}
					onClick={() => (playing ? vid.current?.pause() : void vid.current?.play())}
					className="cw-focus flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105"
				>
					<svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
						{playing ? (
							<>
								<rect x="3" y="2" width="3.5" height="12" rx="1" />
								<rect x="9.5" y="2" width="3.5" height="12" rx="1" />
							</>
						) : (
							<path d="M4 2.5v11a.5.5 0 0 0 .77.42l8.5-5.5a.5.5 0 0 0 0-.84l-8.5-5.5A.5.5 0 0 0 4 2.5Z" />
						)}
					</svg>
				</button>
				<svg
					ref={bar}
					viewBox={`0 0 ${W} ${H}`}
					preserveAspectRatio="none"
					className="block h-11 flex-1 cursor-pointer touch-none"
					role="slider"
					aria-label="Pair"
					aria-valuemin={0}
					aria-valuemax={599}
					aria-valuenow={pair}
					onPointerDown={(e) => {
						e.currentTarget.setPointerCapture(e.pointerId);
						seek(e.clientX);
					}}
					onPointerMove={(e) => e.buttons && seek(e.clientX)}
				>
					<path d={area} fill="rgba(125,211,252,0.22)" />
					<line x1={0} x2={W} y1={H - 0.5} y2={H - 0.5} stroke="rgba(255,255,255,0.15)" vectorEffect="non-scaling-stroke" />
					<line x1={pair} x2={pair} y1={0} y2={H} stroke="#fff" strokeWidth={2} vectorEffect="non-scaling-stroke" />
				</svg>
			</div>

		</div>
	);
}

/* Section 4 · the frame model, drawn as a U (from solution/frame_model.py) --------------------
 * Block height = resolution (384, 192, 96 rows), block width = channels. Weight counts per part
 * add up to 64,358: shrink 4,480 · 4 corrections 38,912 · grow back 6,816 · frame 2 head 2,915 · frame 1 head 11,235.
 */

function Blk({ x, y, w, h, fill = "rgba(125,211,252,0.22)", stroke = "rgba(125,211,252,0.8)" }: { x: number; y: number; w: number; h: number; fill?: string; stroke?: string }) {
	return <rect x={x} y={y} width={w} height={h} rx={2} fill={fill} stroke={stroke} strokeWidth={1} />;
}

function T({ x, y, children, size = 10.5, anchor = "middle", color = "rgba(255,255,255,0.6)", bold }: { x: number; y: number; children: ReactNode; size?: number; anchor?: "start" | "middle" | "end"; color?: string; bold?: boolean }) {
	return (
		<text x={x} y={y} textAnchor={anchor} fontSize={size} fill={color} fontFamily={bold ? "Barlow" : "IBM Plex Mono"} fontWeight={bold ? 600 : 400}>
			{children}
		</text>
	);
}

/* the frame model's drawing (frame_model.py), shared by ModelDiagram and FinalPipelineFig; viewBox 0 0 860 440 */
function ModelDiagramSvg(props: { x?: number; y?: number; width?: number; height?: number; className?: string }) {
	const pink = { fill: "rgba(240,171,252,0.2)", stroke: "rgba(240,171,252,0.85)" };
	const grey = { fill: "rgba(255,255,255,0.08)", stroke: "rgba(255,255,255,0.5)" };
	const line = "rgba(255,255,255,0.45)";
	return (
		<svg viewBox="0 0 860 440" {...props} role="img" aria-label="The frame model: shrink, four corrections, grow back, two heads">
					<defs>
						<marker id="cw-m-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
							<path d="M0,0 L10,5 L0,10 z" fill="rgba(255,255,255,0.6)" />
						</marker>
					</defs>

					{/* input map */}
					<Blk x={48} y={40} w={14} h={192} {...grey} />
					<T x={55} y={28} bold color="#fff" size={12.5}>
						map
					</T>
					<T x={55} y={252}>7 × 384×512</T>
					<T x={55} y={266} size={9.5} color="rgba(255,255,255,0.4)">
						5 classes + 2 position
					</T>

					{/* shrink */}
					<Blk x={110} y={88} w={18} h={96} />
					<T x={119} y={202}>32 × 192×256</T>
					<Blk x={200} y={160} w={30} h={48} />
					<T x={215} y={226}>64 × 96×128</T>
					<path d="M64,136 L106,136" stroke={line} markerEnd="url(#cw-m-arrow)" />
					<path d="M130,136 C165,136 170,184 196,184" fill="none" stroke={line} markerEnd="url(#cw-m-arrow)" />
					<T x={120} y={62} bold color="#fff" size={12.5}>
						shrink
					</T>
					<T x={120} y={76} size={9.5} color="rgba(255,255,255,0.45)">
						4,480 weights
					</T>

					{/* 4 corrections at quarter size */}
					{[0, 1, 2, 3].map((k) => (
						<Blk key={k} x={258 + k * 46} y={160} w={30} h={48} />
					))}
					{[0, 1, 2, 3].map((k) => (
						<path key={k} d={`M${k === 0 ? 232 : 290 + (k - 1) * 46},184 L${256 + k * 46},184`} stroke={line} markerEnd="url(#cw-m-arrow)" />
					))}
					<T x={342} y={140} bold color="#fff" size={12.5}>
						4 corrections at quarter size
					</T>
					<T x={342} y={226} size={9.5} color="rgba(255,255,255,0.45)">
						38,912 weights · 60% of the model
					</T>

					{/* grow back, with the half-size detail glued on */}
					<Blk x={470} y={88} w={18} h={96} />
					<Blk x={490} y={88} w={18} h={96} {...grey} />
					<T x={489} y={202}>32 + 32 × 192×256</T>
					<path d="M422,184 C450,184 448,136 466,136" fill="none" stroke={line} markerEnd="url(#cw-m-arrow)" />
					<path d="M119,86 C119,22 499,22 499,84" fill="none" stroke="rgba(255,255,255,0.4)" strokeDasharray="4 4" markerEnd="url(#cw-m-arrow)" />
					<T x={309} y={20} size={9.5} color="rgba(255,255,255,0.5)">
						half-size detail, glued back on
					</T>
					<Blk x={560} y={40} w={18} h={192} />
					<path d="M510,136 L556,136" stroke={line} markerEnd="url(#cw-m-arrow)" />
					<T x={569} y={252}>scene · 32 × 384×512</T>
					<T x={420} y={98} bold color="#fff" size={12.5}>
						grow back
					</T>
					<T x={420} y={112} size={9.5} color="rgba(255,255,255,0.45)">
						6,816 weights
					</T>

					{/* frame 2 head */}
					<path d="M580,90 L650,90" stroke={line} markerEnd="url(#cw-m-arrow)" />
					<Blk x={654} y={66} w={70} h={48} />
					<T x={689} y={86} bold color="#fff" size={11.5}>
						correction
					</T>
					<T x={689} y={101} size={9.5}>
						+ 1×1 conv
					</T>
					<path d="M726,90 L770,90" stroke={line} markerEnd="url(#cw-m-arrow)" />
					<rect x={774} y={60} width={80} height={60} rx={4} fill="rgba(125,211,252,0.08)" stroke="var(--seg)" />
					<T x={814} y={86} bold color="#fff" size={12.5}>
						frame 2
					</T>
					<T x={814} y={102} size={9.5} color="var(--seg)">
						for SegNet
					</T>
					<T x={689} y={134} size={9.5} color="rgba(255,255,255,0.45)">
						2,915 weights · 5-bit
					</T>

					{/* frame 1 head */}
					<path d="M580,200 C620,200 620,330 650,330" fill="none" stroke={line} markerEnd="url(#cw-m-arrow)" />
					<rect x={560} y={380} width={110} height={40} rx={4} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.4)" />
					<T x={615} y={398} bold color="#fff" size={11.5}>
						6 motion values
					</T>
					<T x={615} y={412} size={9.5}>
						→ pose code
					</T>
					<path d="M672,400 C700,400 700,368 700,358" fill="none" stroke="rgba(240,171,252,0.8)" markerEnd="url(#cw-m-arrow)" />
					<Blk x={654} y={306} w={30} h={48} {...pink} />
					<Blk x={694} y={306} w={30} h={48} {...pink} />
					<path d="M684,330 L692,330" stroke={line} />
					<T x={689} y={296} bold color="#fff" size={11.5}>
						2 pose corrections
					</T>
					<path d="M726,330 L770,330" stroke={line} markerEnd="url(#cw-m-arrow)" />
					<rect x={774} y={300} width={80} height={60} rx={4} fill="rgba(240,171,252,0.08)" stroke="var(--pose)" />
					<T x={814} y={326} bold color="#fff" size={12.5}>
						frame 1
					</T>
					<T x={814} y={342} size={9.5} color="var(--pose)">
						for PoseNet
					</T>
					<T x={814} y={382} size={9.5} color="rgba(255,255,255,0.45)">
						11,235 weights
					</T>
					<T x={814} y={396} size={9.5} color="rgba(255,255,255,0.45)">
						8-bit
					</T>
				</svg>
	);
}

export function ModelDiagram() {
	return (
		<figure className="my-10">
			<div className="cw-scroll">
				<ModelDiagramSvg className="block w-full min-w-[640px]" />
			</div>
			<Caption>
				The frame model in <code className="cw-code">frame_model.py</code>, 64,358 weights. Block height is the resolution, block width the number of channels. Both frames are 384×512 and get stretched to
				874×1164 for comma's grader.
			</Caption>
		</figure>
	);
}

/* 3.2 (16 vs 8; the 5-bit row is unused since 3.8 compares a different 8-bit model) · the same pair drawn with each set of weights (images: make_bits_compare.py; no pose
 * correction). seg / pose parts in bits.json are comma's CPU evaluator: measure_first_codec.py, measure_8bit_no_correction.py,
 * measure_no_correction.py. ---- */

type BitsVersion = { seg_part: number; pose_part: number; pair300: { seg_wrong: number; forward: number; pose_err: number } };
type BitsData = { "16": BitsVersion; "8": BitsVersion; "5": BitsVersion; frame1_mean_change_8_vs_16: number; real_forward_300: number };

export function BitsFig() {
	const [d, setD] = useState<BitsData | null>(null);
	const [eight, setEight] = useState(false);
	useEffect(() => {
		fetch(F("bits.json"))
			.then((r) => r.json())
			.then(setD)
			.catch(() => setD(null));
	}, []);
	// flip the frame between 16-bit and 8-bit once a second
	useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const t = window.setInterval(() => setEight((e) => !e), 1000);
		return () => window.clearInterval(t);
	}, []);
	if (!d) return null;
	const a = d["16"];
	const b = d["8"];
	// green = better, red = worse; the colors carry the verdict, so no note line under each row
	const rows: [string, string, string, string][] = [
		["weights", "var(--size)", "119 KB", "57 KB"],
		["seg part", "var(--seg)", a.seg_part.toFixed(4), b.seg_part.toFixed(4)],
		["pose part", "var(--pose)", a.pose_part.toFixed(4), b.pose_part.toFixed(4)],
	];
	return (
		<figure className="my-8 grid grid-cols-1 items-center gap-6 sm:grid-cols-[1.3fr_1fr]">
			<div className="relative">
				<Img src="bits16_f1.jpg" alt="Frame 1 of pair 300 drawn with 16-bit weights" />
				<img
					src={F("bits8_f1.jpg")}
					alt="The same frame drawn with the weights rounded to 8 bits"
					className="absolute inset-0 block h-full w-full rounded-md"
					style={{ opacity: eight ? 1 : 0 }}
				/>
				<button
					type="button"
					onClick={() => setEight((e) => !e)}
					className="cw-focus absolute top-2 left-2 rounded-md bg-black/75 px-2.5 py-1 font-mono text-[12px] tabular-nums"
				>
					<span className={eight ? "text-white/40" : "text-white"}>16-bit</span>
					<span className="px-1.5 text-white/30">/</span>
					<span className={eight ? "text-white" : "text-white/40"}>8-bit</span>
				</button>
			</div>
			<div className="font-mono tabular-nums">
				<div className="grid grid-cols-[1fr_6.5rem_1.25rem_6.5rem] gap-x-3 pb-2 text-[12px] text-white/40">
					<span />
					<span className="text-right">16-bit</span>
					<span />
					<span className="text-right">8-bit</span>
				</div>
				{rows.map(([k, kc, x, y], i) => (
					<div key={k} className="grid grid-cols-[1fr_6.5rem_1.25rem_6.5rem] gap-x-3 border-t border-white/10 py-3">
						<span className="self-start pt-1.5 text-[13px]" style={{ color: kc }}>
							{k}
						</span>
						<span className="text-right text-[20px] text-white/85">{x}</span>
						<span className="text-[20px] text-white/30">→</span>
						<span className="text-right text-[20px]" style={{ color: i === 0 ? "#86efac" : i === 2 ? "#ff5a6e" : "rgba(255,255,255,0.85)" }}>
							{y}
						</span>
					</div>
				))}
			</div>
		</figure>
	);
}

/* 3.3 · the pose correction. Shows only what physically changed (the pinned bar at the top does the score).
 * Images: pair 300's frame 1 (make_correction_dial.py). Chart: each pair's PoseNet error, all six motions, off and on
 * (mix.json from make_correction_mix.py, GPU judges); hover reads one pair. */

type PoseErrData = { err_off: number[]; err_on: number[]; bytes: number };

/* 3.3 · the four shared patterns and how one pair mixes them. mix_33.json from writeup/build/make_correction_v1.py: the
 * correction 3.3 fitted (the 0.3076 codec's correction.bin, 4,728 B; 3.4 only changed the lossless map coder), its 12 x 16 RGB patterns (already times the strength) and every pair's four amounts. Drawn at their real size,
 * 128 = no change, stretched smoothly like inflate.py's bilinear stretch. */
type MixData = { patterns: number[][][][]; amounts: number[][] };
const MIX_PAIR = 300;

function paintChange(cv: HTMLCanvasElement | null, chw: (c: number, y: number, x: number) => number) {
	if (!cv) return;
	const small = document.createElement("canvas");
	small.width = 16;
	small.height = 12;
	const sctx = small.getContext("2d");
	const ctx = cv.getContext("2d");
	if (!sctx || !ctx) return;
	const img = sctx.createImageData(16, 12);
	for (let y = 0; y < 12; y++)
		for (let x = 0; x < 16; x++)
			for (let c = 0; c < 3; c++) img.data[(y * 16 + x) * 4 + c] = Math.max(0, Math.min(255, Math.round(128 + chw(c, y, x))));
	for (let i = 0; i < 192; i++) img.data[i * 4 + 3] = 255;
	sctx.putImageData(img, 0, 0);
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";
	ctx.drawImage(small, 0, 0, cv.width, cv.height);
}

export function PatternMixFig() {
	const [d, setD] = useState<MixData | null>(null);
	const tiles = useRef<(HTMLCanvasElement | null)[]>([]);
	const result = useRef<HTMLCanvasElement>(null);
	useEffect(() => {
		fetch(F("mix_33.json"))
			.then((r) => r.json())
			.then(setD)
			.catch(() => setD(null));
	}, []);
	useEffect(() => {
		if (!d) return;
		d.patterns.forEach((p, k) => paintChange(tiles.current[k] ?? null, (c, y, x) => p[c]![y]![x]!));
	}, [d]);
	useEffect(() => {
		if (!d) return;
		const a = d.amounts[MIX_PAIR]!;
		paintChange(result.current, (c, y, x) => a.reduce((sum, ak, k) => sum + ak * d.patterns[k]![c]![y]![x]!, 0));
	}, [d]);
	if (!d) return null;
	return (
		<figure className="my-8 rounded-xl border border-white/10 p-5">
			<div className="mb-4">
				<Label>pair {MIX_PAIR}</Label>
			</div>
			<div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
				<div className="grid w-full grid-cols-2 gap-3 sm:w-[46%]">
					{d.patterns.map((_, k) => (
						<div key={k}>
							<canvas ref={(c) => { tiles.current[k] = c; }} width={160} height={120} className="block w-full rounded" aria-label={`Shared pattern ${k + 1}`} />
							<div className="mt-1.5 font-mono text-[11.5px] text-white/80">
								pattern {k + 1} <span className="text-white/50">× {d.amounts[MIX_PAIR]![k]!.toFixed(2).replace("-", "−")}</span>
							</div>
						</div>
					))}
				</div>
				<div className="text-3xl text-white/50">=</div>
				<div className="w-full flex-1">
					<canvas ref={result} width={512} height={384} className="block w-full rounded" aria-label={`The mix added to frame 1 of pair ${MIX_PAIR}`} />
					<div className="mt-1.5 font-mono text-[11.5px] text-white/80">combined pattern</div>
				</div>
			</div>
		</figure>
	);
}

const DIAL_STEPS = ["dial33_000.jpg", "dial33_025.jpg", "dial33_050.jpg", "dial33_075.jpg", "dial33_100.jpg"]; // real frames at 0-100% correction

export function CorrectionDial() {
	const [d, setD] = useState<PoseErrData | null>(null);
	// plays once when scrolled to: red line draws (0-1.2 s), then green line + frame 1 fading in the correction + the count (1.2-2.8 s)
	const ref = useRef<HTMLElement>(null);
	const [ms, setMs] = useState(0);
	useEffect(() => {
		fetch(F("mix_33.json"))
			.then((r) => r.json())
			.then(setD)
			.catch(() => setD(null));
	}, []);
	useEffect(() => {
		const el = ref.current;
		if (!d || !el) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			setMs(9999);
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
					setMs((m) => Math.max(m, t - t0));
					if (t - t0 < 3000) raf = requestAnimationFrame(tick);
				};
				raf = requestAnimationFrame(tick);
				done = window.setTimeout(() => setMs(9999), 3500); // finish even if frames are paused
			},
			{ threshold: 0.35 },
		);
		io.observe(el);
		return () => {
			io.disconnect();
			cancelAnimationFrame(raf);
			clearTimeout(done);
		};
	}, [d]);
	if (!d) return null;
	const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
	const pRed = ease(ms / 1200);
	const pGreen = ease((ms - 1200) / 1600);
	const dialIdx = Math.min(DIAL_STEPS.length - 1, Math.floor(pGreen * DIAL_STEPS.length));
	const panels = [
		{ name: "Correction off", img: "dial33_000.jpg", color: "#ff5a6e" },
		{ name: "Correction on", img: "", color: "#86efac" },
	];
	return (
		<figure ref={ref} className="my-8 rounded-xl border border-white/10 p-5">
			<div className="mb-4">
				<Label>codec after this step</Label>
			</div>
			<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
				{panels.map((p) => (
					<div key={p.name}>
						<div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2 text-[15px]">
							<span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
							{p.name}
						</div>
						{p.img ? (
							<img src={F(p.img)} alt={`Frame 1 of pair 300, ${p.name.toLowerCase()}`} className="block w-full rounded" />
						) : (
							<div className="relative">
								<img src={F("dial33_100.jpg")} alt="Frame 1 of pair 300, correction on" className="block w-full rounded" style={{ opacity: 0 }} />
								{DIAL_STEPS.map((src, i) => (
									<img key={src} src={F(src)} alt="" aria-hidden className="absolute inset-0 block h-full w-full rounded" style={{ opacity: i === dialIdx ? 1 : 0 }} />
								))}
							</div>
						)}
					</div>
				))}
			</div>
			{/* the whole drive, correction off vs on: the pose parts the text quotes (comma's evaluator) and how many pairs improved */}
			<div className="mt-6 grid gap-3 font-mono text-[13px] tabular-nums">
				{(
					[
						["correction off", 0.3783, "#ff5a6e", pRed],
						["correction on", 0.0715, "#86efac", pGreen],
					] as const
				).map(([l, v, c, p]) => (
					<div key={l} className="grid grid-cols-[120px_1fr_60px] items-center gap-3">
						<span className="text-white/60">{l}</span>
						<div className="h-3 rounded-full bg-white/[0.06]">
							<div className="h-3 rounded-full" style={{ width: `${(v / 0.3783) * 100 * p}%`, background: c }} />
						</div>
						<span className="text-right" style={{ color: c }}>
							{v.toFixed(4)}
						</span>
					</div>
				))}
			</div>
		</figure>
	);
}

/* 3.3 · turn the correction yourself. dial.json + dial_<s>.jpg from writeup/build/make_correction_dial.py: the final
 * correction added at strength s (0 = off, 1 = as shipped, up to 1.5), exactly as inflate.py adds it; pose part over all
 * 600 pairs (GPU judges, a hair above comma's CPU numbers) and pair 300's frame 1 at each s. */
type DialData = { strengths: number[]; rows: { s: number; pose_part: number }[] };

export function DialFig() {
	const [d, setD] = useState<DialData | null>(null);
	const [i, setI] = useState(0);
	useEffect(() => {
		fetch(F("dial.json"))
			.then((r) => r.json())
			.then(setD)
			.catch(() => setD(null));
	}, []);
	if (!d) return null;
	const rows = d.rows;
	const row = rows[i]!;
	const best = rows.reduce((a, b) => (b.pose_part < a.pose_part ? b : a));
	const W = 320, H = 200, L = 40, R = 298, T = 14, B = 172;
	const top = 0.3;
	const x = (sv: number) => L + (sv / 1.5) * (R - L);
	const y = (v: number) => B - (v / top) * (B - T);
	const path = rows.map((r, k) => `${k ? "L" : "M"}${x(r.s).toFixed(1)},${y(r.pose_part).toFixed(1)}`).join("");
	const file = (sv: number) => `dial_${String(Math.round(sv * 100)).padStart(3, "0")}.jpg`;
	const good = row.s === best.s;
	return (
		<figure className="my-8 rounded-xl border border-white/10 p-5">
			<div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-[1.15fr_1fr]">
				<div className="relative">
					<img src={F(file(rows[0]!.s))} alt="" aria-hidden className="block w-full rounded opacity-0" />
					{rows.map((r, k) => (
						<img key={r.s} src={F(file(r.s))} alt={`Frame 1 of pair 300 with the correction at ${Math.round(r.s * 100)}%`} className="absolute inset-0 block h-full w-full rounded" style={{ opacity: k === i ? 1 : 0 }} />
					))}
				</div>
				<svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Pose part at each correction strength">
					{[0, 0.1, 0.2, 0.3].map((v) => (
						<g key={v}>
							<line x1={L} x2={R} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.06)" />
							<text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize={10} fill="rgba(255,255,255,0.4)" fontFamily="monospace">{v.toFixed(1)}</text>
						</g>
					))}
					{[0, 0.5, 1, 1.5].map((sv) => (
						<text key={sv} x={x(sv)} y={B + 16} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.4)" fontFamily="monospace">{Math.round(sv * 100)}%</text>
					))}
					<path d={path} fill="none" stroke="var(--pose)" strokeWidth={1.8} />
					{rows.map((r) => (
						<circle key={r.s} cx={x(r.s)} cy={y(r.pose_part)} r={2.5} fill="var(--pose)" opacity={0.6} />
					))}
					<line x1={x(row.s)} x2={x(row.s)} y1={T} y2={B} stroke="rgba(255,255,255,0.25)" />
					<circle cx={x(row.s)} cy={y(row.pose_part)} r={6} fill={good ? "#86efac" : "#fff"} style={{ transition: "cx 200ms, cy 200ms" }} />
				</svg>
			</div>
			<div className="mt-5 flex items-center gap-4">
				<span className="font-mono text-[12px] whitespace-nowrap text-white/55">correction</span>
				<input
					type="range"
					className="cw-range cw-focus flex-1"
					min={0}
					max={rows.length - 1}
					step={1}
					value={i}
					aria-label="Correction strength"
					onChange={(e) => setI(Number(e.target.value))}
				/>
			</div>
			<div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 font-mono tabular-nums">
				<div>
					<div className="text-[10.5px] tracking-[0.12em] text-white/55 uppercase">strength</div>
					<div className="text-2xl">{Math.round(row.s * 100)}%</div>
				</div>
				<div>
					<div className="text-[10.5px] tracking-[0.12em] text-[var(--pose)] uppercase">pose part</div>
					<div className="text-2xl" style={{ color: good ? "#86efac" : "#fff" }}>
						{row.pose_part.toFixed(4)}
					</div>
				</div>
			</div>
		</figure>
	);
}

/* 3.4 and 3.5 · what the map coder reads to guess one pixel: real maps of the car's top edge stacked like cards
 * (maps 295-300 around row 181 col 338, context_pixel.json), the "?" on top. Outlined cells / lines are what it reads.
 * 4 hints (3.1) and 8 hints (3.4): old_0.3076/06_map_encoder.py describe_neighbours / describe_more_neighbours.
 * Neural (3.5): solution/map_encoder.py NEIGHBOURS (30 cells within 4, already decoded) + MAPS_BACK = 5 earlier maps,
 * each seen through a ~31 x 31 window (stride-2 conv, then dilation 1, 2, 4), wider than the 9 x 9 patch drawn. */

type StackData = Record<"now" | "prev" | "prev2" | "prev3" | "prev4" | "prev5", number[][]>;
type ReadMode = "4" | "8" | "neural";
const MODE_LABEL: Record<ReadMode, string> = { "4": "4 hints", "8": "8 hints", neural: "neural guesser" };
const CARD_NAMES = ["this frame", "last frame", "2 frames back", "3 frames back", "4 frames back", "5 frames back"];

export function FramesShareFig({ modes, caption, result }: { modes: [ReadMode, ReadMode]; caption: string; result?: ReactNode }) {
	const [d, setD] = useState<StackData | null>(null);
	const [mode, setMode] = useState<ReadMode>(modes[1]);
	useEffect(() => {
		fetch(F("context_pixel.json"))
			.then((r) => r.json())
			.then(setD)
			.catch(() => setD(null));
	}, []);
	if (!d) return null;
	const big = modes.includes("neural"); // 3.5 needs a wider patch and 6 cards; 3.4 keeps its 7 x 7, 3-card look
	const R = big ? 4 : 3;
	const n = 2 * R + 1;
	const mid = (d.now.length - 1) / 2;
	const patch = (m: number[][]) => m.slice(mid - R, mid + R + 1).map((row) => row.slice(mid - R, mid + R + 1));
	const cards = big ? 6 : 3;
	const S = big ? 19 : 26;
	const Q = 0.4;
	const gap = big ? 92 : 120;
	const W = 640;
	const ox = W / 2 + (big ? 40 : 0);
	const grids = (["now", "prev", "prev2", "prev3", "prev4", "prev5"] as const).slice(0, cards).map((k) => patch(d[k]));
	const at = (L: number, i: number, j: number) => ({ x: ox + (j - i) * S * 0.9, y: 24 + L * gap + (j + i) * S * Q });
	const poly = (L: number, i: number, j: number, h = 1, w = 1) => [at(L, i, j), at(L, i, j + w), at(L, i + h, j + w), at(L, i + h, j)].map((p) => `${p.x},${p.y}`).join(" ");
	const reads = (m: ReadMode) => {
		const cells = new Set<string>();
		const full = new Set<number>();
		if (m === "neural") {
			for (let up = 0; up < 5; up++) for (let left = -4; left < 5; left++) if (up + left >= 1) cells.add(`0,${R - up},${R - left}`);
			for (let L = 1; L <= 5; L++) full.add(L);
		} else {
			[`0,${R},${R - 1}`, `0,${R - 1},${R}`, `0,${R - 1},${R - 1}`, `1,${R},${R}`].forEach((c) => cells.add(c));
			if (m === "8") [`1,${R},${R + 1}`, `1,${R + 1},${R}`, `2,${R},${R}`].forEach((c) => cells.add(c));
		}
		return { cells, full };
	};
	const now = reads(mode);
	const base = reads(modes[0]);
	const isNew = (key: string, L: number) => (now.full.has(L) ? !base.full.has(L) : !base.cells.has(key) && !base.full.has(L));
	const cardUsed = (L: number) => L === 0 || now.full.has(L) || [...now.cells].some((c) => c.startsWith(`${L},`));
	const target = at(0, R + 0.5, R + 0.5);
	const H = 24 + (cards - 1) * gap + 2 * n * S * Q + 10;
	return (
		<figure className="my-8">
			<div className="mb-3 flex gap-2">
				{modes.map((m) => (
					<Btn key={m} on={mode === m} onClick={() => setMode(m)}>
						{MODE_LABEL[m]}
					</Btn>
				))}
			</div>
			<svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="The pixels the map coder reads in this map and earlier maps">
				{grids
					.map((cells, L) => (
						<g key={L}>
							{cells.map((row, i) =>
								row.map((v, j) => {
									const unknown = L === 0 && i + j >= 2 * R && !(i === R && j === R);
									const isTarget = L === 0 && i === R && j === R;
									const read = now.full.has(L) || now.cells.has(`${L},${i},${j}`);
									return (
										<polygon
											key={`${i}-${j}`}
											points={poly(L, i, j)}
											fill={unknown || isTarget ? "#1e1e1e" : SEG_CLASSES[v]![1]}
											opacity={!big || unknown || isTarget || read ? 1 : cardUsed(L) ? 0.55 : 0.2}
											stroke="black"
											strokeWidth={0.8}
										/>
									);
								}),
							)}
							{now.full.has(L) && <polygon points={poly(L, 0, 0, n, n)} fill="none" stroke={isNew("", L) ? "#86efac" : "white"} strokeWidth={2} />}
							{!now.full.has(L) &&
								[...now.cells]
									.filter((c) => c.startsWith(`${L},`))
									.map((c) => {
										const [, i, j] = c.split(",").map(Number) as [number, number, number];
										return <polygon key={c} points={poly(L, i, j)} fill="none" stroke={isNew(c, L) ? "#86efac" : "white"} strokeWidth={1.8} />;
									})}
							{L === 0 && <polygon points={poly(0, R, R)} fill="none" stroke="white" strokeWidth={2.4} />}
							<text x={ox - n * S * 0.9 - 12} y={24 + L * gap + n * S * Q + 5} textAnchor="end" fontSize={13} fill={cardUsed(L) ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)"}>
								{CARD_NAMES[L]}
							</text>
						</g>
					))
					.reverse()}
				{grids.map((_, L) => {
					if (L === 0) return null;
					const pts: [number, number, string][] = now.full.has(L)
						? [[R, R, ""]]
						: [...now.cells].filter((c) => c.startsWith(`${L},`)).map((c) => {
								const [, i, j] = c.split(",").map(Number) as [number, number, number];
								return [i, j, c];
							});
					return pts.map(([i, j, c]) => {
						const p = at(L, i + 0.5, j + 0.5);
						return <line key={`${L}-${i}-${j}`} x1={p.x} y1={p.y} x2={target.x} y2={target.y} stroke={isNew(c, L) ? "#86efac" : "white"} strokeWidth={1.6} />;
					});
				})}
				<text x={target.x} y={target.y + 5} textAnchor="middle" fontSize={13} fill="white" fontFamily="monospace">
					?
				</text>
			</svg>
			{result}
			<Caption>{caption}</Caption>
		</figure>
	);
}

/* A pivot's one result, in its own units: a coloured label over a big value (3.2's ending row, one item). */
export function ResultLine({ label, value, color = "var(--size)" }: { label: string; value: string; color?: string }) {
	return (
		<div className="mt-5 border-t border-white/10 pt-4 font-mono tabular-nums">
			<div className="text-[10.5px] tracking-[0.12em] uppercase" style={{ color }}>
				{label}
			</div>
			<div className="text-2xl">{value}</div>
		</div>
	);
}


export function CombosFig() {
	const rows: [string, number, string][] = [
		["4 hints", 233.3, "dim"],
		["8 hints", 197.2, "dim"],
		["network", 129.7, "win"],
	];
	const sweep: [number, number][] = [
		[6, 144.0],
		[12, 138.7],
		[20, 135.3],
		[30, 131.5],
		[45, 131.7],
	];
	const bar = (label: string, kb: number, max: number, color: string) => (
		<div key={label} className="grid grid-cols-[96px_1fr] items-center gap-3">
			<span className="font-mono text-[12px] text-white/70">{label}</span>
			<div className="flex items-center gap-2">
				<div className="h-4 rounded-sm bg-[var(--size)]" style={{ width: `${(kb / max) * 85}%`, opacity: color === "win" ? 1 : 0.4 }} />
				<span className="font-mono text-[11.5px] whitespace-nowrap text-white/75 tabular-nums">{kb.toFixed(1)} KB</span>
			</div>
		</div>
	);
	return (
		<figure className="my-8">
			<div className="mb-2 font-mono text-[11.5px] text-white/55">maps, KB · network included</div>
			<div className="flex flex-col gap-2">{rows.map(([l, kb, c]) => bar(l, kb, 233.3, c))}</div>
			<div className="mt-8 mb-2 font-mono text-[11.5px] text-white/55">how many neighbors to show the network</div>
			{(() => {
				const W = 640;
				const H = 130;
				const x = (nb: number) => 30 + ((nb - 6) / (45 - 6)) * (W - 70);
				const y = (kb: number) => 26 + ((145 - kb) / (145 - 130)) * (H - 56);
				return (
					<svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Maps plus network size for 6 to 45 neighbours">
						<polyline points={sweep.map(([n, k]) => `${x(n)},${y(k)}`).join(" ")} fill="none" stroke="var(--size)" strokeOpacity={0.4} strokeWidth={1.5} />
						{sweep.map(([n, k]) => (
							<g key={n}>
								<circle cx={x(n)} cy={y(k)} r={4.5} fill="var(--size)" opacity={n === 30 ? 1 : 0.4} />
								<text x={x(n)} y={y(k) - 11} textAnchor="middle" fontSize={12} fill="rgba(255,255,255,0.75)" fontFamily="monospace">
									{k.toFixed(1)}
								</text>
								<text x={x(n)} y={H - 6} textAnchor="middle" fontSize={12} fill="rgba(255,255,255,0.5)" fontFamily="monospace">
									{n}
								</text>
							</g>
						))}
					</svg>
				);
			})()}
			<Caption>The bottom row is KB after short lab runs with the last 5 maps. 45 was no better than 30, because the bigger network costs as much as it saves, so going bigger had nothing to gain.</Caption>
		</figure>
	);
}

/* 3.6 · every pose correction the lab fitted for 3.5's model, re-scored on the CPU with the lab's own maths
 * (writeup/build/eval_carriers.py -> carriers.json; the saved fits are CommaAI-Learning/prototype/out/car_*.npz,
 * car_4_12_400 = v7's shipped one, car_4_12_1200 = v7b's). Each dot is one pair's own pose part sqrt(10 x error).
 * Local scoring, a little under comma's (v7: 0.0399 here, 0.0406 official). */

type CarrierFit = { label: string; patterns: number; big: boolean; epochs: number; raw_bytes: number; pose_part: number; parts: number[] };

export function RefitFig() {
	const [d, setD] = useState<CarrierFit[] | null>(null);
	const [sel, setSel] = useState("K=4, 400 ep (v7)");
	const [prev, setPrev] = useState<string | null>(null);
	const [hov, setHov] = useState<number | null>(null);
	const pick = (l: string) => {
		if (l === sel) return;
		setPrev(sel);
		setSel(l);
	};
	useEffect(() => {
		fetch(F("carriers.json"))
			.then((r) => r.json())
			.then(setD)
			.catch(() => setD(null));
	}, []);
	if (!d) return null;
	const c = d.find((x) => x.label === sel)!;
	const pv = prev ? d.find((x) => x.label === prev) : undefined;
	const W = 640;
	const H = 205;
	const TOP = 30;
	const MAX = 0.12; // every dot of the shown fits fits (largest 0.111)
	const x = (v: number) => 8 + (Math.min(v, MAX) / MAX) * (W - 16);
	// fixed vertical spread per pair, so a dot keeps its row while it slides
	const y = (i: number) => TOP + (((i * 7919) % 600) / 600) * (H - TOP - 52);
	const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
		const r = e.currentTarget.getBoundingClientRect();
		const px = ((e.clientX - r.left) / r.width) * W;
		const py = ((e.clientY - r.top) / r.height) * H;
		let best: number | null = null;
		let bd = 100; // within 10 svg px
		c.parts.forEach((v, i) => {
			const dd = (x(v) - px) ** 2 + (y(i) - py) ** 2;
			if (dd < bd) {
				bd = dd;
				best = i;
			}
		});
		setHov(best);
	};
	// line label: comma's official pose part for each fit, as in the text. Dots and line: each checkpoint's real archive inflated and scored by comma's DistortionNet (rescore_refit.py): 0.0406 and 0.0359
	const OFFICIAL: Record<string, string> = { "K=4, 400 ep (v7)": "0.0406", "K=4, 1200 ep (v7b)": "0.0360" };
	// the fits that tell the story: the 4-pattern refit and the same fit trained longer
	const SHOWN: [string, string][] = [
		["K=4, 400 ep (v7)", "400 epochs"],
		["K=4, 1200 ep (v7b)", "1,200 epochs"],
	];
	return (
		<figure className="my-8">
			<div className="mb-4 flex flex-wrap gap-1.5">
				{SHOWN.map(([l, name]) => (
					<Btn key={l} on={sel === l} onClick={() => pick(l)}>
						{name}
					</Btn>
				))}
			</div>
			<svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Each pair's pose part with ${c.label}`} onMouseMove={onMove} onMouseLeave={() => setHov(null)}>
				{pv && (
					<g opacity={0.6}>
						<line x1={x(pv.pose_part)} x2={x(pv.pose_part)} y1={TOP - 10} y2={H - 34} stroke="rgba(255,255,255,0.5)" strokeDasharray="3 3" />
					</g>
				)}
				{c.parts.map((v, i) => (
					<circle key={i} cx={x(v)} cy={y(i)} r={2.6} fill="var(--pose)" opacity={0.75} style={{ transition: "cx 600ms ease" }} />
				))}
				<g style={{ transform: `translateX(${x(c.pose_part)}px)`, transition: "transform 600ms ease" }}>
					<line x1={0} x2={0} y1={TOP - 10} y2={H - 34} stroke="#fff" strokeWidth={2} />
					<text x={0} y={TOP - 15} textAnchor="middle" fontSize={11} fill="#fff" fontFamily="monospace">
						pose {OFFICIAL[sel]}
					</text>
				</g>
				{hov !== null && (
					<g pointerEvents="none">
						<circle cx={x(c.parts[hov])} cy={y(hov)} r={6} fill="none" stroke="#fff" strokeWidth={1.5} />
						<text x={x(c.parts[hov]) + (x(c.parts[hov]) > W - 190 ? -10 : 10)} y={y(hov) + 4} textAnchor={x(c.parts[hov]) > W - 190 ? "end" : "start"} fontSize={11.5} fill="#fff" fontFamily="monospace" paintOrder="stroke" stroke="#0b0b0f" strokeWidth={3}>
							pair {hov} · {c.parts[hov].toFixed(4)}
						</text>
					</g>
				)}
				<line x1={8} x2={W - 8} y1={H - 34} y2={H - 34} stroke="rgba(255,255,255,0.25)" />
				{[0, 0.05, 0.1].map((t) => (
					<text key={t} x={x(t)} y={H - 20} textAnchor={t === 0 ? "start" : "middle"} fontSize={11} fill="rgba(255,255,255,0.45)" fontFamily="monospace">
						{t.toFixed(2)}
					</text>
				))}
			</svg>
		</figure>
	);
}





/* 3.8 · round after training vs train with the rounding. Left chips: the lab's trained 48-channel model
 * (CommaAI-Learning/prototype/out/stage_c48j8.pt) rounded per channel after training, no retraining
 * (writeup/build/round_probe.py, the lab's ptq_probe.py re-run on the CPU; seg parts reproduce OVERNIGHT_REPORT.md).
 * Last chip: the final 5-bit model, trained with the rounding from the first step (final_seg300.py; seg part from the
 * final report.txt). Image: pair 300, rows 167-298, real map dimmed, SegNet's wrong pixels in red (drawn 3 px wide). */

type RoundProbe = { wrong: Record<string, number>; seg_part: Record<string, number> };

export function RoundingBitsFig() {
	const [d, setD] = useState<RoundProbe | null>(null);
	const [sel, setSel] = useState("5");
	useEffect(() => {
		fetch(F("round_probe.json"))
			.then((r) => r.json())
			.then(setD)
			.catch(() => setD(null));
	}, []);
	if (!d) return null;
	const after: [string, string][] = [
		["float", "full"],
		["8", "8-bit"],
		["6", "6-bit"],
		["5", "5-bit"],
		["4", "4-bit"],
	];
	return (
		<figure className="my-8">
			<div className="mb-4 flex flex-wrap gap-x-6 gap-y-3">
				<div>
					<div className="mb-1.5 font-mono text-[10.5px] tracking-[0.12em] text-white/45 uppercase">rounded after training</div>
					<div className="flex flex-wrap gap-1.5">
						{after.map(([k, l]) => (
							<Btn key={k} on={sel === k} onClick={() => setSel(k)}>
								{l}
							</Btn>
						))}
					</div>
				</div>
				<div>
					<div className="mb-1.5 font-mono text-[10.5px] tracking-[0.12em] text-white/45 uppercase">trained with the rounding</div>
					<Btn on={sel === "qat"} onClick={() => setSel("qat")}>
						5-bit
					</Btn>
				</div>
			</div>
			<img src={F(`round_${sel}_wrong.png`)} alt="Pair 300: SegNet's wrong pixels in red" className="block w-full rounded" style={{ imageRendering: "pixelated" }} />
			<div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 font-mono tabular-nums">
				<div>
					<div className="text-[10.5px] tracking-[0.12em] text-[var(--seg)] uppercase">seg part</div>
					<div className="text-2xl">{d.seg_part[sel]!.toFixed(4)}</div>
				</div>
				<div>
					<div className="text-[10.5px] tracking-[0.12em] text-white/45 uppercase">wrong pixels, this frame</div>
					<div className="text-2xl">{d.wrong[sel]}</div>
				</div>
			</div>
			<Caption>Pair 300 near the horizon, wrong pixels drawn larger so they show. On the left is a trained model rounded after the fact. On the right is the final 5-bit model, trained with the rounding from the first step.</Caption>
		</figure>
	);
}

/* 3.9 · retraining frame 1 on the packed model, final run (head_curve.json, parsed from solution/out/run_all.log:
 * "start: pose part 0.0920", then pose part every 10 epochs, "best pose part 0.0583 -> out/stage_head.pt").
 * The fit is noisy, so the run keeps the best checkpoint, not the last. */

/* 3.9 · animated. Top: the lab checkpoints from 3.8's model to 3.9's (report.txt of v10, v11, v12, v12b, v13a: seg part =
 * 100 x SegNet, pose part = sqrt(10 x PoseNet)), one bar that morphs step to step while the score counts. Steps play by
 * themselves once the figure is on screen; click one to jump. Bottom, at the last step: v13a's own log
 * (research/jp_night.log via writeup/build/jp_night_curve.py) drawing itself: frame 1 retrained on the packed model (pose
 * before correction), then the correction fit, then a joint polish that found nothing better. The log was overwritten
 * after epoch 120 of the first phase, so that stretch is drawn as a gap up to the value the phase kept. */
type Curve = { start: number; kept: { head: number; carrier: number; polish: number }; points: { head: [number, number][]; carrier: [number, number][]; polish: [number, number][] } };

/* 3.9 · one line. v13a's first step re-run at 1,200 epochs instead of 600 (writeup/build/longer_head.py/.sh, same script
 * and inputs; correction refit with carrier.py on both: 600 -> 0.0311, 1,200 -> 0.0299): frame 1's 11,235 weights retrained on the exact packed model, pose part
 * (sqrt(10 x PoseNet), before any correction) every 10 epochs, and the best check the run keeps. Draws itself on screen. */
export function HeadLineFig() {
	const [d, setD] = useState<{ start: number; best: number; points: [number, number][] } | null>(null);
	const [draw, setDraw] = useState(0);
	const [run, setRun] = useState(0);
	const [seen, setSeen] = useState(false);
	const [hov, setHov] = useState<number | null>(null);
	const ref = useRef<HTMLElement>(null);
	useEffect(() => {
		fetch(F("v13a_head_1200.json"))
			.then((r) => r.json())
			.then(setD)
			.catch(() => setD(null));
	}, []);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const io = new IntersectionObserver(([e]) => e && e.isIntersecting && setSeen(true), { threshold: 0.35 });
		io.observe(el);
		return () => io.disconnect();
	}, []);
	useEffect(() => {
		if (!seen) return;
		const t0 = performance.now();
		let raf = 0;
		const tick = (now: number) => {
			const k = Math.min(1, (now - t0) / 5000);
			setDraw(k);
			if (k < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [seen, run]);
	const W = 640, H = 230, L = 46, R = 630, T = 16, B = 196;
	const EP = 1200;
	const pts = d ? d.points : [];
	const top = d ? Math.max(d.start, ...pts.map((p) => p[1])) : 1;
	const lo = d ? Math.min(d.best, ...pts.map((p) => p[1])) * 0.85 : 0.01;
	const y = (v: number) => T + ((Math.log10(top) - Math.log10(v)) / (Math.log10(top) - Math.log10(lo))) * (B - T);
	const x = (e: number) => L + (e / EP) * (R - L);
	const upTo = draw * EP;
	const shown = pts.filter(([e]) => e <= upTo);
	let best = d ? d.start : 0;
	const bestPath: string[] = d ? [`${x(0)},${y(d.start)}`] : [];
	for (const [e, v] of shown) {
		if (v < best) {
			bestPath.push(`${x(e)},${y(best)}`);
			best = v;
		}
		bestPath.push(`${x(e)},${y(best)}`);
	}
	if (d && shown.length) bestPath.push(`${x(upTo)},${y(best)}`);
	const ticks = [0.05, 0.1, 0.2, 0.5, 1].filter((v) => v <= top * 1.01 && v >= lo);
	return (
		<figure ref={ref} className="my-8">
			<div className="mb-3 text-[15px]">
				<span className="font-semibold">Frame 1 retrained on the packed model</span>
			</div>
			<div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
				<span />
				<button type="button" onClick={() => { setSeen(true); setRun((r) => r + 1); }} className="cw-focus font-mono text-[11px] text-white/50 hover:text-white">
					↻ replay
				</button>
			</div>
			{d && (
				<svg
						viewBox={`0 0 ${W} ${H}`}
						className="block w-full"
						onMouseMove={(e) => {
							const bb = e.currentTarget.getBoundingClientRect();
							const ex = ((e.clientX - bb.left) / bb.width) * W;
							const ep = Math.round((((ex - L) / (R - L)) * EP) / 10) * 10;
							setHov(draw >= 1 && ep >= 0 && ep <= EP ? ep : null);
						}}
						onMouseLeave={() => setHov(null)}
						role="img" aria-label="Frame 1's pose part falling while it is retrained on the packed model">
					{ticks.map((v) => (
						<g key={v}>
							<line x1={L} x2={R} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.06)" />
							<text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize={10.5} fill="rgba(255,255,255,0.4)" fontFamily="monospace">
								{v}
							</text>
						</g>
					))}
					{[0, 300, 600, 900].map((e) => (
						<text key={e} x={x(e)} y={H - 10} textAnchor="middle" fontSize={10.5} fill="rgba(255,255,255,0.4)" fontFamily="monospace">
							{e}
						</text>
					))}
					<text x={R} y={H - 10} textAnchor="end" fontSize={10.5} fill="rgba(255,255,255,0.4)" fontFamily="monospace">
						1,200 epochs
					</text>
					<polyline points={[`${x(0)},${y(d.start)}`, ...shown.map(([e, v]) => `${x(e)},${y(v)}`)].join(" ")} fill="none" stroke="var(--pose)" strokeOpacity={0.6} strokeWidth={1.2} />
					{(() => {
						let bb = d.start;
						return shown.map(([e, v]) => {
							if (v >= bb) return null;
							bb = v;
							return <circle key={e} cx={x(e)} cy={y(v)} r={2.6} fill="#86efac" />;
						});
					})()}
					<circle cx={x(0)} cy={y(d.start)} r={4} fill="white" />
					<text x={x(0) + 8} y={y(d.start) - 8} fontSize={11} fill="rgba(255,255,255,0.75)" fontFamily="monospace">
						{d.start.toFixed(4)} as packed
					</text>
					{draw >= 1 && (
						<>
							<circle cx={R} cy={y(d.best)} r={5} fill="#86efac" />
							<text x={R - 8} y={y(d.best) - 10} textAnchor="end" fontSize={11} fill="#86efac" fontFamily="monospace">
								kept {d.best.toFixed(4)}
							</text>
						</>
					)}
					{hov !== null && (() => {
						const cur = hov === 0 ? d.start : pts.find((p) => p[0] === hov)?.[1];
						if (cur === undefined) return null;
						const before = Math.min(d.start, ...pts.filter((p) => p[0] < hov).map((p) => p[1]));
						const isBest = hov > 0 && cur < before;
						const bx = x(hov) > (L + R) / 2 ? x(hov) - 138 : x(hov) + 10;
						return (
							<g pointerEvents="none">
								<line x1={x(hov)} x2={x(hov)} y1={T} y2={B} stroke="rgba(255,255,255,0.25)" />
								<circle cx={x(hov)} cy={y(cur)} r={4} fill={isBest ? "#86efac" : "var(--pose)"} />
								<rect x={bx} y={T} width={128} height={isBest ? 52 : 38} rx={4} fill="rgba(0,0,0,0.85)" stroke="rgba(255,255,255,0.15)" />
								<text x={bx + 10} y={T + 16} fontSize={11} fill="rgba(255,255,255,0.6)" fontFamily="monospace">epoch {hov}</text>
								<text x={bx + 10} y={T + 31} fontSize={11} fill="var(--pose)" fontFamily="monospace">pose {cur.toFixed(4)}</text>
								{isBest && (
									<text x={bx + 10} y={T + 45} fontSize={11} fill="#86efac" fontFamily="monospace">● new best</text>
								)}
							</g>
						);
					})()}
				</svg>
			)}
		</figure>
	);
}

const STEPS_39 = [
	{ what: "3.8's model", seg: 0.040777, pose: Math.sqrt(10 * 0.00016099), score: 0.2004 },
	{ what: "seg stage trained 2× longer", seg: 0.03474, pose: Math.sqrt(10 * 0.00008165), score: 0.1828 },
	{ what: "seg stage 4× longer", seg: 0.029495, pose: Math.sqrt(10 * 0.00011493), score: 0.1827 },
	{ what: "correction 2,400 epochs", seg: 0.029495, pose: Math.sqrt(10 * 0.00010138), score: 0.1807 },
	{ what: "frame 1 retrained on the packed model", seg: 0.029495, pose: Math.sqrt(10 * 0.00009616), score: 0.1798 },
];

export function TrainCurveFig() {
	const [curve, setCurve] = useState<Curve | null>(null);
	const [draw, setDraw] = useState(0); // 0..1
	const [run, setRun] = useState(0);
	const ref = useRef<HTMLElement>(null);
	const [seen, setSeen] = useState(false);
	useEffect(() => {
		fetch(F("v13a_curve.json"))
			.then((r) => r.json())
			.then(setCurve)
			.catch(() => setCurve(null));
	}, []);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const io = new IntersectionObserver(([e]) => e && e.isIntersecting && setSeen(true), { threshold: 0.35 });
		io.observe(el);
		return () => io.disconnect();
	}, []);
	useEffect(() => {
		if (!seen) return;
		const t0 = performance.now();
		let raf = 0;
		const tick = (now: number) => {
			const k = Math.min(1, (now - t0) / 4000);
			setDraw(k);
			if (k < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [seen, run]);
	const first = STEPS_39[0]!;
	const last = STEPS_39[4]!;
	// left: seg part before / after training longer (bars grow in the first quarter of the animation)
	const grow = Math.min(1, draw * 4);
	// right: the correction refit on top of the retrained frame 1, every check from v13a's log
	const W = 360, H = 200, L = 34, R = 350, T = 20, B = 176;
	const lo = 0.028, hi = 0.068;
	const y = (v: number) => T + ((hi - Math.max(lo, Math.min(hi, v))) / (hi - lo)) * (B - T);
	const pts = curve ? [[0, curve.kept.head] as [number, number], ...curve.points.carrier] : [];
	const ex = (e: number) => L + (e / 2500) * (R - L);
	const upTo = 2500 * Math.max(0, (draw - 0.2) / 0.8);
	const drawn = pts.filter(([e]) => e <= upTo);
	const now = drawn.length ? drawn[drawn.length - 1]![1] : curve?.kept.head ?? 0;
	const done = draw >= 1;
	return (
		<figure ref={ref} className="my-8">
			<div className="mb-3 flex justify-end">
				<button type="button" onClick={() => { setSeen(true); setRun((r) => r + 1); }} className="cw-focus font-mono text-[11px] text-white/50 hover:text-white">
					↻ replay
				</button>
			</div>
			<div className="grid gap-8 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
				<div>
					<div className="mb-3 font-mono text-[12px] text-white">1 · trained longer</div>
					<div className="flex flex-col gap-3 font-mono text-[12px]">
						{[
							{ label: "before", v: first.seg, op: 0.45 },
							{ label: "after", v: first.seg + (last.seg - first.seg) * grow, op: 1 },
						].map((r) => (
							<div key={r.label}>
								<div className="mb-1 flex justify-between text-white/60">
									<span>{r.label}</span>
									<span className="tabular-nums text-white">{r.v.toFixed(4)}</span>
								</div>
								<div className="h-5 rounded-sm bg-[var(--seg)]" style={{ width: `${(r.v / first.seg) * 100}%`, opacity: r.op }} />
							</div>
						))}
					</div>
					<div className="mt-3 font-mono text-[11px] text-white/45">seg part: fewer pixels SegNet gets wrong</div>
				</div>
				<div>
					<div className="mb-1 font-mono text-[12px] text-white">2 · frame 1 retrained on the packed model</div>
					{curve && (
						<svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Pose part falling from 0.0653 to 0.0310 while the correction is fitted on the retrained frame 1">
							{[0.03, 0.04, 0.05, 0.06].map((v) => (
								<g key={v}>
									<line x1={L} x2={R} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.06)" />
									<text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize={10} fill="rgba(255,255,255,0.4)" fontFamily="monospace">
										{v}
									</text>
								</g>
							))}
							<polyline points={drawn.map(([e, v]) => `${ex(e)},${y(v)}`).join(" ")} fill="none" stroke="var(--pose)" strokeWidth={1.5} />
							<circle cx={ex(drawn.length ? drawn[drawn.length - 1]![0] : 0)} cy={y(now)} r={4} fill={done ? "#86efac" : "var(--pose)"} />
							{upTo >= 2400 && (
								<text x={ex(2400) - 4} y={y(0.0375)} textAnchor="end" fontSize={9.5} fill="rgba(255,255,255,0.45)" fontFamily="monospace">
									8-bit rounding on
								</text>
							)}
							<text x={R} y={B + 18} textAnchor="end" fontSize={10} fill="rgba(255,255,255,0.4)" fontFamily="monospace">
								epochs of fitting →
							</text>
						</svg>
					)}
					<div className="font-mono text-[11px] text-white/45">pose part, every check of the run: PoseNet reads the motion better</div>
				</div>
			</div>
			<div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 font-mono tabular-nums">
				<div>
					<div className="text-[10.5px] tracking-[0.12em] text-[var(--seg)] uppercase">seg part</div>
					<div className="text-xl">0.0408 → 0.0295</div>
				</div>
				<div>
					<div className="text-[10.5px] tracking-[0.12em] text-[var(--pose)] uppercase">pose part</div>
					<div className="text-xl">0.0401 → 0.0310</div>
				</div>
				<div>
					<div className="text-[10.5px] tracking-[0.12em] text-white/55 uppercase">score</div>
					<div className="text-xl">0.2004 → 0.1798</div>
				</div>
			</div>
			<Caption>Two changes, same model and same archive size. Training longer made SegNet's reading better. Retraining frame 1 on the exact packed model, then fitting the correction on top of it, made PoseNet's better. The curve is every check of that fit from the run's log, starting from the retrained frame 1 at 0.0653.</Caption>
		</figure>
	);
}

/* 3.9 · each lab checkpoint from 3.8's model to 3.9's, scored by comma's evaluator (CommaAI-Learning/prototype/
 * checkpoints/<v>/report.txt): seg part = 100 x SegNet distortion, pose part = sqrt(10 x PoseNet distortion). The size
 * part barely moves (0.1195 -> 0.1192), so the bars show only seg and pose. */
/* 3.8 · training curves, each check every 5 (seg) or 10 (pose) epochs, scored on all 600 pairs.
 * Seg chart: the final code's seg stage trained two ways from scratch, 150 epochs (seg_stage_150.json, writeup/build
 * qat_bits.py 5 150 -> qat_out/log5_e150.txt) and 600 epochs (seg_stage_curve.json, the final run's own stage from
 * comma-lab/solution/out/run_all.log). Header = each run's last check. This is a rerun with the final code; the text's
 * lab numbers (0.0408 -> 0.0295) came from the lab chain v10 -> v12, whose per-epoch logs were not kept.
 * Pose chart: frame 1 retrained on the packed model for 600 epochs (v13a_head_rerun.json, pose part before the
 * correction). */
type TrainCurve = { points: [number, number][]; start?: number; end?: [number, number]; best?: number };
// one training curve; hover shows the epoch and value. `stop` marks where a separate shorter run ended (seg: the 150-epoch run).
function MiniCurve({ file, color, yMin, yMax, stop }: { file: string; color: string; yMin: number; yMax: number; stop?: { file: string; label: string } }) {
	const [d, setD] = useState<TrainCurve | null>(null);
	const [s, setS] = useState<TrainCurve | null>(null);
	const [hov, setHov] = useState<number | null>(null);
	useEffect(() => {
		fetch(F(file))
			.then((r) => r.json())
			.then(setD)
			.catch(() => setD(null));
		if (stop)
			fetch(F(stop.file))
				.then((r) => r.json())
				.then(setS)
				.catch(() => setS(null));
	}, [file, stop]);
	const W = 600, H = 170, L = 44, R = 10, T = 10, B = 24;
	const x = (e: number) => L + (e / 600) * (W - L - R);
	const y = (v: number) => T + (1 - (Math.min(Math.max(v, yMin), yMax) - yMin) / (yMax - yMin)) * (H - T - B);
	const all: [number, number][] = d ? [...(d.start !== undefined ? [[0, d.start] as [number, number]] : []), ...d.points] : [];
	const line = all.map(([e, v], i) => `${i ? "L" : "M"}${x(e).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
	const sEnd = s ? s.points[s.points.length - 1]! : null;
	// the dot marks what the run keeps: its best check when the file records one (the frame 1 retrain keeps its best checkpoint), else the end
	const last = !all.length ? null : d?.best !== undefined ? all.reduce((m, p) => (Math.abs(p[1] - d.best!) < Math.abs(m[1] - d.best!) ? p : m)) : all[all.length - 1]!;
	const hp = hov !== null ? all[hov] : null;
	const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
		if (!all.length) return;
		const r = e.currentTarget.getBoundingClientRect();
		const ep = ((((e.clientX - r.left) / r.width) * W - L) / (W - L - R)) * 600;
		let best = 0;
		all.forEach(([pe], i) => {
			if (Math.abs(pe - ep) < Math.abs(all[best]![0] - ep)) best = i;
		});
		setHov(best);
	};
	return (
		<svg viewBox={`0 0 ${W} ${H}`} className="block w-full cursor-crosshair touch-none" role="img" aria-hidden="true" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHov(null)}>
			{[yMin, yMax].map((t) => (
				<g key={t}>
					<line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.08)" />
					<text x={L - 5} y={y(t) + 3.5} textAnchor="end" fontSize={11} fill="rgba(255,255,255,0.45)" fontFamily="monospace">
						{t.toFixed(2)}
					</text>
				</g>
			))}
			{[0, 150, 300, 600].map((e) => (
				<text key={e} x={x(e)} y={H - 6} textAnchor="middle" fontSize={11} fill="rgba(255,255,255,0.45)" fontFamily="monospace">
					{e}
				</text>
			))}
			<path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
			{last && <circle cx={x(last[0])} cy={y(last[1])} r={4} fill={color} />}
			{sEnd && stop && (
				<g>
					<circle cx={x(sEnd[0])} cy={y(sEnd[1])} r={4} fill="#0b0b0f" stroke={color} strokeWidth={2} />
					<text x={x(sEnd[0])} y={y(sEnd[1]) + 20} textAnchor="middle" fontSize={11} fill="rgba(255,255,255,0.7)" fontFamily="monospace">
						{stop.label}
					</text>
				</g>
			)}
			{hp && (
				<g pointerEvents="none">
					<line x1={x(hp[0])} x2={x(hp[0])} y1={T} y2={H - B} stroke="rgba(255,255,255,0.25)" />
					<circle cx={x(hp[0])} cy={y(hp[1])} r={4} fill="#fff" />
					<text x={x(hp[0]) + (x(hp[0]) > W - 140 ? -8 : 8)} y={T + 12} textAnchor={x(hp[0]) > W - 140 ? "end" : "start"} fontSize={11.5} fill="#fff" fontFamily="monospace">
						epoch {hp[0]} · {hp[1].toFixed(4)}
					</text>
				</g>
			)}
		</svg>
	);
}

function TrainingPanel({ head, curve }: { head: ReactNode; curve: ReactNode }) {
	return (
		<figure className="my-8">
			<div className="mb-2 font-mono text-[20px] tabular-nums">{head}</div>
			{curve}
			<div className="mt-1 text-center font-mono text-[10px] text-white/40">epoch</div>
		</figure>
	);
}

/* 3.8 under paragraph 1 */
export function SegTrainingFig() {
	return (
		<TrainingPanel
			head={
				<>
					<span style={{ color: "var(--seg)" }}>seg</span> 0.0435 → 0.0293
				</>
			}
			curve={<MiniCurve file="seg_stage_curve.json" color="var(--seg)" yMin={0.02} yMax={0.1} />}
		/>
	);
}

/* 3.8 at the end of the section */
export function PoseTrainingFig() {
	return (
		<TrainingPanel
			head={
				<>
					<span style={{ color: "var(--pose)" }}>pose</span> 0.1951 → 0.0653
				</>
			}
			curve={<MiniCurve file="v13a_head_rerun.json" color="var(--pose)" yMin={0} yMax={0.22} />}
		/>
	);
}

export function TrainLongerFig() {
	// 3.8, end of section: every lab step from 3.7's model to the retrained frame 1. Archive size is the same on every row.
	const rows = [
		{ what: "3.7's model", seg: 0.040777, pose: Math.sqrt(10 * 0.00016099), score: 0.2004 },
		{ what: "seg stage 300 epochs", seg: 0.03474, pose: Math.sqrt(10 * 0.00008165), score: 0.1828 },
		{ what: "seg stage 600 epochs", seg: 0.029495, pose: Math.sqrt(10 * 0.00011493), score: 0.1827 },
		{ what: "correction refit, 2,400 epochs", seg: 0.029495, pose: Math.sqrt(10 * 0.00010138), score: 0.1807 },
		{ what: "frame 1 retrained on the packed model", seg: 0.029495, pose: Math.sqrt(10 * 0.00009616), score: 0.1798 },
	];
	const max = 0.085;
	return (
		<figure className="my-8">
			<div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11.5px] text-white/60">
				<span className="inline-flex items-center gap-1.5">
					<span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--seg)]" /> seg part
				</span>
				<span className="inline-flex items-center gap-1.5">
					<span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--pose)]" /> pose part
				</span>
				<span>same archive size on every row</span>
			</div>
			<div className="flex flex-col gap-2.5">
				{rows.map((r, i) => {
					const d = i ? r.score - rows[i - 1]!.score : 0;
					return (
						<div key={r.what} className="grid grid-cols-[minmax(0,200px)_minmax(0,1fr)_92px] items-center gap-3">
							<span className="font-mono text-[12px] leading-tight" style={{ color: i === rows.length - 1 || i === 0 ? "white" : "rgba(255,255,255,0.7)" }}>
								{r.what}
							</span>
							<span className="flex h-5 gap-[2px]">
								<span className="h-full rounded-l-sm bg-[var(--seg)]" style={{ width: `${(r.seg / max) * 100}%` }} title={`seg ${r.seg.toFixed(4)}`} />
								<span className="h-full rounded-r-sm bg-[var(--pose)]" style={{ width: `${(r.pose / max) * 100}%` }} title={`pose ${r.pose.toFixed(4)}`} />
							</span>
							<span className="text-right font-mono text-[12px] tabular-nums">
								{r.score.toFixed(4)}
								{i > 0 && (
									<span className="ml-1.5 text-[10.5px]" style={{ color: d < 0 ? "#86efac" : "#ff5a6e" }}>
										{d < 0 ? "−" : "+"}
										{Math.abs(d).toFixed(4)}
									</span>
								)}
							</span>
						</div>
					);
				})}
			</div>
		</figure>
	);
}

export function HeadRetrainFig() {
	const [d, setD] = useState<{ start: number; best: number; points: [number, number][] } | null>(null);
	useEffect(() => {
		fetch(F("head_curve.json"))
			.then((r) => r.json())
			.then(setD)
			.catch(() => setD(null));
	}, []);
	if (!d) return null;
	const W = 640;
	const H = 220;
	const L = 44;
	const B = 26;
	const top = Math.max(...d.points.map((p) => p[1]));
	const x = (e: number) => L + (e / 600) * (W - L - 10);
	const lo = 0.05; // log scale: one spike near 0.6 would otherwise flatten the part that matters
	const y = (v: number) => 10 + ((Math.log10(top) - Math.log10(v)) / (Math.log10(top) - Math.log10(lo))) * (H - B - 10);
	let best = d.start;
	const bestPath = [`${x(0)},${y(d.start)}`];
	for (const [e, v] of d.points) {
		if (v < best) {
			bestPath.push(`${x(e)},${y(best)}`);
			best = v;
		}
		bestPath.push(`${x(e)},${y(best)}`);
	}
	const bestAt = d.points.find((p) => p[1] === d.best)!;
	return (
		<figure className="my-8">
			<div className="mb-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11.5px] text-white/60">
				<span className="inline-flex items-center gap-1.5">
					<span className="inline-block h-0.5 w-4 bg-[var(--pose)]" />
					pose part each check
				</span>
				<span className="inline-flex items-center gap-1.5">
					<span className="inline-block h-0.5 w-4 bg-white" />
					best so far (what the run keeps)
				</span>
			</div>
			<svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Pose part while retraining frame 1, and the best checkpoint kept">
				<line x1={L} x2={W - 10} y1={y(d.start)} y2={y(d.start)} stroke="rgba(255,255,255,0.3)" strokeDasharray="4 3" />
				<text x={W - 10} y={y(d.start) - 5} textAnchor="end" fontSize={11} fill="rgba(255,255,255,0.5)" fontFamily="monospace">
					before retraining {d.start.toFixed(4)}
				</text>
				<polyline points={[`${x(0)},${y(d.start)}`, ...d.points.map(([e, v]) => `${x(e)},${y(v)}`)].join(" ")} fill="none" stroke="var(--pose)" strokeOpacity={0.7} strokeWidth={1.4} />
				<polyline points={bestPath.join(" ")} fill="none" stroke="white" strokeWidth={1.8} />
				<circle cx={x(bestAt[0])} cy={y(bestAt[1])} r={5} fill="#86efac" />
				<text x={x(bestAt[0])} y={y(bestAt[1]) + 18} textAnchor="middle" fontSize={11} fill="#86efac" fontFamily="monospace">
					kept {d.best.toFixed(4)}
				</text>
				{[0, 200, 400, 600].map((e) => (
					<text key={e} x={x(e)} y={H - 6} textAnchor="middle" fontSize={11} fill="rgba(255,255,255,0.45)" fontFamily="monospace">
						{e}
					</text>
				))}
				{[0.06, 0.1, 0.2, 0.4].map((v) => (
					<text key={v} x={L - 6} y={y(v) + 4} textAnchor="end" fontSize={10.5} fill="rgba(255,255,255,0.4)" fontFamily="monospace">
						{v}
					</text>
				))}
			</svg>
			<div className="mt-4 border-t border-white/10 pt-4 font-mono tabular-nums">
				<div className="text-[10.5px] tracking-[0.12em] text-[var(--pose)] uppercase">pose part</div>
				<div className="text-2xl">
					{d.start.toFixed(4)} → {d.best.toFixed(4)}
				</div>
			</div>
			<Caption>The final run retraining only frame 1's 11,235 weights on the packed model, 600 epochs, checked every 10 (log scale). The fit jumps around, so the run keeps the best check, not the last.</Caption>
		</figure>
	);
}

/* 3.7 · what cleaning does to one frame, and to all 600 (clean_frames.json + cleanf_<frame>_{without,with}.png from
 * writeup/build/clean_per_frame.py: real maps vs the final run's out/clean_maps.npz, both drawn by the final model and
 * graded by SegNet). One image per frame: green = mistake cleaning fixed, red = wrong after cleaning (new or left over,
 * recolored from the old dim red), drawn 3 px wide so they show. The 12 frames where cleaning helped most. */

type CleanFrame = { frame: number; changed: number; before: number; after: number; fixed: number; broke: number };

export function CleanFramesFig() {
	const [d, setD] = useState<{ top: CleanFrame[]; helped: number; hurt: number; unchanged: number } | null>(null);
	const [sel, setSel] = useState(0);
	const startX = useRef<number | null>(null);
	useEffect(() => {
		fetch(F("clean_frames.json"))
			.then((r) => r.json())
			.then(setD)
			.catch(() => setD(null));
	}, []);
	if (!d) return null;
	const shown = d.top.filter((t) => t.frame !== 522 && t.frame !== 177); // 10 frames, the two with the most new mistakes left out
	const n = shown.length;
	const go = (k: number) => setSel((v) => (v + k + n) % n);
	const f = shown[sel]!;
	return (
		<figure className="my-8">
			<div className="mb-3 flex items-start justify-between gap-3 font-mono tabular-nums">
				<div>
					<Label>frame {f.frame}</Label>
					<div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
						<span className="text-[20px] leading-none text-white">
							{f.before} <span className="text-white/40">→</span> {f.after}
						</span>
						<span className="text-[12px] text-white/50">wrong pixels</span>
						<span className="text-[12px]">
							<span className="text-[#86efac]">{f.fixed} fixed</span> <span className="text-white/40">·</span> <span className="text-[#ff5a6e]">{f.broke} new</span>
						</span>
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<span className="mr-1 text-[12px] text-white/50">
						{sel + 1} / {n}
					</span>
					<button type="button" onClick={() => go(-1)} className="cw-focus rounded border border-white/15 px-2.5 py-0.5 font-mono text-[11.5px] text-white/70 hover:text-white">
						← back
					</button>
					<button type="button" onClick={() => go(1)} className="cw-focus rounded border border-white/15 px-2.5 py-0.5 font-mono text-[11.5px] text-white/70 hover:text-white">
						next →
					</button>
				</div>
			</div>
			<div className="relative">
				<img
					src={F(`cleanf_${f.frame}_diff.png`)}
					alt={`Frame ${f.frame}: SegNet mistakes cleaning fixed (green) and new ones it caused (red)`}
					className="block w-full touch-pan-y rounded select-none"
					style={{ imageRendering: "pixelated" }}
					draggable={false}
					onPointerDown={(e) => (startX.current = e.clientX)}
					onPointerUp={(e) => {
						if (startX.current === null) return;
						const dx = e.clientX - startX.current;
						if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); // swipe left = next frame
						startX.current = null;
					}}
				/>
			</div>
		</figure>
	);
}

/* 3.8 · the renderer that draws each frame back from its map, before and after 3.8: lab v8 (24 channels, 8-bit weights)
 * and v9 (32 channels, 5-bit). Each row runs pair 300 through the trunk: map in -> squeeze (192 x 256) -> middle
 * (96 x 128, twice the channels) -> expand (192 x 256) -> out (384 x 512) -> frame. Tiles are drawn at their real
 * relative resolution; each stage shows its clearest channel (writeup/build/renderer_flow.py), and the frame is the
 * model's own output. Weights and seg part: lab measurements over all 600 pairs (PIVOT_NOTES 3.8). */


export function FilterSnapFig() {
	// one real 3 x 3 filter of the final model (out/stage_seg.pt, shrink1 output 3, looking at the road grid), as trained
	// and snapped to its row's step (pack.py's rule): 8-bit step 0.0241, 5-bit step 0.1928
	const FILTERS = [
		{ name: "as trained", note: "9 different values", v: [0.096, 0.103, 0.269, 0.24, 0.426, 0.453, -0.096, 0.129, -0.096] },
		{ name: "8-bit", note: "almost the same", v: [0.096, 0.096, 0.265, 0.241, 0.434, 0.458, -0.096, 0.12, -0.096] },
		{ name: "5-bit", note: "3 values left", v: [0.193, 0.193, 0.193, 0.193, 0.386, 0.386, 0, 0.193, 0] },
	];
	return (
		<figure className="my-8">
			<div className="mb-3 font-mono text-[11.5px] text-white/55">one real 3×3 filter from your model, looking at the road grid</div>
			<div className="flex flex-wrap gap-x-8 gap-y-5">
				{FILTERS.map((f, fi) => (
					<div key={f.name}>
						<div className="mb-1.5 font-mono text-[13px]" style={{ color: fi ? "white" : "rgba(255,255,255,0.6)" }}>
							{f.name} <span className="text-[11px] text-white/45">· {f.note}</span>
						</div>
						<div className="grid grid-cols-[repeat(3,56px)] gap-[3px]">
							{f.v.map((x, i) => {
								const t = Math.min(1, Math.abs(x) / 0.46);
								return (
									<div key={i} className="flex h-14 items-center justify-center rounded font-mono text-[12px] tabular-nums" style={{ background: x < 0 ? `rgba(240,171,252,${0.1 + 0.9 * t})` : `rgba(252,211,77,${0.06 + 0.94 * t})`, color: t > 0.5 ? "#2a1f00" : "rgba(255,255,255,0.85)" }}>
										{x.toFixed(3)}
									</div>
								);
							})}
						</div>
					</div>
				))}
			</div>
			<Caption>Each number says how much road at that spot counts toward the next grid (pink counts against). At 8-bit the filter keeps its detail. At 5-bit the nine numbers collapse to three, but it still means the same thing.</Caption>
		</figure>
	);
}

export function FiveBitFig() {
	// one weight, stored both ways: rounded to a whole number on a -127..127 (8-bit) or -15..15 (5-bit) grid
	const rows = [
		{ label: "8-bit", bits: "00101111", int: 47, values: 255, ch: 24, kb: "33.8 KB" },
		{ label: "5-bit", bits: "00110", int: 6, values: 31, ch: 32, kb: "29.6 KB" },
	];
	return (
		<figure className="my-8">
			<div className="mb-3 font-mono text-[11.5px] text-white/55">fewer bits per weight left room for more grids</div>
			<div className="flex flex-col gap-2">
				{rows.map((r, ri) => (
					<div key={r.label} className="grid grid-cols-[150px_1fr] items-center gap-3">
						<span className="font-mono text-[12px] text-white/70">
							{r.ch} grids × {r.label}
						</span>
						<span className="flex items-center gap-2">
							<span className="h-4 rounded-sm bg-[var(--size)]" style={{ width: `${(parseFloat(r.kb) / 33.8) * 80}%`, opacity: ri ? 1 : 0.4 }} />
							<span className="font-mono text-[11.5px] whitespace-nowrap text-white/75">{r.kb}</span>
						</span>
					</div>
				))}
			</div>
			<div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 font-mono tabular-nums">
				<div>
					<div className="text-[10.5px] tracking-[0.12em] text-[var(--size)] uppercase">weights</div>
					<div className="text-2xl">33.8 → 29.6 KB</div>
				</div>
				<div>
					<div className="text-[10.5px] tracking-[0.12em] text-[var(--seg)] uppercase">seg part</div>
					<div className="text-2xl">0.0584 → 0.0443</div>
				</div>
			</div>
			<Caption>Each 5-bit weight costs 5 bits instead of 8. That paid for a third more grids in fewer bytes, and the wider model draws edges SegNet reads better. It only held up because the model was trained with the 5-bit rounding from the first step.</Caption>
		</figure>
	);
}


/* §2 · the model inside the codec, as written in frame_model.py (FrameModel, the same shape in every version since): the map
 * goes in as 7 grids (5 classes + 2 position), shrink1 halves it into 32 grids, shrink2 quarters it into 64, four
 * corrections run there, then it is enlarged twice back to full size, with shrink1's half-size grids glued back on, and
 * mixed into 3 colours. Block height = picture size, block width = grids. */
export function ModelShapeFig() {
	const steps = [
		{ h: 384, w: 512, g: 7, name: "map in" },
		{ h: 192, w: 256, g: 32, name: "shrink" },
		{ h: 96, w: 128, g: 64, name: "shrink again" },
		{ h: 192, w: 256, g: 32, name: "enlarge" },
		{ h: 384, w: 512, g: 32, name: "enlarge" },
		{ h: 384, w: 512, g: 3, name: "frame" },
	];
	const W = 680;
	const yMid = 92;
	let x = 30;
	const mids: number[] = [];
	return (
		<figure className="my-8">
			<svg viewBox={`0 0 ${W} 190`} className="block w-full" role="img" aria-label="The model: shrink the map twice into more grids, then enlarge it back into a frame">
				{steps.map((st, i) => {
					const hp = (st.h / 384) * 96;
					const wp = Math.max(6, st.g * 1.6);
					const cx = x;
					mids.push(cx + wp / 2);
					x += wp + 40;
					const frame = i === steps.length - 1;
					return (
						<g key={i}>
							<rect x={cx} y={yMid - hp / 2} width={wp} height={hp} rx={2} fill={i === 0 ? "rgba(255,255,255,0.18)" : frame ? "rgba(255,255,255,0.55)" : "var(--size)"} fillOpacity={i === 0 || frame ? 1 : 0.85} stroke="white" strokeOpacity={0.35} />
							{i < steps.length - 1 && (
								<text x={cx + wp + 13} y={yMid + 4} fontSize={13} fill="rgba(255,255,255,0.3)">
									→
								</text>
							)}
							<text x={cx + wp / 2} y={yMid + 66} textAnchor="middle" fontSize={11} fill="rgba(255,255,255,0.8)" fontFamily="monospace">
								{st.name}
							</text>
							<text x={cx + wp / 2} y={yMid + 80} textAnchor="middle" fontSize={10.5} fill="rgba(255,255,255,0.5)" fontFamily="monospace">
								{st.w}×{st.h}
							</text>
							<text x={cx + wp / 2} y={yMid + 93} textAnchor="middle" fontSize={10.5} fill="rgba(255,255,255,0.5)" fontFamily="monospace">
								{frame ? "3 colors" : `${st.g} grids`}
							</text>
						</g>
					);
				})}
				<path d={`M ${mids[1]} ${yMid - 30} C ${mids[1]} ${yMid - 70}, ${mids[3]} ${yMid - 70}, ${mids[3]} ${yMid - 30}`} fill="none" stroke="rgba(255,255,255,0.45)" strokeDasharray="3 3" />
				<text x={(mids[1]! + mids[3]!) / 2} y={yMid - 58} textAnchor="middle" fontSize={10.5} fill="rgba(255,255,255,0.55)" fontFamily="monospace">
					detail glued back on
				</text>
			</svg>
			<Caption>The model that turns a stored map back into a frame. It shrinks the map twice, splitting it into more grids each time so every spot sees more of its surroundings, then enlarges it back, gluing the half-size detail back on, and mixes the grids into colour. Block height = picture size, block width = number of grids.</Caption>
		</figure>
	);
}

/* 3.8 · choosing the bit count: the final 32-grid seg model trained with the rounding from the first step at 8 / 6 / 5 / 4
 * bits, 100 epochs each (writeup/build/qat_bits.py + qat_wrong_png.py, run 2026-11-16 with solution/train_frame_model unchanged
 * except the step count). Pair 300 near the horizon, the real map dimmed, SegNet's mistakes in red (drawn larger).
 * weights_kb = entropy size of the frame-2 weights at that bit count. */

export function BitsSliderFig() {
	const [d, setD] = useState<Record<string, { seg_part: number; wrong_pair300: number; weights_kb: number; epochs: number }> | null>(null);
	const [i, setI] = useState(2);
	useEffect(() => {
		fetch(F("qat_bits.json"))
			.then((r) => r.json())
			.then(setD)
			.catch(() => setD(null));
	}, []);
	if (!d) return null;
	const keys = ["8", "6", "5", "4"];
	const k = keys[i]!;
	const r = d[k]!;
	return (
		<figure className="my-8">
			<div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
				<span className="text-[15px]">
					<span className="font-semibold">{k}-bit</span> <span className="text-white/55">· trained with the rounding</span>
				</span>
				<span className="font-mono text-[13px] tabular-nums">
					<span className="text-[var(--seg)]">seg part {r.seg_part.toFixed(4)}</span>
					<span className="text-white/45"> · </span>
					<span style={{ color: "#fcd34d" }}>weights {r.weights_kb.toFixed(1)} KB</span>
				</span>
			</div>
			<img src={F(`qat_${k}_wrong.png`)} alt={`SegNet's mistakes on pair 300 with a ${k}-bit model trained with the rounding`} className="block w-full rounded" style={{ imageRendering: "pixelated" }} />
			<input type="range" min={0} max={keys.length - 1} step={1} value={i} onChange={(e) => setI(Number(e.target.value))} className="cw-range cw-focus mt-3 w-full" aria-label="Bits per weight" />
			<div className="mt-1 grid font-mono text-[10.5px] text-white/45" style={{ gridTemplateColumns: `repeat(${keys.length}, minmax(0, 1fr))` }}>
				{keys.map((kk, j) => (
					<span key={kk} className={j === 0 ? "text-left" : j === keys.length - 1 ? "text-right" : "text-center"} style={{ color: j === i ? "white" : undefined }}>
						{kk}-bit
					</span>
				))}
			</div>
			<Caption>The same model trained four times, each with a different bit count rounded in from the first step ({r.epochs} epochs each, shorter than the final run). Seg part plus the weights' size part is 0.0774 at 8-bit, 0.0726 at 6-bit, 0.0692 at 5-bit and 0.0733 at 4-bit. Below 5 bits the mistakes cost more than the bytes save. Pair 300 near the horizon, SegNet's mistakes in red, drawn larger.</Caption>
		</figure>
	);
}

/* 3.8 · one model, 8-bit vs 5-bit, stepped through with back / next (writeup/build/qat_bits.py, round_after.py, qat_wrong_png.py;
 * the final 32-grid seg stage, 600 epochs like the final run, solution/train_frame_model unchanged):
 *   1. trained with 8-bit rounding                      (qat_out/b8_e600)
 *   2. the same 8-bit weights rounded to 5-bit after training, no retraining (round_after.py, qat_out/b8to5_e600)
 *   3. 5-bit from the first step = the final run's own stage_seg.pt, scored the same way (qat_out/b5_e600)
 * Seg part on all 600 pairs; weights = entropy size of frame 2's rounded weights; image = SegNet's mistakes on pair 300. */
export function BitsThreeFig() {
	const [d, setD] = useState<Record<string, { seg_part: number; wrong_pair300: number; weights_kb: number }> | null>(null);
	const [step, setStep] = useState(0);
	useEffect(() => {
		fetch(F("qat_bits_e600.json"))
			.then((r) => r.json())
			.then(setD)
			.catch(() => setD(null));
	}, []);
	const stops = [
		{ k: "8", title: "1 · Before", note: "8-bit weights" },
		{ k: "8to5", title: "2 · Rounded after", note: "5-bit weights, rounded after training" },
		{ k: "5", title: "3 · After", note: "5-bit weights, trained with the rounding" },
	];
	const st = stops[step]!;
	const r = d?.[st.k];
	const segMax = 0.11, kbMax = 55;
	const segColor = st.k === "8" ? "rgba(255,255,255,0.85)" : "#ff5a6e";
	return (
		<figure className="my-8">
			<div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
				<span className="text-[15px] font-semibold">{st.note}</span>
				<span className="flex gap-2 font-mono text-[11.5px]">
					<button type="button" disabled={step === 0} onClick={() => setStep((x) => x - 1)} className="cw-focus rounded border border-white/15 px-2.5 py-0.5 text-white/70 hover:text-white disabled:opacity-30">
						← back
					</button>
					<button type="button" disabled={step === stops.length - 1} onClick={() => setStep((x) => x + 1)} className="cw-focus rounded border border-white/15 px-2.5 py-0.5 text-white/70 hover:text-white disabled:opacity-30">
						next →
					</button>
				</span>
			</div>
			<div className="relative">
				{stops.map((s2) => (
					<img key={s2.k} src={F(`qat_${s2.k}_e600_wrong.png`)} alt={`SegNet's mistakes on pair 300, ${s2.title} ${s2.note}`} className={`${s2.k === "8" ? "relative" : "absolute inset-0"} block w-full rounded transition-opacity duration-500`} style={{ imageRendering: "pixelated", opacity: s2.k === st.k ? 1 : 0 }} />
				))}
			</div>
			<div className="mt-3 inline-flex items-center gap-1.5 font-mono text-[12px] text-white/60">
				<span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: "#ff5a6e" }} />
				SegNet mistake
			</div>
			{r && (
				<div className="mt-4 grid gap-2 font-mono text-[12px] tabular-nums">
					<div className="grid grid-cols-[86px_1fr_70px] items-center gap-3">
						<span className="text-white/55">seg part</span>
						<div className="h-2 rounded-full bg-white/[0.06]">
							<div className="h-2 rounded-full transition-all duration-700" style={{ width: `${(100 * r.seg_part) / segMax}%`, background: "var(--seg)" }} />
						</div>
						<span className="text-right" style={{ color: segColor }}>{r.seg_part.toFixed(4)}</span>
					</div>
					<div className="grid grid-cols-[86px_1fr_70px] items-center gap-3">
						<span className="text-white/55">weights</span>
						<div className="h-2 rounded-full bg-white/[0.06]">
							<div className="h-2 rounded-full transition-all duration-700" style={{ width: `${(100 * r.weights_kb) / kbMax}%`, background: "#fcd34d" }} />
						</div>
						<span className="text-right" style={{ color: st.k === "8" ? "rgba(255,255,255,0.85)" : "#86efac" }}>{r.weights_kb.toFixed(1)} KB</span>
					</div>
				</div>
			)}
			<div className="mt-3 grid grid-cols-3 gap-2">
				{stops.map((s2, j) => (
					<div key={s2.k} className={`h-0.5 rounded-full transition-colors duration-500 ${j <= step ? "bg-white/70" : "bg-white/10"}`} />
				))}
			</div>
		</figure>
	);
}

/* 3.10 · what the bug did, one line per model (writeup/build/tie_frames.py: the v13a trunk, out/stage_qXpose.pt, rounded the
 * way training did (float32) and the way pack.py shipped it (float64); all 600 pairs on the stored maps, no correction,
 * PoseNet error per pair as carrier.py scores it). Faint = each pair, bold = 15-pair rolling average. The fix (v13b) makes
 * pack store the float32 values, so the fixed line is the trained line. Score 0.1798 -> 0.1775 from the lab's v13b report. */
export function TieStepsFig() {
	const [d, setD] = useState<{ f32: { pose: number; per_pair: number[] }; f64: { pose: number; per_pair: number[] } } | null>(null);
	const [hov, setHov] = useState<number | null>(null);
	// plays once on scroll: red (shipped) and green (trained) draw together over 1.4 s
	const ref = useRef<HTMLElement>(null);
	const [ms, setMs] = useState(0);
	useEffect(() => {
		fetch(F("tie_frames.json"))
			.then((r) => r.json())
			.then(setD)
			.catch(() => setD(null));
	}, []);
	useEffect(() => {
		const el = ref.current;
		if (!d || !el) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			setMs(9999);
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
					setMs((m) => Math.max(m, t - t0));
					if (t - t0 < 3200) raf = requestAnimationFrame(tick);
				};
				raf = requestAnimationFrame(tick);
				done = window.setTimeout(() => setMs(9999), 3800);
			},
			{ threshold: 0.35 },
		);
		io.observe(el);
		return () => {
			io.disconnect();
			cancelAnimationFrame(raf);
			clearTimeout(done);
		};
	}, [d]);
	const ease = (v: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, v)), 3);
	const pRed = ease(ms / 1400);
	const pGreen = ease(ms / 1400);
	const W = 640, H = 240, L = 44, R = 632, T = 12, B = 210;
	const lo = 5e-5, hi = 4e-2;
	const N = d ? d.f32.per_pair.length : 600;
	const x = (i: number) => L + (i / (N - 1)) * (R - L);
	const y = (v: number) => T + ((Math.log10(hi) - Math.log10(Math.max(v, lo))) / (Math.log10(hi) - Math.log10(lo))) * (B - T);
	const roll = (a: number[]) => a.map((_, i) => {
		const s0 = Math.max(0, i - 7), s1 = Math.min(a.length, i + 8);
		let t = 0;
		for (let j = s0; j < s1; j++) t += a[j]!;
		return t / (s1 - s0);
	});
	const line = (a: number[]) => a.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
	const fx = d ? d.f32.per_pair : [];
	const sh = d ? d.f64.per_pair : [];
	return (
		<figure ref={ref} className="my-8">
			<div className="mb-2 flex flex-wrap items-baseline justify-end gap-2 font-mono text-[12px] text-white/60">
				<span className="flex gap-5">
					<span><span className="mr-1.5 inline-block h-0.5 w-4 align-middle bg-[#ff5a6e]" />before the fix</span>
					<span><span className="mr-1.5 inline-block h-0.5 w-4 align-middle bg-[#86efac]" />after the fix</span>
				</span>
			</div>
			{d && (
				<svg
					viewBox={`0 0 ${W} ${H}`}
					className="block w-full"
					role="img"
					aria-label="PoseNet error per pair for the shipped and fixed models"
					onMouseMove={(e) => {
						const bb = e.currentTarget.getBoundingClientRect();
						const i = Math.round((((e.clientX - bb.left) / bb.width) * W - L) / (R - L) * (N - 1));
						setHov(i >= 0 && i < N ? i : null);
					}}
					onMouseLeave={() => setHov(null)}
				>
					{[1e-4, 1e-3, 1e-2].map((v) => (
						<g key={v}>
							<line x1={L} x2={R} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.06)" />
							<text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize={10.5} fill="rgba(255,255,255,0.4)" fontFamily="monospace">
								{v === 1e-2 ? "0.01" : v === 1e-3 ? "0.001" : "0.0001"}
							</text>
						</g>
					))}
					<text x={L} y={H - 8} fontSize={10.5} fill="rgba(255,255,255,0.4)" fontFamily="monospace">pair 0</text>
					<text x={R} y={H - 8} textAnchor="end" fontSize={10.5} fill="rgba(255,255,255,0.4)" fontFamily="monospace">pair 599</text>
					<polyline points={line(roll(sh))} fill="none" stroke="#ff5a6e" strokeWidth={2} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - pRed} />
					<polyline points={line(roll(fx))} fill="none" stroke="#86efac" strokeWidth={2} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - pGreen} />
					{hov !== null && (() => {
						const bx = x(hov) > (L + R) / 2 ? x(hov) - 150 : x(hov) + 10;
						return (
							<g pointerEvents="none">
								<line x1={x(hov)} x2={x(hov)} y1={T} y2={B} stroke="rgba(255,255,255,0.25)" />
								<rect x={bx} y={T} width={140} height={52} rx={4} fill="rgba(0,0,0,0.85)" stroke="rgba(255,255,255,0.15)" />
								<text x={bx + 10} y={T + 16} fontSize={11} fill="rgba(255,255,255,0.6)" fontFamily="monospace">pair {hov}</text>
								<text x={bx + 10} y={T + 31} fontSize={11} fill="#ff5a6e" fontFamily="monospace">before {sh[hov]!.toFixed(4)}</text>
								<text x={bx + 10} y={T + 45} fontSize={11} fill="#86efac" fontFamily="monospace">after {fx[hov]!.toFixed(4)}</text>
							</g>
						);
					})()}
				</svg>
			)}
		</figure>
	);
}

/* 4 · the final pipeline drawn out: scripts (solution/, times from solution/out/run_all.log) feed the four archive
 * files (bytes from ARCHIVE_FILES / report.txt), pack.py packs them, inflate.py inflates on comma's side; score row at the bottom
 * ("was" = the 0.3076 codec, FINAL.tree). Boxes inside archive.zip are drawn to scale by bytes. */
export function FinalPipelineFig() {
	const W = 680, H = 392;
	const SEG = "#7dd3fc", POSE = "#f0abfc", SIZE = "#fcd34d";
	const dim = "rgba(255,255,255,0.45)";
	const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" } as const;
	// one short line under each script: what it makes, nothing more
	const steps: { y: number; h: number; c: string; name: string; sub: string[] }[] = [
		{ y: 40, h: 40, c: "rgba(255,255,255,0.45)", name: "ask the judges", sub: ["maps + motion"] },
		{ y: 96, h: 40, c: SEG, name: "train frame model", sub: ["draws both frames"] },
		{ y: 152, h: 40, c: SIZE, name: "train map coder", sub: ["predicts map pixels"] },
		{ y: 208, h: 40, c: SIZE, name: "clean the maps", sub: ["fewer bits per map"] },
		{ y: 264, h: 40, c: POSE, name: "frame 1 + correction", sub: ["corrects frame 1's motion"] },
	];
	// archive.zip interior: one box per file. Every box gets room for its two lines (34), and the rest of the height is
	// shared by the square root of each file's size above the smallest, so bigger files read bigger without the small
	// ones turning into slivers (exact sizes are written in each box).
	const AX = 340, AW = 130, AY = 62, AH = 276;
	const files = [
		{ n: "maps.bin", b: 127645, c: SIZE },
		{ n: "weights.bin", b: 43985, c: SEG },
		{ n: "correction.bin", b: 4220, c: POSE },
		{ n: "pose.bin", b: 3351, c: "rgba(255,255,255,0.6)" },
	];
	const gap = 10;
	const MIN_H = 34;
	const extra = AH - gap * (files.length - 1) - MIN_H * files.length;
	const smallest = Math.sqrt(Math.min(...files.map((f) => f.b)));
	const weight = files.map((f) => Math.sqrt(f.b) - smallest);
	const weightSum = weight.reduce((a, b) => a + b, 0);
	const heights = weight.map((w) => MIN_H + (extra * w) / weightSum);
	const boxes = files.map((f, k) => ({ ...f, y: AY + heights.slice(0, k).reduce((a, b) => a + b, 0) + k * gap, h: heights[k]! }));
	const mid = (i: number) => boxes[i]!.y + boxes[i]!.h / 2;
	const sy = (i: number) => steps[i]!.y + steps[i]!.h / 2;
	const link = (from: number, to: number, c: string, k = 0) => (
		<path d={`M300 ${sy(from)} C${318 + k} ${sy(from)} ${318 + k} ${mid(to)} ${AX - 2} ${mid(to)}`} stroke={c} strokeOpacity={0.7} fill="none" strokeWidth={1.2} />
	);
	return (
		<figure className="my-8">
			<svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="The final pipeline: five scripts make the four archive files, pack.py packs them into a 179,609-byte archive, inflate.py inflates it into 1,200 frames. Score 0.1682." {...mono}>
				<defs>
					<marker id="fp-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
						<path d="M2 1L8 5L2 9" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} />
					</marker>
				</defs>
				<text x={20} y={24} fontSize={11} fill={dim} letterSpacing={1}>MY COMPUTER · one 10-hour run</text>
				<text x={520} y={24} fontSize={11} fill={dim} letterSpacing={1}>COMMA'S COMPUTER</text>
				<line x1={500} y1={12} x2={500} y2={372} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
				<rect x={20} y={40} width={80} height={34} rx={4} fill="none" stroke="rgba(255,255,255,0.4)" />
				<text x={60} y={61} textAnchor="middle" fontSize={12} fill="#fff">0.mkv</text>
				<line x1={100} y1={57} x2={128} y2={57} stroke="rgba(255,255,255,0.5)" markerEnd="url(#fp-arrow)" />
				<line x1={115} y1={74} x2={115} y2={sy(4)} stroke="rgba(255,255,255,0.12)" />
				{steps.slice(1).map((s) => (
					<line key={s.name} x1={115} y1={s.y + s.h / 2} x2={128} y2={s.y + s.h / 2} stroke="rgba(255,255,255,0.25)" />
				))}
				{steps.map((s) => (
					<g key={s.name}>
						<rect x={130} y={s.y} width={170} height={s.h} rx={4} fill="none" stroke={s.c} />
						<text x={140} y={s.y + 17} fontSize={11.5} fill="#fff">{s.name}</text>
						{s.sub.map((t, j) => (
							<text key={t} x={140} y={s.y + 31 + j * 11} fontSize={10} fill={dim}>{t}</text>
						))}
					</g>
				))}
				{link(1, 1, SEG, 4)}
				{link(2, 0, SIZE)}
				{link(3, 0, SIZE, 4)}
				{link(4, 1, POSE, -4)}
				{link(4, 2, POSE)}
				{link(0, 3, "rgba(255,255,255,0.45)", 12)}
				<text x={AX - 10} y={44} fontSize={11} fill="rgba(255,255,255,0.6)">pack → archive.zip</text>
				<rect x={AX - 10} y={AY - 10} width={AW + 20} height={AH + 20} rx={5} fill="none" stroke="rgba(255,255,255,0.4)" />
				{boxes.map((f) => (
					<g key={f.n}>
						<rect x={AX} y={f.y} width={AW} height={f.h} rx={3} fill={f.c} fillOpacity={0.16} stroke={f.c} />
						<text x={AX + 10} y={f.y + f.h / 2 - 3} fontSize={11} fill="#fff">{f.n}</text>
						<text x={AX + 10} y={f.y + f.h / 2 + 12} fontSize={10} fill="rgba(255,255,255,0.6)">{f.b.toLocaleString("en-US")} B</text>
					</g>
				))}
				<text x={AX - 10} y={AY + AH + 30} fontSize={11} fill="rgba(255,255,255,0.6)">179,609 B total</text>
				<line x1={AX + AW + 10} y1={192} x2={518} y2={192} stroke="rgba(255,255,255,0.5)" markerEnd="url(#fp-arrow)" />
				<rect x={520} y={170} width={140} height={44} rx={4} fill="none" stroke="rgba(255,255,255,0.4)" />
				<text x={530} y={188} fontSize={11.5} fill="#fff">inflate</text>
				<text x={530} y={203} fontSize={10} fill={dim}>archive + code only</text>
				<line x1={590} y1={214} x2={590} y2={246} stroke="rgba(255,255,255,0.5)" markerEnd="url(#fp-arrow)" />
				<rect x={520} y={248} width={140} height={34} rx={4} fill="none" stroke="rgba(255,255,255,0.4)" />
				<text x={530} y={269} fontSize={11.5} fill="#fff">1,200 frames</text>
			</svg>
		</figure>
	);
}

/* 2 · step 04: one frame model, stage 1's loop over the top (SegNet, every weight) and stage 2's loop underneath
   (PoseNet, frame 1 only; frame 2 switches to frozen). Plays once when scrolled into view: three steady laps per
   stage, then the archive. Reduced motion shows the finished diagram. TrainStagesDiagram (the ring) is kept above. */
export function TrainLoopsFig() {
	const svg = useRef<SVGSVGElement>(null);
	const [run, setRun] = useState(0);
	const [done, setDone] = useState(false);
	const mono = "IBM Plex Mono";
	const sans = "Barlow";
	useEffect(() => {
		const el = svg.current;
		if (!el) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			setDone(true);
			return;
		}
		const q = (k: string) => el.querySelector<SVGElement>(`[data-k="${k}"]`)!;
		const ids = ["so", "m", "d1", "g1", "d2", "g2", "az"];
		const base: Record<string, [string, string]> = {};
		ids.forEach((i) => (base[i] = [q(i).getAttribute("stroke")!, q(i).getAttribute("stroke-width")!]));
		const hl = (i: string, on: boolean, c = "#fff") => {
			q(i).setAttribute("stroke", on ? c : base[i]![0]);
			q(i).setAttribute("stroke-width", on ? "2.4" : base[i]![1]);
		};
		const clr = () => ids.forEach((i) => hl(i, false));
		const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
		const dot = q("dot");
		const pk = q("pk");
		const along = (k: string, t: number) => {
			const p = q(k) as SVGPathElement;
			const pt = p.getPointAtLength(p.getTotalLength() * t);
			dot.setAttribute("cx", String(pt.x));
			dot.setAttribute("cy", String(pt.y));
			dot.setAttribute("opacity", "1");
			return pt;
		};
		const lane = (n: 1 | 2, pt: DOMPoint) => {
			const y = n === 1 ? 110 : 220;
			const on = Math.abs(pt.y - y) < 1;
			hl("d" + n, on && pt.x > 335 && pt.x < 470);
			hl("g" + n, (on && pt.x > 510) || (pt.x > 575 && (n === 1 ? pt.y < y && pt.y > y - 60 : pt.y > y && pt.y < y + 60)), n === 1 ? "#bae6fd" : "#f5d0fe");
			hl("m", pt.x <= 302 && (n === 1 ? pt.y <= 82 : pt.y >= 248));
		};
		const frozen = (on: boolean) => {
			q("f2r").setAttribute("fill", on ? "rgba(255,255,255,0.03)" : "rgba(134,239,172,0.16)");
			q("f2r").setAttribute("stroke", on ? "rgba(255,255,255,0.22)" : "#86efac");
			q("f2t").setAttribute("fill", on ? "rgba(255,255,255,0.45)" : "#fff");
			q("f2s").textContent = on ? "frozen" : "53,123 weights";
			q("f2s").setAttribute("fill", on ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.75)");
		};
		const op = (k: string, v: number) => {
			q(k).style.opacity = String(v);
		};
		const LAP = 2300;
		const LAPS = 3;
		const steps: [number, (t: number) => void][] = [
			[
				300,
				() => {
					op("L1", 1);
					op("L2", 0.2);
					op("AZ", 0.2);
					frozen(false);
				},
			],
			[
				700,
				(t) => {
					hl("so", true);
					pk.setAttribute("fill", "#fff");
					pk.setAttribute("opacity", t < 0.95 ? "1" : "0");
					pk.setAttribute("cx", String(lerp(128, 165, t)));
					pk.setAttribute("cy", "165");
					if (t > 0.9) hl("m", true);
				},
			],
			[
				LAP * LAPS,
				(t) => {
					hl("so", false);
					lane(1, along("r1", (t * LAPS) % 1));
				},
			],
			[
				1100,
				(t) => {
					dot.setAttribute("opacity", "0");
					clr();
					if (t > 0.15) frozen(true);
					op("L1", lerp(1, 0.35, t));
					op("L2", lerp(0.2, 1, t));
				},
			],
			[LAP * LAPS, (t) => lane(2, along("r2", (t * LAPS) % 1))],
			[
				1000,
				(t) => {
					dot.setAttribute("opacity", "0");
					clr();
					op("AZ", lerp(0.2, 1, Math.min(1, t * 2)));
					pk.setAttribute("fill", "#fcd34d");
					pk.setAttribute("opacity", t < 0.9 ? "1" : "0");
					pk.setAttribute("cx", "190");
					pk.setAttribute("cy", String(lerp(250, 336, t)));
					hl("az", t > 0.85, "#fde68a");
				},
			],
			[
				700,
				(t) => {
					hl("az", false);
					op("L1", lerp(0.35, 1, t));
					frozen(false);
				},
			],
		];
		let raf = 0;
		let start = 0;
		const frame = (ts: number) => {
			if (!start) start = ts;
			let e = ts - start;
			for (const [d, f] of steps) {
				if (e < d) {
					f(e / d);
					raf = requestAnimationFrame(frame);
					return;
				}
				e -= d;
			}
			clr();
			setDone(true);
		};
		setDone(false);
		const io = new IntersectionObserver(
			([e]) => {
				if (e?.isIntersecting) {
					io.disconnect();
					raf = requestAnimationFrame(frame);
				}
			},
			{ threshold: 0.5 },
		);
		io.observe(el);
		return () => {
			io.disconnect();
			cancelAnimationFrame(raf);
			dot.setAttribute("opacity", "0");
			pk.setAttribute("opacity", "0");
			clr();
			op("L1", 1);
			op("L2", 1);
			op("AZ", 1);
			frozen(false);
		};
	}, [run]);

	const pill = (x: number, y: number, w: number, k: string, title: string, sub: string, stroke: string) => (
		<g>
			<rect data-k={k} x={x} y={y} width={w} height={56} rx={28} fill="#0b0b0d" stroke={stroke} strokeWidth={1.5} />
			<text x={x + w / 2} y={y + 24} textAnchor="middle" fontSize={15} fontWeight={600} fill="#fff" fontFamily={sans}>
				{title}
			</text>
			<text x={x + w / 2} y={y + 42} textAnchor="middle" fontSize={12} fill="rgba(255,255,255,0.6)" fontFamily={mono}>
				{sub}
			</text>
		</g>
	);
	const arrow = (d: string, stroke: string, m: string, w = 1.6) => <path d={d} fill="none" stroke={stroke} strokeWidth={w} markerEnd={`url(#cw-tl-${m})`} />;
	const marker = (id: string, fill: string) => (
		<marker id={`cw-tl-${id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
			<path d="M0,0 L10,5 L0,10 z" fill={fill} />
		</marker>
	);
	return (
		<div>
			<svg
				ref={svg}
				viewBox="0 0 670 400"
				className="block w-full"
				role="img"
				aria-label="Stored outputs feed the frame model. Stage 1 loops through draws and SegNet for 600 epochs. Stage 2 freezes frame 2 and loops through PoseNet for 500 epochs. Then the model is packed into archive.zip."
			>
				<defs>
					{marker("w", "rgba(255,255,255,0.7)")}
					{marker("y", "#fcd34d")}
					{marker("b", "#7dd3fc")}
					{marker("p", "#f0abfc")}
				</defs>
				<path data-k="r1" d="M300,110 L582,110 L582,44 L260,44 L260,80" fill="none" stroke="none" />
				<path data-k="r2" d="M300,220 L582,220 L582,288 L260,288 L260,250" fill="none" stroke="none" />
				<circle data-k="dot" r={5} fill="#fff" opacity={0} />

				<rect data-k="so" x={0} y={137} width={128} height={56} rx={11} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.3)" strokeWidth={1.4} />
				<text x={14} y={161} fontSize={15} fontWeight={600} fill="#fff" fontFamily={sans}>
					stored outputs
				</text>
				<text x={14} y={179} fontSize={12} fill="rgba(255,255,255,0.6)" fontFamily={mono}>
					map + 6 values
				</text>
				{arrow("M128,165 L156,165", "rgba(255,255,255,0.45)", "w", 1.4)}

				<rect data-k="m" x={160} y={80} width={140} height={170} rx={14} fill="#0b0b0d" stroke="#fff" strokeWidth={1.5} />
				<text x={230} y={106} textAnchor="middle" fontSize={15} fontWeight={600} fill="#fff" fontFamily={sans}>
					frame model
				</text>
				<rect data-k="f2r" x={172} y={124} width={116} height={48} rx={7} fill="rgba(134,239,172,0.16)" stroke="#86efac" strokeWidth={1.3} style={{ transition: "all 700ms" }} />
				<text data-k="f2t" x={230} y={144} textAnchor="middle" fontSize={12} fill="#fff" fontFamily={mono}>
					frame 2
				</text>
				<text data-k="f2s" x={230} y={161} textAnchor="middle" fontSize={11.5} fill="rgba(255,255,255,0.75)" fontFamily={mono}>
					53,123 weights
				</text>
				<rect x={172} y={182} width={116} height={48} rx={7} fill="rgba(134,239,172,0.16)" stroke="#86efac" strokeWidth={1.3} />
				<text x={230} y={202} textAnchor="middle" fontSize={12} fill="#fff" fontFamily={mono}>
					frame 1
				</text>
				<text x={230} y={219} textAnchor="middle" fontSize={11.5} fill="rgba(255,255,255,0.75)" fontFamily={mono}>
					11,235 weights
				</text>

				<g data-k="L1" style={{ transition: "opacity 700ms" }}>
					{arrow("M582,82 L582,44 L260,44 L260,78", "#7dd3fc", "b")}
					<text x={421} y={34} textAnchor="middle" fontSize={12.5} fill="#7dd3fc" fontFamily={mono}>
						stage 1 · 600 epochs
					</text>
					{arrow("M300,110 L331,110", "rgba(255,255,255,0.6)", "w")}
					{pill(335, 82, 135, "d1", "draws", "frame 2", "rgba(255,255,255,0.35)")}
					{arrow("M470,110 L506,110", "rgba(255,255,255,0.6)", "w")}
					{pill(510, 82, 145, "g1", "SegNet grades", "wrong pixels × 10", "#7dd3fc")}
				</g>

				<g data-k="L2" style={{ transition: "opacity 700ms" }}>
					{arrow("M582,248 L582,288 L260,288 L260,252", "#f0abfc", "p")}
					<text x={421} y={308} textAnchor="middle" fontSize={12.5} fill="#f0abfc" fontFamily={mono}>
						stage 2 · 500 epochs
					</text>
					{arrow("M300,220 L331,220", "rgba(255,255,255,0.6)", "w")}
					{pill(335, 192, 135, "d2", "draws", "both frames", "rgba(255,255,255,0.35)")}
					{arrow("M470,220 L506,220", "rgba(255,255,255,0.6)", "w")}
					{pill(510, 192, 145, "g2", "PoseNet grades", "log motion error", "#f0abfc")}
				</g>

				<g data-k="AZ" style={{ transition: "opacity 700ms" }}>
					{arrow("M190,250 L190,330", "#fcd34d", "y", 1.5)}
					<rect data-k="az" x={115} y={334} width={150} height={56} rx={11} fill="rgba(252,211,77,0.06)" stroke="#fcd34d" strokeWidth={1.4} />
					<text x={131} y={358} fontSize={15} fontWeight={600} fill="#fff" fontFamily={sans}>
						archive.zip
					</text>
					<text x={131} y={376} fontSize={12} fill="rgba(255,255,255,0.6)" fontFamily={mono}>
						packed weights
					</text>
				</g>
				<circle data-k="pk" r={5} fill="#fff" opacity={0} />
			</svg>
			<div className="mt-1 flex h-6 justify-end">
				{done && (
					<button type="button" onClick={() => setRun((r) => r + 1)} className="cw-focus font-mono text-[11.5px] text-white/55 hover:text-white">
						↻ replay
					</button>
				)}
			</div>
		</div>
	);
}
