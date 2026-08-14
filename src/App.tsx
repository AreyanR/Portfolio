import { useEffect, useRef, useState } from "react";
import AsciiVitruvian from "@/components/ui/ascii-vitruvian";
import BirdsBackground from "@/components/BirdsBackground";
import TerminalAbout from "./TerminalAbout";

const NAV_ITEMS = [
	{ label: "About", href: "#about" },
	{ label: "Statistics", href: "#statistics" },
	{ label: "Projects", href: "#projects" },
	{ label: "Experience", href: "#experience" },
	{ label: "Skills", href: "#skills" },
	{ label: "Contact", href: "#contact" },
];

const GITHUB_USER = "AreyanR";

type Repo = {
	id: number;
	name: string;
	description: string | null;
	html_url: string;
	language: string | null;
};

type Day = {
	date: string;
	count: number;
	level: number;
};

export default function App() {
	const [repos, setRepos] = useState<Repo[]>([]);
	const [loadingRepos, setLoadingRepos] = useState(true);
	const [contributions, setContributions] = useState<Day[]>([]);
	const [contributionTotal, setContributionTotal] = useState<number | null>(null);
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
				const [reposRes, contribRes] = await Promise.all([
					fetch(
						`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`,
					),
					fetch(
						`https://github-contributions-api.jogruber.de/v4/${GITHUB_USER}?y=last`,
					),
				]);

				if (!cancelled && reposRes.ok) {
					const data = await reposRes.json();
					const filtered = (Array.isArray(data) ? data : [])
						.filter((r: { fork?: boolean }) => !r.fork)
						.sort(
							(a: { updated_at: string }, b: { updated_at: string }) =>
								new Date(b.updated_at).getTime() -
								new Date(a.updated_at).getTime(),
						);
					setRepos(filtered);
				}

				if (!cancelled && contribRes.ok) {
					const data = await contribRes.json();
					setContributionTotal(data.total?.lastYear ?? null);
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
				if (!cancelled) {
					setRepos([]);
					setContributions([]);
					setContributionTotal(null);
				}
			} finally {
				if (!cancelled) {
					setLoadingRepos(false);
					setLoadingStats(false);
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<div className="min-h-screen overflow-x-hidden bg-black text-white">
			{/* localhost:3001 liquid-glass top bar */}
			<nav className="micro-nav" aria-label="Primary">
				<div className="nav-shell liquid-glass">
					{NAV_ITEMS.map((item) => (
						<a key={item.label} href={item.href} className="nav-link">
							{item.label}
						</a>
					))}
				</div>
			</nav>

			{/* Hero — birds from localhost:3000 (same size + Vanta config) */}
			<section id="top" className="hero-wrapper relative w-full overflow-hidden bg-black">
				<BirdsBackground />
			</section>

			<main className="relative z-10 flex flex-col items-center px-5 pb-16 sm:px-6 sm:pb-20">
				<section
					id="about"
					ref={aboutRef}
					className="-mt-10 w-full max-w-[680px] sm:-mt-14"
				>
					<TerminalAbout active={aboutActive} />
				</section>

				{/* Statistics + ASCII — one recording console */}
				<section id="statistics" className="mt-20 w-full max-w-[960px] sm:mt-24">
					<p className="mb-2 text-[11px] font-medium tracking-[0.16em] text-white/40 uppercase">
						Statistics
					</p>
					<h2 className="mb-7 text-[clamp(1.75rem,3.5vw,2.25rem)] font-bold tracking-[-0.03em]">
						Activity
					</h2>

					<div className="stats-console overflow-hidden rounded-xl border border-white/[0.1] bg-[#0c0c0e]/[0.92]">
						{/* Shared title bar */}
						<div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] px-4 py-2.5 sm:px-5">
							<div className="flex items-center gap-2">
								<span className="rec-dot" aria-hidden="true" />
								<span className="font-mono text-[11px] tracking-[0.14em] text-white/55 uppercase">
									Recording
								</span>
							</div>
							<span className="font-mono text-[11px] text-white/40">
								{contributionTotal != null
									? `${contributionTotal.toLocaleString()} commits · 12mo`
									: "GitHub · last 12 months"}
							</span>
						</div>

						{/* Linked panes: heatmap + viz */}
						<div className="grid lg:grid-cols-[1fr_200px]">
							<div className="flex min-h-[200px] flex-col justify-center gap-4 border-b border-white/[0.08] p-4 sm:min-h-[220px] sm:p-5 lg:border-r lg:border-b-0">
								<div className="calendar-scroll">
									{loadingStats ? (
										<p className="text-sm text-white/40">Loading activity…</p>
									) : contributions.length > 0 ? (
										<div
											className="calendar-grid"
											aria-label="GitHub contribution calendar"
										>
											{contributions.map((day) => (
												<div
													key={day.date}
													className={`contribution-day level-${day.level}`}
													title={`${day.date}: ${day.count} contributions`}
												/>
											))}
										</div>
									) : (
										<p className="text-sm text-white/40">
											Contribution data unavailable.
										</p>
									)}
								</div>

								<div className="flex items-center justify-between">
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
									<span className="font-mono text-[10px] text-white/30">
										LIVE FEED
									</span>
								</div>
							</div>

							<div className="relative flex min-h-[200px] flex-col bg-black sm:min-h-[220px]">
								<div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5">
									<span className="font-mono text-[10px] tracking-[0.12em] text-white/40 uppercase">
										viz · vitruvian
									</span>
									<span className="flex items-center gap-1.5 font-mono text-[10px] text-white/35">
										<span className="size-1.5 animate-pulse rounded-full bg-white/70" />
										REC
									</span>
								</div>
								<div className="relative min-h-0 flex-1">
									<AsciiVitruvian className="h-full w-full" speed={1} />
									<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Projects */}
				<section id="projects" className="mt-20 w-full max-w-[960px] sm:mt-24">
					<p className="mb-2 text-[11px] font-medium tracking-[0.16em] text-white/40 uppercase">
						Projects
					</p>
					<h2 className="mb-7 text-[clamp(1.75rem,3.5vw,2.25rem)] font-bold tracking-[-0.03em]">
						My Projects
					</h2>

					{loadingRepos && (
						<p className="mb-4 text-sm text-white/40">Loading projects…</p>
					)}
					{!loadingRepos && repos.length === 0 && (
						<p className="mb-4 text-sm text-white/40">
							Projects unavailable right now.
						</p>
					)}

					<div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
						{repos.slice(0, 12).map((repo) => (
							<a
								key={repo.id}
								href={repo.html_url}
								target="_blank"
								rel="noopener noreferrer"
								className="group flex min-h-[120px] flex-col gap-2 border-t border-white/[0.08] pt-4 transition-colors hover:border-white/25"
							>
								<h3 className="text-[15px] font-semibold tracking-[-0.02em] text-white/90 transition-colors group-hover:text-white">
									{repo.name}
								</h3>
								<p className="line-clamp-3 flex-1 text-[13px] leading-relaxed text-white/55">
									{repo.description || "No description provided."}
								</p>
								{repo.language ? (
									<span className="text-xs text-white/35">{repo.language}</span>
								) : null}
							</a>
						))}
					</div>
				</section>
			</main>
		</div>
	);
}
