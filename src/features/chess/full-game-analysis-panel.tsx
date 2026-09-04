"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { EngineAnalysisLimit, EngineScore } from "./engine";
import type { ReviewTimeline } from "./timeline";
import type { UseQuickPassAnalysis } from "./use-quick-pass-analysis";
import {
  analysisJobLabel,
  describeEvaluation,
  formatEngineLine,
  formatSignedScore,
  isCriticalPassJob,
  sideToMoveFromFen,
} from "./engine-presentation";

type FullGameAnalysisPanelProps = {
  readonly timeline: ReviewTimeline;
  readonly currentPly: number;
  readonly limit: EngineAnalysisLimit;
  readonly multiPv?: number;
  readonly analysisState: UseQuickPassAnalysis;
  readonly controlsHost?: HTMLElement | null;
};

function timelineIdentity(timeline: ReviewTimeline): string {
  const steps = timeline.steps
    .map((step) => `${step.ply}:${step.fen}:${step.move?.san ?? ""}`)
    .join("|");
  return `${timeline.initialFen}#${timeline.totalPlies}#${timeline.finalFen}#${timeline.analysisEligible}#${steps}`;
}

type DisplayState = {
  readonly status: "idle" | "loading" | "ready" | "running" | "completed" | "cancelled" | "error";
  readonly error: string | null;
  readonly results: readonly QuickPassResult[];
};

const defaultDisplayState: DisplayState = {
  status: "loading",
  error: null,
  results: [],
};

type QuickPassResult = {
  readonly job: { readonly ply: number };
  readonly info: { readonly depth?: number; readonly nodes?: number; readonly timeMs?: number; readonly score?: EngineScore; readonly pv?: readonly string[] } | null;
  readonly bestMove: { readonly move: string | null; readonly ponder: string | null } | null;
  readonly candidateLines: readonly { readonly rank: number; readonly info: { readonly depth?: number; readonly score?: EngineScore; readonly nodes?: number; readonly timeMs?: number; readonly pv?: readonly string[] } }[];
};

function positionFenForPly(timeline: ReviewTimeline, ply: number): string | null {
  return timeline.steps[ply]?.fen ?? null;
}

