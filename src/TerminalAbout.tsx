import { useEffect, useMemo, useState, type ReactNode } from "react";

const ABOUT_TEXT =
	"Computer Science graduate from the University of Oregon currently pursuing a Master of Engineering in Mechanical & Aerospace Engineering at UC Irvine. I specialize in software engineering, computer vision, and machine learning, with a focus on applying those skills toward autonomous intelligent systems. Driven by pushing the boundaries of what technology can achieve, I aim to contribute to the next generation of automation by bridging core software design with physical robotic systems.";

type Line =
	| { type: "cmd"; text: string; cwd?: string }
	| { type: "out"; text: string };

const LINES: Line[] = [
	{ type: "cmd", text: "cd ~/portfolio", cwd: "~" },
	{ type: "cmd", text: "cat aboutme.md", cwd: "~/portfolio" },
	{ type: "out", text: ABOUT_TEXT },
];

type Visible =
	| { kind: "full"; lineIndex: number }
	| { kind: "typing"; lineIndex: number; chars: number };

type Props = {
	active: boolean;
};

function Prompt({ cwd = "~" }: { cwd?: string }) {
	return (
		<span className="select-none">
			<span className="text-white/55">{cwd}</span>
			<span className="text-white/45"> % </span>
		</span>
	);
}

function colorCmd(text: string): ReactNode[] {
	const [bin, ...rest] = text.split(" ");
	const args = rest.join(" ");
	return [
		<span key="b" className="text-white/88">
			{bin}
		</span>,
		args ? (
			<span key="a" className="text-white/55">
				{" "}
				{args}
			</span>
		) : null,
	];
}

function lineDelay(line: Line, done: boolean): number {
	if (done) return line.type === "cmd" ? 140 : 70;
	if (line.type === "cmd") return 14 + Math.random() * 10;
	return 2 + Math.random() * 3;
}

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
				timer = window.setTimeout(tick, lineDelay(line, false));
				return;
			}

			setVisible({ kind: "full", lineIndex });
			if (lineIndex >= LINES.length - 1) return;

			lineIndex += 1;
			chars = 0;
			timer = window.setTimeout(tick, lineDelay(line, true));
		};

		timer = window.setTimeout(tick, 90);
		return () => {
			if (timer) window.clearTimeout(timer);
		};
	}, [started, reduced]);

	const showFull = (i: number) => {
		if (visible.kind === "full") return i <= visible.lineIndex;
		return i < visible.lineIndex;
	};

	const renderLine = (line: Line, text: string, showCaret: boolean) => {
		if (line.type === "cmd") {
			return (
				<p className="mb-1.5 whitespace-pre-wrap break-words">
					<Prompt cwd={line.cwd} />
					{colorCmd(text)}
					{showCaret ? <span className="caret" aria-hidden="true" /> : null}
				</p>
			);
		}
		return (
			<p className="mb-3 mt-2 whitespace-pre-wrap break-words text-white/70">
				{text}
				{showCaret ? <span className="caret" aria-hidden="true" /> : null}
			</p>
		);
	};

	return (
		<div className="terminal-window overflow-hidden rounded-[10px]">
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
						~/areyanr — zsh
					</span>
				</div>
			</div>

			<div className="terminal-body relative min-h-[12rem] px-4 py-4 font-mono text-[13px] leading-[1.65] sm:min-h-[13.5rem] sm:px-5 sm:py-5 sm:text-[13.5px]">
				{!started ? null : (
					<>
						{LINES.map((line, i) => {
							if (showFull(i)) {
								return (
									<div key={i}>{renderLine(line, line.text, false)}</div>
								);
							}
							if (visible.kind === "typing" && i === visible.lineIndex) {
								return (
									<div key={i}>
										{renderLine(line, line.text.slice(0, visible.chars), true)}
									</div>
								);
							}
							return null;
						})}
						{(visible.kind === "full" &&
							visible.lineIndex === LINES.length - 1) ||
						reduced ? (
							<p className="mt-1">
								<Prompt cwd="~/portfolio" />
								<span className="caret" aria-hidden="true" />
							</p>
						) : null}
					</>
				)}
			</div>
		</div>
	);
}
