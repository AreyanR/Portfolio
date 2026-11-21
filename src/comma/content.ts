// Text on this page is Areyan's, copied from comma-lab/writeup/WRITEUP.md (and the old
// study text in WRITEUP_PLAN.md's appendix). Do not rewrite it here; edit the source and copy.
// Inline markup: **bold**, *italic*, `code`.

export type Upgrade = {
	id: string;
	label: string;
	short: string;
	score: number;
	approx?: boolean;
	title: string;
	/** The headline: what this step taught, as a claim. */
	claim: string;
	body: string[];
	tree: string;
	quote?: string;
	extra?: "pose" | "clean";
};

export const INTRO = [
	"My archive stores the information SegNet and PoseNet use to evaluate the video. I first run both judges on the original frames, producing a SegNet map of the second frame and six PoseNet motion values for each of the 600 frame pairs. A compact model reconstructs both frames from that map and those motion values. I train it until SegNet and PoseNet produce nearly the same outputs on the reconstructed frames as they do on the original video. The {size:44 KB} model ships inside the archive and reconstructs all 1,200 frames on comma's machine.",
	"The approach builds on earlier entries, particularly [PR #55 (Quantizr)](#pr-55), which introduced storing the judges' outputs and reconstructing frames with a small model. I rebuilt the model, training pipeline and archive packing from scratch, then added [a map coder network (3.5)](#u5), [a rule for cleaning the maps (3.6)](#u7) and [5-bit weights (3.7)](#u8).",
	"The final codec is {size:179,609 B}, **209× smaller** than the original video, with a score of {score:0.1682}.",
];

export const INTRO_NOTE =
	"Scored with comma's evaluator on my CPU. In the November 13 leaderboard snapshot that sits between 0.166 and 0.172, about 11th place.";

export const HOOK = "The archive does not store the video. It stores a map, six motion values, and a small model that draws what SegNet and PoseNet expect.";

export const INITIAL = {
	p1: "The figure below walks through the codec step by step, from the original video to comma's score.",
	video: "comma's video is one minute of dashcam footage, 1,200 frames at 20 per second, split into 600 pairs of consecutive frames.",
	input: "Each pair is two frames, 50 ms apart. The rest of the walkthrough follows pair 300.",
	targets:
		"SegNet and PoseNet run once on the original video. For each pair they give a 384 × 512 class map of frame 2 and six motion values, which the model trains against and the archive stores.",
	training:
		"Training happens in two stages. First, the entire model trains for 600 epochs to draw frames that reproduce the stored SegNet map. Pixels SegNet misclassifies receive 10 times more weight, focusing training on the remaining errors.\n\nThe second stage trains only the 11,235 weights that draw frame 1, for 500 epochs, minimizing the log of the squared error between PoseNet's motion on the drawn pair and its motion on the original video. Freezing the rest of the model keeps frame 2 exactly as the SegNet stage drew it. After training, the 600 maps, the 600 sets of motion values and the model's weights are packed into archive.zip.",
	demo: "**Demo run, pair 300.** The input frames:",
	keeps: "The archive keeps SegNet's map of frame 2 and PoseNet's six motion values.",
	inflation:
		"On comma's machine, the decoder unpacks the archive, has the model draw every pair at 384 × 512 from its map and motion values, then scales both frames up to 874 × 1164 and writes the 1,200-frame video.",
	compared:
		"comma runs SegNet and PoseNet on the inflated video and compares their outputs with those on the original. How far they drift, plus the archive's size, is the score.",
	packed: "The first complete codec used bz2 for the maps and 16-bit model weights. It scored **0.4537**.",
	tree: `score 0.4537
├── seg    0.0616
├── pose   0.0849
└── size   0.3072
    ├── maps      339 KB   bz2
    ├── weights   119 KB   16-bit
    └── motions   3.6 KB   1 byte per value`,
	cleanRun:
		"My first complete codec used the pipeline from section 2, with shorter training and the simplest packing scheme I could implement. The maps were compressed with bz2, the model weights were stored as 16-bit values, and each motion value occupied one byte.",
	after:
		"Archive size contributed two-thirds of the {score:0.4537} score, with the maps alone occupying {size:339 KB}. I targeted the maps first. The upgrades below appear in the order I implemented them, with each score measured against the version immediately before it.",
};

