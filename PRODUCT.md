# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Club and amateur chess players reviewing their own completed games after playing them. They import games they just played (from Chess.com, Lichess, or PGN) and want to understand where they won or lost the game and why. No accounts, no multi-user features.

## Product Purpose

A chess game review tool that runs entirely in the browser: it imports completed games, analyzes every position with Stockfish (WASM, client-side), classifies each move objectively, explains mistakes in natural language, and lets the player explore alternative variations on the board. Success is a player finishing a review knowing what to work on next.

## Positioning

Fully private, local analysis: the engine runs client-side via Stockfish WASM and no game data leaves the device — no accounts, no upload, no server-side analysis. A competitor whose review pipeline runs on their servers cannot truthfully claim the same.

## Operating Context

- A player finishes a game on Chess.com or Lichess, then opens this app to review it. Typical session: import → run full-game analysis (depth-10 quick pass, then deeper re-analysis of critical positions) → walk the timeline, read explanations, explore variations on the StudyBoard.
- Runs as a Next.js app (Node 22, deployable to Vercel). Internal API routes proxy the Chess.com PubAPI and Lichess games endpoint so browser code never hits the public APIs directly; these are the only server-touching parts.
- Deep review is available only for completed (eligible) games; incomplete PGNs remain reviewable without engine analysis.

## Capabilities and Constraints

- Four import methods: paste PGN, Chess.com username, Lichess username, file upload (multi-game PGNs get a chooser).
- Stockfish 18.0.0 full-game quick-pass (depth 10, MultiPV 3) with determinate progress, plus a deeper critical-position pass (depth 14+) with brilliancy detection.
- Move classification: Brilliant, Great, Best, Excellent, Good, Inaccuracy, Mistake, Blunder, Missed Win — driven by transparent centipawn-loss and sacrifice rules.
- Natural-language move explanations; interactive SVG evaluation graph and evaluation bar; per-player performance summary (accuracy %, ACPL, estimated rating, phase breakdowns).
- Interactive position explorer (drag pieces to explore alternatives, breadcrumb stack, return to game) and best-move engine arrows.
- StudyBoard: freeform study board with legal-move validation, history, undo, reset, flip — deliberately engine-free.
- Local ECO opening lookup (small starter set, 28 lines ≤ 6 plies, transpositions unresolved).
- `/licenses` page crediting Stockfish (GPLv3, unmodified distribution).
- Undecided/roadmap (not yet built): Milestone B UI polish & loading feedback, Milestone C explanation engine & drills, Milestone D play vs Stockfish.

## Evidence on Hand

- The app itself: working Next.js implementation with 1,449+ unit/integration tests and a Playwright smoke suite covering the real-engine path.
- README.md documents all current features and the milestone roadmap; no testimonials, marketing copy, or external proof exists — future work must not fabricate any.

## Product Principles

- Privacy is the product: game data stays on the device; no account or upload can ever be a prerequisite for analysis.
- Objective and transparent: classifications and explanations must trace back to stated, checkable rules (centipawn loss, sacrifice evaluation), never opaque labels.
- Review the real game, then explore: ground the player in what actually happened before inviting variation exploration.
- Engine quality without engine friction: deep analysis is available but progress, cancellation, and expected wait are always visible.

## Accessibility & Inclusion

The codebase carries an established assistive-technology baseline (progressbar roles, AT announcements during analysis, aria-invalid on inputs, deterministic accessible chooser keys). Future UI work should preserve this parity.
