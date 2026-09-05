"use client";

import { useCallback, useMemo, useState } from "react";
import { Chessboard, type PieceDropHandlerArgs } from "react-chessboard";
import { getTimelineStep, type ReviewTimeline } from "@/features/chess/timeline";
import { useQuickPassAnalysis } from "@/features/chess/use-quick-pass-analysis";
import { ARROW_COLORS } from "@/features/chess/engine-arrows";
import { usePositionAnalysis } from "./use-position-analysis";
import { buildAnalysisCache } from "./analysis-cache";
import FullGameAnalysisPanel from "@/features/chess/full-game-analysis-panel";
import { MoveList } from "@/features/chess/move-list";
import { buildMoveAssessments } from "@/features/chess/move-assessment";
import { classifyMoves, type MoveClassification } from "@/features/chess/move-classification";
import type { EngineAnalysisLimit } from "@/features/chess/engine";
import type { QuickPassCompletedJob } from "@/features/chess/quick-pass-runner";
import { selectCriticalPositions, type CriticalPosition } from "./critical-positions";
import { buildQuickPassEvaluationSeries } from "./quick-pass-evaluation";
import { buildEvaluationGraphPoints } from "./evaluation-graph-model";
import { EvaluationBar } from "./evaluation-bar";
import { EvaluationGraph } from "./evaluation-graph";
import {
  type ExplorerStack,
  createExplorerStack,
  pushExplorerPosition,
  popExplorerPosition,
  currentExplorerFen,
} from "./explorer-position-stack";
import { ExplorerPanel } from "./explorer-panel";
import { applyExplorerMove } from "./explorer-move";
import { buildGamePerformance, type GamePerformance } from "./game-performance";
import { GamePerformanceSummary } from "./game-performance-summary";
import { buildMoveExplanations } from "./move-explanation";
import { MoveExplanationPanel } from "./move-explanation-panel";
import { lookupOpening } from "./opening-book";
import { OpeningDisplay } from "./opening-display";
import { ClassificationIcon } from "./classification-icon";
import { squareToPosition } from "./board-badge";
import {
  branchMoveSan,
  classifyCustomMove,
  formatGraphPointScore,
  type CustomMoveVerdict,
} from "./custom-variation";
import { CustomMovePanel } from "./custom-move-panel";
import { cachedAnalysisToGraphPoint } from "./position-evaluation";
import { explorerDepth } from "./explorer-position-stack";

const FULL_GAME_ANALYSIS_LIMIT: EngineAnalysisLimit = { kind: "depth", value: 10 };
const DEEP_PASS_LIMIT: EngineAnalysisLimit = { kind: "depth", value: 18 };

function isDisabled(ply: number, total: number): {
  atStart: boolean;
  atEnd: boolean;
} {
  return { atStart: ply <= 0, atEnd: ply >= total };
}

function timelineIdentity(timeline: ReviewTimeline): string {
  const steps = timeline.steps
    .map((step) => `${step.ply}:${step.fen}:${step.move?.san ?? ""}`)
    .join("|");
  return `${timeline.initialFen}#${timeline.totalPlies}#${steps}`;
}

export function buildClassificationMap(
  timeline: ReviewTimeline,
  results: readonly QuickPassCompletedJob[],
): ReadonlyMap<number, MoveClassification> {
  if (results.length === 0) {
    return new Map<number, MoveClassification>();
  }
  const assessmentResult = buildMoveAssessments(timeline, results);
  if (!assessmentResult.ok) {
    return new Map<number, MoveClassification>();
  }
  return classifyMoves(assessmentResult.assessments)
    .filter((classified) => classified.classification !== "unclassified")
    .reduce((map, classified) => {
      map.set(classified.assessment.ply, classified.classification);
      return map;
    }, new Map<number, MoveClassification>());
}