// The old "store what the judges see" section (WRITEUP_PLAN.md appendix, Part 1).
export const TRICK = {
	line: "Store what the judges see, not the video.",
	judges:
		"comma's compression challenge is to compress one minute of dashcam video, 1,200 frames and 37.5 MB, into an archive. comma then inflates the archive back into video and runs two judges, SegNet and PoseNet, on both versions. The score combines how far their outputs drift from the original with the archive size. A lower score means a smaller archive that the judges read almost the same as the original.",
	segnet:
		"{seg:SegNet} labels every frame 2 pixel as road, lane line, sky, car or hood, where \"sky\" stands for everything undrivable, including buildings and trees.",
	posenet: "{pose:PoseNet} estimates how the camera moved between the two frames.",
	size: "{size:Size} is how many bytes the archive takes.",
	pair300:
		"Here's what the judges say about pair 300. Left to right are the real frame, SegNet's map of it, and PoseNet's 6 motion values.",
};

export const UPGRADES: Upgrade[] = [
	{
		id: "u1",
		label: "1",
		short: "map coder",
		score: 0.3836,
		title: "Upgrade 1: replace bz2 with a context coder",
		claim: "A map is mostly predictable",
		body: [
			"Predicting each pixel from the ones around it cut the maps from {size:339 KB} to {size:233 KB}. A segmentation map is highly repetitive. 98.9% of pixels match the one above, and 98.8% match the same spot in the previous map. bz2 sees the maps as a flat stream of bytes and cannot use either pattern.",
			"I replaced bz2 with a context coder based on the approach used in PRs [#81 (erichasinternet)](#pr-81), [#84 (ottokunkel)](#pr-84), [#86 (jas0xf)](#pr-86) and [#91 (ottokunkel)](#pr-91). It codes each map one diagonal at a time. This lets every pixel on the same diagonal be decoded in parallel, because the neighbors it needs are already known.",
			"Each pixel uses four classes as context, the pixels to its left, upper left and above, plus the pixel at the same spot in the previous map. Five possible classes across four positions produce 625 contexts. For each context, the coder counts which classes have followed it and uses those counts to predict the pixel.",
			"For 97.9% of pixels, all four context values agree, and the pixel almost always matches them. A range coder turns a probability p into about −log₂ p bits. A predictable pixel therefore costs about 0.001 bits, while a surprise costs about 12 bits.",
			"The decoder rebuilds the same counts in the same order, so every map comes back exactly. About 94% of the remaining bits go toward pixels on class edges or in places where the pattern breaks. The score fell from {score:0.4537} to {score:0.3836}.",
		],
		tree: `after upgrade 1
├── score   0.4537 → 0.3836
└── maps    339 KB → 233 KB`,
	},
	{
		id: "u2",
		label: "2",
		short: "8-bit weights",
		score: 0.6353,
		title: "Upgrade 2: cut the weights to 8 bits",
		claim: "PoseNet breaks long before SegNet does",
		body: [
			"Cutting the weights to 8 bits saved {size:62 KB} but made the pose part 4.5 times worse.",
			"After the map coder, the {size:119 KB} model was the next biggest part of the archive. I stored one scale per tensor and rounded every weight to a whole number from −127 to 127, which reduced the model to {size:57 KB}. Rounding moves each weight by at most half a step, so the frames the model reconstructs change only slightly. PoseNet reads motion from small differences between frame 1 and frame 2, and even changes that small are enough to shift its output.",
			"The size part fell by {size:0.041}, but the pose part jumped from {pose:0.0849} to {pose:0.3783}, taking the score from {score:0.3836} to {score:0.6353}.",
		],
		tree: `after upgrade 2
├── score     0.3836 → 0.6353
├── weights   119 KB → 57 KB
└── pose      0.085 → 0.378`,
	},
	{
		id: "u3",
		label: "3",
		short: "pose correction",
		score: 0.3316,
		title: "Upgrade 3: add pose correction",
		claim: "Frame 1 belongs to PoseNet alone",
		body: [
			"The damage was limited to PoseNet, so the correction only needed to change frame 1, which SegNet does not evaluate. [PR #130 (fesalfayed)](#pr-130) used this approach by adding a faint pattern to frame 1.",
			"I extended that idea into a correction fitted to each frame pair. The correction uses four shared 12 × 16 patterns and four coefficients per pair that control how much of each pattern is added. For each pair, the combined pattern is scaled to the full frame and added to frame 1. The shared patterns and coefficients are trained together through PoseNet to reproduce the motion measured on the original frames. I then refit the correction with the patterns and coefficients rounded to the same 8-bit values stored in the archive. The complete correction took {size:4.7 KB} at this stage.",
			"My first correction was fitted to the full-precision model, but it stopped working after the model was reduced to 8-bit weights. I fitted it using the model reconstructed from the packed bytes, which is the exact version used during inflation. Across all 600 pairs, this reduced the pose part from {pose:0.3783} to {pose:0.0715} and the overall score from {score:0.6353} to {score:0.3316}.",
		],
		quote: "Tune the thing that ships.",
		tree: `after upgrade 3
├── score   0.6353 → 0.3316
└── pose    0.378 → 0.0715`,
		extra: "pose",
	},
	{
		id: "u4",
		label: "4",
		short: "more context",
		score: 0.3076,
		title: "Upgrade 4: give the map coder more context",
		claim: "Four more pieces of context cut the maps by 36 KB",
		body: [
			"Adding four more context values cut the maps by {size:36 KB}, from {size:233 KB} to {size:197 KB}.",
			"The coder from 3.1 used three neighboring pixels from the current map and one pixel from the previous map. I added four more context values:\n- the pixels immediately to the right and below the same position in the previous map, which help account for movement between frames\n- the pixel at the same position two maps back, which catches pixels that alternate between two classes\n- the eighth of the frame containing the current row, since the sky is usually near the top and the hood is near the bottom",
			"These additions increase the number of possible contexts to 625 × 5 × 5 × 5 × 8 = 625,000. Most of those contexts appear too rarely to produce a reliable prediction. Until a context has enough examples, the coder falls back toward the four-neighbor estimate from 3.1.",
			"The maps still decode exactly, so the drawn frames are unchanged and the whole gain is in size. The score fell from {score:0.3316} to {score:0.3076}.",
		],
		tree: `score 0.3076
├── seg    0.0609
├── pose   0.0715
└── size   0.1752
    ├── maps         197 KB   ↓ from 233 KB
    ├── weights       57 KB
    ├── correction   4.7 KB
    └── motions      3.6 KB`,
	},
	{
		id: "u5",
		label: "5",
		short: "map coder network",
		score: 0.2107,
		title: "Upgrade 5: replace the hand-written predictor with a neural one",
		claim: "A map coder network beats hand-picked context",
		body: [
			"A small map coder network predicted the maps better than any context I designed by hand. The encoded maps and the network together took {size:129.7 KB}, down from {size:197 KB}. The network itself accounted for {size:12.2 KB}.",
			"In 3.1 and 3.4, I chose which neighboring pixels formed each context. Here the network learns which information is useful. For each pixel, it reads 30 already decoded neighbors and the previous five maps, then predicts a probability for each of the five classes.",
			"The network rounds every layer's output down to a whole number and turns its outputs into probabilities with a fixed lookup table, which gives my encoder and comma's decoder identical probabilities on any machine. This is required because even one probability mismatch would cause the range decoder to misread that pixel and every pixel after it.",
			"This version also used a smaller frame model with 24 channels, 8-bit weights, and range-coded weight storage. These changes reduced the model weights from {size:57 KB} to {size:33.8 KB}. I built this version without the pose correction at first, and the smaller model produced a pose part of {pose:0.0798}.",
			"The pose correction is fitted to the exact frames produced by the model, so I fitted a new one for the smaller model. This reduced the pose part to {pose:0.0406}. Training the correction three times longer reduced it again to {pose:0.0360} without increasing the archive size.",
			"The new map coder and frame model reduced the score from {score:0.3076} to {score:0.2518}. Adding the new pose correction brought it down further to {score:0.2107}.",
		],
		tree: `after upgrade 5
├── score     0.3076 → 0.2518
├── maps      197 KB → 129.7 KB
└── weights   57 KB → 33.8 KB`,
	},
	{
		id: "u7",
		label: "6",
		short: "clean the maps",
		score: 0.2081,
		title: "Upgrade 6: clean the maps",
		claim: "SegNet only argues about edges",
		body: [
			"SegNet makes 99.7% of its mistakes along class boundaries. These are also the pixels that require the most bits to encode. Storing every boundary pixel exactly was not always worth its cost.",
			"I first tested a simple rule. If a map pixel cost more than two bits and changing it to the coder's cheaper prediction did not add a SegNet error to the reconstructed frame, I kept the change. This modified 5,240 pixels and reduced the maps from {size:117.5 KB} to {size:115.8 KB}. At the same time, the number of SegNet errors fell from 71,100 to 68,854.",
			"The errors fell because changing one map pixel also affects how the model reconstructs nearby pixels. A map change can therefore correct errors around it, and the rule rejects any change that adds an error.",
			"Changes to the reconstructed frames also affect PoseNet, so I refitted the pose correction afterward. This reduced the score from {score:0.2107} to {score:0.2081}.",
			"For the final codec, I kept the 2-bit filter and derived the test for keeping a change directly from the score formula. One incorrect SegNet pixel adds 100 / 117,964,800 to the score, while one archive bit adds 25 / (8 × 37,545,489). This means one SegNet error has the same cost as 10.18 archive bits. I kept a change only when the bits it saved were worth more than the SegNet errors it added. In the final run this rule changed 2,796 pixels and improved the score by about 0.0012.",
		],
		tree: `after upgrade 7
├── score           0.2107 → 0.2081
├── maps            129.7 KB → 127.7 KB
└── pixels changed  2,796  final run`,
		extra: "clean",
	},
	{
		id: "u8",
		label: "7",
		short: "5-bit weights",
		score: 0.2004,
		title: "Upgrade 7: cut the main model to 5-bit weights",
		claim: "Fewer bits won, even with more mistakes",
		body: [
			"SegNet's remaining mistakes were concentrated along class boundaries, and a larger frame model could draw those boundaries more sharply. A 48-channel model reduced the seg part from {seg:0.0604} to {seg:0.0239}, but its 8-bit weights added {size:74 KB} to the archive. That size increase outweighed the improvement, so I reduced the bits per weight to afford more channels.",
			"I first tried converting an already trained model from 8-bit to 5-bit weights. Its seg part jumped from {seg:0.0228} to {seg:0.1025}. So I trained the model with 5-bit rounding enabled from the beginning, allowing it to adapt to the reduced precision. Each row of weights received its own scale, restricted to powers of 2^{1/8}, and each weight was rounded to an integer from −15 to 15.",
			"This allowed the model to use 32 channels in {size:29.6 KB}, less than the {size:33.8 KB} required by the 24-channel model at 8 bits. The sharper reconstruction reduced the seg part from {seg:0.0584} to {seg:0.0443}. The layers responsible for frame 1 remained at 8 bits because reducing their precision further caused PoseNet to fail. As a result, the complete archive still grew by {size:9.8 KB}.",
			"The map-cleaning decisions depend on the exact frames produced by the model. After changing the model, I cleaned the maps again. The 5-bit model reduced the score from {score:0.2081} to {score:0.2050}, and the second cleaning reduced it further to {score:0.2004}.",
		],
		tree: `after upgrade 8
├── score             0.2081 → 0.2050 → 0.2004 after re-cleaning
├── weights           33.8 KB → 29.6 KB  32 channels at 5-bit instead of 24 at 8-bit
└── side info         4.0 KB → 17.9 KB  frame-1 head kept at 8-bit, so the archive grew 9.8 KB`,
	},
	{
		id: "u9",
		label: "8",
		short: "retrain frame 1",
		score: 0.1798,
		title: "Upgrade 8: train longer, then retrain frame 1 on the packed model",
		claim: "Epochs were the cheapest lever left",
		body: [
			"With the archive format settled, longer training was the cheapest remaining improvement, since it adds no bytes. Training the SegNet stage for 600 epochs instead of 150 reduced the seg part from {seg:0.0408} to {seg:0.0295}, and a rerun with the final code showed a similar gap, {seg:0.0435} against {seg:0.0293}. With a longer pose-correction fit, the score went from {score:0.2004} to {score:0.1807}.",
			"After that, the pose correction stopped improving. The limiting factor was frame 1 itself. Four small correction patterns can repair a frame that is already close to the target, but they cannot compensate for a frame that is far from it.",
			"I froze the rest of the model and retrained only the layers responsible for frame 1. I performed this training on the model reconstructed from the packed bytes, using the exact weights that comma loads during inflation.",
			"Before applying the pose correction, retraining frame 1 reduced the pose part from {pose:0.1951} to {pose:0.0653}. Applying the correction reduced it further to {pose:0.0310}, producing an overall score of {score:0.1798}. The unusually high starting value of 0.1951 was caused by the packing bug explained in 3.9.",
		],
		tree: `after upgrade 9
├── score             0.2004 → 0.1807 → 0.1798
├── seg part          0.0408 → 0.0295 (seg stage 150 → 600 epochs)
└── pose part         0.0401 → 0.0310`,
	},
	{
		id: "u10",
		label: "9",
		short: "rounding fix + retrain",
		score: 0.1682,
		title: "Upgrade 9: make packing match training, then retrain from scratch",
		claim: "A fix at the bottom means retraining on top",
		body: [
			"PoseNet was sensitive to a difference of just one quantization step. The frame model contains 64,358 weights, including 51,008 stored at 5 bits. In the packed model, 225 of those 5-bit weights differed by one step from the values used during training. SegNet barely changed, but PoseNet performed worse on 79% of the frame pairs. Before the correction, the packed model's pose part was {pose:0.1951}, against {pose:0.0987} for the model as trained.",
			"The mismatch came from performing the same rounding at two different precisions. Training rounded the weights with 32-bit values on the GPU, while packing repeated it with 64-bit values in NumPy. They usually agree, but training with the rounding on pushes many weights to exactly halfway between two steps, and there they split. One weight was exactly 4.5 steps in 32-bit math and rounded to 4, while 64-bit math put it at 4.50000017 and rounded it to 5. The pose correction had been compensating for the difference.",
			"I changed packing to store the exact values training chose, so the model comma loads is the model I trained. After cleaning the maps again and refitting frame 1 and the pose correction, the score fell from {score:0.1798} to {score:0.1774}, mostly from SegNet.",
			"Because this fix changed the base model, it also affected every stage trained after it. For the final code, I made training round in 64-bit exactly as packing does, then retrained the entire codec from scratch in one 10-hour run on one GPU. Retraining frame 1 reduced the pose part from {pose:0.0920} to {pose:0.0583}, against {pose:0.0653} in 3.8, and with the correction the final pose part fell from {pose:0.0310} to {pose:0.0197}. The seg part became slightly worse, from {seg:0.0269} to {seg:0.0289}, so the entire improvement came from PoseNet.",
			"The new archive was only 45 bytes larger, {size:179,609 B} against {size:179,564 B}, and retraining reduced the final score from {score:0.1774} to {score:0.1682}.",
		],
		tree: `after upgrade 9
├── score                0.1798 → 0.1775 → 0.1774
└── shipped pose error   about 4× lower`,
	},
];

