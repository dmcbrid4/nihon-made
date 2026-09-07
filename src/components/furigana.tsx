import type { RubySegment } from "@/lib/study/types";

export type FuriganaDisplay = "always" | "hidden";

export function FuriganaText({
  segments,
  fallback,
  display = "always",
}: {
  segments?: RubySegment[];
  fallback: string;
  display?: FuriganaDisplay;
}) {
  if (!segments?.length) return <>{fallback}</>;

  return (
    <span className={`furigana-text furigana-${display}`}>
      {segments.map((segment, index) =>
        segment.reading ? (
          <ruby key={`${segment.text}-${index}`}>
            {segment.text}
            <rt>{segment.reading}</rt>
          </ruby>
        ) : (
          <span key={`${segment.text}-${index}`}>{segment.text}</span>
        ),
      )}
    </span>
  );
}
