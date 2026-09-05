import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ClassificationIcon, type ClassificationIconName } from "@/features/chess/classification-icon";
import type { MoveClassification } from "@/features/chess/move-classification";

const CLASSIFICATIONS: MoveClassification[] = [
  "brilliant",
  "great",
  "best",
  "excellent",
  "good",
  "missed-win",
  "inaccuracy",
  "mistake",
  "blunder",
  "unclassified",
];

describe("ClassificationIcon", () => {
  it.each(CLASSIFICATIONS)(
    "renders an svg for classification %s",
    (classification) => {
      const { container } = render(
        <ClassificationIcon classification={classification} />
      );
      expect(container.querySelector("svg")).toBeTruthy();
    }
  );

  it.each(CLASSIFICATIONS)(
    "sets data-classification to %s",
    (classification) => {
      const { container } = render(
        <ClassificationIcon classification={classification} />
      );
      const svg = container.querySelector("svg");
      expect(svg?.getAttribute("data-classification")).toBe(classification);
    }
  );

  it("renders default size 16x16", () => {
    const { container } = render(
      <ClassificationIcon classification="best" />
    );
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("16");
    expect(svg?.getAttribute("height")).toBe("16");
  });

  it("renders custom size 24x24", () => {
    const { container } = render(
      <ClassificationIcon classification="best" size={24} />
    );
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("24");
    expect(svg?.getAttribute("height")).toBe("24");
  });

  it.each([0, -1, NaN, Infinity])(
    "falls back to size 16 for invalid size %s",
    (invalidSize) => {
      const { container } = render(
        <ClassificationIcon classification="best" size={invalidSize} />
      );
      const svg = container.querySelector("svg");
      expect(svg?.getAttribute("width")).toBe("16");
      expect(svg?.getAttribute("height")).toBe("16");
    }
  );

  it("applies className to root svg", () => {
    const { container } = render(
      <ClassificationIcon classification="best" className="test-class" />
    );
    const svg = container.querySelector("svg");
    expect(svg?.classList.contains("test-class")).toBe(true);
  });

  it("does not produce literal 'undefined' class when className is omitted", () => {
    const { container } = render(
      <ClassificationIcon classification="best" />
    );
    const svg = container.querySelector("svg");
    expect(svg?.hasAttribute("class")).toBe(false);
    expect(svg?.getAttribute("class")).toBeNull();
  });

  it("sets aria-hidden to true", () => {
    const { container } = render(
      <ClassificationIcon classification="best" />
    );
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("sets focusable to false", () => {
    const { container } = render(
      <ClassificationIcon classification="best" />
    );
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("focusable")).toBe("false");
  });

  it("renders a non-empty title for each classification", () => {
    for (const classification of CLASSIFICATIONS) {
      const { container } = render(
        <ClassificationIcon classification={classification} />
      );
      const title = container.querySelector("title");
      expect(title?.textContent?.length).toBeGreaterThan(0);
    }
  });

  it("renders the book icon with its own display name", () => {
    const { container } = render(<ClassificationIcon classification="book" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("data-classification")).toBe("book");
    expect(container.querySelector("title")?.textContent).toBe("Book move");
  });

  it("paints each verdict circle with the reference palette color", () => {
    const expected: Record<string, string> = {
      brilliant: "#20b28f",
      great: "#6f8fc2",
      best: "#62b448",
      excellent: "#79b25a",
      good: "#85a465",
      "missed-win": "#d1a419",
      inaccuracy: "#f3c11d",
      mistake: "#eca53f",
      blunder: "#e2433c",
      book: "#c9a26b",
    };
    for (const [classification, color] of Object.entries(expected)) {
      const { container } = render(
        <ClassificationIcon
          classification={classification as ClassificationIconName}
        />
      );
      const circle = container.querySelector("svg circle");
      expect(circle?.getAttribute("fill")).toBe(color);
    }
  });

  it("renders structurally distinct glyphs for all classifications", () => {
    const glyphs = new Set<string>();
    for (const classification of CLASSIFICATIONS) {
      const { container } = render(
        <ClassificationIcon classification={classification} />
      );
      const svg = container.querySelector("svg");
      if (!svg) {
        throw new Error(`Missing svg for ${classification}`);
      }
      const inner = svg.innerHTML;
      glyphs.add(inner);
    }
    expect(glyphs.size).toBe(CLASSIFICATIONS.length);
  });
});
