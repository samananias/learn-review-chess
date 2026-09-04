---
target: the main page
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-09-04T16-35-33Z
slug: src-app-page-tsx
---
# Critique: main page (src/app/page.tsx — Review surface)

## Design Health Score: 20/40 (Acceptable)

| # | Heuristic | Score | Key Issue |
| --- | --- | --- | --- |
| 1 | Visibility of System Status | 3/4 | Progressbar + aria-live present; but "Analyzing position 2 (1/40)" uses internal job IDs, no elapsed time/ETA |
| 2 | Match System / Real World | 1/4 | Primary readout is UCI engine telemetry (nodes, ponder moves, centipawn scores) for club players |
| 3 | User Control and Freedom | 3/4 | Cancel/Undo/Clear exist; "Clear imported game" destroys minutes of analysis with one click |
| 4 | Consistency and Standards | 2/4 | Chess.com vs Lichess pickers differ in density and row behavior; off-palette neutral-900 panel; font-bold off-spec |
| 5 | Error Prevention | 2/4 | Good length limits; but multi-game paste unhandled and destructive clear unconfirmed |
| 6 | Recognition Rather Than Recall | 2/4 | Arrow legend good; "Analyze critical moments" unexplained; classification glyphs have no visible legend |
| 7 | Flexibility and Efficiency | 1/4 | No keyboard shortcuts at all for a timeline product (no ←/→/Home/End) |
| 8 | Aesthetic and Minimalist Design | 2/4 | Monochrome discipline real; post-analysis column is one unbroken stack with a telemetry dump |
| 9 | Error Recovery | 3/4 | role="alert" banners, typed failures, retry-after; error id never wired to aria-describedby |
| 10 | Help and Documentation | 1/4 | No legend for classification colors; "depth"/"critical moments" unexplained; privacy promise absent from UI |
| **Total** | | **20/40** | **Acceptable — significant improvements needed** |

## Design Specificity Verdict

The instruments are genuinely authored for this product: the charcoal evaluation graph (two-tone outlined polyline, 48-marker density cap, per-ply click targets with aria-current) is a signature piece implemented almost to the letter of DESIGN.md, and the glyph-paired classification badges are chess-native. But the bench around the instruments is half stock: the shell is Next.js-starter furniture with dead `href="#"` nav links promising "Learn" and "Analysis" pages that don't exist; the default state is a free-play sandbox board contradicting the app's own "Only completed games are reviewed" copy; and MoveExplanationPanel is a permanently-dark `neutral-900` card that violates the Twin Theme Rule and imports a foreign color family. An unrelated product could reuse the shell unchanged; it could not reuse the graph.

Deterministic scan: clean — the CLI detector returned zero findings (exit 0) across `src/app/page.tsx` and `src/features`. Browser overlay (injected on the live page, desktop + mobile) highlighted one element: the board container (`div.aspect-square.w-full.max-w-2xl.overflow-hidden.rounded-lg.border…`) clips a positioned child. Banner info items (overused font "geist 100%", gradient-text, marquee) are false positives or informational — the single-font doctrine is deliberate, and no gradient or `<marquee>` exists in source.

## Overall Impression

A well-built instrument inside a stock frame. The evaluation graph and classification system are excellent; everything around them — the sandbox empty state, the UCI telemetry readout, the dead nav, the scroll-stack layout — reads as scaffolding left up. Biggest opportunity: make the bench speak chess, not engine — SAN lines, human evals, keyboard timeline navigation, and the privacy promise on screen at the moment trust is required.

## What's Working

1. **The evaluation graph is executed, not sketched.** Two-tone outlined polyline solving a real contrast problem (with an honest code comment), 48-marker density cap with computed justification, per-ply full-height click targets with aria-current. The signature instrument DESIGN.md promised, built with care.
2. **Accessibility scaffolding is structural.** role="progressbar" with values, aria-live on every async status, aria-busy on fetch controls, aria-pressed on the import toggle, sr-only classification labels paired with glyphs.
3. **The outlined-control vocabulary is disciplined.** Every button across five files uses the identical hairline/6px/alpha-wash treatment with proper disabled states; the monochrome chrome genuinely recedes.

## Priority Issues

