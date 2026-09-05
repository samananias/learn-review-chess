import type { MoveClassification } from "./move-classification";
import {
  CLASSIFICATION_COLORS,
  CLASSIFICATION_LABELS,
  BOOK_COLOR,
  BOOK_LABEL,
} from "./classification-presentation";

// Display-only verdicts beyond MoveClassification.
export type ClassificationIconName = MoveClassification | "book";

function iconColor(name: ClassificationIconName): string {
  return name === "book" ? BOOK_COLOR : CLASSIFICATION_COLORS[name];
}

function iconName(name: ClassificationIconName): string {
  return name === "book" ? BOOK_LABEL : CLASSIFICATION_LABELS[name];
}

// Glyph geometry in the 16x16 viewBox, drawn white over the verdict circle
// with a soft dark echo underneath, matching the reference icon set.
function renderGlyph(name: ClassificationIconName): React.ReactElement {
  switch (name) {
    case "brilliant":
      return (
        <>
          <GlyphShadow>
            <ExclamationBar x={4.4} />
            <ExclamationBar x={8.4} />
            <ExclamationDot x={4.4} y={10.4} />
            <ExclamationDot x={8.4} y={10.4} />
          </GlyphShadow>
          <g fill="#ffffff">
            <ExclamationBar x={4} y={2.8} />
            <ExclamationBar x={8} y={2.8} />
            <ExclamationDot x={4} y={10} />
            <ExclamationDot x={8} y={10} />
          </g>
        </>
      );
    case "great":
      return (
        <>
          <GlyphShadow>
            <ExclamationBar x={6.4} />
            <ExclamationDot x={6.4} y={10.4} />
          </GlyphShadow>
          <g fill="#ffffff">
            <ExclamationBar x={6} y={2.8} />
            <ExclamationDot x={6} y={10} />
          </g>
        </>
      );
    case "blunder":
      return (
        <>
          <GlyphShadow>
            <QuestionMark x={2.2} />
            <QuestionMark x={8.2} />
          </GlyphShadow>
          <g fill="#ffffff">
            <QuestionMark x={1.8} y={2.4} />
            <QuestionMark x={7.8} y={2.4} />
          </g>
        </>
      );
    case "inaccuracy":
      return (
        <>
          <GlyphShadow>
            <QuestionMark x={3.2} />
            <ExclamationBar x={9.2} />
            <ExclamationDot x={9.2} y={10.4} />
          </GlyphShadow>
          <g fill="#ffffff">
            <QuestionMark x={2.8} y={2.4} />
            <ExclamationBar x={8.8} y={2.8} />
            <ExclamationDot x={8.8} y={10} />
          </g>
        </>
      );
    case "mistake":
      return (
        <>
          <GlyphShadow>
            <QuestionMark x={5.2} />
          </GlyphShadow>
          <g fill="#ffffff">
            <QuestionMark x={4.8} y={2.4} />
          </g>
        </>
      );
    case "best":
      return (
        <>
          <path
            d={STAR_PATH}
            transform="translate(0.35 0.55) scale(0.84) translate(1.7 1.7)"
            fill="rgba(0,0,0,0.25)"
          />
          <path
            d={STAR_PATH}
            transform="scale(0.84) translate(1.7 1.7)"
            fill="#ffffff"
          />
        </>
      );
    case "excellent":
      return (
        <>
          <g transform="translate(0.3 0.5)">
            <ThumbGlyph fill="rgba(0,0,0,0.25)" />
          </g>
          <ThumbGlyph fill="#ffffff" />
        </>
      );
    case "good":
      return (
        <>
          <path
            d="M4.1 8.6 L6.9 11.4 L11.9 5.2"
            fill="none"
            stroke="rgba(0,0,0,0.25)"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(0.25 0.45)"
          />
          <path
            d="M4.1 8.6 L6.9 11.4 L11.9 5.2"
            fill="none"
            stroke="#ffffff"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
    case "missed-win":
      return (
        <>
          <rect x={3.7} y={6.8} width={8.6} height={2.8} rx={1.2} fill="rgba(0,0,0,0.25)" />
          <rect x={3.4} y={6.6} width={8.6} height={2.8} rx={1.2} fill="#ffffff" />
        </>
      );
    case "book":
      return (
        <>
          <g transform="translate(0.3 0.5)">
            <BookGlyph fill="rgba(0,0,0,0.25)" />
          </g>
          <BookGlyph fill="#ffffff" />
        </>
      );
    case "unclassified":
      return (
        <circle cx={8} cy={8} r={4.6} fill="none" stroke="#ffffff" strokeWidth={1.6} />
      );
    default:
      throw new Error(`Unsupported classification: ${name}`);
  }
}

function ExclamationBar({ x, y = 3.1 }: { x: number; y?: number }): React.ReactElement {
  return <rect x={x} y={y} width={2.1} height={6.6} rx={1.05} />;
}

function ExclamationDot({ x, y }: { x: number; y: number }): React.ReactElement {
  return <rect x={x} y={y} width={2.1} height={2.1} rx={1.05} />;
}

// Bold question mark drawn as a filled path (10 units tall, ~6 wide) so the
// glyph does not depend on the surrounding text font.
function QuestionMark({ x, y = 2.6 }: { x: number; y?: number }): React.ReactElement {
  return (
    <path
      d="M6.1 0.6 C8.6 0.6 10.3 2 10.3 4.1 C10.3 5.6 9.5 6.5 8.2 7.4 C7.2 8.1 6.9 8.5 6.9 9.4 L6.9 9.9 L4.8 9.9 L4.8 9.2 C4.8 7.9 5.4 7.1 6.6 6.3 C7.7 5.5 8.1 5.1 8.1 4.2 C8.1 3.2 7.3 2.5 6.1 2.5 C4.9 2.5 4.1 3.2 4 4.4 L1.8 4.4 C1.9 2.1 3.6 0.6 6.1 0.6 Z M5.9 10.7 C6.7 10.7 7.3 11.3 7.3 12.1 C7.3 12.9 6.7 13.5 5.9 13.5 C5.1 13.5 4.5 12.9 4.5 12.1 C4.5 11.3 5.1 10.7 5.9 10.7 Z"
      transform={`translate(${x} ${y})`}
    />
  );
}

const STAR_PATH =
  "M8 0.9 L10.1 5.2 L14.9 5.9 L11.45 9.3 L12.27 14.1 L8 11.85 L3.73 14.1 L4.55 9.3 L1.1 5.9 L5.9 5.2 Z";

function ThumbGlyph({ fill }: { fill: string }): React.ReactElement {
  return (
    <g transform="scale(0.6) translate(2.5 3)">
      <path
        d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.72v-2z"
        fill={fill}
      />
    </g>
  );
}

function BookGlyph({ fill }: { fill: string }): React.ReactElement {
  return (
    <g transform="scale(0.62) translate(2.6 2.8)">
      <path
        d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"
        fill={fill}
      />
    </g>
  );
}

function GlyphShadow({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <g fill="rgba(0,0,0,0.25)" transform="translate(0.4 0.55)">
      {children}
    </g>
  );
}

export type ClassificationIconProps = {
  readonly classification: ClassificationIconName;
  readonly size?: number;
  readonly className?: string;
};

export function ClassificationIcon({
  classification,
  size = 16,
  className,
}: ClassificationIconProps): React.ReactElement {
  const validSize = Number.isFinite(size) && size > 0 ? size : 16;
  const color = iconColor(classification);

  return (
    <svg
      width={validSize}
      height={validSize}
      viewBox="0 0 16 16"
      className={className}
      aria-hidden="true"
      focusable="false"
      data-classification={classification}
    >
      <title>{iconName(classification)}</title>
      <circle cx={8} cy={8} r={8} fill={color} />
      {renderGlyph(classification)}
    </svg>
  );
}
