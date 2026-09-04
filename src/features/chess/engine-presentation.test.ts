import { describe, expect, it } from "vitest";
import {
  analysisJobLabel,
  describeEvaluation,
  formatEngineLine,
  formatSignedScore,
  isCriticalPassJob,
  sideToMoveFromFen,
} from "@/features/chess/engine-presentation";
import type { ReviewTimeline } from "@/features/chess/timeline";

const START_WHITE = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
const AFTER_E4_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";

function cp(value: number, perspective: "side-to-move" | "white" = "side-to-move") {
  return { type: "cp" as const, value, perspective };
}

function mate(value: number, perspective: "side-to-move" | "white" = "side-to-move") {
  return { type: "mate" as const, value, perspective };
}

describe("sideToMoveFromFen", () => {
  it("reads the active side from a FEN", () => {
    expect(sideToMoveFromFen(AFTER_E4)).toBe("b");
    expect(sideToMoveFromFen(START_WHITE)).toBe("w");
  });

  it("returns null for malformed input", () => {
    expect(sideToMoveFromFen(null)).toBeNull();
    expect(sideToMoveFromFen("fen-0")).toBeNull();
    expect(sideToMoveFromFen("")).toBeNull();
  });
});

describe("describeEvaluation", () => {
  it("converts a side-to-move score into a White-perspective sentence", () => {
    // Black to move, -1.2 for Black = +1.2 for White.
    expect(describeEvaluation(cp(-120), "b")).toBe("White is slightly better (+1.2).");
    // Black to move, +2.5 for Black = -2.5 for White.
    expect(describeEvaluation(cp(250), "b")).toBe("Black has a clear advantage (-2.5).");
    // White to move, +1.2 for White.
    expect(describeEvaluation(cp(120), "w")).toBe("White is slightly better (+1.2).");
  });

  it("honors an explicit white-perspective score without conversion", () => {
    expect(describeEvaluation(cp(90, "white"), "w")).toBe(
      "White is slightly better (+0.9)."
    );
    expect(describeEvaluation(cp(-250, "white"), "w")).toBe(
      "Black has a clear advantage (-2.5)."
    );
  });

  it("names the winning side past five pawns", () => {
    expect(describeEvaluation(cp(600), "w")).toBe("White is winning (+6.0).");
    expect(describeEvaluation(cp(700), "b")).toBe("Black is winning (-7.0).");
  });

  it("calls a near-level position balanced", () => {
    expect(describeEvaluation(cp(10), "w")).toBe("The position is balanced.");
    expect(describeEvaluation(cp(-40), "b")).toBe("The position is balanced.");
    expect(describeEvaluation(cp(30), "b")).toBe("The position is balanced.");
  });

  it("describes forced mate with the winning side named", () => {
    expect(describeEvaluation(mate(3), "w")).toBe(
      "White has a forced mate in 3 moves."
    );
    expect(describeEvaluation(mate(1), "w")).toBe(
      "White has a forced mate in 1 move."
    );
    expect(describeEvaluation(mate(1), "b")).toBe(
      "Black has a forced mate in 1 move."
    );
  });

  it("returns null when the side to move is unknown", () => {
    expect(describeEvaluation(cp(30), null)).toBeNull();
  });
});

describe("formatSignedScore", () => {
  it("formats centipawn scores with an explicit sign", () => {
    expect(formatSignedScore(cp(30), "b")).toBe("-0.3");
    expect(formatSignedScore(cp(30), "w")).toBe("+0.3");
    expect(formatSignedScore(cp(0), "w")).toBe("0.0");
  });

  it("formats mate scores with a hash and sign", () => {
    expect(formatSignedScore(mate(4), "w")).toBe("#4");
    expect(formatSignedScore(mate(-4), "w")).toBe("#-4");
  });

  it("returns null without a derivable side to move", () => {
    expect(formatSignedScore(cp(30), null)).toBeNull();
  });
});

describe("formatEngineLine", () => {
  it("renders a UCI line as numbered SAN from the position", () => {
    expect(formatEngineLine(START_WHITE, ["e2e4", "e7e5", "g1f3"])).toBe(
      "1. e4 e5 2. Nf3"
    );
    expect(formatEngineLine(AFTER_E4, ["e7e5", "g1f3"])).toBe("1... e5 2. Nf3");
    expect(formatEngineLine(AFTER_E4_E5, ["g1f3", "b8c6"])).toBe(
      "2. Nf3 Nc6"
    );
  });

  it("falls back to raw UCI when a move cannot be applied", () => {
    expect(formatEngineLine(AFTER_E4, ["e2e4"])).toBe("e2e4");
    expect(formatEngineLine("not a fen", ["e2e4"])).toBe("e2e4");
  });

  it("truncates long lines and returns null for empty input", () => {
    const longLine = ["g1f3", "g8f6", "f3g1", "f6g8", "g1f3", "g8f6"];
    const rendered = formatEngineLine(START_WHITE, longLine, 4);
    expect(rendered).toBe("1. Nf3 Nf6 2. Ng1 Ng8 ...");
    expect(formatEngineLine(START_WHITE, [])).toBeNull();
  });
});

describe("analysisJobLabel", () => {
  const timeline: ReviewTimeline = {
    steps: [
      { ply: 0, fen: START_WHITE, move: null },
      { ply: 1, fen: AFTER_E4, move: { san: "e4", from: "e2", to: "e4", before: START_WHITE, after: AFTER_E4, color: "w" } },
      { ply: 2, fen: AFTER_E4_E5, move: { san: "e5", from: "e7", to: "e5", before: AFTER_E4, after: AFTER_E4_E5, color: "b" } },
    ],
    totalPlies: 2,
    initialFen: START_WHITE,
    finalFen: AFTER_E4_E5,
    analysisEligible: true,
  };

  it("labels quick-pass jobs as scoresheet moves", () => {
    expect(analysisJobLabel("quick-pass-1", timeline)).toBe("1. e4");
    expect(analysisJobLabel("quick-pass-2", timeline)).toBe("1... e5");
  });

  it("labels ply 0 as the start position and unknown ids as empty", () => {
    expect(analysisJobLabel("quick-pass-0", timeline)).toBe("the start position");
    expect(analysisJobLabel(null, timeline)).toBe("");
    expect(analysisJobLabel("quick-pass", timeline)).toBe("");
  });

  it("detects critical-pass phase jobs", () => {
    expect(isCriticalPassJob("critical-pass-7")).toBe(true);
    expect(isCriticalPassJob("quick-pass-7")).toBe(false);
    expect(isCriticalPassJob(null)).toBe(false);
  });
});
