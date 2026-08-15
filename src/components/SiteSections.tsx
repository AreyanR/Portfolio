import { useState } from "react";

/** Match Portfolio App.js: [brackets] = light emphasis inside full sentences. */
function RichLine({ text }: { text: string }) {
	const parts = text.split(/(\[.*?\])/g);
	return (
		<span>
			{parts.map((part, i) => {
				if (part.startsWith("[") && part.endsWith("]")) {
					return (
						<span key={i} className="exp-em">
							{part.slice(1, -1)}
						</span>
					);
				}
				return <span key={i}>{part}</span>;
			})}
		</span>
	);
}

function BulletList({ items }: { items: string[] }) {
	return (
		<ul className="exp-list">
			{items.map((item) => (
				<li key={item}>
					{item.includes("PSURP") ? (
						<>
							{item.split(/(PSURP)/g).map((chunk, i) =>
								chunk === "PSURP" ? (
									<a
										key={i}
										href="https://www.blackboxtoolkit.com/psurp.html"
										target="_blank"
										rel="noopener noreferrer"
										className="exp-link"
									>
										PSURP
									</a>
								) : (
									<RichLine key={i} text={chunk} />
								),
							)}
						</>
					) : (
						<RichLine text={item} />
					)}
				</li>
			))}
		</ul>
	);
}

type Job = {
	id: string;
	title: string;
	place: string;
	when: string;
	bullets: string[];
	impact: string[];
};

const JOBS: Job[] = [
	{
		id: "bridgepos",
		title: "Software Engineer (Contract)",
		place: "BridgePOS | Orange County, CA",
		when: "August 2025 - November 2025",
		bullets: [
			"Developed a [full stack invoice automation system using React, Node.js, and Python] to streamline [invoice capture, data extraction, and downstream processing workflows].",
			"Implemented [OCR and computer vision pipelines] to extract structured data from [handwritten and printed invoices] with integrated validation and error detection.",
			"Designed and implemented [RESTful APIs] to support [scanner ingestion and structured JSON output] for automated database population.",
			"Built [interactive validation and correction interfaces] to support [rapid human review and exception handling].",
			"Tested system performance across [a wide range of vendor invoice formats] to ensure [consistent extraction behavior and system reliability].",
		],
		impact: [
			"[Reduced manual invoice data entry time] by automating capture, extraction, and validation workflows.",
			"[Achieved 85 percent or higher extraction accuracy] across diverse handwritten and printed invoice formats.",
			"[Improved processing reliability] by combining automated OCR with structured validation and human in the loop review tools.",
			"[Supported integration with warehouse management systems] through standardized APIs and structured data output.",
			"[Validated system] across 20 plus invoice format variations from different vendors.",
		],
	},
	{
		id: "action-control",
		title: "Research Software Engineer",
		place: "Action Control Lab | Eugene, OR",
		when: "November 2024 - June 2025",
		bullets: [
			"Developed a [hardware-integrated 2D simulation in PsychoPy] that combined task coordination, input capture, and visual feedback for [motor-learning neurological studies].",
			"Engineered the [sensor-to-software pipeline in Python], processing pressure-pad signals from the PSURP into [millisecond-accurate controller inputs] for research analysis.",
			"Built a [fully automated data-capture workflow] that captured trial events, recorded performance metrics, and [exported structured CSV datasets] with no manual processing required.",
			"Designed a [participant configuration GUI] that streamlined setup, maintained consistent trial settings, and [reduced researcher effort across sessions].",
			"Collaborated with neuroscience researchers through [iterative prototyping] to refine task mechanics and experiment parameters as study requirements evolved.",
			"Authored [technical documentation] covering setup, calibration, integration, and long-term maintenance workflows.",
		],
		impact: [
			"[Increased participant engagement] through interactive task elements and visual feedback.",
			"[Reduced researcher workload by ~80 percent] by automating setup and trial preparation.",
			"[Improved measurement accuracy] using a calibrated pressure-pad pipeline for higher-resolution force input.",
			"[Improved data reliability] across 15+ sessions through standardized timing and automated dataset generation.",
			"[Expanded study capacity] by streamlining workflows and reducing manual effort to support more participants.",
		],
	},
];

const EDUCATION = [
	{
		school: "University of Oregon",
		when: "2021 - 2025",
		detail: "Bachelor of Science in Computer Science",
	},
	{
		school: "UC Irvine",
		when: "2026 - 2027",
		detail: "Master of Engineering in Mechanical & Aerospace Engineering",
		current: true,
	},
];

