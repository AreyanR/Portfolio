import { SOURCES } from "./sources";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
	CREDITS,
	DEAD_ENDS,
	DEAD_ENDS_NOTE,
	FINAL,
	INITIAL,
	INTRO,
	JOURNEY_TEXT,
	STUDY,
	TRICK,
	UPGRADES,
	type Upgrade,
} from "./content";
import { HintsFig, NeuralGuessFig, PixelGuessFig } from "./coder";
import { FirstScore, ORDER, UpgradeTracker } from "./meter";
import { BitsFig, PatternMixFig, CorrectionDial, HowItWorksFig, RewriteFig, StudyVideoFig, RefitFig, SegTrainingFig, PoseTrainingFig, CleanFramesFig, BitsThreeFig, TieStepsFig, FinalPipelineFig } from "./figures";
import { ArchiveDonut, DrawsFig, ScoreJourney, StudyScoreFig, type PairData } from "./proof";
import { A, md, P, Prose, Section, Sub } from "./ui";

/** Outlines for Areyan to write each pivot from, in order. Notes, not sentences. Facts: comma-lab/writeup/PIVOT_NOTES.md. */
const PIVOT_OUTLINES: Record<string, string[]> = {
	u2: [
		"Right after 3.1: the model (119 KB at 16-bit) was now the biggest file.",
		"8-bit: one scale per tensor (biggest weight / 127), store whole numbers −127…127 plus that scale → 57 KB.",
		"SegNet barely moved (0.0616 → 0.0609). Pose part jumped 0.085 → 0.378, so the score went up: 0.3836 → 0.6353.",
		"Why pose: PoseNet reads motion from tiny differences between frame 1 and frame 2, so small rounding errors in the model moved its answer.",
		"Bridge to 3.3: 62 KB saved but pose broken. Looking at other entries, the #130 line added a faint \"pose carrier\" to frame 1 only, which SegNet never grades.",
	],
	u3: [
		"Open from 3.2: the 8-bit cut saved 62 KB but pose part jumped 0.085 → 0.378 (score 0.6353).",
		"Idea from the #130 line (the \"pose carrier\"): add a faint pattern to frame 1 only. SegNet only grades frame 2, so it never sees it.",
		"4 patterns shared by all 600 pairs + 4 amounts per pair, 4.7 KB.",
		"Pair 300: real forward motion 32.23, your frames 31.90, with the correction 32.20.",
		"The bug: the first fit used the full-precision model, but the 8-bit one shipped, so it didn't work. Fix: rebuild the model from the packed bytes like comma does, and fit on that.",
		"Result: pose 0.0715, score 0.3316, past quantizr's 0.333.",
		"Bridge to 3.4: pose was back (0.0715), and the maps (233 KB) were the biggest file again.",
	],
	u4: [
		"Maps were still the biggest file (233 KB).",
		"4 more hints: the previous map's right and below pixels, the same spot 2 maps back (catches flicker), and which 1/8 of the picture the row is in.",
		"That's 625,000 combinations and most barely show up, so rare ones fall back to the old 4-hint count.",
		"Still exact, so seg and pose didn't change.",
		"Result: 233 → 197 KB, score 0.3076.",
		"Bridge to 3.5: maps still 197 KB, and every hint was one you picked by hand. A small network could learn its own.",
	],
	u5: [
		"At 0.3076 the maps were still 197 KB, and your hand-picked hints only used relationships you thought of.",
		"Replacement: a small neural network that learns them, from the last 5 maps + 30 known neighbours → a score per class (the comparison below shows the step from 4 hints to this).",
		"Whole-number math on the CPU, so your computer and comma's make exactly the same guesses.",
		"The lab version (v6) also changed the model: 24 channels at 8-bit, weights range-coded to ~34 KB (was 57).",
		"v6 bytes: maps 117.5 KB + map net 12.2 KB + weights 33.8 KB + side info 4.0 KB = 167.6 KB.",
		"Result: 0.3076 → 0.2518.",
		"Bridge to 3.6: the new model drew different frames, so the old correction no longer matched.",
	],
	u6: [
		"The new model drew different frames, so the old correction no longer matched.",
		"Refit: 4 patterns of 12×16, 400 epochs → pose 0.0798 → 0.0406 (0.2154) for 4.2 KB.",
		"Same correction trained 1,200 epochs → pose 0.0360 (0.2107).",
		"Lesson from your notes: fits vary run to run, and a longer fit is a free fix (no bytes).",
		"Bridge to 3.7: pose part was down to 0.0360; seg (0.0603) was now the biggest distortion, so you looked at where SegNet was wrong.",
	],
	u7: [
		"Where SegNet was wrong: 99.7% of the 71k wrong pixels sit on a class boundary, so the limit is how exactly edges are drawn.",
		"First try: edit the stored maps to fix SegNet's errors. Didn't pay (each fix cost about as many bits as it saved, +0.0004 over 18 rounds).",
		"What worked: edit them to save bits. Flip pixels that cost more than 2 bits to the map net's own guess whenever SegNet on the drawn frame doesn't care.",
		"Lab: 5,240 pixels changed, SegNet errors 71,100 → 68,854 AND maps 117,480 → 115,828 B.",
		"Any change to the frames undid the correction (pose 1.3e-4 → 6.8e-4), so it was refit after.",
		"Final run's rule: 1 wrong SegNet pixel costs the same as 10.18 bits; 2,796 pixels changed. Point at map 175.",
		"Bridge to 3.8: the errors are on edges, and sharper edges need a bigger model, which costs weight bytes.",
	],
	u8: [
		"Open by tying back to 3.2: the weights again, and this time pose has to survive the cut.",
		"A bigger model draws better edges (48 channels reached SegNet 0.0239 vs 0.0604), but at 8-bit it's ~108 KB.",
		"Rounding a trained model to 5-bit broke it (seg 0.0292 → 0.0801), so you trained with the rounding from the first step.",
		"32 channels at 5-bit with one scale per row = 29.6 KB, vs 33.8 KB for 24 channels at 8-bit.",
		"Figure: the same model trained at 8-bit and at 5-bit (600 epochs each, like the final run). Seg 0.0228 → 0.0293, weights 49.0 → 29.5 KB: size part −0.0130, net about 0.0065 better. (100-epoch sweep: 4-bit was worse than 5.)",
		"Frame 1's pose part stayed 8-bit with 2 blocks; at 4/5-bit it stalled (pose 5e-3).",
		"The archive grew ~10 KB (the 8-bit part sits in the side info), but seg went 0.0584 → 0.0443: 0.2081 → 0.2050.",
		"Cleaned the maps again for the new model: 0.2004.",
		"Bridge to 3.9: each format change was giving less; training longer was the cheapest lever left.",
	],
	u9: [
		"Changing formats was giving less; training longer was the cheapest lever left.",
		"First stage 150 → 300 epochs, pose stage 400 → 500: 0.2004 → 0.1828 at the same bytes.",
		"Finding: the correction's floor came from how good frame 1 already was, not from rounding.",
		"600-epoch first stage + 2,400-epoch correction → 0.1807.",
		"Retrained only frame 1 on the exact packed model → 0.1798. Figure: re-run at 1,200 epochs instead of the lab's 600: pose part 0.1951 → 0.0575, after the correction 0.0299 vs 0.0311 at 600 (≈0.0012 off the score; not in the shipped codec).",
		"Bridge to 3.10: the packed model still scored worse than the one in training.",
	],
	u10: [
		"The packed model still scored worse than the one in training.",
		"Cause: training computed each row's scale with 32-bit numbers on the GPU, packing with 64-bit numbers.",
		"Training pushes many rows exactly onto the boundaries where 32-bit and 64-bit disagree, so some weights shipped one step off.",
		"SegNet barely noticed. PoseNet error: 4.4e-4 on the trained model vs 3.8e-3 on the shipped one (~9×, lab report, v12b head). Figure re-measures on the v13a model: 9.7e-4 vs 3.8e-3 (~4×). The correction had been hiding it.",
		"Fix: pack stores exactly the values training used, so shipped = trained. 0.1798 → 0.1775; correction 4,800 epochs → 0.1774. Point at the row below.",
		"Your lesson: check the shipped model bit for bit against the one you trained.",
		"Bridge to 3.11: the best score came out of a long chain of lab checkpoints, so you rebuilt it from scratch in one run.",
	],
	u11: [
		"The best result came out of a long chain of lab experiments.",
		"Rewrote everything as files 01–09 in one style and trained from scratch in one 10-hour run.",
		"Stages: seg 3.2 h, pose 1.9 h, map net 30 min, cleaning 3.5 min, frame 1 70 min, correction 2 h, pack + evaluate 25 min.",
		"Archive within 45 B of the lab (179,609 vs 179,564 B).",
		"All the gain was pose: 0.0310 → 0.0197 (seg slightly worse, 0.0269 → 0.0289).",
		"Why it mattered: the score doesn't depend on an old checkpoint or an experiment you can't redo.",
	],
};

