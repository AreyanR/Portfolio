import { useState } from "react";
import { A } from "./ui";

/** A small image tile inside a widget (the scrubber): a labelled empty tile if the file is missing. */
export function Tile({ file, alt, pixel }: { file: string; alt: string; pixel?: boolean }) {
	const [missing, setMissing] = useState(false);
	if (missing)
		return (
			<div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-dashed border-rose-400/40 bg-rose-400/[0.04] p-2 text-center font-mono text-[10px] text-rose-200/60">
				{file}
			</div>
		);
	return <img key={file} src={A(file)} alt={alt} className={pixel ? "cw-pixel" : undefined} onError={() => setMissing(true)} />;
}
