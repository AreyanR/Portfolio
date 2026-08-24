import { useEffect, useState } from "react";

export default function BackToTop() {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const onScroll = () => {
			setVisible(window.scrollY > window.innerHeight * 0.55);
		};
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<button
			type="button"
			aria-label="Back to top"
			className={`back-to-top ${visible ? "is-visible" : ""}`}
			onClick={() => {
				window.scrollTo({ top: 0, behavior: "smooth" });
			}}
		>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
				<path
					d="M12 19V5M12 5l-6 6M12 5l6 6"
					stroke="currentColor"
					strokeWidth="1.8"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</button>
	);
}
