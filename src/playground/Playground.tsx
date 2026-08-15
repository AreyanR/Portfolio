import { useEffect, useState } from "react";
import AsciiEvolution, {
	ASCII_EVOLUTION_DEFAULTS,
	EVOLUTION_STAGE_NAMES,
	type AsciiEvolutionConfig,
} from "@/components/ui/ascii-evolution";
import AsciiEvolution2, {
	ASCII_EVOLUTION_2_DEFAULTS,
	EVOLUTION_2_STAGE_NAMES,
	type AsciiEvolution2Config,
} from "@/components/ui/ascii-evolution-2";
import AsciiEvolution3, {
	ASCII_EVOLUTION_3_DEFAULTS,
	EVOLUTION_3_STAGE_NAMES,
	type AsciiEvolution3Config,
} from "@/components/ui/ascii-evolution-3";
import AsciiNameLoop, {
	ASCII_NAME_LOOP_DEFAULTS,
	type AsciiNameLoopConfig,
} from "@/components/ui/ascii-name-loop";
import {
	DEFAULT_ENABLED_PATHS,
	FLIGHT_PATH_OPTIONS,
	ROCKET_STYLE_LOOKS,
	ROCKET_STYLE_OPTIONS,
	type RocketStyleId,
} from "@/components/ui/ascii-rockets";
import AsciiVitruvian, {
	ASCII_VITRUVIAN_DEFAULTS,
	type AsciiVitruvianConfig,
} from "@/components/ui/ascii-vitruvian";

type Scene = "current" | "anim1" | "anim2" | "anim3" | "vitruvian";

const SCENE_OPTIONS: { id: Scene; label: string }[] = [
	{ id: "current", label: "Current" },
	{ id: "anim1", label: "Anim 1" },
	{ id: "anim2", label: "Anim 2" },
	{ id: "anim3", label: "Anim 3" },
	{ id: "vitruvian", label: "Vitruvian" },
];

function sceneTitle(id: Scene): string {
	switch (id) {
		case "current":
			return "Current";
		case "anim1":
			return "Whale";
		case "anim2":
			return "Whale school";
		case "anim3":
			return "H1 Monkey";
		case "vitruvian":
			return "Vitruvian";
	}
}

type ColorPreset = {
	label: string;
	bright: string;
	ghost: string;
	star: string;
	exhaust?: string;
};

const PRESETS: ColorPreset[] = [
	{
		label: "White",
		bright: "rgba(255,255,255,0.96)",
		ghost: "rgba(255,255,255,0.5)",
		star: "rgba(255,255,255,0.22)",
		exhaust: "rgba(251,146,60,0.85)",
	},
	{
		label: "GitHub green",
		bright: "rgba(34,197,94,1)",
		ghost: "rgba(34,197,94,0.55)",
		star: "rgba(34,197,94,0.28)",
		exhaust: "rgba(74,222,128,0.8)",
	},
	{
		label: "Amber",
		bright: "rgba(251,191,36,0.95)",
		ghost: "rgba(251,191,36,0.45)",
		star: "rgba(251,191,36,0.2)",
		exhaust: "rgba(249,115,22,0.9)",
	},
	{
		label: "Ice",
		bright: "rgba(125,211,252,0.95)",
		ghost: "rgba(125,211,252,0.45)",
		star: "rgba(125,211,252,0.2)",
		exhaust: "rgba(56,189,248,0.85)",
	},
];

function Slider({
	label,
	value,
	min,
	max,
	step,
	onChange,
	format = (v) => v.toFixed(2),
}: {
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
	onChange: (v: number) => void;
	format?: (v: number) => string;
}) {
	return (
		<label className="flex flex-col gap-1.5">
			<span className="flex items-center justify-between font-mono text-[11px] text-white/50">
				<span>{label}</span>
				<span className="text-white/80">{format(value)}</span>
			</span>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
				className="lab-range"
			/>
		</label>
	);
}

