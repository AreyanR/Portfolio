import { useEffect, useState, type ReactNode } from "react";

const GITHUB_USER = "AreyanR";

/** Preferred display order (top → bottom). Unlisted repos go after these. */
const PROJECT_ORDER = [
	"SitRight",
	"ML-Ecosystem",
	"ML-Agents-Racing-Simulation",
	"Motor-Learning-Research-Project",
	"CardBoard-Boxing",
	"BattleBoards",
	"VR-XR-GameRoom",
	"Sisyphus-Simulator-UE5-",
	"AI-Coursework",
	"Portfolio",
];

function projectRank(name: string) {
	const i = PROJECT_ORDER.findIndex(
		(n) => n.toLowerCase() === name.toLowerCase(),
	);
	return i === -1 ? PROJECT_ORDER.length + 1 : i;
}

type Repo = {
	id: number;
	name: string;
	description: string | null;
	html_url: string;
	language: string | null;
	stargazers_count: number;
	updated_at: string;
	fork?: boolean;
	homepage?: string | null;
};

type Kind = "game" | "simulation" | "research" | "tool" | "web";

type Props = {
	username?: string;
};

function classifyRepo(repo: Repo): Kind {
	const blob = `${repo.name} ${repo.description || ""}`.toLowerCase();
	if (
		/\b(portfolio|website|webpage|landing)\b/.test(blob) ||
		repo.name.toLowerCase() === "portfolio"
	) {
		return "web";
	}
	if (/\b(research|motor.?learning|coursework|study)\b/.test(blob)) {
		return "research";
	}
	if (/simulat|ml-?agents|ecosystem|\bvr\b|\bxr\b|reinforcement/.test(blob)) {
		return "simulation";
	}
	if (/\b(game|boxing|boards|chess|sisyphus|racing)\b/.test(blob)) {
		return "game";
	}
	if (/\b(app|tool|utility|sitright)\b/.test(blob)) {
		return "tool";
	}
	return "tool";
}

const KIND_LABEL: Record<Kind, string> = {
	game: "Game",
	simulation: "Simulation",
	research: "Research",
	tool: "Tool",
	web: "Web",
};

function KindIcon({ kind }: { kind: Kind }) {
	const common = {
		width: 16,
		height: 16,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: 1.6,
		strokeLinecap: "round" as const,
		strokeLinejoin: "round" as const,
		"aria-hidden": true,
	};

	const icons: Record<Kind, ReactNode> = {
		game: (
			<svg {...common}>
				<path d="M6.5 10.5h11" />
				<path d="M9 8v5" />
				<path d="M6.5 15.5c-2 0-3.5-1.4-3.5-3.5S4.5 8.5 6.5 8.5h11c2 0 3.5 1.4 3.5 3.5s-1.5 3.5-3.5 3.5" />
				<circle cx="16.2" cy="11.2" r="0.7" fill="currentColor" stroke="none" />
				<circle cx="18.2" cy="13" r="0.7" fill="currentColor" stroke="none" />
			</svg>
		),
		simulation: (
			<svg {...common}>
				<circle cx="12" cy="12" r="3" />
				<path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21" />
				<path d="M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" />
			</svg>
		),
		research: (
			<svg {...common}>
				<circle cx="10.5" cy="10.5" r="5.5" />
				<path d="M15 15l5 5" />
			</svg>
		),
		tool: (
			<svg {...common}>
				<path d="M14.7 6.3a4.2 4.2 0 0 0-5.9 5.9L3 18l3 3 5.8-5.8a4.2 4.2 0 0 0 5.9-5.9l-2.5 2.5-2.5-2.5 2.5-2.5z" />
			</svg>
		),
		web: (
			<svg {...common}>
				<circle cx="12" cy="12" r="8.5" />
				<path d="M3.5 12h17" />
				<path d="M12 3.5c2.4 2.6 3.6 5.4 3.6 8.5s-1.2 5.9-3.6 8.5c-2.4-2.6-3.6-5.4-3.6-8.5s1.2-5.9 3.6-8.5z" />
			</svg>
		),
	};

	return icons[kind];
}

function ProjectCard({
	repo,
	kind,
}: {
	repo: Repo;
	kind: Kind;
}) {
	return (
		<a
			href={repo.html_url}
			target="_blank"
			rel="noreferrer"
			aria-label={`${repo.name} — ${KIND_LABEL[kind]} — on GitHub`}
			className="project-card"
		>
			<div className="project-card__head">
				<span className="project-card__icon">
					<KindIcon kind={kind} />
				</span>
				<span className="project-card__kind">{KIND_LABEL[kind]}</span>
				<span className="project-card__arrow" aria-hidden>
					↗
				</span>
			</div>
			<h3>{repo.name}</h3>
			<p>{repo.description || "Open on GitHub →"}</p>
			<div className="project-card__meta">
				{repo.language ? <span>{repo.language}</span> : null}
				<span>
					{new Date(repo.updated_at).toLocaleDateString(undefined, {
						month: "short",
						year: "numeric",
					})}
				</span>
			</div>
		</a>
	);
}

export default function ProjectsCarousel({
	username = GITHUB_USER,
}: Props) {
	const [repos, setRepos] = useState<Repo[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await fetch(
					`https://api.github.com/users/${username}/repos?sort=updated&per_page=20&type=owner`,
				);
				if (!res.ok) throw new Error("repos failed");
				const data = (await res.json()) as Repo[];
				if (cancelled) return;
				const cleaned = data
					.filter((r) => !r.fork)
					.filter((r) => !r.name.startsWith("."))
					.sort((a, b) => {
						const ra = projectRank(a.name);
						const rb = projectRank(b.name);
						if (ra !== rb) return ra - rb;
						return (
							b.stargazers_count - a.stargazers_count ||
							+new Date(b.updated_at) - +new Date(a.updated_at)
						);
					})
					.slice(0, 10);
				setRepos(cleaned);
			} catch {
				if (!cancelled) setError(true);
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [username]);

	return (
		<section id="projects" className="mt-20 w-full max-w-[960px] sm:mt-24">
			<div className="mb-5 flex flex-wrap items-end justify-between gap-3">
				<p className="font-mono text-[12px] tracking-normal text-white/45">
					<span className="text-white/25">~/</span>projects
				</p>
				<a
					href={`https://github.com/${username}`}
					target="_blank"
					rel="noreferrer"
					className="font-mono text-[11px] text-white/40 underline-offset-2 transition hover:text-white/70 hover:underline"
				>
					github.com/{username} →
				</a>
			</div>

			{loading ? (
				<p className="font-mono text-sm text-white/40">Loading repos…</p>
			) : error || repos.length === 0 ? (
				<p className="font-mono text-sm text-white/40">
					Couldn’t load GitHub repos right now.
				</p>
			) : (
				<div className="project-grid">
					{repos.map((repo) => (
						<ProjectCard
							key={repo.id}
							repo={repo}
							kind={classifyRepo(repo)}
						/>
					))}
				</div>
			)}
		</section>
	);
}
