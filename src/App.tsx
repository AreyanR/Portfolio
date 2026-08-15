import { useEffect, useRef, useState } from "react";
import AsciiNameLoop, {
	ASCII_NAME_LOOP_DEFAULTS,
} from "@/components/ui/ascii-name-loop";
import PageStars from "@/components/PageStars";
import BackToTop from "@/components/BackToTop";
import ProjectsCarousel from "@/components/ProjectsCarousel";
import {
	ContactSection,
	EducationSection,
	ExperienceSection,
	SkillsSection,
} from "@/components/SiteSections";
import TerminalAbout from "./TerminalAbout";

const NAV_ITEMS = [
	{ label: "About", href: "#about" },
	{ label: "Projects", href: "#projects" },
	{ label: "Activity", href: "#activity" },
	{ label: "Experience", href: "#experience" },
	{ label: "Education", href: "#education" },
	{ label: "Skills", href: "#skills" },
	{ label: "Contact", href: "#contact" },
];

const GITHUB_USER = "AreyanR";

type Day = {
	date: string;
	count: number;
	level: number;
};

function weekAlignedDays(days: Day[]): Array<Day | null> {
	if (!days.length) return [];
	const pad = new Date(`${days[0]!.date}T00:00:00`).getDay();
	return [...Array<Day | null>(pad).fill(null), ...days];
}

export default function App() {
	const [contributions, setContributions] = useState<Day[]>([]);
	const [loadingStats, setLoadingStats] = useState(true);
	const [aboutActive, setAboutActive] = useState(false);
	const aboutRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		const el = aboutRef.current;
		if (!el) return;
		const io = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) setAboutActive(true);
			},
			{ threshold: 0.25 },
		);
		io.observe(el);
		return () => io.disconnect();
	}, []);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const contribRes = await fetch(
					`https://github-contributions-api.jogruber.de/v4/${GITHUB_USER}?y=last`,
				);
				if (!cancelled && contribRes.ok) {
					const data = await contribRes.json();
					setContributions(
						(data.contributions || []).map(
							(day: { date: string; count: number; level: number }) => ({
								date: day.date,
								count: Number(day.count),
								level: Number(day.level),
							}),
						),
					);
				}
			} catch {
				if (!cancelled) setContributions([]);
			} finally {
				if (!cancelled) setLoadingStats(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<div
			className="relative min-h-screen text-white"
			style={{
				backgroundColor: "#000000",
				backgroundImage: "linear-gradient(#000000, #000000)",
			}}
		>
			<PageStars />
			<BackToTop />

			<nav className="micro-nav" aria-label="Primary">
				<div className="nav-shell liquid-glass">
					{NAV_ITEMS.map((item) => (
						<a key={item.label} href={item.href} className="nav-link">
							{item.label}
						</a>
					))}
				</div>
			</nav>

			<section
				id="top"
				className="hero-wrapper relative z-[1] w-full overflow-hidden bg-transparent"
			>
				<div className="hero-evolution absolute inset-0 bg-transparent">
					<AsciiNameLoop
						className="h-full w-full"
						config={{
							...ASCII_NAME_LOOP_DEFAULTS,
							showLabels: false,
							beat: "current",
							rotateCraft: true,
							figureScale: 0.36,
							figureFit: "height",
							viewY: 0.5,
							showStars: true,
							transparentBg: true,
							colorStar: "rgba(255,255,255,0.26)",
						}}
					/>
				</div>
			</section>

			<main className="relative z-10 flex min-h-screen flex-col items-center bg-transparent px-5 pb-16 sm:px-6 sm:pb-20">
				<section
					id="about"
					ref={aboutRef}
					className="mt-1 w-full max-w-[680px] sm:mt-2"
				>
					<TerminalAbout active={aboutActive} />
				</section>

				<ProjectsCarousel username={GITHUB_USER} />

				<section
					id="activity"
					className="mt-20 w-full max-w-[960px] sm:mt-24"
				>
					<div className="stats-console overflow-x-auto rounded-xl border border-white/[0.08] bg-black">
						<div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] px-4 py-2.5 sm:px-5">
							<span className="font-mono text-[12px] tracking-normal text-white/55">
								<span className="text-white/30">~/</span>activity
							</span>
							<span className="font-mono text-[11px] text-white/40">
								GitHub · last 12 months
							</span>
						</div>

						<div className="flex min-w-0 flex-col justify-center gap-4 p-4 sm:p-5">
							<div className="calendar-scroll">
								{loadingStats ? (
									<p className="text-sm text-white/40">Loading activity…</p>
								) : contributions.length > 0 ? (
									<div
										className="calendar-grid"
										aria-label="GitHub contribution calendar"
									>
										{weekAlignedDays(contributions).map((day, i) =>
											day ? (
												<div
													key={day.date}
													className={`contribution-day level-${day.level}`}
													title={`${day.date}: ${day.count} contributions`}
												/>
											) : (
												<div
													key={`pad-${i}`}
													className="contribution-day level-pad"
													aria-hidden="true"
												/>
											),
										)}
									</div>
								) : (
									<p className="text-sm text-white/40">
										Contribution data unavailable.
									</p>
								)}
							</div>

							<div className="calendar-legend">
								<span>Less</span>
								<div className="legend-squares">
									<div className="legend-square level-0" />
									<div className="legend-square level-1" />
									<div className="legend-square level-2" />
									<div className="legend-square level-3" />
									<div className="legend-square level-4" />
								</div>
								<span>More</span>
							</div>
						</div>
					</div>
				</section>

				<ExperienceSection />
				<EducationSection />
				<SkillsSection />
				<ContactSection />
			</main>
		</div>
	);
}