function Toggle({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (v: boolean) => void;
}) {
	return (
		<label className="flex cursor-pointer items-center justify-between gap-3 border-t border-white/[0.06] py-2.5 first:border-t-0 first:pt-0">
			<span className="font-mono text-[12px] text-white/70">{label}</span>
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
				className="size-4 accent-white"
			/>
		</label>
	);
}

export default function Playground() {
	const [scene, setScene] = useState<Scene>("current");
	const [stageLabel, setStageLabel] = useState("Current");

	const [evo, setEvo] = useState<AsciiEvolutionConfig>({
		...ASCII_EVOLUTION_DEFAULTS,
		figureScale: 0.38,
		showLabels: true,
		holdStage: -1,
	});
	const [evo2, setEvo2] = useState<AsciiEvolution2Config>({
		...ASCII_EVOLUTION_2_DEFAULTS,
		figureScale: 0.36,
		showLabels: true,
		seekStage: -1,
		seekGen: 0,
	});
	const [evo3, setEvo3] = useState<AsciiEvolution3Config>({
		...ASCII_EVOLUTION_3_DEFAULTS,
		figureScale: 0.36,
		showLabels: true,
		seekStage: -1,
		seekGen: 0,
	});
	const [nameLoop, setNameLoop] = useState<AsciiNameLoopConfig>({
		...ASCII_NAME_LOOP_DEFAULTS,
		figureScale: 0.36,
		showLabels: true,
		beat: "current",
		rocketStyle: "classic",
	});
	const [vit, setVit] = useState<AsciiVitruvianConfig>({
		...ASCII_VITRUVIAN_DEFAULTS,
	});
	const [stageIndex, setStageIndex] = useState(0);

	// Always start clean on load / refresh / bfcache restore (don't stick on last tab)
	useEffect(() => {
		const reset = () => {
			setScene("current");
			setStageLabel("Current");
			setStageIndex(0);
			setEvo({
				...ASCII_EVOLUTION_DEFAULTS,
				figureScale: 0.38,
				showLabels: true,
				holdStage: -1,
			});
			setEvo2({
				...ASCII_EVOLUTION_2_DEFAULTS,
				figureScale: 0.36,
				showLabels: true,
				seekStage: -1,
				seekGen: 0,
			});
			setEvo3({
				...ASCII_EVOLUTION_3_DEFAULTS,
				figureScale: 0.36,
				showLabels: true,
				seekStage: -1,
				seekGen: 0,
			});
			setNameLoop({
				...ASCII_NAME_LOOP_DEFAULTS,
				figureScale: 0.36,
				showLabels: true,
				beat: "current",
				rocketStyle: "classic",
			});
			setVit({ ...ASCII_VITRUVIAN_DEFAULTS });
		};
		reset();
		const onPageShow = (e: PageTransitionEvent) => {
			if (e.persisted) reset();
		};
		window.addEventListener("pageshow", onPageShow);
		return () => window.removeEventListener("pageshow", onPageShow);
	}, []);

	const patchEvo = (partial: Partial<AsciiEvolutionConfig>) =>
		setEvo((c) => ({ ...c, ...partial }));
	const patchEvo2 = (partial: Partial<AsciiEvolution2Config>) =>
		setEvo2((c) => ({ ...c, ...partial }));
	const patchEvo3 = (partial: Partial<AsciiEvolution3Config>) =>
		setEvo3((c) => ({ ...c, ...partial }));
	const patchName = (partial: Partial<AsciiNameLoopConfig>) =>
		setNameLoop((c) => ({ ...c, ...partial }));
	const patchVit = (partial: Partial<AsciiVitruvianConfig>) =>
		setVit((c) => ({ ...c, ...partial }));

	const isSeekEvo = scene === "anim2" || scene === "anim3";
	const isCurrent = scene === "current";
	const isEvo = scene === "anim1" || isSeekEvo || isCurrent;
	const activeEvo = isCurrent
		? nameLoop
		: scene === "anim3"
			? evo3
			: scene === "anim2"
				? evo2
				: evo;
	const patchActive = isCurrent
		? patchName
		: scene === "anim3"
			? patchEvo3
			: scene === "anim2"
				? patchEvo2
				: patchEvo;
	const stageNames =
		scene === "anim3"
			? [...EVOLUTION_3_STAGE_NAMES]
			: scene === "anim2"
				? [...EVOLUTION_2_STAGE_NAMES]
				: EVOLUTION_STAGE_NAMES;

	function selectScene(id: Scene) {
		setScene(id);
		setStageLabel(sceneTitle(id));
		setStageIndex(0);
		if (id === "anim2") {
			setEvo2((c) => ({
				...c,
				seekStage: -1,
				seekGen: c.seekGen + 1,
			}));
		}
		if (id === "anim3") {
			setEvo3((c) => ({
				...c,
				seekStage: -1,
				seekGen: c.seekGen + 1,
			}));
		}
		if (id === "anim1") {
			setEvo((c) => ({ ...c, holdStage: -1 }));
		}
		if (id === "current") {
			setNameLoop({
				...ASCII_NAME_LOOP_DEFAULTS,
				figureScale: 0.36,
				showLabels: true,
				beat: "current",
				rocketStyle: nameLoop.rocketStyle,
			});
		}
	}

	return (
		<div className="lab min-h-screen bg-[#000000] text-white">
			<header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.08] px-5 py-4 sm:px-8">
				<div>
					<p className="font-mono text-[11px] tracking-[0.16em] text-white/40 uppercase">
						localhost:3003
					</p>
					<h1 className="mt-1 text-2xl font-bold tracking-[-0.03em]">
						ASCII Lab
					</h1>
				</div>
				<label className="flex flex-col gap-1.5">
					<span className="font-mono text-[10px] tracking-[0.14em] text-white/40 uppercase">
						Page
					</span>
					<select
						value={scene}
						onChange={(e) => selectScene(e.target.value as Scene)}
						className="min-w-[11rem] border border-white/20 bg-black px-3 py-2 font-mono text-[12px] tracking-[0.06em] text-white outline-none focus:border-white/45"
					>
						{SCENE_OPTIONS.map((opt) => (
							<option key={opt.id} value={opt.id}>
								{opt.label}
							</option>
						))}
					</select>
				</label>
			</header>

			<div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
				<div className="relative min-h-[70vh] overflow-hidden border-b border-white/[0.08] bg-[#000000] lg:min-h-[calc(100vh-5.5rem)] lg:border-r lg:border-b-0">
					{scene === "current" ? (
						<div className="absolute inset-0">
							<AsciiNameLoop
								key={`${nameLoop.beat}-${nameLoop.rocketStyle}-${nameLoop.shipOnly}`}
								className="h-full w-full"
								config={nameLoop}
								onStageChange={(name, index) => {
									setStageLabel(name);
									setStageIndex(index);
								}}
							/>
						</div>
					) : scene === "anim1" ? (
						<div className="absolute inset-0">
							<AsciiEvolution
								className="h-full w-full"
								config={evo}
								onStageChange={(name, index) => {
									setStageLabel(name);
									setStageIndex(index);
								}}
							/>
						</div>
					) : scene === "anim2" ? (
						<div className="absolute inset-0">
							<AsciiEvolution2
								className="h-full w-full"
								config={evo2}
								onStageChange={(name, index) => {
									setStageLabel(name);
									setStageIndex(index);
								}}
							/>
						</div>
					) : scene === "anim3" ? (
						<div className="absolute inset-0">
							<AsciiEvolution3
								className="h-full w-full"
								config={evo3}
								onStageChange={(name, index) => {
									setStageLabel(name);
									setStageIndex(index);
								}}
							/>
						</div>
					) : (
						<div className="absolute inset-0">
							<AsciiVitruvian className="h-full w-full" config={vit} />
						</div>
					)}
				</div>

				<aside className="flex max-h-[calc(100vh-5.5rem)] flex-col gap-5 overflow-y-auto px-5 py-5 sm:px-6">
					{isEvo ? (
						<>
							<section>
								<p className="font-mono text-[11px] tracking-[0.14em] text-white/40 uppercase">
									Now ·{" "}
									{scene === "current"
										? "Current"
										: scene === "anim3"
											? "Animation 3"
											: scene === "anim2"
												? "Animation 2"
												: "Animation 1"}
								</p>
								<p className="mt-1 text-lg font-semibold tracking-[-0.02em]">
									{stageLabel}
								</p>
								<p className="mt-2 text-[13px] leading-relaxed text-white/45">
									{scene === "current"
										? "Name fades in with an intro rocket, then randomized flybys. Toggle Ship only to preview craft + paths."
										: scene === "anim3"
											? "March of Progress: H1 monkey → H3 hunched spear → H4 human → rocket → name."
											: scene === "anim2"
												? "One full loop only. Jump-to seeks into that same timeline (whale → monkey → human → rocket)."
												: "Whale → Monkey V2 → Human → rocket NE. Lizard/Monkey/Running/Cells/Cells 2 holdable."}
								</p>
							</section>

							<section>
								<h2 className="mb-3 font-mono text-[11px] tracking-[0.14em] text-white/40 uppercase">
									Playback
								</h2>
								<div className="flex flex-col gap-4">
									<Slider
										label="Speed"
										value={activeEvo.speed}
										min={0}
										max={2.5}
										step={0.05}
										onChange={(speed) => patchActive({ speed })}
									/>
									<Slider
										label="Figure scale"
										value={activeEvo.figureScale}
										min={0.2}
										max={0.5}
										step={0.01}
										onChange={(figureScale) => patchActive({ figureScale })}
									/>
									<Slider
										label="Density"
										value={activeEvo.density}
										min={0.6}
										max={1.8}
										step={0.05}
										onChange={(density) => patchActive({ density })}
									/>
								</div>
							</section>

							{isCurrent && (
								<section>
									<h2 className="mb-3 font-mono text-[11px] tracking-[0.14em] text-white/40 uppercase">
										Preview
									</h2>
									<Toggle
										label="Ship only (no name)"
										checked={nameLoop.shipOnly}
										onChange={(shipOnly) => patchName({ shipOnly })}
									/>
									<h2 className="mb-3 mt-5 font-mono text-[11px] tracking-[0.14em] text-white/40 uppercase">
										Flight paths
									</h2>
									<div className="flex flex-col gap-0.5">
										{FLIGHT_PATH_OPTIONS.map((opt) => {
											const checked = nameLoop.enabledPaths.includes(
												opt.id,
											);
											return (
												<label
													key={opt.id}
													className="flex cursor-pointer items-center justify-between gap-3 border-t border-white/[0.06] py-2 first:border-t-0 first:pt-0"
												>
													<span className="font-mono text-[12px] text-white/70">
														{opt.label}
													</span>
													<input
														type="checkbox"
														checked={checked}
														onChange={() => {
															const next = checked
																? nameLoop.enabledPaths.filter(
																		(id) => id !== opt.id,
																	)
																: [
																		...nameLoop.enabledPaths,
																		opt.id,
																	].sort((a, b) => a - b);
															patchName({
																enabledPaths:
																	next.length > 0
																		? next
																		: [opt.id],
															});
														}}
														className="size-4 accent-white"
													/>
												</label>
											);
										})}
									</div>
									<button
										type="button"
										onClick={() =>
											patchName({
												enabledPaths: [...DEFAULT_ENABLED_PATHS],
											})
										}
										className="mt-2 font-mono text-[10px] text-white/40 underline-offset-2 hover:text-white/70 hover:underline"
									>
										Reset to default paths
									</button>
									<h2 className="mb-3 mt-5 font-mono text-[11px] tracking-[0.14em] text-white/40 uppercase">
										Rocket style
									</h2>
									<div className="flex flex-wrap gap-2">
										{ROCKET_STYLE_OPTIONS.map((opt) => {
											const look = ROCKET_STYLE_LOOKS[opt.id];
											const active = nameLoop.rocketStyle === opt.id;
											return (
												<button
													key={opt.id}
													type="button"
													onClick={() => {
														patchName({
															rocketStyle: opt.id as RocketStyleId,
															beat: "current",
														});
														setStageLabel(opt.label);
													}}
													className={`font-mono text-[11px] border px-2.5 py-1.5 ${
														active
															? "border-white/40 text-white"
															: "border-white/10 text-white/50 hover:border-white/25"
													}`}
												>
													<span
														className="mr-2 inline-block size-2 align-middle"
														style={{ background: look.craft }}
													/>
													{opt.label}
												</button>
											);
										})}
									</div>
									<p className="mt-3 font-mono text-[10px] leading-relaxed text-white/35">
										Checked paths pick at random each pass. Ship only
										previews faster.
									</p>
								</section>
							)}

							{!isCurrent && (
							<section>
								<h2 className="mb-3 font-mono text-[11px] tracking-[0.14em] text-white/40 uppercase">
									{isSeekEvo ? "Jump to" : "Hold stage"}
								</h2>
								<div className="flex flex-wrap gap-2">
									<button
										type="button"
										onClick={() => {
											if (scene === "anim3") {
												patchEvo3({
													seekStage: -1,
													seekGen: evo3.seekGen + 1,
												});
											} else if (scene === "anim2") {
												patchEvo2({
													seekStage: -1,
													seekGen: evo2.seekGen + 1,
												});
											} else {
												patchEvo({ holdStage: -1 });
											}
										}}
										className={`font-mono text-[11px] border px-2.5 py-1.5 ${
											isSeekEvo
												? (scene === "anim3" ? evo3 : evo2).seekStage < 0
													? "border-white/40 text-white"
													: "border-white/10 text-white/50 hover:border-white/25"
												: evo.holdStage < 0
													? "border-white/40 text-white"
													: "border-white/10 text-white/50 hover:border-white/25"
										}`}
									>
										Full loop
									</button>
									{stageNames.map((name, i) => (
										<button
											key={name}
											type="button"
											onClick={() => {
												if (scene === "anim3") {
													patchEvo3({
														seekStage: i,
														seekGen: evo3.seekGen + 1,
													});
												} else if (scene === "anim2") {
													patchEvo2({
														seekStage: i,
														seekGen: evo2.seekGen + 1,
													});
												} else {
													patchEvo({ holdStage: i });
												}
											}}
											className={`font-mono text-[11px] border px-2.5 py-1.5 ${
												isSeekEvo
													? stageIndex === i
														? "border-white/40 text-white"
														: "border-white/10 text-white/50 hover:border-white/25"
													: evo.holdStage === i
														? "border-white/40 text-white"
														: "border-white/10 text-white/50 hover:border-white/25"
											}`}
										>
											{name}
										</button>
									))}
								</div>
							</section>
							)}

							<section>
								<h2 className="mb-3 font-mono text-[11px] tracking-[0.14em] text-white/40 uppercase">
									Layers
								</h2>
								<Toggle
									label="Stars / bubbles"
									checked={activeEvo.showStars}
									onChange={(showStars) => patchActive({ showStars })}
								/>
								<Toggle
									label="Rocket exhaust"
									checked={activeEvo.showExhaust}
									onChange={(showExhaust) => patchActive({ showExhaust })}
								/>
								<Toggle
									label="Stage label"
									checked={activeEvo.showLabels}
									onChange={(showLabels) => patchActive({ showLabels })}
								/>
							</section>

							<section>
								<h2 className="mb-3 font-mono text-[11px] tracking-[0.14em] text-white/40 uppercase">
									Color presets
								</h2>
								<div className="grid grid-cols-2 gap-2">
									{PRESETS.map((p) => (
										<button
											key={p.label}
											type="button"
											onClick={() =>
												patchActive({
													colorBright: p.bright,
													colorDim: p.ghost,
													colorStar: p.star,
													colorExhaust: p.exhaust ?? ASCII_EVOLUTION_DEFAULTS.colorExhaust,
												})
											}
											className="border border-white/[0.1] px-3 py-2.5 text-left font-mono text-[12px] text-white/70 transition-colors hover:border-white/30 hover:text-white"
										>
											<span
												className="mb-1.5 block h-2 w-full"
												style={{ background: p.bright }}
											/>
											{p.label}
										</button>
									))}
								</div>
								<button
									type="button"
									onClick={() => {
										if (scene === "current") {
											setNameLoop({
												...ASCII_NAME_LOOP_DEFAULTS,
												figureScale: 0.36,
												showLabels: true,
												beat: "current",
												rocketStyle: nameLoop.rocketStyle,
											});
										} else if (scene === "anim3") {
											setEvo3({
												...ASCII_EVOLUTION_3_DEFAULTS,
												figureScale: 0.36,
												showLabels: true,
											});
										} else if (scene === "anim2") {
											setEvo2({
												...ASCII_EVOLUTION_2_DEFAULTS,
												figureScale: 0.36,
												showLabels: true,
											});
										} else {
											setEvo({
												...ASCII_EVOLUTION_DEFAULTS,
												figureScale: 0.38,
												showLabels: true,
											});
										}
									}}
									className="mt-3 w-full border border-white/[0.12] py-2 font-mono text-[12px] text-white/60 transition-colors hover:border-white/30 hover:text-white"
								>
									Reset defaults
								</button>
							</section>
						</>
					) : (
						<>
							<section>
								<p className="text-[13px] leading-relaxed text-white/45">
									Original Da Vinci figure — still editable here.
								</p>
							</section>
							<section>
								<h2 className="mb-3 font-mono text-[11px] tracking-[0.14em] text-white/40 uppercase">
									Motion
								</h2>
								<div className="flex flex-col gap-4">
									<Slider
										label="Speed"
										value={vit.speed}
										min={0}
										max={3}
										step={0.05}
										onChange={(speed) => patchVit({ speed })}
									/>
									<Slider
										label="Figure scale"
										value={vit.figureScale}
										min={0.18}
										max={0.55}
										step={0.01}
										onChange={(figureScale) => patchVit({ figureScale })}
									/>
									<Slider
										label="Density"
										value={vit.density}
										min={0.6}
										max={1.8}
										step={0.05}
										onChange={(density) => patchVit({ density })}
									/>
								</div>
							</section>
							<section>
								<h2 className="mb-3 font-mono text-[11px] tracking-[0.14em] text-white/40 uppercase">
									Layers
								</h2>
								<Toggle
									label="Stars"
									checked={vit.showStars}
									onChange={(showStars) => patchVit({ showStars })}
								/>
								<Toggle
									label="Ghost limbs / frames"
									checked={vit.showGhost}
									onChange={(showGhost) => patchVit({ showGhost })}
								/>
								<Toggle
									label="Scanline shimmer"
									checked={vit.showScanline}
									onChange={(showScanline) => patchVit({ showScanline })}
								/>
							</section>
							<section>
								<h2 className="mb-3 font-mono text-[11px] tracking-[0.14em] text-white/40 uppercase">
									Color presets
								</h2>
								<div className="grid grid-cols-2 gap-2">
									{PRESETS.map((p) => (
										<button
											key={p.label}
											type="button"
											onClick={() =>
												patchVit({
													colorBright: p.bright,
													colorGhost: p.ghost,
													colorStar: p.star,
												})
											}
											className="border border-white/[0.1] px-3 py-2.5 text-left font-mono text-[12px] text-white/70 transition-colors hover:border-white/30 hover:text-white"
										>
											<span
												className="mb-1.5 block h-2 w-full"
												style={{ background: p.bright }}
											/>
											{p.label}
										</button>
									))}
								</div>
							</section>
						</>
					)}
				</aside>
			</div>

			<style>{`
				.lab-range {
					width: 100%;
					accent-color: #fff;
					height: 0.35rem;
				}
			`}</style>
		</div>
	);
}