// Sources (rechecked 2026-11-21): CommaAI-Learning/prototype/OVERNIGHT_REPORT.md (48-channel: Nov 8 follow-up; gray carrier: 'Things that lost'), HOW_IT_WORKS.md ("experiments that lost"), comma-lab/writeup/PIVOT_NOTES.md.
// Some come from early lab versions, so their numbers are on that version's scale.
export const DEAD_ENDS_NOTE = "I ran these tests on earlier versions of the codec while building it, so their numbers come from those versions.";

export const DEAD_ENDS: { group: string; items: string[] }[] = [
	{
		group: "Maps",
		items: [
			"Shifting the previous map using the car's estimated motion improved pixel prediction only from 98.75% to 98.78%. Warping the map with a ground-plane model improved lane-line prediction by 4% but made everything else worse, because the hood and other cars do not move with the road.",
			"A larger map coder network with 38,000 weights reduced the maps to 129 KB, but storing the network added another 30 KB.",
			"A hand-drawn sketch of the skyline, hood and road saved 4 KB in map coding but cost 3.3 KB to store.",
			"I tried changing map pixels to correct SegNet errors, but each change cost about as many bits as it saved. After 18 rounds, the score was 0.0004 worse.",
		],
	},
	{
		group: "Frame model",
		items: [
			"A 48-channel model with 4-bit weights and an 8-bit frame 1 scored {score:0.2236} against {score:0.2081} for the smaller 8-bit model. Its seg part improved only from {seg:0.0584} to {seg:0.0551}, and its extra 27 KB of weights cost more than that saved.",
			"Reconstructing frame 1 by warping frame 2 with the camera motion reduced PoseNet error by three to five times during training. However, the additional weights cost more bytes than the improvement saved.",
			"Feeding the full-resolution map directly into the model made the result worse. PoseNet reads frame 2 as well, so any change to frame 2 also moved the pose part.",
		],
	},
	{
		group: "Pose",
		items: [
			"Storing the motion values at higher precision made the pose part worse. Going from 8 bits to between 10 and 16 bits changed it from {pose:0.079} to {pose:0.112}, because the model had learned the exact 8-bit values used during training.",
			"Giving each frame pair its own unrestricted correction performed worse than four shared patterns, with a pose part of {pose:0.092}. Because the frames are rounded to whole pixel values, sharing the patterns made the correction more stable.",
			"I tested a per-pair Gauss-Newton solver similar to those used by the top entries. Without damping, it improved only 3 of 600 pairs. With damping, it reduced the pose part only from {pose:0.0439} to {pose:0.0436}.",
		],
	},
];

