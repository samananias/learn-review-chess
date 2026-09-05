"use client";

import type { GraphPoint } from "./evaluation-graph-model";
import type { CustomMoveVerdict } from "./custom-variation";
import { formatGraphPointScore } from "./custom-variation";
import { ClassificationIcon } from "./classification-icon";

const COMPARISON_TEXT: Record<string, string> = {
  better: "Better than original",
  similar: "Similar to original",
  worse: "Worse than original",
};

const COMPARISON_MARK: Record<string, string> = {
  better: "↑",
  similar: "≈",
  worse: "↓",
};

function signedPawns(deltaCp: number): string {
  const pawns = deltaCp / 100;
  return `${pawns > 0 ? "+" : ""}${pawns.toFixed(1)}`;
}

export type CustomMovePanelProps = {
  readonly label: string;
  readonly verdict: CustomMoveVerdict | null;
  readonly customPoint: GraphPoint | null;
  readonly isAnalyzing: boolean;
  readonly original: {
    readonly label: string;
    readonly san: string;
    readonly classification: string | null;
    readonly score: string | null;
  } | null;
};

export function CustomMovePanel({
  label,
  verdict,
  customPoint,
  isAnalyzing,
  original,
}: CustomMovePanelProps): React.ReactElement {
  return (
    <section
      aria-label="Custom variation analysis"
      data-testid="custom-move-panel"
      className="rounded-md border border-black/[.12] p-4 text-black dark:border-white/[.2] dark:text-zinc-50"
    >
      <h3 className="text-sm font-semibold">Custom variation</h3>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
        Temporary branch — the uploaded game is unchanged.
      </p>

      <div className="mt-3 space-y-1 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <span data-testid="custom-move-label">{label}</span>
          {verdict !== null && (
            <>
              <ClassificationIcon classification={verdict.classification} />
              <span className="capitalize" data-testid="custom-move-classification">
                {verdict.classification}
              </span>
            </>
          )}
        </div>
        <div>
          <span className="text-zinc-600 dark:text-zinc-400">Evaluation: </span>
          <span data-testid="custom-move-eval">
            {formatGraphPointScore(customPoint) ?? (isAnalyzing ? "Analyzing…" : "–")}
          </span>
        </div>
      </div>

      {original !== null && (
        <div className="mt-3 space-y-1 border-t border-black/[.08] pt-3 text-xs text-zinc-600 dark:border-white/[.145] dark:text-zinc-400">
          <div>
            Original: <span className="font-medium text-black dark:text-zinc-50">{original.label}</span>
            {original.classification !== null && (
              <span className="capitalize"> · {original.classification}</span>
            )}
            {original.score !== null && <span> · {original.score}</span>}
          </div>
          {verdict?.comparison !== undefined && verdict?.comparison !== null && (
            <div data-testid="custom-move-comparison" className="font-medium text-black dark:text-zinc-50">
              {COMPARISON_MARK[verdict.comparison]} {signedPawns(verdict.deltaCp ?? 0)}{" "}
              {COMPARISON_TEXT[verdict.comparison]}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
