import type { GraphPoint } from "./evaluation-graph-model";

export type EvaluationBarProps = {
  readonly point: GraphPoint | null;
  readonly orientation: "white" | "black";
};

export function EvaluationBar({
  point,
  orientation,
}: EvaluationBarProps): React.ReactElement {
  const { label, fillPercentage } = (() => {
    if (!point || !point.hasValue) {
      return { label: "Evaluation unavailable", fillPercentage: 50 };
    }

    const clampedCp = point.clampedCp;
    if (clampedCp === null) {
      return { label: "Evaluation unavailable", fillPercentage: 50 };
    }

    const advantage = point.advantage;
    if (advantage === null) {
      return { label: "Evaluation unavailable", fillPercentage: 50 };
    }

    if (point.isMate) {
      const mateFor = clampedCp > 0 ? "White" : "Black";
      return {
        label: `Evaluation: forced mate for ${mateFor}`,
        fillPercentage: parseFloat((advantage * 100).toFixed(1)),
      };
    }

    if (clampedCp === 0) {
      return { label: "Evaluation: equal", fillPercentage: 50 };
    }

    const ahead = clampedCp > 0 ? "White" : "Black";
    const pawns = (Math.abs(clampedCp) / 100).toFixed(1);
    return {
      label: `Evaluation: ${ahead} ahead by ${pawns} pawns`,
      fillPercentage: parseFloat((advantage * 100).toFixed(1)),
    };
  })();

  const fillStyle: React.CSSProperties =
    orientation === "white"
      ? { height: `${fillPercentage}%`, bottom: "0" }
      : { height: `${fillPercentage}%`, top: "0" };

  const shortScore = (() => {
    if (!point || !point.hasValue || point.clampedCp === null) {
      return "–";
    }
    if (point.isMate) {
      // The graph model clamps mate scores, so no honest move count exists here.
      return point.clampedCp > 0 ? "#" : "-#";
    }
    const pawns = point.clampedCp / 100;
    return `${pawns > 0 ? "+" : ""}${pawns.toFixed(1)}`;
  })();

  return (
    <div className="flex w-7 flex-col items-stretch gap-1 self-stretch">
      <div
        data-testid="evaluation-bar"
        role="img"
        aria-label={label}
        title={label}
        className="relative w-7 flex-1 min-h-32 overflow-hidden rounded border border-black/[.15] dark:border-white/[.2] bg-black dark:bg-zinc-900"
      >
        <div
          data-testid="evaluation-bar-fill"
          className="absolute inset-x-0 bg-white dark:bg-zinc-100"
          style={fillStyle}
        />
      </div>
      <span
        aria-hidden
        data-testid="evaluation-bar-score"
        className="text-center font-mono text-xs leading-3 text-zinc-600 dark:text-zinc-400"
      >
        {shortScore}
      </span>
    </div>
  );
}
