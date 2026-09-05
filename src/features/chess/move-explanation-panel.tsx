"use client";

import type { MoveExplanation } from "./move-explanation";
import { explanationToSentences } from "./move-explanation-text";

export function MoveExplanationPanel(props: {
  readonly explanation: MoveExplanation | null;
}): React.ReactElement {
  const { explanation } = props;

  const sentences =
    explanation !== null ? explanationToSentences(explanation) : [];

  return (
    <section
      aria-label="Move explanation"
      className={
        explanation === null
          ? "rounded-md border border-black/[.12] p-4 text-black dark:border-white/[.2] dark:text-zinc-50"
          : "rounded-md border border-black/[.12] p-4 text-black space-y-3 dark:border-white/[.2] dark:text-zinc-50"
      }
    >
      {explanation === null ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Select a move to see its explanation.
        </p>
      ) : (
        <>
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
            {explanation.san}
          </h3>
          <ul className="space-y-1.5 list-disc list-inside text-sm text-zinc-700 dark:text-zinc-300">
            {sentences.map((sentence, index) => (
              <li key={index}>{sentence}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