1. **[P1] Raw engine telemetry is the primary readout for amateurs.** CurrentPlyResult shows Ply/Depth/Nodes/TimeMs, UCI best moves with ponder moves ("Best move: e2e4 (ponder: e7e5)"), and ranked centipawn candidate lines. The product promises to explain mistakes to club players; the most prominent analysis surface reads like a debug console. Fix: SAN-rendered lines, human eval ("White is better by ~1.2"), nodes/depth behind a disclosure; the explanation engine (buildMoveExplanations) already exists — surface it here.
2. **[P1] The board is the third thing on screen, and the explanation is last.** ReviewBoard renders: status line → move list (60 wrapped buttons for a full game) → 6-button nav row → board → … → MoveExplanationPanel at the very bottom. On mobile the import sidebar lands below the entire stack (confirmed by screenshot). Fix: board first, move list alongside/after, explanation pinned near the selection.
3. **[P1] Zero keyboard timeline navigation.** A game-review tool where arrow keys do nothing forces 60 clicks per game. Fix: ←/→/Home/End on the review region — nearly free since goTo already exists.
4. **[P2] "Clear imported game" silently destroys completed analysis.** One unconfirmed click discards timeline, summary, and all engine results that took minutes of WASM compute. Fix: confirm, or preserve analysis keyed by timelineIdentity (infrastructure already exists in ReviewBoard).
5. **[P2] "Analyze critical moments" is an unexplained second analysis.** Appears only after full-game completion, runs depth 18 on a hidden selection of positions, and no copy says what it does or costs. Fix: one sentence of description ("Deeper pass on the X most decisive moments") and a distinct progress state.

## Persona Red Flags

**Alex (power user):** No keyboard shortcuts, no rapid ply-stepping, no clickable candidate line that jumps the board to the PV, engine depth fixed at 10/18, no analysis export. Finishes one review and leaves.

**Jordan (first-timer):** Lands on the StudyBoard sandbox — a blank board inviting moves, contradicting "Import a completed game to begin reviewing" hidden in a 320px sidebar (below the board on mobile). Reads "Nodes: 1,234,567" and "ponder: e7e5" with no bridge to plain language. Never discovers critical-moments analysis or the glyph meanings.

**Sam (accessibility-dependent):** The load-game transition is silent — StudyBoard is replaced by ReviewBoard with no aria-live announcement. The evaluation graph is role="img" with a bare label; the shape of the game is unavailable non-visually except tabbing through 60+ per-ply buttons with no roving tabindex. The error paragraph's id="pgn-error" is never referenced by aria-describedby, so aria-invalid points at nothing.

**Casey (mobile):** Single-column collapse puts the import sidebar after the entire review stack; importing a second game means scrolling past graph, telemetry, and performance blocks. The 6-button nav row wraps onto two ragged lines.

## Minor Observations

- Nav items "Learn" and "Analysis" are dead `href="#"` links — a fake IA.
- MoveExplanationPanel's neutral-900/neutral-100 palette drifts from the zinc system and violates the Twin Theme Rule; its sibling analysis-panel.tsx appears to be unreachable dead code.
- formatScore renders "+1.20" as "1.20" — no sign for White advantages; the eval bar shows no numeric label.
- Chess.com picker silently truncates to 20 games; Lichess rows omit time class/date that Chess.com rows show; Lichess rows are whole-item buttons vs Chess.com's nested "Review game" button.
- "Game performance" headings use font-bold (700), off the 600 weight spec.
- Study board has Undo but no Redo; paste doesn't split multi-game PGNs while file upload does.
- Dark theme exists only via prefers-color-scheme; no user toggle.
- react-chessboard's default brown/tan board colors clash with the monochrome bench (confirmed visually) and are not themed.
- The overlay-highlighted clipped child on the board container: the board's overflow-hidden + rounded frame clips a positioned child (coordinate labels/arrows at the edge) — minor but real.

## Questions to Consider

- If privacy is the entire positioning, why does the word "local" or "private" appear nowhere on screen at the exact moment the user hands over a game and presses "Analyze full game"?
- Does the sandbox StudyBoard earn its pixels in the default state, given it contradicts the "completed games only" rule? What would a dedicated "Nothing under review" empty state lose?
- The doctrine says hierarchy is "positional, not chromatic" — but the central action sits inside a transport-control row. Is the no-filled-button rule serving the bench, or hiding the most important button?
