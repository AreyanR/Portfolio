import type { ReactNode } from "react";

export const A = (p: string) => `${import.meta.env.BASE_URL}comma-assets/${p}`;
export const PIXELS = 384 * 512;
export const ORIGINAL_BYTES = 37_545_489;
export const MONO = "IBM Plex Mono";

/** **bold**, *italic*, `code`, ^{superscript} → React nodes. */
/** anchors: give GitHub PR links an id like "pr-130" so in-text mentions can jump to them (used by the credits table). */
export function md(text: string, anchors = false): ReactNode[] {
	const out: ReactNode[] = [];
	// {seg:0.0616} {pose:0.0849} {size:233 KB}: a number drawn in its score part's color, matching the top bar. {score:0.1682}: bold white
	const re = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\{(?:seg|pose|size|score):[^}]+\}|\^\{[^}]+\})/g;
	let last = 0;
	let m: RegExpExecArray | null;
	let k = 0;
	while ((m = re.exec(text))) {
		if (m.index > last) out.push(text.slice(last, m.index));
		const t = m[0];
		const link = t.startsWith("[") ? /^\[([^\]]+)\]\(([^)]+)\)$/.exec(t) : null;
		if (link) {
			const pr = anchors ? /\/pull\/(\d+)$/.exec(link[2]!) : null;
			out.push(<a key={k++} id={pr ? `pr-${pr[1]}` : undefined} href={link[2]} className="scroll-mt-40 text-white underline decoration-white/35 underline-offset-2 hover:decoration-white" {...(link[2]!.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>{link[1]}</a>);
		}
		else if (t.startsWith("**")) out.push(<strong key={k++}>{t.slice(2, -2)}</strong>);
		else if (t.startsWith("`")) out.push(<code key={k++} className="cw-code">{t.slice(1, -1)}</code>);
		else if (t.startsWith("^{")) out.push(<sup key={k++}>{t.slice(2, -1)}</sup>);
		else if (t.startsWith("{")) {
			const [part, value] = [t.slice(1, t.indexOf(":")), t.slice(t.indexOf(":") + 1, -1)];
			out.push(
				part === "score" ? (
					<span key={k++} className="font-semibold text-white tabular-nums">{value}</span>
				) : (
					<span key={k++} className="tabular-nums" style={{ color: `var(--${part})` }}>{value}</span>
				),
			);
		}
		else out.push(<em key={k++}>{t.slice(1, -1)}</em>);
		last = m.index + t.length;
	}
	if (last < text.length) out.push(text.slice(last));
	return out;
}

export const P = ({ children }: { children: string }) => <p>{md(children)}</p>;

export function Prose({ children }: { children: ReactNode }) {
	return <div className="cw-prose">{children}</div>;
}

/** Text Areyan still has to write. */
export function YourWords({ note, points }: { note: string; points?: string[] }) {
	return (
		<div className="cw-words" role="note">
			<div className="cw-words-label">your words</div>
			<div className="cw-words-note">{note}</div>
			{points && (
				<ol className="mt-2 list-decimal space-y-1 pl-5 text-[0.92rem] text-amber-100/80">
					{points.map((p) => (
						<li key={p}>{p}</li>
					))}
				</ol>
			)}
		</div>
	);
}

/** A visual or data file that still has to be made. Listed in comma-lab/writeup/PAGE_REQUESTS.md. */
export function Need({ id, title, what, file }: { id: string; title: string; what: string; file?: string }) {
	return (
		<div className="cw-need" role="note">
			<div className="flex items-baseline justify-between gap-3">
				<div className="cw-need-label">i need this · {id}</div>
				{file && <code className="font-mono text-[10.5px] text-rose-200/70">{file}</code>}
			</div>
			<div className="mt-1 font-semibold text-rose-100">{title}</div>
			<div className="mt-1 text-[0.92rem] text-rose-100/75">{what}</div>
		</div>
	);
}

