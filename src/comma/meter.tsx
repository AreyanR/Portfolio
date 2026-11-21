import { UPGRADES, type Upgrade } from "./content";

/*
 * Section 3: one scoreboard pinned to the top while you read the upgrades. Its bar is the score split
 * (seg | pose | size) after whichever upgrade is on screen, on a fixed scale, so it shrinks as you read.
 *
 * Where the numbers come from:
 * - first codec, upgrade 1: re-measured from the 0.3316-era model (comma-lab/writeup/build/measure_first_codec.py):
 *   16-bit weights + bz2 maps = 461,354 B, comma's CPU evaluator seg 0.00061583, pose 0.00072146 → 0.4537;
 *   the same with the v1 map coder = 356,104 B → 0.3836.
 * - upgrade 2 (8-bit, no correction): measure_8bit_no_correction.py, 294,400 B, seg 0.00060942, pose 0.01431174 → 0.6353
 * - upgrades 3-4: the 0.3076-era tables (0.3316: 299,232 B; 0.3076: 263,084 B)
 * - upgrades 5-10: comma's evaluator output in the lab checkpoints
 *   (CommaAI-Learning/prototype/checkpoints: v6, v7b, v8, v10, v13a; v13c as repacked in
 *   comma-study/lab_v13c_backup, 179,564 B, which is what "within 45 bytes" and 0.1774 refer to)
 * - upgrade 11: report.txt of the final run
 * Parts: seg = 100 · SegNet, pose = √(10 · PoseNet), size = 25 · bytes / 37,545,489.
 */

type State = { seg: number; pose: number; size: number; bytes: number; approx?: boolean; source: string };

const ORIGINAL = 37_545_489;
const part = (seg: number, pose: number, bytes: number) => ({ seg: 100 * seg, pose: Math.sqrt(10 * pose), size: (25 * bytes) / ORIGINAL, bytes });

export const STATES: Record<string, State> = {
	start: { ...part(6.1583e-4, 7.2146e-4, 461_354), source: "first codec, re-scored with comma's evaluator" },
	u1: { ...part(6.1583e-4, 7.2146e-4, 356_104), source: "first codec with the map coder (lossless, same distortions)" },
	u2: { ...part(6.0942e-4, 1.431174e-2, 294_400), source: "8-bit weights, no correction (measure_8bit_no_correction.py)" },
	u3: { seg: 0.0609, pose: 0.0715, size: 0.1992, bytes: 299_232, source: "0.3316 codec" },
	u4: { seg: 0.0609, pose: 0.0715, size: 0.1752, bytes: 263_084, source: "0.3076 codec" },
	u5: { ...part(6.0343e-4, 1.2937e-4, 171_815), source: "lab v7b (v6's coder and renderer, correction refit)" },
	u7: { ...part(5.8371e-4, 1.3413e-4, 169_801), source: "lab v8" },
	u8: { ...part(4.0777e-4, 1.6099e-4, 179_461), source: "lab v10" },
	u9: { ...part(2.9495e-4, 9.616e-5, 179_087), source: "lab v13a" },
	u10: { ...part(2.8927e-4, 3.863e-5, 179_609), source: "final run (the rounding fix, then everything retrained from scratch)" },
};
export const ORDER = ["start", ...UPGRADES.map((u) => u.id)];
const PARTS = ["seg", "pose", "size"] as const;
const COLOR = { seg: "var(--seg)", pose: "var(--pose)", size: "var(--size)" };


const total = (s: State) => s.seg + s.pose + s.size;
const fmt = (v: number) => v.toFixed(4).replace(/^0/, "0");
const scoreText = (id: string) => {
	const u = UPGRADES.find((x) => x.id === id);
	const s = STATES[id]!;
	if (!u) return total(s).toFixed(4); // the first codec
	return `${u.approx ? "~" : ""}${u.score}`;
};

/** What an upgrade moved: the parts that changed, and the score before → after. */
export function upgradeSummary(u: Upgrade) {
	const i = ORDER.indexOf(u.id);
	const now = STATES[u.id]!;
	const before = STATES[ORDER[i - 1]!]!;
	const show = (st: State, id2: string, k: (typeof PARTS)[number]) => {
		const exact = !st.approx || (id2 === "start" && k === "size");
		return exact ? st[k].toFixed(4) : `~${st[k].toFixed(3)}`;
	};
	const moved = PARTS.map((k) => ({ k, d: now[k] - before[k], from: show(before, ORDER[i - 1]!, k), to: show(now, u.id, k) }))
		.filter((c) => Math.abs(c.d) >= 0.001)
		.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
	const from = scoreText(ORDER[i - 1]!);
	const to = scoreText(u.id);
	const num = (t: string) => parseFloat(t.replace("~", ""));
	const rounded = from.includes("~") || to.includes("~") || from.split(".")[1]!.length < 4;
	const d = num(to) - num(from);
	const delta = `${d < 0 ? "−" : "+"}${Math.abs(d).toFixed(rounded ? 2 : 4)}`;
	return {
		delta,
		moved,
		from: scoreText(ORDER[i - 1]!),
		to: scoreText(u.id),
		worse: total(now) > total(before),
		approx: !!(now.approx || before.approx),
	};
}

