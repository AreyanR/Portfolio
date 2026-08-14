import { useEffect, useRef } from "react";

declare global {
	interface Window {
		VANTA?: {
			BIRDS: (opts: Record<string, unknown>) => { destroy?: () => void };
		};
	}
}

function loadScript(src: string) {
	return new Promise<void>((resolve, reject) => {
		const existing = document.querySelector(
			`script[src="${src}"]`,
		) as HTMLScriptElement | null;
		if (existing) {
			if (existing.dataset.loaded === "true") resolve();
			else existing.addEventListener("load", () => resolve(), { once: true });
			return;
		}
		const s = document.createElement("script");
		s.src = src;
		s.async = true;
		s.onload = () => {
			s.dataset.loaded = "true";
			resolve();
		};
		s.onerror = () => reject(new Error(`Failed to load ${src}`));
		document.body.appendChild(s);
	});
}

/**
 * Vanta BIRDS via CDN (three r134).
 * Copied 1:1 from localhost:3000 Portfolio/src/components/HeroScene.jsx
 */
export default function BirdsBackground() {
	const elRef = useRef<HTMLDivElement>(null);
	const vantaRef = useRef<{ destroy?: () => void } | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function start() {
			try {
				await loadScript(
					"https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js",
				);
				await loadScript(
					"https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.birds.min.js",
				);
				if (cancelled || !elRef.current || !window.VANTA?.BIRDS) return;

				if (vantaRef.current?.destroy) {
					vantaRef.current.destroy();
					vantaRef.current = null;
				}

				// StrictMode / HMR can leave stray canvases — clear before init
				elRef.current.replaceChildren();

				vantaRef.current = window.VANTA.BIRDS({
					el: elRef.current,
					mouseControls: true,
					touchControls: true,
					gyroControls: false,
					minHeight: 200.0,
					minWidth: 200.0,
					scale: 1.0,
					scaleMobile: 1.0,
					backgroundColor: 0x0,
					color1: 0xffffff,
					colorMode: "variance",
					birdSize: 1.3,
					speedLimit: 7.0,
					quantity: 2.0,
				});
			} catch (err) {
				console.error("Vanta BIRDS failed to start", err);
			}
		}

		start();

		return () => {
			cancelled = true;
			if (vantaRef.current?.destroy) {
				vantaRef.current.destroy();
				vantaRef.current = null;
			}
			elRef.current?.replaceChildren();
		};
	}, []);

	return (
		<div className="hero-vanta" ref={elRef} aria-hidden="true" />
	);
}