export const PIPELINE = `0.mkv
  |
  |-- 01 extract maps and poses
  |-- 03 train the frame model
  |-- 08 train the map coder
  |-- 09 clean and recode the maps
  |-- 07 retrain frame 1 and fit correction
  \`-- 04 pack everything
  |
  v
archive.zip
  |
  \`-- 05 inflate: render 1,200 frames`;

export const JOURNEY_TEXT =
	"Nine upgrades reduced the score from {score:0.4537} to {score:0.1682}.";

export const FINAL = {
	pipeline:
		"The pipeline produces four archive files and packs them into a {size:179,609-byte} archive, from which comma's machine reconstructs the complete 1,200-frame video.",
	model:
		"The frame model is a small U-Net with **64,358 weights**, using 32 channels at full and half resolution and 64 at quarter resolution. Depthwise separable convolutions keep the model small. Four residual blocks at quarter resolution reconstruct the scene, one more at full resolution finishes frame 2, and two additional blocks use the six motion values to produce frame 1. Most of the model uses 5-bit weights. The 11,235 weights responsible for frame 1 remain at 8 bits because lower precision causes PoseNet to fail.",
	tree: `score 0.1682
├── seg    0.0289   (was 0.0609)
├── pose   0.0197   (was 0.0715)
└── size   0.1196   (was 0.1752)
    ├── maps         127.6 KB   (was 197 KB)
    ├── weights       44.0 KB   (was 57 KB)
    ├── correction     4.2 KB
    └── motions        3.4 KB`,
	cpuNote:
		"These scores come from comma's evaluator on my CPU, and comma's own run can differ slightly, mostly in the pose part.",
	boundaryNote:
		"Across all 600 frame pairs, only **34,124 of 117,964,800 pixels** receive a different SegNet label than they do in the original video. That is **0.029%**.",
};

