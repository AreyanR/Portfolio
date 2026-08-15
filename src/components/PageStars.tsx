"use client";

import { useEffect, useRef } from "react";

type Star = {
	x: number;
	y: number;
	phase: number;
	speed: number;
	bright: number;
	kind: "." | "+";
};

/**
 * Fixed page starfield — strong near the hero, fades out as you scroll down.
 */
export default function PageStars() {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const view = canvasRef.current;
		if (!view) return;
		const g = view.getContext("2d", { alpha: true });
		if (!g) return;

		const reduced =
			typeof window !== "undefined" &&
			window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

		let raf = 0;
		let W = 0;
		let H = 0;
		let stars: Star[] = [];
		let scrollFade = 1;

		const hash = (n: number) => {
			const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
			return s - Math.floor(s);
		};

		const updateScrollFade = () => {
			const maxScroll = Math.max(
				1,
				document.documentElement.scrollHeight - window.innerHeight,
			);
			// Stay full near the name, then ease off — almost gone by mid/late page
			const t = Math.min(1, window.scrollY / (maxScroll * 0.55));
			scrollFade = Math.max(0.06, 1 - t * t);
		};

		const rebuild = () => {
			const dpr = Math.min(2, window.devicePixelRatio || 1);
			W = window.innerWidth;
			H = window.innerHeight;
			view.width = Math.floor(W * dpr);
			view.height = Math.floor(H * dpr);
			view.style.width = `${W}px`;
			view.style.height = `${H}px`;
			g.setTransform(dpr, 0, 0, dpr, 0, 0);

			const count = Math.floor((W * H) / 14000);
			stars = [];
			for (let i = 0; i < count; i++) {
				const h = hash(i + 1.7);
				// Bias stars toward the upper half of the viewport
				const yBias = Math.pow(hash(i * 7.9 + 2), 1.35);
				stars.push({
					x: hash(i * 3.1) * W,
					y: yBias * H,
					phase: h * Math.PI * 2,
					speed: 0.18 + hash(i * 11.3) * 0.28,
					bright: 0.22 + hash(i * 5.5) * 0.35,
					kind: hash(i * 13.1) > 0.82 ? "+" : ".",
				});
			}
			updateScrollFade();
		};

		const frame = (now: number) => {
			const t = now / 1000;
			g.clearRect(0, 0, W, H);
			if (scrollFade < 0.04) {
				if (!reduced) raf = requestAnimationFrame(frame);
				return;
			}
			g.font = '11px "IBM Plex Mono", ui-monospace, monospace';
			g.textAlign = "center";
			g.textBaseline = "middle";
			for (const s of stars) {
				const tw = reduced
					? 0.85
					: 0.78 + 0.22 * Math.sin(t * s.speed + s.phase);
				// Extra falloff for stars lower in the viewport
				const yFade = 1 - (s.y / H) * 0.55;
				const a = s.bright * tw * 0.42 * scrollFade * yFade;
				if (a < 0.05) continue;
				g.fillStyle = `rgba(255,255,255,${a})`;
				g.fillText(s.kind, s.x, s.y);
			}
			if (!reduced) raf = requestAnimationFrame(frame);
		};

		rebuild();
		if (reduced) frame(performance.now());
		else raf = requestAnimationFrame(frame);

		const onResize = () => {
			rebuild();
			if (reduced) frame(performance.now());
		};
		const onScroll = () => {
			updateScrollFade();
			if (reduced) frame(performance.now());
		};
		window.addEventListener("resize", onResize);
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("resize", onResize);
			window.removeEventListener("scroll", onScroll);
		};
	}, []);

	return (
		<canvas
			ref={canvasRef}
			aria-hidden
			className="pointer-events-none fixed inset-0 z-0"
		/>
	);
}
