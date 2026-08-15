import { useState } from "react";
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
import AsciiVitruvian, {
	ASCII_VITRUVIAN_DEFAULTS,
	type AsciiVitruvianConfig,
} from "@/components/ui/ascii-vitruvian";

type Scene = "anim1" | "anim2" | "vitruvian";

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
	const [scene, setScene] = useState<Scene>("anim1");
	const [stageLabel, setStageLabel] = useState("Fish school");

	const [evo, setEvo] = useState<AsciiEvolutionConfig>({
		...ASCII_EVOLUTION_DEFAULTS,
		figureScale: 0.38,
		showLabels: true,
	});
	const [evo2, setEvo2] = useState<AsciiEvolution2Config>({
		...ASCII_EVOLUTION_2_DEFAULTS,
		figureScale: 0.36,
		showLabels: true,
	});
	const [vit, setVit] = useState<AsciiVitruvianConfig>({
		...ASCII_VITRUVIAN_DEFAULTS,
	});

	const patchEvo = (partial: Partial<AsciiEvolutionConfig>) =>
		setEvo((c) => ({ ...c, ...partial }));
	const patchEvo2 = (partial: Partial<AsciiEvolution2Config>) =>
		setEvo2((c) => ({ ...c, ...partial }));
	const patchVit = (partial: Partial<AsciiVitruvianConfig>) =>
		setVit((c) => ({ ...c, ...partial }));

	const isEvo = scene === "anim1" || scene === "anim2";
	const activeEvo = scene === "anim2" ? evo2 : evo;
	const patchActive = scene === "anim2" ? patchEvo2 : patchEvo;
	const stageNames =
		scene === "anim2" ? [...EVOLUTION_2_STAGE_NAMES] : EVOLUTION_STAGE_NAMES;

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
				<div className="flex gap-2">
					{(
						[
							["anim1", "Anim 1"],
							["anim2", "Anim 2"],
							["vitruvian", "Vitruvian"],
						] as const
					).map(([id, label]) => (
						<button
							key={id}
							type="button"
							onClick={() => {
								setScene(id);
								setStageLabel(
									id === "anim2"
										? "Fish school"
										: id === "anim1"
											? "Whale"
											: "Vitruvian",
								);
							}}
							className={`font-mono text-[12px] tracking-[0.08em] uppercase border px-3 py-1.5 transition-colors ${
								scene === id
									? "border-white/40 text-white"
									: "border-white/10 text-white/45 hover:border-white/25 hover:text-white/80"
							}`}
						>
							{label}
						</button>
					))}
				</div>
			</header>

			<div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
				<div className="relative min-h-[70vh] overflow-hidden border-b border-white/[0.08] bg-[#000000] lg:min-h-[calc(100vh-5.5rem)] lg:border-r lg:border-b-0">
					{scene === "anim1" ? (
						<div className="absolute inset-0">
							<AsciiEvolution
								className="h-full w-full"
								config={evo}
								onStageChange={(name) => setStageLabel(name)}
							/>
						</div>
					) : scene === "anim2" ? (
						<div className="absolute inset-0">
							<AsciiEvolution2
								className="h-full w-full"
								config={evo2}
								onStageChange={(name) => setStageLabel(name)}
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
									Now · {scene === "anim2" ? "Animation 2" : "Animation 1"}
								</p>
								<p className="mt-1 text-lg font-semibold tracking-[-0.02em]">
									{stageLabel}
								</p>
								<p className="mt-2 text-[13px] leading-relaxed text-white/45">
									{scene === "anim2"
										? "Fish school underwater → one fish becomes monkey → monkey school → human → rocket → name."
										: "Whale → Monkey V2 → Human → rocket NE. Lizard/Monkey/Running holdable."}
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

							<section>
								<h2 className="mb-3 font-mono text-[11px] tracking-[0.14em] text-white/40 uppercase">
									Hold stage
								</h2>
								<div className="flex flex-wrap gap-2">
									<button
										type="button"
										onClick={() => patchActive({ holdStage: -1 })}
										className={`font-mono text-[11px] border px-2.5 py-1.5 ${
											activeEvo.holdStage < 0
												? "border-white/40 text-white"
												: "border-white/10 text-white/50 hover:border-white/25"
										}`}
									>
										Play all
									</button>
									{stageNames.map((name, i) => (
										<button
											key={name}
											type="button"
											onClick={() => patchActive({ holdStage: i })}
											className={`font-mono text-[11px] border px-2.5 py-1.5 ${
												activeEvo.holdStage === i
													? "border-white/40 text-white"
													: "border-white/10 text-white/50 hover:border-white/25"
											}`}
										>
											{name}
										</button>
									))}
								</div>
							</section>

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
										if (scene === "anim2") {
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
