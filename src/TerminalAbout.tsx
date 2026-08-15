import { useEffect, useMemo, useState } from "react";

const ABOUT_TEXT =
	"Computer Science graduate from the University of Oregon currently pursuing a Master of Engineering in Mechanical & Aerospace Engineering at UC Irvine. I specialize in software engineering, computer vision, and machine learning, with a focus on applying those skills toward autonomous intelligent systems. Driven by pushing the boundaries of what technology can achieve, I aim to contribute to the next generation of automation by bridging core software design with physical robotic systems.";

const LINES = [
	{ type: "cmd" as const, text: "cat aboutme.md" },
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
		<div className="terminal-window overflow-hidden rounded-[10px]">
			{/* Classic macOS window chrome */}
			<div className="terminal-titlebar relative flex h-11 items-center px-3.5 sm:h-12 sm:px-4">
				<div
					className="z-10 flex shrink-0 items-center gap-[7px]"
					aria-hidden="true"
				>
					<span className="traffic-light traffic-close" title="Close" />
					<span className="traffic-light traffic-minimize" title="Minimize" />
					<span className="traffic-light traffic-zoom" title="Zoom" />
				</div>
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center px-14">
					<span className="truncate font-mono text-[13px] tracking-[-0.01em] text-white/70 sm:text-[14px]">
						aboutme.md
					</span>
				</div>
			</div>

			{/* Black text area */}
			<div className="terminal-body relative min-h-[10.5rem] px-4 py-4 font-mono text-[13.5px] leading-[1.7] text-white/78 sm:min-h-[11.5rem] sm:px-5 sm:py-5 sm:text-[14px]">
				{!started ? null : (
					<>
						{LINES.map((line, i) => {
							if (showFull(i)) {
								return (
									<p
										key={i}
										className={
											line.type === "cmd"
												? "mb-3 text-white/40"
												: "mb-3 text-white/80"
										}
									>
										{line.type === "cmd" ? (
											<span className="text-emerald-400/70">› </span>
										) : null}
										{line.text}
									</p>
								);
							}
							if (visible.kind === "typing" && i === visible.lineIndex) {
								return (
									<p
										key={i}
										className={
											line.type === "cmd"
												? "mb-3 text-white/40"
												: "mb-3 text-white/80"
										}
									>
										{line.type === "cmd" ? (
											<span className="text-emerald-400/70">› </span>
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
							<p className="text-white/40">
								<span className="text-emerald-400/70">› </span>
								<span className="caret" aria-hidden="true" />
							</p>
						) : null}
					</>
				)}
			</div>
		</div>
	);
}