export function Panel({ title, children, note }: { tag?: string; title: string; children: ReactNode; note?: ReactNode }) {
	return (
		<figure className="my-8">
			<div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:p-5">{children}</div>
			<figcaption className="mt-2 font-mono text-[11px] text-white/45">
				{title}
				{note && <span className="text-white/35"> · {note}</span>}
			</figcaption>
		</figure>
	);
}

export function Section({ id, num, title, children }: { id: string; num: string; title: string; children: ReactNode }) {
	const n = num.replace(".", "").padStart(2, "0");
	return (
		<section id={id} className="scroll-mt-16 pt-16 [header+&]:pt-14">
			{/* hairline between sections; the first section follows the title, so it has none */}
			{n !== "01" && <div className="mb-10 h-px bg-white/15" />}
			<div className="font-mono text-[11px] tracking-[0.22em] text-white/55 uppercase">§{n}</div>
			<h2 className="mt-3 mb-8 text-[2rem] leading-[1.05] font-bold tracking-tight sm:text-[2.75rem]">{title}</h2>
			{children}
		</section>
	);
}

export function Sub({ id, n, title }: { id?: string; n: string; title: string }) {
	return (
		<div id={id} className="mt-20 mb-5 scroll-mt-16">
			<div className="font-mono text-[11px] tracking-[0.18em] text-white/40 uppercase">{n}</div>
			<h3 className="mt-1.5 text-[1.75rem] leading-tight font-bold tracking-tight">{title}</h3>
		</div>
	);
}

export function Fig({ src, alt, cap, pixel }: { src: string; alt: string; cap?: string; pixel?: boolean }) {
	return (
		<figure className="cw-fig">
			<img src={A(src)} alt={alt} loading="lazy" className={pixel ? "cw-pixel" : undefined} />
			{cap && <figcaption>{cap}</figcaption>}
		</figure>
	);
}

const PART_COLOR: Record<string, string> = { seg: "var(--seg)", pose: "var(--pose)", size: "var(--size)" };

type TreeRow = { depth: number; label: string; value: string; note: string };

function parseTree(text: string): { head: string; rows: TreeRow[] } {
	const lines = text.split("\n");
	const rows = lines.slice(1).map((line) => {
		const at = line.search(/[├└]/);
		const body = line.slice(at).replace(/^[├└]──\s*/, "");
		const [label = "", ...rest] = body.split(/\s{2,}/);
		return { depth: Math.max(0, Math.round(at / 4)), label: label.trim(), value: (rest[0] ?? "").trim(), note: rest.slice(1).join("  ").trim() };
	});
	return { head: lines[0]!.trim(), rows };
}

/** "0.2004 → 0.1807 → 0.1798": earlier steps small and grey, the last one big. */
function BigChain({ text, big }: { text: string; big: string }) {
	const parts = text.split("→").map((t) => t.trim());
	return (
		<span className="inline-flex flex-wrap items-baseline gap-x-2">
			{parts.map((t, i) =>
				i === parts.length - 1 ? (
					<span key={i} className={`${big} font-semibold tracking-tight tabular-nums`}>
						{t}
					</span>
				) : (
					<span key={i} className="font-mono text-[15px] text-white/40 tabular-nums">
						{t} <span className="text-white/25">→</span>
					</span>
				),
			)}
		</span>
	);
}

/**
 * Areyan's score trees, drawn as plain big numbers.
 * "score X" trees: the score, one seg / pose / size bar, then the file sizes in a line.
 * "after upgrade N" trees: each line as before → after, the after value big.
 */