// Kept beside the page as the fact-checking record for the finished prose.
void PIVOT_OUTLINES;

const U = (id: string) => UPGRADES.find((u) => u.id === id)!;
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** One upgrade: a heading with what it changed, Areyan's text, then whatever explains it. */
function Step({ u, children, after }: { u: Upgrade; children?: ReactNode; after?: Record<number, ReactNode> }) {
	// after = { n: figure }: the figure goes right after paragraph n (1-based), the text carries on below it
	const cuts = [0, ...Object.keys(after ?? {}).map(Number).sort((a, b) => a - b), u.body.length].filter((n, i, a) => a.indexOf(n) === i);
	return (
		<>
			<div id={u.id} className="mt-20 mb-5 scroll-mt-40">
				<h3 className="text-[2.1rem] leading-[1.1] font-bold tracking-tight sm:text-[2.6rem]">
					<span className="mr-3 text-white/40 tabular-nums">3.{u.label}</span>
					{cap(u.title.replace(/^Upgrade \d+: /, ""))}
				</h3>
			</div>
			{cuts.slice(1).map((end, i) => (
				<div key={end}>
					<Prose>
						{u.body.slice(cuts[i], end).map((b) => {
							// a paragraph may end in a list: lines after the first that start with "- "
							const [lead, ...items] = b.split("\n- ");
							return (
								<div key={b}>
									<P>{lead!}</P>
									{items.length > 0 && (
										<ul className="mb-5 list-disc space-y-2 pl-5 text-white/80">
											{items.map((it) => (
												<li key={it}>{md(it)}</li>
											))}
										</ul>
									)}
								</div>
							);
						})}
					</Prose>
					{after?.[end]}
				</div>
			))}
			{children}
		</>
	);
}

