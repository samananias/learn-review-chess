export type SquarePosition = {
  readonly left: number;
  readonly top: number;
};

// Converts a chess square ("e4") to the percentage position of its top-left
// corner inside the board, honoring board orientation. Callers size the cell
// at 12.5% x 12.5% of the board.
export function squareToPosition(
  square: string,
  orientation: "white" | "black"
): SquarePosition {
  const file = square.charCodeAt(0) - 97;
  const rank = Number.parseInt(square.slice(1), 10);
  if (!Number.isInteger(file) || file < 0 || file > 7 || !Number.isInteger(rank) || rank < 1 || rank > 8) {
    return { left: 43.75, top: 43.75 };
  }
  const columnFromLeft = orientation === "white" ? file : 7 - file;
  const rowFromTop = orientation === "white" ? 8 - rank : rank - 1;
  return {
    left: (columnFromLeft / 8) * 100,
    top: (rowFromTop / 8) * 100,
  };
}
