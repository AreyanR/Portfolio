import { useEffect, useMemo, useState } from "react";

const ABOUT_TEXT =
	"Computer Science graduate from the University of Oregon currently pursuing a Master of Engineering in Mechanical & Aerospace Engineering at UC Irvine. I specialize in software engineering, computer vision, and machine learning, with a focus on applying those skills toward autonomous intelligent systems. Driven by pushing the boundaries of what technology can achieve, I aim to contribute to the next generation of automation by bridging core software design with physical robotic systems.";

const LINES = [
	{ type: "cmd" as const, text: "cat ~/about.md" },
	{ type: "out" as const, text: ABOUT_TEXT },
];

type Visible =
	| { kind: "full"; lineIndex: number }
	| { kind: "typing"; lineIndex: number; chars: number };

type Props = {
	active: boolean;
};

export default function TerminalAbout({ active }: Props) {
	const [visible, setVisible] = useState<Visible>({
		kind: "typing",
		lineIndex: 0,
		chars: 0,
	});
	const [started, setStarted] = useState(false);

	const reduced = useMemo(() => {
		if (typeof window === "undefined") return false;
		return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	}, []);

	useEffect(() => {
		if (!active || started) return;
		setStarted(true);
	}, [active, started]);

	useEffect(() => {
		if (!started) return;

		if (reduced) {
			setVisible({ kind: "full", lineIndex: LINES.length - 1 });
			return;
		}

		let lineIndex = 0;
		let chars = 0;
		let timer: number | undefined;

		const tick = () => {
			const line = LINES[lineIndex];
			if (!line) return;

			if (chars < line.text.length) {
				chars += 1;
				setVisible({ kind: "typing", lineIndex, chars });
				const delay =
					line.type === "cmd" ? 26 + Math.random() * 16 : 6 + Math.random() * 7;
				timer = window.setTimeout(tick, delay);
				return;
			}

			setVisible({ kind: "full", lineIndex });
			if (lineIndex >= LINES.length - 1) return;

			lineIndex += 1;
			chars = 0;
			timer = window.setTimeout(tick, line.type === "cmd" ? 260 : 140);
		};

		timer = window.setTimeout(tick, 180);
		return () => {
			if (timer) window.clearTimeout(timer);
		};
	}, [started, reduced]);

	const showFull = (i: number) => {
		if (visible.kind === "full") return i <= visible.lineIndex;
		return i < visible.lineIndex;
	};

	return (
		<div className="terminal-window overflow-hidden rounded-xl border border-white/[0.1] bg-[#0c0c0e]/[0.92] backdrop-blur-[14px]">
			{/* macOS title bar — name is the window title (large + readable) */}
			<div className="relative flex min-h-14 items-center border-b border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.02] px-3.5 py-3 sm:min-h-[4.25rem] sm:px-4 sm:py-3.5">
				<div className="z-10 flex shrink-0 items-center gap-2" aria-hidden="true">
					<span className="size-3 rounded-full bg-[#ff5f57] shadow-[inset_0_-0.5px_0_rgba(0,0,0,0.18)] sm:size-[13px]" />
					<span className="size-3 rounded-full bg-[#febc2e] shadow-[inset_0_-0.5px_0_rgba(0,0,0,0.18)] sm:size-[13px]" />
					<span className="size-3 rounded-full bg-[#28c840] shadow-[inset_0_-0.5px_0_rgba(0,0,0,0.18)] sm:size-[13px]" />
				</div>
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center px-16 sm:px-20">
					<span className="truncate text-[clamp(1.25rem,3.8vw,1.85rem)] font-semibold tracking-[-0.03em] text-white">
						Areyan Rastawan
					</span>
				</div>
			</div>

			<div className="min-h-[9.5rem] px-4 py-3.5 font-mono text-[13.5px] leading-relaxed text-white/75 sm:px-5 sm:py-4 sm:text-sm">
				{!started ? null : (
					<>
						{LINES.map((line, i) => {
							if (showFull(i)) {
								return (
									<p
										key={i}
										className={line.type === "cmd" ? "mb-2 text-white/45" : "mb-3"}
									>
										{line.type === "cmd" ? (
											<span className="text-white/30">› </span>
										) : null}
										{line.text}
									</p>
								);
							}
							if (visible.kind === "typing" && i === visible.lineIndex) {
								return (
									<p
										key={i}
										className={line.type === "cmd" ? "mb-2 text-white/45" : "mb-3"}
									>
										{line.type === "cmd" ? (
											<span className="text-white/30">› </span>
										) : null}
										{line.text.slice(0, visible.chars)}
										<span className="caret" aria-hidden="true" />
									</p>
								);
							}
							return null;
						})}
						{(visible.kind === "full" && visible.lineIndex === LINES.length - 1) ||
						reduced ? (
							<p className="text-white/45">
								<span className="text-white/30">› </span>
								<span className="caret" aria-hidden="true" />
							</p>
						) : null}
					</>
				)}
			</div>
		</div>
	);
}
