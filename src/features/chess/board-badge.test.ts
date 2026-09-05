import { describe, expect, it } from "vitest";
import { squareToPosition } from "@/features/chess/board-badge";

describe("squareToPosition", () => {
  it("computes the top-left corner percentage from White's side", () => {
    expect(squareToPosition("a8", "white")).toEqual({ left: 0, top: 0 });
    expect(squareToPosition("e4", "white")).toEqual({ left: 50, top: 50 });
    expect(squareToPosition("h1", "white")).toEqual({ left: 87.5, top: 87.5 });
  });

  it("mirrors columns and ranks from Black's side", () => {
    expect(squareToPosition("a8", "black")).toEqual({ left: 87.5, top: 87.5 });
    expect(squareToPosition("e4", "black")).toEqual({ left: 37.5, top: 37.5 });
    expect(squareToPosition("h1", "black")).toEqual({ left: 0, top: 0 });
  });

  it("falls back to near-center for malformed squares", () => {
    expect(squareToPosition("", "white")).toEqual({ left: 43.75, top: 43.75 });
    expect(squareToPosition("z9", "white")).toEqual({ left: 43.75, top: 43.75 });
    expect(squareToPosition("e", "white")).toEqual({ left: 43.75, top: 43.75 });
  });
});