/* Site bar: both links go back to the portfolio. It slides away while the reader scrolls down and comes back when they
   scroll up (or reach the top). The scoreboard (meter.tsx) sits right under it when it's showing, and at the top when not. */
function useBarShown() {
	const [shown, setShown] = useState(true);
	useEffect(() => {
		let last = window.scrollY;
		const onScroll = () => {
			const y = window.scrollY;
			if (y < 80) setShown(true);
			else if (Math.abs(y - last) > 6) setShown(y < last);
			last = y;
		};
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);
	return shown;
}

function SiteBar({ shown }: { shown: boolean }) {
	const home = import.meta.env.BASE_URL;
	return (
		<div className={`fixed inset-x-0 top-0 z-40 h-11 border-b border-white/10 bg-black/85 backdrop-blur-md transition-transform duration-300 ${shown ? "translate-y-0" : "-translate-y-full"}`}>
			<div className="mx-auto flex h-full max-w-[44rem] items-center justify-between px-5 sm:px-6">
				<a href={home} tabIndex={shown ? 0 : -1} className="cw-focus text-[14px] font-semibold tracking-tight text-white no-underline hover:text-white/80">
					Areyan Rastawan
				</a>
				<a href={home} tabIndex={shown ? 0 : -1} className="cw-focus font-mono text-[11px] tracking-[0.12em] text-white/50 uppercase no-underline hover:text-white">
					portfolio
				</a>
			</div>
		</div>
	);
}

/* Bottom-right button that appears once the reader is a screen or two down. */
function BackToTop() {
	const [show, setShow] = useState(false);
	useEffect(() => {
		const onScroll = () => setShow(window.scrollY > 1200);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);
	const toTop = () => {
		const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
	};
	return (
		<button
			type="button"
			onClick={toTop}
			aria-label="Back to top"
			aria-hidden={!show}
			tabIndex={show ? 0 : -1}
			className={`cw-focus fixed right-5 bottom-5 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/80 text-white/70 backdrop-blur-md transition-all duration-300 hover:text-white ${show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
		>
			<svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
				<path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
			</svg>
		</button>
	);
}

function Wide({ children }: { children: ReactNode }) {
	return <div className="lg:-mx-16">{children}</div>;
}

function Table({ head, rows, num = [], colors = [] }: { head: string[]; rows: ReactNode[][]; num?: number[]; colors?: (string | undefined)[] }) {
	return (
		<div className="cw-scroll my-6">
			<table className="cw-table">
				<thead>
					<tr>
						{head.map((h, i) => (
							<th key={h + i} className={num.includes(i) ? "num" : undefined} style={colors[i] ? { color: colors[i] } : undefined}>
								{h}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((r, i) => (
						<tr key={i}>
							{r.map((c, j) => (
								<td key={j} className={num.includes(j) ? "num" : undefined}>
									{c}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export default function CommaWriteup() {
	const [pairs, setPairs] = useState<PairData | null>(null);
	const [pair, setPair] = useState(300);
	const setPairCb = useCallback((n: number) => setPair(n), []);
	const [activeUpgrade, setActiveUpgrade] = useState("start");
	const [trackerOn, setTrackerOn] = useState(false);
	const barShown = useBarShown();

	useEffect(() => {
		const ids = ORDER.slice(1);
		const onScroll = () => {
			let current = "start";
			for (const id of ids) {
				const el = document.getElementById(id);
				if (el && el.getBoundingClientRect().top < 154) current = id; // a pivot counts once its heading slides under the bar (44 px site bar + scoreboard)
			}
			setActiveUpgrade(current);
			const section = document.getElementById("upgrades");
			const first = document.getElementById("first-codec-score"); // the bar takes over once the big 0.4537 scrolls off
			setTrackerOn(!!first && first.getBoundingClientRect().bottom < 134 && !!section && section.getBoundingClientRect().bottom > 204);
		};
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	useEffect(() => {
		fetch(A("pairs.json"))
			.then((r) => r.json())
			.then((d: PairData) => setPairs({ seg: d.seg, pose: d.pose }))
			.catch(() => setPairs(null));
	}, []);

	return (
		<div className="min-h-screen bg-black text-white">
			<SiteBar shown={barShown} />
			<BackToTop />
			<main className="mx-auto max-w-[44rem] px-5 pb-24 sm:px-6">
				<header className="pt-24">
					{/* read time: 3,409 prose words at ~238 wpm + ~10 s for each of the 21 figures, counted on the page 2026-11-19 */}
					<div className="font-mono text-[11px] tracking-[0.14em] text-white/45 uppercase">Nov 2026 · 20 min read · <a href="https://github.com/commaai/comma_video_compression_challenge/pull/155" target="_blank" rel="noreferrer" className="text-white/70 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white hover:decoration-white">PR submission ↗</a></div>
					<h1 className="mt-4 text-[2.25rem] leading-[1.05] font-bold tracking-tight text-balance sm:text-[3.25rem]">comma.ai Video Compression Challenge</h1>
				</header>

				<Section id="challenge" num="1." title="The challenge">
					<Prose>
						<P>{TRICK.judges}</P>
						<ul className="mb-5 list-disc space-y-2 pl-5 text-white/80">
							<li>{md(TRICK.segnet)}</li>
							<li>{md(TRICK.posenet)}</li>
							<li>{md(TRICK.size)}</li>
						</ul>
					</Prose>
					<div className="my-10 text-center text-[1.35rem] leading-snug font-semibold tracking-tight sm:text-[1.7rem]">
						score = 100 · <span className="text-[var(--seg)]">seg</span> + √(10 · <span className="text-[var(--pose)]">pose</span>) + 25 ·{" "}
						<span className="text-[var(--size)]">size</span> / 37,545,489
					</div>
					<Sub id="result" n="1.1" title="My solution" />
					<Prose>
						{INTRO.map((t, i) => (
							<P key={i}>{t}</P>
						))}
					</Prose>
					<Table
						head={["Score", "Seg part", "Pose part", "Size part", "Archive"]} colors={[undefined, "#7dd3fc", "#f0abfc", "#fcd34d"]}
						num={[0, 1, 2, 3, 4]}
						rows={[[<strong key="s">0.1682</strong>, "0.0289", "0.0197", "0.1196", "179,609 B"]]}
					/>
					<Wide>
						<ArchiveDonut />
					</Wide>
				</Section>

				<Section id="start" num="2." title="The codec">
					<Prose>
						<P>{INITIAL.p1}</P>
					</Prose>
					<HowItWorksFig
						video={<P>{INITIAL.video}</P>}
						scoreFig={<DrawsFig data={pairs} pair={pair} setPair={setPairCb} />}
						input={<P>{INITIAL.input}</P>}
						targets={<P>{INITIAL.targets}</P>}
						training={<>{INITIAL.training.split("\n\n").map((t) => <P key={t}>{t}</P>)}</>}
						inflation={<P>{INITIAL.inflation}</P>}
						compared={<P>{INITIAL.compared}</P>}
					/>
				</Section>

				<Section id="upgrades" num="3." title="How the score fell">
					<UpgradeTracker active={activeUpgrade} visible={trackerOn} belowBar={barShown} />
					<FirstScore />
					<Prose>
						<P>{INITIAL.cleanRun}</P>
						<P>{INITIAL.after}</P>
					</Prose>
					<Step u={U("u1")}>
						<PixelGuessFig />
					</Step>
					<Step u={U("u2")}>
						<BitsFig />
					</Step>
					<Step u={U("u3")}>
						<PatternMixFig />
						<CorrectionDial />
					</Step>
					<Step u={U("u4")}>
						<HintsFig />
					</Step>
					<Step u={U("u5")} after={{ 2: <NeuralGuessFig />, 5: <RefitFig /> }} />
					<Step u={U("u7")}>
						<CleanFramesFig />
					</Step>
					<Step u={U("u8")}>
						<BitsThreeFig />
					</Step>
					<Step u={U("u9")} after={{ 1: <SegTrainingFig /> }}>
						<PoseTrainingFig />
					</Step>
					<Step u={U("u10")} after={{ 1: <TieStepsFig /> }}>
						<RewriteFig />
					</Step>

					<div id="final" className="mt-20 mb-5 scroll-mt-40">
						<h3 className="text-[2.1rem] leading-[1.1] font-bold tracking-tight sm:text-[2.6rem]">
							<span className="mr-3 text-white/40 tabular-nums">3.10</span>
							The final codec
						</h3>
					</div>
					<Prose>
						<P>{FINAL.pipeline}</P>
					</Prose>
					<FinalPipelineFig />
					<Prose>
						<P>{FINAL.model}</P>
						<P>{JOURNEY_TEXT}</P>
					</Prose>
					<ScoreJourney />
					<Prose>
						<P>{FINAL.cpuNote}</P>
						<P>{FINAL.boundaryNote}</P>
					</Prose>
				</Section>

				<Section id="study" num="4." title="Does the model generalize?">
					<Prose>
						<P>{STUDY.intro}</P>
						<P>{STUDY.result}</P>
					</Prose>
					<StudyVideoFig />
					<StudyScoreFig />
					<Prose>
						<P>{STUDY.setup}</P>
						<P>{STUDY.protocol}</P>
						<ul className="mb-5 list-disc space-y-2 pl-5 text-white/80">
							{STUDY.cuts.map((x) => (
								<li key={x}>{md(x)}</li>
							))}
						</ul>
						<P>{STUDY.cutsNote}</P>
					</Prose>
					<Prose>
						<P>{STUDY.cost}</P>
					</Prose>
				</Section>

				<Section id="dead-ends" num="5." title="Dead ends">
					<Prose>
						<P>{DEAD_ENDS_NOTE}</P>
					</Prose>
					{DEAD_ENDS.map((g) => (
						<div key={g.group} className="mb-6">
							<div className="mb-2 font-mono text-[11px] tracking-[0.14em] text-white/50 uppercase">{g.group}</div>
							<ul className="cw-prose list-disc space-y-2 pl-5 text-white/80">
								{g.items.map((d) => (
									<li key={d}>{md(d)}</li>
								))}
							</ul>
						</div>
					))}
				</Section>

				<Section id="credits" num="6." title="Credits">
					<Table head={["Piece", "Credit"]} rows={CREDITS.map((c) => [md(c[0]), md(c[1], true)])} />
					<div className="mt-8 space-y-6">
						{SOURCES.map((g) => (
							<div key={g.group}>
								<div className="mb-2 font-mono text-[11px] tracking-[0.12em] text-white/50 uppercase">{g.group}</div>
								<ol className="space-y-2.5 text-[14px] leading-snug">
									{g.items.map((it) => (
										<li key={it.url}>
											<a href={it.url} target="_blank" rel="noreferrer" className="cw-focus text-white underline decoration-white/25 underline-offset-2 hover:decoration-white/70">
												{it.title}
											</a>
											<span className="text-white/50"> · {it.who}</span>
											<div className="text-[12.5px] text-white/45">{it.used}</div>
										</li>
									))}
								</ol>
							</div>
						))}
					</div>
				</Section>

			</main>
		</div>
	);
}