/** The score split as one bar on the fixed scale, with the three parts and the archive size under it. */
export function ScoreBar({ id, big = false }: { id: string; big?: boolean }) {
	const s = STATES[id]!;
	const t = total(s);
	const scale = Math.max(total(STATES.start!), t); // the first codec fills the bar; later scores shrink from there
	return (
		<div>
			<div className={`relative flex overflow-hidden rounded-sm bg-white/[0.05] ${big ? "h-3.5" : "h-3"}`}>
				{PARTS.map((k) => (
					<div key={k} className="transition-all duration-500" style={{ width: `${(s[k] / scale) * 100}%`, background: COLOR[k] }} />
				))}
			</div>
			<div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 font-mono text-[11.5px]">
				{PARTS.map((k) => (
					<span key={k}>
						<span className="text-white/45">{k} </span>
						<span className="tabular-nums" style={{ color: COLOR[k] }}>
							{s.approx && !(id === "start" && k === "size") ? "~" : ""}
							{fmt(s[k])}
						</span>
					</span>
				))}
				<span className="ml-auto text-white/45 tabular-nums">
					archive {s.approx && id !== "start" ? "~" : ""}
					{(s.bytes / 1000).toFixed(1)} KB
				</span>
			</div>
			{big && <div className="sr-only">total {t.toFixed(4)}</div>}
		</div>
	);
}

/** The first codec's score, drawn exactly like the scoreboard so section 3 picks up where it ends. */
export function FirstScore() {
	return (
		<div id="first-codec-score" className="my-8">
			<div className="font-mono text-[10px] tracking-[0.14em] text-white/45 uppercase">first codec</div>
			<div className="text-5xl font-semibold tracking-tight tabular-nums">0.4537</div>
			<div className="mt-3">
				<ScoreBar id="start" big />
			</div>
		</div>
	);
}

/** The pinned scoreboard. `active` is the upgrade on screen ("start" before the first one). */
export function UpgradeTracker({ active, visible, belowBar = false }: { active: string; visible: boolean; belowBar?: boolean }) {
	const i = Math.max(0, ORDER.indexOf(active)); // 0 = still on the first codec, before 3.1
	const id = ORDER[i]!;
	const worse = i > 0 && total(STATES[id]!) > total(STATES[ORDER[i - 1]!]!);
	return (
		<div
			aria-hidden={!visible}
			className={`fixed ${belowBar ? "top-11" : "top-0"} left-1/2 z-30 w-full max-w-[44rem] -translate-x-1/2 border-b border-white/10 bg-black/90 px-5 py-3 backdrop-blur-md transition-all duration-300 sm:px-6 ${visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0"}`}
		>
			<div className="flex items-center gap-5">
				<div className="w-28 shrink-0">
					<div className="font-mono text-[10px] tracking-[0.14em] text-white/45 uppercase">{i ? `after 3.${i}` : "first codec"}</div>
					<div className={`text-3xl font-semibold tracking-tight tabular-nums transition-colors ${worse ? "text-[#ff5a6e]" : ""}`}>{scoreText(id)}</div>
				</div>
				<div className="min-w-0 flex-1">
					<ScoreBar id={id} />
					<div className="mt-2 flex gap-[3px]">
						{ORDER.slice(1).map((o, k) => (
							<a
								key={o}
								href={`#${o}`}
								className="h-[2px] flex-1 rounded-full transition-colors"
								style={{ background: k === i - 1 ? "rgba(255,255,255,0.85)" : k < i - 1 ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)" }}
								aria-label={`Pivot ${k + 1}`}
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

/** The other lines of an upgrade's score tree (pixels changed, shipped pose error, ...), shown under its text. */
export function upgradeExtras(u: Upgrade) {
	const lines = u.tree.split("\n");
	const full = lines[0]!.trim().startsWith("score");
	return lines
		.slice(1)
		.map((line) => {
			const at = line.search(/[├└]/);
			const [label = "", ...rest] = line.slice(at).replace(/^[├└]──\s*/, "").split(/\s{2,}/);
			return { label: label.trim(), value: rest.join("  ").trim() };
		})
		.filter((r) => r.label !== "score" && !(full && ["seg", "pose", "size", "weights", "correction", "motions"].includes(r.label)));
}