export const ARCHIVE_FILES = [
	{ name: "maps.bin", bytes: 127645, what: "600 range-coded maps + the int8 map coder network" },
	{ name: "weights.bin", bytes: 43985, what: "frame model, 5-bit weights with an 8-bit frame 1 head" },
	{ name: "correction.bin", bytes: 4220, what: "4 shared pose patterns + 4 amounts per pair" },
	{ name: "pose.bin", bytes: 3351, what: "600 × 6 motion targets, 1 byte each" },
	{ name: "ZIP overhead", bytes: 408, what: "zip headers and metadata" },
];

export const MISTAKES = {
	p1: "SegNet errors climb in the last stretch of the video (pairs 505–580), where traffic is busy and full of headlights. The biggest pose spikes come from cars passing close on the right (pairs 75 and 448) and a car right ahead (pair 139).",
	p2: "Pair 247 is a quiet stretch with one car far ahead. Pair 541 is in busy traffic with bright headlights and a nearby car, the hardest kind of scene for both judges.",
};

export const CREDITS = [
	["judges' outputs → small redraw model", "[PR #55 (Quantizr)](https://github.com/commaai/comma_video_compression_challenge/pull/55)"],
	["context-coded maps", "[PR #81 (erichasinternet)](https://github.com/commaai/comma_video_compression_challenge/pull/81), [PR #84 (ottokunkel)](https://github.com/commaai/comma_video_compression_challenge/pull/84), [PR #86 (jas0xf)](https://github.com/commaai/comma_video_compression_challenge/pull/86), [PR #91 (ottokunkel)](https://github.com/commaai/comma_video_compression_challenge/pull/91)"],
	["pose correction on frame 1", "[PR #130 (fesalfayed)](https://github.com/commaai/comma_video_compression_challenge/pull/130)"],
	["range coder library", "[constriction (Bamler lab)](https://github.com/bamler-lab/constriction)"],
];

