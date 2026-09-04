import type { EngineScore } from "./engine";
import { createGame, type ChessSquare } from "./game";
import type { ReviewTimeline } from "./timeline";

const CP_WINNING_THRESHOLD = 500;
const CP_CLEAR_ADVANTAGE_THRESHOLD = 200;
const CP_SLIGHT_EDGE_THRESHOLD = 80;
const MAX_LINE_PLIES = 10;

type Side = "w" | "b";

export function sideToMoveFromFen(fen: string | null | undefined): Side | null {
  if (!fen) {
    return null;
  }
  const parts = fen.trim().split(/\s+/);
  if (parts[1] === "w" || parts[1] === "b") {
    return parts[1];
  }
  return null;
}

function whitePerspectiveValue(
  score: EngineScore,
  sideToMove: Side | null
): number | null {
  if (score.perspective === "white") {
    return score.value;
  }
  if (sideToMove === null) {
    return null;
  }
  return sideToMove === "w" ? score.value : -score.value;
}

export function formatSignedScore(
  score: EngineScore,
  sideToMove: Side | null
): string | null {
  const whiteValue = whitePerspectiveValue(score, sideToMove);
  if (whiteValue === null) {
    return null;
  }
  if (score.type === "mate") {
    return whiteValue > 0 ? `#${whiteValue}` : `#-${Math.abs(whiteValue)}`;
  }
  const pawns = whiteValue / 100;
  if (pawns === 0) {
    return "0.0";
  }
  return `${pawns > 0 ? "+" : "-"}${Math.abs(pawns).toFixed(1)}`;
}

export function describeEvaluation(
  score: EngineScore,
  sideToMove: Side | null
): string | null {
  const whiteValue = whitePerspectiveValue(score, sideToMove);
  if (whiteValue === null) {
    return null;
  }

  if (score.type === "mate") {
    const moves = Math.abs(whiteValue);
    const side = whiteValue > 0 ? "White" : "Black";
    return `${side} has a forced mate in ${moves} move${moves === 1 ? "" : "s"}.`;
  }

  const absValue = Math.abs(whiteValue);
  if (absValue >= CP_WINNING_THRESHOLD) {
    return `${whiteValue > 0 ? "White" : "Black"} is winning (${formatSignedScore(score, sideToMove)}).`;
  }
  if (absValue >= CP_CLEAR_ADVANTAGE_THRESHOLD) {
    return `${whiteValue > 0 ? "White" : "Black"} has a clear advantage (${formatSignedScore(score, sideToMove)}).`;
  }
  if (absValue >= CP_SLIGHT_EDGE_THRESHOLD) {
    return `${whiteValue > 0 ? "White" : "Black"} is slightly better (${formatSignedScore(score, sideToMove)}).`;
  }
  return "The position is balanced.";
}

// Renders a UCI principal variation as a numbered SAN line ("1. e4 e5 2. Nf3").
// Falls back to the raw UCI moves when the position or any move cannot be applied.
export function formatEngineLine(
  fen: string | null | undefined,
  pv: readonly string[],
  maxPlies: number = MAX_LINE_PLIES
): string | null {
  if (!fen || pv.length === 0) {
    return null;
  }
  const raw = pv.join(" ");

  const parts = fen.trim().split(/\s+/);
  let side: Side = parts[1] === "b" ? "b" : "w";
  let moveNo = Number.parseInt(parts[5] ?? "1", 10);
  if (!Number.isFinite(moveNo) || moveNo < 1) {
    moveNo = 1;
  }

  try {
    const game = createGame(fen);
    const rendered: string[] = [];
    for (const uci of pv.slice(0, maxPlies)) {
      if (!/^[a-h][1-8][a-h][1-8]([qrbn])?$/.test(uci)) {
        return raw;
      }
      const result = game.move({
        from: uci.slice(0, 2) as ChessSquare,
        to: uci.slice(2, 4) as ChessSquare,
        promotion: (uci.slice(4) || undefined) as "q" | "r" | "b" | "n" | undefined,
      });
      if (!result.ok) {
        return raw;
      }
      const san = game.history().at(-1)?.san;
      if (!san) {
        return raw;
      }
      // Scoresheet convention: number White's moves; Black's move carries a
      // number only when it opens the line (e.g. "1... e5").
      if (side === "w") {
        rendered.push(`${moveNo}. ${san}`);
      } else if (rendered.length === 0) {
        rendered.push(`${moveNo}... ${san}`);
      } else {
        rendered.push(san);
      }
      if (side === "b") {
        moveNo += 1;
      }
      side = side === "w" ? "b" : "w";
    }
    if (rendered.length === 0) {
      return null;
    }
    return pv.length > maxPlies ? `${rendered.join(" ")} ...` : rendered.join(" ");
  } catch {
    return raw;
  }
}

// Extracts the ply from a job id ("quick-pass-12" / "critical-pass-3") and labels
// it the way a scoresheet does: "1. e4", "3... Nf6", or "the start position".
export function analysisJobLabel(
  jobId: string | null,
  timeline: ReviewTimeline
): string {
  const match = jobId ? /-(\d+)$/.exec(jobId) : null;
  if (!match) {
    return "";
  }
  const ply = Number.parseInt(match[1], 10);
  const san = timeline.steps[ply]?.move?.san;
  if (!san) {
    return ply === 0 ? "the start position" : `position ${ply}`;
  }
  return ply % 2 === 1 ? `${(ply + 1) / 2}. ${san}` : `${ply / 2}... ${san}`;
}

export function isCriticalPassJob(jobId: string | null): boolean {
  return typeof jobId === "string" && jobId.startsWith("critical-pass-");
}
