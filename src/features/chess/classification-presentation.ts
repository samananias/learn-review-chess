import type { MoveClassification } from "./move-classification";

// Palette matches the reference icon set: saturated circle per verdict, white glyph.
export const CLASSIFICATION_COLORS: Record<MoveClassification, string> = {
  brilliant: "#20b28f",
  great: "#6f8fc2",
  best: "#62b448",
  excellent: "#79b25a",
  good: "#85a465",
  "missed-win": "#d1a419",
  inaccuracy: "#f3c11d",
  mistake: "#eca53f",
  blunder: "#e2433c",
  unclassified: "#64748b",
};

// Book is a display-only verdict (opening-book match), not a MoveClassification.
export const BOOK_COLOR = "#c9a26b";

export const CLASSIFICATION_LABELS: Record<MoveClassification, string> = {
  brilliant: "Brilliant move",
  great: "Great move",
  best: "Best move",
  excellent: "Excellent move",
  good: "Good move",
  "missed-win": "Missed Win",
  inaccuracy: "Inaccuracy",
  mistake: "Mistake",
  blunder: "Blunder",
  unclassified: "Unclassified",
};

export const BOOK_LABEL = "Book move";