export function Tree({ children }: { children: string }) {
	const { head, rows } = parseTree(children);
	if (!/^(score|after)/.test(head)) return <pre className="cw-tree">{children}</pre>;
	const total = head.match(/^score\s+(.+)$/)?.[1];

	if (total) {
		const parts = rows.filter((r) => r.depth === 0);
		const files = rows.filter((r) => r.depth > 0);
		const num = (v: string) => parseFloat(v.replace(/[^0-9.]/g, "")) || 0;
		const sum = parts.reduce((s2, r) => s2 + num(r.value), 0) || 1;
		return (
			<div className="my-8">
				<div className="text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl">{total}</div>
				<div className="mt-4 flex h-2.5 overflow-hidden rounded-full">
					{parts.map((r) => (
						<div key={r.label} style={{ width: `${(num(r.value) / sum) * 100}%`, background: PART_COLOR[r.label] ?? "#fff" }} />
					))}
				</div>
				<div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[13px]">
					{parts.map((r) => (
						<span key={r.label}>
							<span className="text-white/50">{r.label} </span>
							<span className="tabular-nums" style={{ color: PART_COLOR[r.label] }}>
								{r.value}
							</span>
							{r.note && <span className="text-white/35"> {r.note}</span>}
						</span>
					))}
				</div>
				{files.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[12px] text-white/50">
						{files.map((r) => (
							<span key={r.label}>
								{r.label} <span className="text-white/85 tabular-nums">{r.value}</span>
								{r.note && <span className="text-white/35"> {r.note}</span>}
							</span>
						))}
					</div>
				)}
			</div>
		);
	}

	return (
		<div className="my-8 flex flex-col gap-3">
			{rows.map((r, i) => (
				<div key={i} className="flex flex-wrap items-baseline gap-x-4">
					<span className="w-28 shrink-0 font-mono text-[11px] tracking-[0.14em] text-white/45 uppercase">{r.label}</span>
					<BigChain text={r.value} big={i === 0 ? "text-4xl" : "text-2xl"} />
					{r.note && <span className="font-mono text-[12px] text-white/40">{r.note}</span>}
				</div>
			))}
		</div>
	);
}

/** A clear round play / pause button. */
export function PlayBtn({ playing, onClick }: { playing: boolean; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={playing ? "Pause" : "Play"}
			className="cw-focus flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105"
		>
			{playing ? (
				<svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
					<rect x="3" y="2" width="3.5" height="12" rx="1" />
					<rect x="9.5" y="2" width="3.5" height="12" rx="1" />
				</svg>
			) : (
				<svg viewBox="0 0 16 16" className="ml-0.5 h-4 w-4" fill="currentColor">
					<path d="M4 2.5v11a.5.5 0 0 0 .77.42l8.5-5.5a.5.5 0 0 0 0-.84l-8.5-5.5A.5.5 0 0 0 4 2.5z" />
				</svg>
			)}
		</button>
	);
}

export function Callout({ children }: { children: ReactNode }) {
	return <blockquote className="my-6 border-l-2 border-white py-1 pl-4 text-xl font-semibold text-white">{children}</blockquote>;
}

export function Btn({
	on,
	onClick,
	children,
	disabled,
}: {
	on?: boolean;
	onClick: () => void;
	children: ReactNode;
	disabled?: boolean;
}) {
	return (
		<button type="button" className="cw-btn" aria-pressed={on} onClick={onClick} disabled={disabled}>
			{children}
		</button>
	);
}

export const SEG_CLASSES: [string, string][] = [
	["road", "rgb(126,63,126)"],
	["lane", "rgb(245,196,0)"],
	["sky", "rgb(69,128,179)"],
	["car", "rgb(0,0,142)"],
	["hood", "rgb(105,140,33)"],
];

export function SegLegend() {
	return (
		<div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-white/55">
			{SEG_CLASSES.map(([n, c]) => (
				<span key={n} className="inline-flex items-center gap-1.5">
					<span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
					{n}
				</span>
			))}
		</div>
	);
}

export function Readout({ label, value, sub, color }: { label: string; value: ReactNode; sub?: string; color?: string }) {
	return (
		<div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
			<div className="font-mono text-[10px] tracking-[0.12em] text-white/40 uppercase">{label}</div>
			<div className="font-mono text-lg tabular-nums" style={{ color: color ?? "#fff" }}>
				{value}
			</div>
			{sub && <div className="font-mono text-[10px] text-white/35">{sub}</div>}
		</div>
	);
}

/** Path for a line through points already in SVG coordinates. */
export const linePath = (pts: [number, number][]) =>
	pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