function CurrentPlyResult({
  currentResult,
  timeline,
}: {
  readonly currentResult: QuickPassResult;
  readonly timeline: ReviewTimeline;
}) {
  const info = currentResult.info;
  const candidateLines = currentResult.candidateLines;
  const fen = positionFenForPly(timeline, currentResult.job.ply);
  const sideToMove = sideToMoveFromFen(fen);

  const evalSentence = info?.score
    ? describeEvaluation(info.score, sideToMove)
    : null;

  const rankedLines = candidateLines
    .slice()
    .sort((a, b) => a.rank - b.rank);
  const topLine = rankedLines[0] ?? null;
  const otherLines = rankedLines.slice(1);

  const suggestion =
    topLine?.info.pv && topLine.info.pv.length > 0
      ? formatEngineLine(fen, topLine.info.pv)
      : info?.pv && info.pv.length > 0
        ? formatEngineLine(fen, info.pv)
        : null;

  return (
    <div
      data-testid="current-ply-result"
      data-ply={currentResult.job.ply}
      className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300"
    >
      {evalSentence && (
        <p
          data-testid="eval-sentence"
          className="font-medium text-black dark:text-zinc-50"
        >
          {evalSentence}
        </p>
      )}

      {suggestion && (
        <p>
          <span className="font-medium">Engine suggests:</span> {suggestion}
        </p>
      )}

      {otherLines.length > 0 && (
        <div className="space-y-1">
          <span className="font-medium">Also considered:</span>
          {otherLines.map((line) => (
            <div key={line.rank} data-testid="candidate-line" className="ml-2">
              <span className="font-medium">{line.rank}.</span>
              {line.info.score && (
                <span>
                  {" "}
                  {formatSignedScore(line.info.score, sideToMove) ?? ""}
                </span>
              )}
              {line.info.pv && line.info.pv.length > 0 && (
                <span>
                  {" "}
                  — {formatEngineLine(fen, line.info.pv) ?? line.info.pv.join(" ")}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {info &&
        (info.depth !== undefined ||
          info.nodes !== undefined ||
          info.timeMs !== undefined) && (
          <details data-testid="engine-details" className="text-zinc-600 dark:text-zinc-400">
            <summary className="cursor-pointer select-none text-sm">Engine details</summary>
            <div className="ml-2 mt-1 space-y-0.5">
              {info.depth !== undefined && <div>Search depth: {info.depth}</div>}
              {info.nodes !== undefined && (
                <div>Positions considered: {info.nodes.toLocaleString()}</div>
              )}
              {info.timeMs !== undefined && <div>Think time: {info.timeMs}ms</div>}
            </div>
          </details>
        )}
    </div>
  );
}

function FullGameAnalysisPanelEligible({
  timeline,
  currentPly,
  limit,
  multiPv,
  analysisState,
  controlsHost,
}: {
  readonly timeline: ReviewTimeline;
  readonly currentPly: number;
  readonly limit: EngineAnalysisLimit;
  readonly multiPv: number;
  readonly analysisState: UseQuickPassAnalysis;
  readonly controlsHost?: HTMLElement | null;
}) {
  const {
    status,
    error,
    totalJobs,
    completedJobs,
    currentJobId,
    results,
    start,
    cancel,
  } = analysisState;

  const startedTimelineRef = useRef<string | null>(null);
  const [displayState, setDisplayState] = useState<DisplayState>(defaultDisplayState);

  const timelineId = timelineIdentity(timeline);

  useEffect(() => {
    if (startedTimelineRef.current === timelineId) {
      setDisplayState({ status, error, results });
    } else {
      const effectiveStatus =
        status === "running" ||
        status === "completed" ||
        status === "cancelled"
          ? "ready"
          : status;
      setDisplayState((prev) => ({
        status: effectiveStatus,
        error: status === "error" ? error : prev.error,
        results: [],
      }));
    }
  }, [status, error, results, timelineId]);

  useEffect(() => {
    if (startedTimelineRef.current === null) return;
    if (startedTimelineRef.current !== timelineId) {
      if (status === "running") {
        cancel();
      }
      startedTimelineRef.current = null;
    }
  }, [timelineId, status, cancel]);

  const handleStart = useCallback(() => {
    const accepted = start(timeline, limit, multiPv);
    if (accepted) {
      startedTimelineRef.current = timelineId;
      setDisplayState({ status: "loading", error: null, results: [] });
    }
  }, [start, timeline, limit, multiPv, timelineId]);

  const handleCancel = useCallback(() => {
    cancel();
  }, [cancel]);

  const isRunning = displayState.status === "running";
  const canStart = !isRunning && displayState.status !== "loading";

  const analysisControls = (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={handleStart}
        disabled={!canStart}
        aria-busy={!canStart}
        className="rounded-md border border-black/[.12] px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[.2] dark:text-zinc-50 dark:hover:bg-white/[.08]"
      >
        Analyze full game
      </button>

      {isRunning && (
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-md border border-black/[.12] px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:text-zinc-50 dark:hover:bg-white/[.08]"
        >
          Cancel
        </button>
      )}
    </div>
  );

  const currentResult = displayState.results.find(
    (result) => result.job.ply === currentPly
  );

  const jobLabel = analysisJobLabel(displayState.status === "running" ? currentJobId : null, timeline);
  const jobVerb = isCriticalPassJob(currentJobId) ? "Re-checking" : "Analyzing";
  const progressText = isRunning
    ? jobLabel
      ? `${jobVerb} ${jobLabel} (${completedJobs}/${totalJobs})`
      : `${jobVerb} (${completedJobs}/${totalJobs})`
    : displayState.status === "completed"
      ? "Analysis complete."
      : displayState.status === "cancelled"
        ? "Analysis cancelled."
        : displayState.status === "error"
          ? displayState.error ?? "Analysis error."
          : displayState.status === "loading"
            ? "Loading engine..."
            : "Ready to analyze.";

  const progressPercent =
    totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

  return (
    <section aria-label="Full-game analysis" className="mt-4 space-y-3">
      {isRunning && totalJobs > 0 && (
        <div
          role="progressbar"
          aria-label="Full-game analysis progress"
          aria-valuenow={completedJobs}
          aria-valuemin={0}
          aria-valuemax={totalJobs}
          className="h-2 w-full overflow-hidden rounded-full bg-black/[.06] dark:bg-white/[.08]"
        >
          <div
            className="h-full bg-black dark:bg-zinc-50"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
      <div role="status" aria-live="polite" className="text-sm text-zinc-600 dark:text-zinc-400">
        {progressText}
      </div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        Analysis runs locally in your browser — your game never leaves this device.
      </p>

      {controlsHost ? createPortal(analysisControls, controlsHost) : analysisControls}

      {currentResult && (
        <CurrentPlyResult currentResult={currentResult} timeline={timeline} />
      )}

      {!currentResult && displayState.status !== "loading" && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This position has not been analyzed yet. Run the full-game analysis to
          see its evaluation.
        </p>
      )}
    </section>
  );
}

export default function FullGameAnalysisPanel({
  timeline,
  currentPly,
  limit,
  multiPv = 3,
  analysisState,
  controlsHost,
}: FullGameAnalysisPanelProps) {
  if (!timeline.analysisEligible) {
    return (
      <p
        role="status"
        aria-live="polite"
        className="mt-4 text-sm text-zinc-600 dark:text-zinc-400"
      >
        Full-game analysis is available only for completed games.
      </p>
    );
  }

  return (
    <FullGameAnalysisPanelEligible
      timeline={timeline}
      currentPly={currentPly}
      limit={limit}
      multiPv={multiPv}
      analysisState={analysisState}
      controlsHost={controlsHost}
    />
  );
}
