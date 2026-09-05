import type { GraphPoint } from "./evaluation-graph-model";
import { DEFAULT_CLASSIFICATION_POLICY } from "./move-classification";

export type CustomComparison = "better" | "similar" | "worse";

export type CustomMoveClassification =
  | "best"
  | "excellent"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export type CustomMoveVerdict = {
  readonly classification: CustomMoveClassification;
  readonly centipawnLoss: number;
  readonly deltaCp: number | null;
  readonly comparison: CustomComparison | null;
};

// Deltas within this band read as "similar to the original move".
export const SIMILAR_BAND_CP = 25;

function clampedWhiteCp(point: GraphPoint | null): number | null {
  if (point === null || !point.hasValue || point.clampedCp === null) {
    return null;
  }
  return point.clampedCp;
}

/**
 * Classifies a custom variation move with the same centipawn-loss policy the
 * game review uses. All inputs are White-perspective clamped graph points:
 * - bestAtBranchPoint: the engine's evaluation after its best move at the
 *   branch position (from the original game's quick-pass analysis).
 * - customAfter: the evaluation after the custom move.
 * - originalAfter: the evaluation after the move the game actually played
 *   (null at the end of the game, where there is nothing to compare against).
 */
export function classifyCustomMove(args: {
  readonly bestAtBranchPoint: GraphPoint | null;
  readonly customAfter: GraphPoint | null;
  readonly originalAfter: GraphPoint | null;
}): CustomMoveVerdict | null {
  const customCp = clampedWhiteCp(args.customAfter);
  if (customCp === null) {
    return null;
  }

  const bestCp = clampedWhiteCp(args.bestAtBranchPoint) ?? 0;
  const centipawnLoss = Math.max(0, bestCp - customCp);
  const policy = DEFAULT_CLASSIFICATION_POLICY;
  let classification: CustomMoveClassification;
  if (centipawnLoss <= policy.bestMax) {
    classification = "best";
  } else if (centipawnLoss <= policy.excellentMax) {
    classification = "excellent";
  } else if (centipawnLoss <= policy.goodMax) {
    classification = "good";
  } else if (centipawnLoss <= policy.inaccuracyMax) {
    classification = "inaccuracy";
  } else if (centipawnLoss <= policy.mistakeMax) {
    classification = "mistake";
  } else {
    classification = "blunder";
  }

  const originalCp = clampedWhiteCp(args.originalAfter);
  let deltaCp: number | null = null;
  let comparison: CustomComparison | null = null;
  if (originalCp !== null) {
    deltaCp = customCp - originalCp;
    comparison =
      deltaCp > SIMILAR_BAND_CP ? "better" : deltaCp < -SIMILAR_BAND_CP ? "worse" : "similar";
  }

  return { classification, centipawnLoss, deltaCp, comparison };
}

// Branch moves keep their place in the game's numbering: the move made at
// depth k from parent ply P is game ply P + k, prefixed "+" in the UI.
export function branchMoveSan(parentPly: number, depth: number, san: string): string {
  const gamePly = parentPly + depth;
  return gamePly % 2 === 1 ? `${(gamePly + 1) / 2}. ${san}` : `${gamePly / 2}... ${san}`;
}

// Signed pawns display for a clamped White-perspective evaluation.
export function formatGraphPointScore(point: GraphPoint | null): string | null {
  if (point === null || !point.hasValue || point.clampedCp === null) {
    return null;
  }
  if (point.isMate) {
    return point.clampedCp > 0 ? "#" : "-#";
  }
  const pawns = point.clampedCp / 100;
  return `${pawns > 0 ? "+" : ""}${pawns.toFixed(1)}`;
}
