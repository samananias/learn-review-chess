import { describe, expect, it } from "vitest";
import {
  branchMoveSan,
  classifyCustomMove,
  formatGraphPointScore,
} from "@/features/chess/custom-variation";
import type { GraphPoint } from "@/features/chess/evaluation-graph-model";

function point(cp: number | null, isMate = false): GraphPoint {
  return {
    ply: 0,
    hasValue: cp !== null,
    clampedCp: cp,
    advantage: 0.5,
    isMate,
    san: null,
  };
}

describe("classifyCustomMove", () => {
  it("classifies a move matching the engine best as Best", () => {
    const verdict = classifyCustomMove({
      bestAtBranchPoint: point(320),
      customAfter: point(318),
      originalAfter: point(80),
    });
    expect(verdict?.classification).toBe("best");
    expect(verdict?.centipawnLoss).toBe(2);
  });

  it("maps centipawn loss onto the game-review policy bands", () => {
    const cases: Array<{ best: number; custom: number; expected: string }> = [
      { best: 300, custom: 295, expected: "best" },
      { best: 300, custom: 280, expected: "excellent" },
      { best: 300, custom: 240, expected: "good" },
      { best: 300, custom: 190, expected: "inaccuracy" },
      { best: 300, custom: 60, expected: "mistake" },
      { best: 300, custom: -200, expected: "blunder" },
    ];
    for (const c of cases) {
      const verdict = classifyCustomMove({
        bestAtBranchPoint: point(c.best),
        customAfter: point(c.custom),
        originalAfter: null,
      });
      expect(verdict?.classification).toBe(c.expected);
    }
  });

  it("treats a forced-mate custom move as no worse than the best line", () => {
    const verdict = classifyCustomMove({
      bestAtBranchPoint: point(1000, true),
      customAfter: point(1000, true),
      originalAfter: point(200),
    });
    expect(verdict?.classification).toBe("best");
  });

  it("compares the custom move against the original continuation", () => {
    const better = classifyCustomMove({
      bestAtBranchPoint: point(300),
      customAfter: point(120),
      originalAfter: point(80),
    });
    expect(better?.deltaCp).toBe(40);
    expect(better?.comparison).toBe("better");

    const worse = classifyCustomMove({
      bestAtBranchPoint: point(300),
      customAfter: point(-150),
      originalAfter: point(80),
    });
    expect(worse?.deltaCp).toBe(-230);
    expect(worse?.comparison).toBe("worse");

    const similar = classifyCustomMove({
      bestAtBranchPoint: point(300),
      customAfter: point(85),
      originalAfter: point(80),
    });
    expect(similar?.comparison).toBe("similar");
  });

  it("returns no comparison at the end of the game", () => {
    const verdict = classifyCustomMove({
      bestAtBranchPoint: point(300),
      customAfter: point(120),
      originalAfter: null,
    });
    expect(verdict?.deltaCp).toBeNull();
    expect(verdict?.comparison).toBeNull();
  });

  it("returns null while the custom position has no evaluation", () => {
    expect(
      classifyCustomMove({
        bestAtBranchPoint: point(300),
        customAfter: point(null),
        originalAfter: point(80),
      })
    ).toBeNull();
    expect(
      classifyCustomMove({
        bestAtBranchPoint: point(300),
        customAfter: null,
        originalAfter: point(80),
      })
    ).toBeNull();
  });
});

describe("branchMoveSan", () => {
  it("numbers branch moves with their game ply", () => {
    // Branch after game ply 40: first custom move is game ply 41 (White's 21st).
    expect(branchMoveSan(40, 1, "Qh5")).toBe("21. Qh5");
    expect(branchMoveSan(40, 2, "Kg7")).toBe("21... Kg7");
    // Branch after game ply 0: first custom move is 1. e4.
    expect(branchMoveSan(0, 1, "e4")).toBe("1. e4");
  });
});

describe("formatGraphPointScore", () => {
  it("formats signed pawns and mate markers", () => {
    expect(formatGraphPointScore(point(120))).toBe("+1.2");
    expect(formatGraphPointScore(point(-80))).toBe("-0.8");
    expect(formatGraphPointScore(point(0))).toBe("0.0");
    expect(formatGraphPointScore(point(1000, true))).toBe("#");
    expect(formatGraphPointScore(point(-1000, true))).toBe("-#");
    expect(formatGraphPointScore(null)).toBeNull();
    expect(formatGraphPointScore(point(null))).toBeNull();
  });
});
