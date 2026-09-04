import { useEffect, useRef } from "react";
import type { ReviewTimeline } from "./timeline";
import type { MoveClassification } from "./move-classification";
import { ClassificationIcon } from "./classification-icon";
import { CLASSIFICATION_LABELS } from "./classification-presentation";

export type MoveListProps = {
  readonly timeline: ReviewTimeline;
  readonly currentPly: number;
  readonly onSelectPly: (ply: number) => void;
  readonly classifications?: ReadonlyMap<number, MoveClassification>;
};

export function MoveList({
  timeline,
  currentPly,
  onSelectPly,
  classifications,
}: MoveListProps): React.ReactElement | null {
  const listRef = useRef<HTMLOListElement>(null);

  const moves: { readonly ply: number; readonly label: string; readonly isCurrent: boolean }[] = [];

  for (const step of timeline.steps) {
    if (step.move === null) {
      continue;
    }
    const moveNumber = Math.floor((step.ply - 1) / 2) + 1;
    const isWhite = step.ply % 2 === 1;
    const label = `${moveNumber}${isWhite ? "." : "..."} ${step.move.san}`;
    moves.push({
      ply: step.ply,
      label,
      isCurrent: step.ply === currentPly,
    });
  }

  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof list.scrollTo !== "function") {
      return;
    }
    const current = list.querySelector<HTMLElement>('[aria-current="true"]');
    if (!current) {
      return;
    }
    const target =
      current.offsetLeft - list.clientWidth / 2 + current.offsetWidth / 2;
    list.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [currentPly]);

  if (moves.length === 0) {
    return null;
  }

  return (
    <ol
      ref={listRef}
      data-testid="move-strip"
      className="flex gap-1 overflow-x-auto pb-1"
      aria-label="Move list"
    >
      {moves.map(({ ply, label, isCurrent }) => (
        <li key={ply} className="shrink-0">
          <button
            type="button"
            data-ply={ply}
            aria-current={isCurrent ? "true" : undefined}
            onClick={() => onSelectPly(ply)}
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-sm transition-colors ${
              isCurrent
                ? "bg-black font-medium text-white dark:bg-white dark:text-black"
                : "text-black hover:bg-black/[.06] dark:text-zinc-50 dark:hover:bg-white/[.08]"
            }`}
          >
            {label}
          {(() => {
            const classification = classifications?.get(ply);
            if (!classification) return null;
            return (
              <>
                <ClassificationIcon classification={classification} />
                <span className="sr-only">{CLASSIFICATION_LABELS[classification]}</span>
              </>
            );
          })()}
          </button>
        </li>
      ))}
    </ol>
  );
}
