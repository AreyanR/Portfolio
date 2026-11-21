import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./comma.css";
import CommaWriteup from "./CommaWriteup.tsx";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<CommaWriteup />
	</StrictMode>,
);