// Part 3 text (WRITEUP_PLAN.md appendix); numbers updated 2026-11-17 to the final-codec study (writeup/study_final).
export const STUDY = {
	intro:
		'comma ships 64 extra drives with the challenge "to test your compression strategy on more samples". After finishing the codec, I used them to test whether my frame model, trained only on video 0, generalizes or has overfit to that one minute. I compared it, the video 0 model, with a shared model of the same design trained on drives from other trips.',
	setup:
		"To run the test, I kept the 50 drives with at least 1,200 frames, which come from 20 trips, and split them by trip, since drives from the same trip share roads, weather and lighting, and placing drives from one trip in both sets would put near-duplicates into the test set. Video 0's trip and 4 random trips were held out, leaving 38 training drives and 12 test drives. The test set contains video 0 and 11 drives from trips neither model had seen. As a baseline I trained a shared model with the same design and recipe on all 38 training drives, drawing each batch from any of them.",
	protocol:
		"On every test drive, both models get that drive's maps and motion values and a pose correction fitted to it, then the drive is scored with my copy of comma's evaluator, which matches comma's on video 0 (0.168174 against 0.168176). To keep the study fast, I cut three steps from the full pipeline.",
	cuts: [
		"[Map cleaning (3.6)](#u7) is skipped for both models.",
		"The [pose correction (3.3)](#u3) fits for 160 epochs against 5,000, for both models.",
		"The shared model trains for 360 rounds of 600 pairs on the SegNet stage and 300 on the PoseNet stage against the video 0 model's 600 and 500 epochs, and skips [retraining frame 1 on the packed model (3.8)](#u9).",
	],
	cutsNote: "Because of these cuts, the video 0 model scores {score:0.1876} on video 0 here against {score:0.1682} in the submission.",
	result:
		"On the 11 test drives other than video 0, the video 0 model averages {score:1.1498} and the shared model {score:0.4199}, and the shared model wins on every drive. Most of the gap is SegNet. Its seg part averages {seg:0.5727} against {seg:0.0991}, because on a new road it draws video 0's scenery into the frame. The correction keeps the video 0 model's pose part below 0.15 on 9 of the 11 drives, and size is nearly identical for both models ({size:0.2086} on average), since each drive's maps and motion values make up most of it.",
	cost:
		"Generalizing has a cost on the clip that is scored. On video 0 the shared model scores {score:0.2621} against the video 0 model's {score:0.1876}, 40% worse, and part of that gap comes from its shorter training. On drives neither model trained on, though, the general version scores 2.7 times lower on average. A stronger next version would pretrain across many trips, then specialize to the scored clip.",
};