const SKILL_GROUPS: { title: string; items: { name: string; img: string }[] }[] =
	[
		{
			title: "Programming Languages",
			items: [
				{ name: "Python", img: "python.png" },
				{ name: "C", img: "c.png" },
				{ name: "C++", img: "cplusplus.png" },
				{ name: "C#", img: "csharpe.png" },
				{ name: "JavaScript", img: "js.png" },
				{ name: "Swift", img: "swift.png" },
				{ name: "HTML", img: "html.png" },
				{ name: "CSS", img: "css.png" },
			],
		},
		{
			title: "Web Development",
			items: [
				{ name: "React", img: "react.png" },
				{ name: "Node.js", img: "nodejs.png" },
				{ name: "Express", img: "express.png" },
				{ name: "SQL", img: "sql.png" },
				{ name: "PostgreSQL", img: "postgresql.png" },
				{ name: "Spline", img: "spline.png" },
				{ name: "REST API Design", img: "rest-api.png" },
				{ name: "FastAPI", img: "fastapi.png" },
				{ name: "Flask", img: "flask.png" },
				{ name: "Firebase", img: "firebase.png" },
			],
		},
		{
			title: "Machine Learning & AI",
			items: [
				{ name: "TensorFlow", img: "tflow.png" },
				{ name: "PyTorch", img: "ptorch.png" },
				{ name: "Unity ML Agents", img: "mlagentslogo.png" },
				{ name: "NumPy", img: "numpy.png" },
				{ name: "Matplotlib", img: "matplotlib.png" },
				{ name: "Pandas", img: "pandas.png" },
				{ name: "Scikit-learn", img: "scikit-learn.png" },
				{ name: "OpenCV", img: "opencv.png" },
			],
		},
		{
			title: "Game Development & Simulation",
			items: [
				{ name: "Unity", img: "unity.png" },
				{ name: "Unreal Engine", img: "ue.png" },
				{ name: "PsychoPy", img: "psychopy.png" },
			],
		},
		{
			title: "Tools & Software",
			items: [
				{ name: "Git", img: "git.png" },
				{ name: "VS Code", img: "vscode.png" },
				{ name: "Pycharm", img: "pycharm.png" },
				{ name: "Powershell", img: "powershell.png" },
				{ name: "Linux", img: "linux.png" },
				{ name: "MATLAB", img: "matlab.png" },
				{ name: "Terminal", img: "terminal.png" },
				{ name: "Excel", img: "excel.png" },
				{ name: "Photoshop", img: "photoshop.png" },
				{ name: "Figma", img: "figma.png" },
				{ name: "Jupyter", img: "jupyter.png" },
			],
		},
	];

function SectionLabel({ children }: { children: string }) {
	return (
		<p className="font-mono text-[12px] tracking-normal text-white/45">
			<span className="text-white/25">~/</span>
			{children}
		</p>
	);
}

function JobBlock({ job }: { job: Job }) {
	const [open, setOpen] = useState(false);

	return (
		<article className={`exp-card ${open ? "is-open" : ""}`}>
			<button
				type="button"
				aria-expanded={open}
				onClick={() => setOpen((v) => !v)}
				className="exp-card__trigger"
			>
				<div className="exp-card__titleblock">
					<h3>{job.title}</h3>
					<p>{job.place}</p>
				</div>
				<div className="exp-card__meta">
					<span className="exp-card__when">{job.when}</span>
					<span className="exp-card__chevron" aria-hidden>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
							<path
								d="M6 9l6 6 6-6"
								stroke="currentColor"
								strokeWidth="1.8"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</span>
				</div>
			</button>

			<div className="exp-card__panel" aria-hidden={!open}>
				<div className="exp-card__panel-inner">
					<div className="exp-card__body">
						<section className="exp-block">
							<p className="exp-card__label">Work</p>
							<BulletList items={job.bullets} />
						</section>
						<section className="exp-block">
							<p className="exp-card__label">Impact</p>
							<BulletList items={job.impact} />
						</section>
					</div>
				</div>
			</div>
		</article>
	);
}

export function ExperienceSection() {
	return (
		<section id="experience" className="mt-20 w-full max-w-[920px] sm:mt-24">
			<SectionLabel>experience</SectionLabel>
			<div className="exp-stack mt-6">
				{JOBS.map((job) => (
					<JobBlock key={job.id} job={job} />
				))}
			</div>
		</section>
	);
}

export function EducationSection() {
	return (
		<section id="education" className="mt-20 w-full max-w-[920px] sm:mt-24">
			<SectionLabel>education</SectionLabel>
			<ol className="edu-timeline mt-6">
				{EDUCATION.map((item, i) => (
					<li
						key={item.school}
						className={`edu-timeline__item ${item.current ? "is-current" : ""}`}
					>
						<div className="edu-timeline__rail" aria-hidden>
							<span className="edu-timeline__dot" />
							{i < EDUCATION.length - 1 ? (
								<span className="edu-timeline__line" />
							) : null}
						</div>
						<div className="edu-timeline__body">
							<span className="edu-timeline__when">{item.when}</span>
							<h3>{item.school}</h3>
							{item.detail ? <p>{item.detail}</p> : null}
						</div>
					</li>
				))}
			</ol>
		</section>
	);
}

export function SkillsSection() {
	return (
		<section id="skills" className="mt-20 w-full max-w-[920px] sm:mt-24">
			<SectionLabel>skills</SectionLabel>
			<div className="skills-board mt-6">
				{SKILL_GROUPS.map((group) => (
					<div key={group.title} className="skills-row">
						<p className="skills-row__label">{group.title}</p>
						<ul className="skills-row__tags">
							{group.items.map((item) => (
								<li key={item.name}>
									<span className="skills-tag">
										<img
											src={`${import.meta.env.BASE_URL}skills/${item.img}`}
											alt=""
											loading="lazy"
										/>
										{item.name}
									</span>
								</li>
							))}
						</ul>
					</div>
				))}
			</div>
		</section>
	);
}

export function ContactSection() {
	return (
		<section id="contact" className="mt-20 w-full max-w-[920px] pb-10 text-center sm:mt-24">
			<SectionLabel>contact</SectionLabel>
			<div className="mt-8 flex items-center justify-center gap-8">
				<a
					href="https://github.com/AreyanR"
					target="_blank"
					rel="noopener noreferrer"
					aria-label="GitHub"
					className="flex size-16 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:border-white/50 hover:text-white sm:size-[4.5rem]"
				>
					<svg className="size-8 sm:size-9" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
						<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
					</svg>
				</a>
				<a
					href="https://www.linkedin.com/in/areyan-rastawan-bb757a259"
					target="_blank"
					rel="noopener noreferrer"
					aria-label="LinkedIn"
					className="flex size-16 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:border-white/50 hover:text-white sm:size-[4.5rem]"
				>
					<svg className="size-8 sm:size-9" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
						<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
					</svg>
				</a>
			</div>
		</section>
	);
}