export function buildPerformance(
  timeline: ReviewTimeline,
  results: readonly QuickPassCompletedJob[],
): GamePerformance | null {
  if (results.length === 0) {
    return null;
  }
  const assessmentResult = buildMoveAssessments(timeline, results);
  if (!assessmentResult.ok) {
    return null;
  }
  return buildGamePerformance(classifyMoves(assessmentResult.assessments));
}

export default function ReviewBoard({
  timeline,
  children,
}: {
  timeline: ReviewTimeline;
  children?: React.ReactNode;
}) {
  const [ply, setPly] = useState(0);
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [explorer, setExplorer] = useState<ExplorerStack | null>(null);
  const [variations, setVariations] = useState<Record<number, ExplorerStack>>({});
  const [customVerdicts, setCustomVerdicts] = useState<Record<string, CustomMoveVerdict>>({});
  const [criticalSelection, setCriticalSelection] = useState<readonly CriticalPosition[] | null>(null);
  const [lastIdentity, setLastIdentity] = useState(() =>
    timelineIdentity(timeline)
  );
  const identity = timelineIdentity(timeline);
  if (identity !== lastIdentity) {
    setLastIdentity(identity);
    setPly(0);
    setCriticalSelection(null);
    setExplorer(null);
    setVariations({});
    setCustomVerdicts({});
  }
  const analysisState = useQuickPassAnalysis();

  const classifications = useMemo(
    () => buildClassificationMap(timeline, analysisState.results),
    [timeline, analysisState.results]
  );

  const performance = useMemo(
    () => buildPerformance(timeline, analysisState.results),
    [timeline, analysisState.results]
  );

  const classifiedMoves = useMemo(() => {
    const res = buildMoveAssessments(timeline, analysisState.results);
    return res.ok ? classifyMoves(res.assessments) : [];
  }, [timeline, analysisState.results]);

  // Plies still inside the longest matched opening-book line get the Book badge.
  const bookPlies = useMemo(() => {
    const plies = new Set<number>();
    const sans: string[] = [];
    for (let ply = 1; ply <= timeline.totalPlies; ply += 1) {
      const san = timeline.steps[ply]?.move?.san;
      if (san === undefined) {
        break;
      }
      sans.push(san);
      if (lookupOpening(sans) === null) {
        break;
      }
      plies.add(ply);
    }
    return plies;
  }, [timeline]);


  if (analysisState.status === "completed" && criticalSelection === null) {
    setCriticalSelection(selectCriticalPositions(classifiedMoves));
  }

  const graphPoints = useMemo(() => {
    const series = buildQuickPassEvaluationSeries(timeline, analysisState.results);
    if (series.ok) {
      return buildEvaluationGraphPoints(series.points, timeline);
    }
    return [];
  }, [timeline, analysisState.results]);

  const analysisCache = useMemo(
    () => buildAnalysisCache(analysisState.results),
    [analysisState.results]
  );

  const moveExplanations = useMemo(() => {
    const res = buildMoveAssessments(timeline, analysisState.results);
    return res.ok ? buildMoveExplanations(res.assessments) : [];
  }, [timeline, analysisState.results]);

  const explanation =
    moveExplanations.find((e) => e.ply === ply) ?? null;

  const currentGraphPoint = useMemo(() => {
    return graphPoints.find((point) => point.ply === ply) ?? null;
  }, [graphPoints, ply]);

  const result = getTimelineStep(timeline, ply);
  const fen = result.ok ? result.step.fen : timeline.initialFen;
  const displayedFen = explorer !== null ? currentExplorerFen(explorer) : fen;
  const positionAnalysis = usePositionAnalysis({
    fen: displayedFen,
    cache: analysisCache,
    enabled: analysisState.status !== "running" && analysisState.results.length > 0,
    ply,
  });
  const currentMove = result.ok ? result.step.move : null;

  const branchDepth = explorer !== null ? explorerDepth(explorer) : 0;
  const lastBranchMove =
    explorer !== null && branchDepth > 0
      ? explorer.visited[branchDepth - 1]
      : null;

  // Persist the verdict for each analyzed custom move so re-entering a
  // variation reuses the classification without recalculating it.
  // Classify the current custom move against the branch position's best
  // evaluation (from the original analysis) and the original continuation.
  // Verdicts are cached by position (render-phase state adjustment, same
  // pattern as criticalSelection) so re-entering a variation reuses them.
  let branchVerdict: CustomMoveVerdict | null = null;
  if (lastBranchMove !== null && positionAnalysis.point !== null) {
    const cached = customVerdicts[lastBranchMove.fen];
    if (cached !== undefined) {
      branchVerdict = cached;
    } else {
      const bestAtBranchPoint = cachedAnalysisToGraphPoint(
        analysisCache.get(explorer?.rootFen ?? "") ?? null,
        0
      );
      const originalStep = timeline.steps[(explorer?.ply ?? 0) + branchDepth];
      const originalAfter = originalStep
        ? cachedAnalysisToGraphPoint(analysisCache.get(originalStep.fen) ?? null, 0)
        : null;
      const computed = classifyCustomMove({
        bestAtBranchPoint,
        customAfter: positionAnalysis.point,
        originalAfter,
      });
      if (computed !== null) {
        branchVerdict = computed;
        setCustomVerdicts((prev) =>
          prev[lastBranchMove.fen] === computed
            ? prev
            : { ...prev, [lastBranchMove.fen]: computed }
        );
      }
    }
  }

  // The board shows exactly one classification badge for the active path:
  // inside a variation it is the current custom move's verdict; on the game
  // timeline it is the game move's verdict (or Book for unclassified book moves).
  const currentBadge = useMemo(() => {
    if (lastBranchMove !== null) {
      if (branchVerdict === null || lastBranchMove.to === undefined) {
        return null;
      }
      const position = squareToPosition(lastBranchMove.to, orientation);
      return {
        left: position.left,
        top: position.top,
        classification: branchVerdict.classification,
      };
    }
    if (ply < 1) {
      return null;
    }
    const square = timeline.steps[ply]?.move?.to;
    if (square === undefined) {
      return null;
    }
    const classification = classifications.get(ply);
    if (classification === undefined && !bookPlies.has(ply)) {
      return null;
    }
    const position = squareToPosition(square, orientation);
    return {
      left: position.left,
      top: position.top,
      classification: classification ?? ("book" as const),
    };
  }, [lastBranchMove, branchVerdict, classifications, bookPlies, timeline, ply, orientation]);

  const highlightSquares = useMemo(() => {
    if (lastBranchMove !== null && lastBranchMove.from !== undefined && lastBranchMove.to !== undefined) {
      return [lastBranchMove.from, lastBranchMove.to].map((square) => ({
        square,
        ...squareToPosition(square, orientation),
      }));
    }
    if (explorer !== null || currentMove === null) {
      return [];
    }
    return [currentMove.from, currentMove.to].map((square) => ({
      square,
      ...squareToPosition(square, orientation),
    }));
  }, [lastBranchMove, explorer, currentMove, orientation]);

  // Branch view-model for the move strip and the custom-move panel.
  const branchForStrip = useMemo(() => {
    // Prefer the full cached branch so stepping back inside a variation keeps
    // the whole branch visible with only the active depth changing.
    const parentPly = explorer !== null ? explorer.ply : ply;
    const stack = variations[parentPly] ?? explorer;
    if (stack === null) {
      return null;
    }
    const labels = stack.visited.map((visited, index) =>
      branchMoveSan(parentPly, index + 1, visited.san)
    );
    const classificationsList = stack.visited.map(
      (visited) => customVerdicts[visited.fen]?.classification ?? null
    );
    return {
      parentPly,
      labels,
      classifications: classificationsList,
      activeDepth: explorer !== null ? explorerDepth(explorer) : 0,
    };
  }, [explorer, variations, ply, customVerdicts]);

  const handleSelectBranchMove = useCallback(
    (depth: number) => {
      const parentPly = explorer !== null ? explorer.ply : ply;
      const stack = variations[parentPly] ?? explorer;
      if (stack === null) {
        return;
      }
      setPly(stack.ply);
      setExplorer({ ...stack, visited: stack.visited.slice(0, depth) });
    },
    [explorer, variations, ply]
  );

  const customPanelOriginal = useMemo(() => {
    if (explorer === null || branchDepth === 0) {
      return null;
    }
    const originalStep = timeline.steps[explorer.ply + branchDepth];
    if (originalStep?.move === undefined || originalStep.move === null) {
      return null;
    }
    const originalPoint = cachedAnalysisToGraphPoint(
      analysisCache.get(originalStep.fen) ?? null,
      0
    );
    return {
      label: branchMoveSan(explorer.ply, branchDepth, originalStep.move.san),
      san: originalStep.move.san,
      classification: classifications.get(explorer.ply + branchDepth) ?? null,
      score: formatGraphPointScore(originalPoint),
    };
  }, [explorer, branchDepth, timeline, analysisCache, classifications]);

  const movesPlayed = useMemo(() => {
    const list: string[] = [];
    for (let i = 1; i <= ply && i < timeline.steps.length; i++) {
      const step = timeline.steps[i];
      const san = step?.move?.san;
      if (typeof san === "string") {
        list.push(san);
      }
    }
    return list;
  }, [timeline.steps, ply]);

  const opening = useMemo(() => lookupOpening(movesPlayed), [movesPlayed]);

  const { atStart, atEnd } = isDisabled(ply, timeline.totalPlies);
  // Inside a variation Previous steps back through the branch, so it stays
  // enabled even at the branch's parent position.
  const previousDisabled = atStart && explorer === null;

  const handlePieceDrop = useCallback(
    (args: PieceDropHandlerArgs) => {
      const { sourceSquare, targetSquare } = args;
      if (sourceSquare === null || targetSquare === null) {
        return false;
      }
      const currentFen = explorer !== null ? currentExplorerFen(explorer) : fen;
      const result = applyExplorerMove(currentFen, {
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });
      if (!result.ok) {
        return false;
      }
      // A custom move creates (or continues) a temporary variation branch;
      // the uploaded game timeline itself is never modified.
      const branchParentPly = explorer !== null ? explorer.ply : ply;
      const nextStack = pushExplorerPosition(
        explorer ?? createExplorerStack({ ply, fen }),
        { fen: result.fen, san: result.san, from: sourceSquare, to: targetSquare }
      );
      setExplorer(nextStack);
      setVariations((prev) => ({ ...prev, [branchParentPly]: nextStack }));
      return true;
    },
    [explorer, fen, ply]
  );

  const goTo = (next: number) => {
    const step = getTimelineStep(timeline, next);
    if (step.ok) {
      setPly(next);
      // Leaving the game timeline hides the active branch but keeps its data
      // cached so the user can re-enter it from the same position.
      setExplorer(null);
    }
  };

  const handleStart = () => goTo(0);
  const handlePrevious = () => {
    // Inside a variation, Previous steps back through the branch and only
    // then returns to the game position the branch started from.
    if (explorer !== null) {
      if (explorerDepth(explorer) <= 1) {
        setExplorer(null);
        return;
      }
      setExplorer(popExplorerPosition(explorer));
      return;
    }
    goTo(ply - 1);
  };
  const handleNext = () => goTo(ply + 1);
  const handleEnd = () => goTo(timeline.totalPlies);
  const handleFlip = () =>
    setOrientation((current) => (current === "white" ? "black" : "white"));

  const handleReviewKeyDown = (event: React.KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable)
    ) {
      return;
    }
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        handlePrevious();
        break;
      case "ArrowRight":
        event.preventDefault();
        goTo(ply + 1);
        break;
      case "Home":
        event.preventDefault();
        goTo(0);
        break;
      case "End":
        event.preventDefault();
        goTo(timeline.totalPlies);
        break;
    }
  };

  const statusText = (() => {
    if (lastBranchMove !== null) {
      return `${lastBranchMove.san} (+${branchDepth})`;
    }
    if (ply === 0) {
      return "Start position";
    }
    return currentMove ? currentMove.san : "Position";
  })();

  return (
    <div className="review-layout">
      <div
        className="review-board-block flex min-w-0 flex-col gap-4"
        onKeyDown={handleReviewKeyDown}
      >
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between text-sm font-medium text-black dark:text-zinc-50"
        >
          <div>
            <span data-testid="review-ply-status">{statusText}</span>{" "}
            <span data-testid="review-ply-count">
              ({ply} / {timeline.totalPlies})
            </span>
          </div>
          <OpeningDisplay opening={opening} />
        </div>

        <MoveList
          timeline={timeline}
          currentPly={ply}
          onSelectPly={goTo}
          classifications={classifications}
          branch={
            branchForStrip === null
              ? null
              : {
                  parentPly: branchForStrip.parentPly,
                  labels: branchForStrip.labels,
                  classifications: branchForStrip.classifications,
                  activeDepth: branchForStrip.activeDepth,
                  onSelectBranchMove: handleSelectBranchMove,
                }
          }
        />

        <div
          role="group"
          aria-label="Timeline navigation"
          className="flex flex-wrap gap-2"
        >
          <button
            type="button"
            onClick={handleStart}
            disabled={atStart}
            className="rounded-md border border-black/[.12] px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[.2] dark:text-zinc-50 dark:hover:bg-white/[.08]"
          >
            Start
          </button>
          <button
            type="button"
            onClick={handlePrevious}
            disabled={previousDisabled}
            className="rounded-md border border-black/[.12] px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[.2] dark:text-zinc-50 dark:hover:bg-white/[.08]"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={atEnd}
            className="rounded-md border border-black/[.12] px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[.2] dark:text-zinc-50 dark:hover:bg-white/[.08]"
          >
            Next
          </button>
          <button
            type="button"
            onClick={handleEnd}
            disabled={atEnd}
            className="rounded-md border border-black/[.12] px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[.2] dark:text-zinc-50 dark:hover:bg-white/[.08]"
          >
            End
          </button>
          <button
            type="button"
            onClick={handleFlip}
            className="rounded-md border border-black/[.12] px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:text-zinc-50 dark:hover:bg-white/[.08]"
          >
            Flip board
          </button>
        </div>

        <div className="flex w-full max-w-2xl items-stretch gap-3">
          <div
            className="relative aspect-square w-full max-w-2xl overflow-hidden rounded-lg border border-black/[.15] dark:border-white/[.2]"
          >
            <section aria-label="Review chessboard" className="h-full w-full">
               <Chessboard
                options={{
                  id: "review",
                  position: displayedFen,
                  boardOrientation: orientation,
                  allowDragging: true,
                  onPieceDrop: handlePieceDrop,
                  arrows: [...positionAnalysis.arrows],
                  clearArrowsOnPositionChange: true,
                  animationDurationInMs: 150,
                  lightSquareStyle: { backgroundColor: "#e4e4e7" },
                  darkSquareStyle: { backgroundColor: "#71717a" },
                }}
              />
            </section>
            {(currentBadge !== null || highlightSquares.length > 0) && (
              <div
                data-testid="board-overlays"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
              >
                {highlightSquares.length > 0 && (
                  <div data-testid="current-move-highlights">
                    {highlightSquares.map(({ square, left, top }) => (
                      <span
                        key={square}
                        data-testid="current-move-highlight"
                        data-square={square}
                        className="absolute block h-[12.5%] w-[12.5%] bg-white/30"
                        style={{ left: `${left}%`, top: `${top}%` }}
                      />
                    ))}
                  </div>
                )}
                {currentBadge !== null && (
                  <span
                    data-testid="board-classification-cell"
                    data-ply={ply}
                    className="absolute block h-[12.5%] w-[12.5%]"
                    style={{ left: `${currentBadge.left}%`, top: `${currentBadge.top}%` }}
                  >
                    <span
                      data-testid="board-classification-badge"
                      data-ply={ply}
                      data-classification={currentBadge.classification}
                      className="absolute block h-[42%] w-[42%] drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]"
                      style={{ right: "4%", top: "4%" }}
                    >
                      <ClassificationIcon classification={currentBadge.classification} className="h-full w-full" />
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
          <EvaluationBar point={currentGraphPoint} orientation={orientation} />
        </div>

        {positionAnalysis.arrows.length > 0 && (
          <div
            data-testid="arrow-legend"
            aria-label="Engine suggestion legend"
            className="flex flex-wrap gap-3 text-sm font-medium text-black dark:text-zinc-50"
          >
            {positionAnalysis.arrows.slice(0, 3).map((arrow, index) => {
              const label =
                index === 0
                  ? "Best"
                  : index === 1
                    ? "2nd best"
                    : "3rd best";
              const swatchColor =
                index === 0
                  ? ARROW_COLORS.first
                  : index === 1
                    ? ARROW_COLORS.second
                    : ARROW_COLORS.third;

              return (
                <div
                  key={index}
                  data-testid="arrow-legend-item"
                  className="flex items-center gap-2"
                >
                  <span
                    aria-hidden
                    className="inline-block h-3 w-3 rounded-sm"
                    style={{ backgroundColor: swatchColor }}
                  />
                  {label}
                </div>
              );
            })}
          </div>
        )}

        <ExplorerPanel
          stack={explorer ?? createExplorerStack({ ply, fen })}
          onBack={() =>
            setExplorer((prev) =>
              prev === null ? null : popExplorerPosition(prev)
            )
          }
          onReset={() => setExplorer(null)}
        />
        {explorer !== null && branchDepth > 0 && lastBranchMove !== null && (
          <CustomMovePanel
            label={`+${branchMoveSan(explorer.ply, branchDepth, lastBranchMove.san)}`}
            verdict={branchVerdict}
            customPoint={positionAnalysis.point}
            isAnalyzing={positionAnalysis.isAnalyzing}
            original={customPanelOriginal}
          />
        )}
      </div>

      <aside
        aria-label="Review rail"
        className="review-rail rounded-lg border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-black"
      >
        <MoveExplanationPanel explanation={explanation} />
        {criticalSelection !== null && criticalSelection.length > 0 && (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                if (criticalSelection) {
                  analysisState.startCriticalPass(criticalSelection, DEEP_PASS_LIMIT, 3);
                }
              }}
              disabled={analysisState.status === "running"}
              className="rounded-md border border-black/[.12] px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[.2] dark:text-zinc-50 dark:hover:bg-white/[.08]"
            >
              Analyze critical moments
            </button>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Re-runs the engine deeper on the {criticalSelection.length} most
              decisive moments of the game to refine their evaluation.
            </p>
          </div>
        )}
        <FullGameAnalysisPanel
          timeline={timeline}
          currentPly={ply}
          limit={FULL_GAME_ANALYSIS_LIMIT}
          multiPv={3}
          analysisState={analysisState}
        />
      </aside>

      <div className="review-graph-block w-full max-w-2xl">
        <EvaluationGraph points={graphPoints} currentPly={ply} onSelectPly={goTo} />
      </div>

      <div className="review-perf-block w-full max-w-2xl">
        <GamePerformanceSummary performance={performance} />
      </div>

      <div className="review-import-block">{children}</div>
    </div>
  );
}
