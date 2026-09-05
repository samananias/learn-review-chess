---
name: Learn Review Chess
description: A quiet, private chess game-review bench — monochrome chrome, honest readouts, color only where it means something.
colors:
  clock-white: "#ffffff"
  carbon-black: "#0a0a0a"
  scoresheet: "#fafafa"
  ink: "#171717"
  chalk: "#ededed"
  charcoal: "#18181b"
  slate-board: "#3f3f46"
  steel: "#52525b"
  mist: "#a1a1aa"
  hairline: "rgba(0,0,0,0.12)"
  hairline-faint: "rgba(0,0,0,0.08)"
  hairline-dark: "rgba(255,255,255,0.2)"
  hairline-faint-dark: "rgba(255,255,255,0.145)"
  hover-wash: "rgba(0,0,0,0.04)"
  hover-wash-dark: "rgba(255,255,255,0.08)"
  track-wash: "rgba(0,0,0,0.06)"
  flag-fall: "#ef4444"
  flag-fall-bg: "#fef2f2"
  flag-fall-text: "#b91c1c"
  flag-fall-bg-dark: "#450a0a"
  flag-fall-text-dark: "#fca5a5"
  brilliant-teal: "#20b28f"
  great-blue: "#6f8fc2"
  best-green: "#62b448"
  excellent-green: "#79b25a"
  good-olive: "#85a465"
  missed-win-mustard: "#d1a419"
  inaccuracy-yellow: "#f3c11d"
  mistake-orange: "#eca53f"
  blunder-red: "#e2433c"
  book-tan: "#c9a26b"
  unclassified-slate: "#64748b"
  arrow-first: "#22c55e"
  arrow-second: "#3b82f6"
  arrow-third: "#a855f7"
typography:
  display:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.56
  title:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
  mono:
    fontFamily: "Geist Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  xs: "2px"
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  "2xl": "20px"
  "3xl": "24px"
  "4xl": "32px"
components:
  button-secondary:
    backgroundColor: "{colors.clock-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  button-secondary-hover:
    backgroundColor: "{colors.hover-wash}"
  button-secondary-dark:
    backgroundColor: "{colors.carbon-black}"
    textColor: "{colors.chalk}"
  button-secondary-dark-hover:
    backgroundColor: "{colors.hover-wash-dark}"
  panel:
    backgroundColor: "{colors.clock-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "20px"
  panel-dark:
    backgroundColor: "{colors.carbon-black}"
    textColor: "{colors.chalk}"
  input-text:
    backgroundColor: "{colors.clock-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px"
  progress-track:
    backgroundColor: "{colors.track-wash}"
    height: "8px"
    rounded: "{rounded.full}"
  progress-fill:
    backgroundColor: "{colors.ink}"
    height: "8px"
  error-banner:
    backgroundColor: "{colors.flag-fall-bg}"
    textColor: "{colors.flag-fall-text}"
    rounded: "{rounded.md}"
    padding: "8px"
  error-banner-dark:
    backgroundColor: "{colors.flag-fall-bg-dark}"
    textColor: "{colors.flag-fall-text-dark}"
---

# Design System: Learn Review Chess

## Overview

**Creative North Star: "The Analyst's Bench"**

The interface is a measurement bench for a chess player's play. Every surface is an instrument readout: neutral, calm, and precise, with the chessboard and the evaluation graph as the only visual events on screen. Chrome — buttons, panels, inputs, navigation — recedes into a monochrome vocabulary of ink lines and hairline borders so that nothing competes with the position under review.

Color is never decoration. The entire surrounding UI is black-and-white with tonal alpha washes; the only saturated pixels on screen are *meaning*: the nine move-classification colors, the three engine-candidate arrow colors, and the error banner. A visitor reads the interface the way they read a scoresheet — quiet paper, honest numbers.

Depth does not exist as shadow. Hierarchy is produced by hairline borders, tonal layering, and spacing rhythm alone.

**Key Characteristics:**

- Flat, border-driven monochrome chrome with dual light/dark themes of equal weight (white surfaces + ink text ↔ carbon-black surfaces + chalk text)
- One type family (Geist) in a tight, small scale — body copy is 14px, everything denser
- Restrained outlined controls: rectangles with 6px radius, hairline borders, 4–8% alpha hover washes
- Semantic color reserved for move classification, engine arrows, and errors
- Signature instrument: the charcoal evaluation graph (`zinc-700` field, white/black advantage regions)

## Colors

A two-temperature monochrome core (pure paper white ↔ carbon black, both named for chess objects) with a single semantic spectrum carrying all evaluative meaning.

### Neutral

- **Clock White** (#ffffff): Primary surface in light mode — header, nav, footer bands, the review aside, cards, buttons, inputs.
- **Scoresheet** (#fafafa, zinc-50): Page background in light mode; also White's advantage region fill inside the evaluation graph.
- **Carbon Black** (#0a0a0a): Primary surface in dark mode — the equivalent of every Clock White surface.
- **Ink** (#171717): Primary text in light mode; progress-bar fill; graph segment stroke.
- **Chalk** (#ededed, zinc-100/zinc-50): Primary text in dark mode.
- **Charcoal** (#18181b, zinc-900): Marker dots and hover tooltip chips inside the evaluation graph (inverted ink-on-white and white-on-ink).
- **Slate Board** (#3f3f46, zinc-700): The evaluation graph's permanent charcoal field; Black's advantage region matches it exactly.
- **Steel** (#52525b, zinc-600): Secondary text in light mode — helper copy, descriptions, metadata.
- **Mist** (#a1a1aa, zinc-400): Secondary text in dark mode; the graph midline and cursor rules (zinc-500 #71717a at low stroke weight).
- **Hairlines** — `rgba(0,0,0,0.12)` light / `rgba(255,255,255,0.2)` dark: every interactive and container border. Fainter variants (`rgba(0,0,0,0.08)` / `rgba(255,255,255,0.145)`) separate page bands (header/nav/footer) and panel edges.
- **Washes** — `rgba(0,0,0,0.04)` / `rgba(255,255,255,0.08)`: hover state on every outlined control. `rgba(0,0,0,0.06)` / `rgba(255,255,255,0.08)`: progress-bar track.

### Primary (semantic spectrum)

The classification palette — the product's evaluative voice, matched to the reference icon set (saturated circle, white glyph). Each color is bound to exactly one verdict and always paired with its glyph, never used as the sole signal:

- **Brilliant Teal** (#20b28f): Brilliant moves (`!!`).
- **Great Blue** (#6f8fc2): Great moves (`!`).
- **Best Green** (#62b448): Best moves (star).
- **Excellent Green** (#79b25a): Excellent moves (thumbs-up).
- **Good Olive** (#85a465): Good moves (check).
- **Missed Win Mustard** (#d1a419): Missed wins (minus).
- **Inaccuracy Yellow** (#f3c11d): Inaccuracies (`?!`).
- **Mistake Orange** (#eca53f): Mistakes (`?`).
- **Blunder Red** (#e2433c): Blunders (`??`).
- **Book Tan** (#c9a26b): Opening-book moves (open book) — a display-only verdict from the ECO lookup, not an engine classification.
- **Unclassified Slate** (#64748b): hollow circle for positions without a verdict.
- **Arrow Blue** (#3b82f6) / **Arrow Purple** (#a855f7): 2nd and 3rd engine-candidate arrows.

### Error

- **Flag-Fall Red**: text #b91c1c on #fef2f2 with #fca5a5 border (light); #fca5a5 text on #450a0a with #991b1b border (dark). Reserved for validation and failure states — the same red family as Mistake/Blunder, so errors feel continuous with the classification language.

### Named Rules

**The Ink Rule.** Chrome is monochrome. Saturated color appears only where it *means* something: move classification, engine arrows, and errors. If a new element is decorative, it gets ink, not color.

**The Twin Theme Rule.** Every light-mode choice has a same-weight dark counterpart (white ↔ carbon-black, ink ↔ chalk, hairline ↔ hairline-dark). No surface ships in one theme only.

## Typography

**Display Font:** Geist (with Arial, Helvetica fallbacks), loaded via `next/font`
**Body Font:** Geist
**Label/Mono Font:** Geist Mono — SAN move lists, per-classification counts, and timestamps

**Character:** A single neutral grotesque at deliberately small sizes keeps the bench dense and instrument-like; hierarchy is carried by weight and size alone — no color differentiation, no decorative faces.

### Hierarchy

- **Display** (600, 24px, -0.025em tracking, ~1.33): The app title in the header only. One per page.
- **Headline** (600, 18px, ~1.56): Panel titles ("Game performance", explanation panel headers).
- **Title** (600, 16px, 1.5): Section titles like "Game review"; intro body copy (400) at this size uses 28px line-height.
- **Body** (400, 14px, ~1.43): The workhorse — nearly all UI copy, metadata, buttons, and labels.
- **Label** (500, 12px, 1.33): Helper text under fields, file metadata, small result annotations.
- **Mono** (Geist Mono, 12px): Move-list indices, classification counts, game timestamps.

### Named Rules

**The Scale Discipline Rule.** The type scale has exactly five steps (12/14/16/18/24px). Nothing in the chrome gets larger than 24px; if hierarchy is missing, add weight, not size.

## Layout

The shell is a single-column document frame: header, primary nav, main, footer — each page band a full-width white (or carbon-black) strip separated by a faint hairline, all content constrained to a `max-w-6xl` (1152px) centerline with 16px horizontal padding stepping to 32px at ≥640px.

The workspace is a two-column grid from 1024px: the board column (`minmax(0,1fr)`) and a fixed 320px review sidebar, collapsing to a single column below. Everything belonging to the review itself — board, evaluation bar + graph, panels, analysis output — stacks inside a `max-w-2xl` (672px) column so the graph and board share exact edges.

Vertical rhythm is a 4/8/12/16px ladder: `gap-2` (8px) is the default inside groups, `gap-3` (12px) between stacked panels, `py-8` (32px) framing the main area, `p-5` (20px) inside the sidebar panel. Density is high by intent — this is a working bench, not a display case.

## Elevation & Depth

The system is **flat by doctrine — zero shadows anywhere.** Depth and hierarchy are produced by three substitutes: hairline borders (1px alpha lines at 8–20% opacity), tonal layering (4–8% alpha washes on hover and tracks), and the inverted ink pair (Charcoal markers/chips on Clock White surfaces and vice versa). The only deep surface is the evaluation graph's Slate Board field, and it reads as a recessed instrument display, not a raised card.

### Named Rules

**The Hairline Rule.** Every surface boundary is a 1px alpha border, never a shadow. If something needs to lift, it gets a stronger border or a wash — not elevation.

## Shapes

Rectangular with quiet corners. `rounded-md` (6px) is the working radius for every control: buttons, inputs, list rows, error banners, progress segments. `rounded-lg` (8px) marks large containers only — the board frame and the review sidebar. `rounded-full` is reserved for things that are genuinely round: progress bar and its fill, graph marker dots. The evaluation graph uses a small border-radius with a 1px Slate Board-tone border. There are no pills, notched corners, or asymmetric silhouettes; borders are always present, always 1px, always the alpha hairline pair.

## Components

### Buttons

- **Shape:** Outlined rectangle, 6px radius, 1px hairline border.
- **Secondary (the only button style):** Clock White surface, Ink text, 14px/500, `6px 12px` padding. Dark twin: Carbon Black surface, Chalk text.
- **Hover / Focus:** `transition-colors` to the 4–8% alpha wash; focus is a 2px Ink/Chalk outline offset 2px. No color change, no scale, no shadow.
- **Disabled:** 50% opacity + `cursor-not-allowed`.
- **Primary action:** There is no filled primary variant — the "Analyze full game" and "Load game" actions use the same outlined style. Hierarchy among actions is positional, not chromatic.

### Navigation

- **Style:** Horizontal tab row inside the white header band, 14px labels in `12px` horizontal padding / 12px vertical.
- **States:** Active tab = Ink text, 600 weight, 2px Ink underline flush with the band's bottom border. Inactive = Steel/Mist text, 500 weight, transparent underline, hover shifts text to Ink. Underline is `border-b-2`, not a pill or background fill.

### Cards / Containers

- **Corner Style:** 8px radius (large containers), 6px for inner rows.
- **Background:** Clock White / Carbon Black, always with a hairline border; the page band behind is Scoresheet / Carbon Black.
- **Shadow Strategy:** None — see Elevation & Depth.
- **Border:** hairline (faint variant for bands, standard for interactive containers).
- **Internal Padding:** 20px for the sidebar panel, 8–16px for inner cards and list rows.

### Inputs / Fields

- **Style:** 1px hairline border, Clock White surface, 6px radius, 8px padding, 14px text. Textareas resize vertically.
- **Focus:** 2px solid outline (Ink/Chalk) with 2px offset — keyboard-visible, not a glow.
- **Error / Disabled:** `aria-invalid` pairs with the Flag-Fall banner below the field; disabled = 50% opacity. File inputs style their embedded button with the standard outlined-button treatment.

### Progress Bar

- **Track:** full-width, 8px tall, fully rounded, track-wash background.
- **Fill:** solid Ink (light) / Chalk (dark), fully rounded, animated by width during engine analysis. Always paired with a `role="progressbar"` and live announcements — the visual is never the only channel.

### Move Classification Badges (signature)

The verdict system, matched to the reference icon set: a filled circle in the verdict color carrying a white glyph (`!!`, `!`, star, thumbs-up, check, minus, `?!`, `?`, `??`, open book) with a soft dark echo under the glyph for depth. Badges appear in the move strip, the performance summary, and — after analysis — directly on the board at each classified move's destination square, with Book badges for opening-book plies. Color encodes the verdict tier; the glyph guarantees the information survives color-blindness and monochrome rendering.

### Evaluation Graph (signature)

A 672×160 instrument display: permanent **Slate Board** (#3f3f46) charcoal field with a 1px zinc-500 border; White's advantage painted as a **Scoresheet** region rising from the bottom, Black's advantage reading as the field itself, separated by a two-tone outlined polyline (2.5px Chalk under 1.5px Ink) because the dark end cannot reach contrast with the surface alone. A 0.5px Mist midline and cursor rule; Ink marker dots (10px, Chalk border) capped at 48 for density; hover reveals a Charcoal tooltip chip with the SAN. Entire surface is a click target — one column per ply.

## Do's and Don'ts

### Do:

- **Do** pair every color decision with its dark-mode twin (`bg-white`/`text-black` ↔ `dark:bg-black`/`dark:text-zinc-50`, hairline ↔ hairline-dark). Unilateral theming is a defect.
- **Do** use the alpha hairline pair for all borders: `rgba(0,0,0,0.12)` / `rgba(255,255,255,0.2)` interactive, `.08`/`.145` for page bands.
- **Do** show state with tonal washes (`rgba(0,0,0,0.04)` / `rgba(255,255,255,0.08)`) and `transition-colors` only.
- **Do** keep body copy at 14px and reserve 12px for helpers; use Geist Mono for move data.
- **Do** give every status a non-color channel: glyphs on classification badges, `role="status"`/`aria-live` text beside the progress bar, `aria-invalid` on errored fields.
- **Do** align review-column elements to the shared `max-w-2xl` (672px) edge so board and graph read as one instrument.

### Don't:

- **Don't** use drop shadows, glows, or gradients for depth — the system is flat by doctrine.
- **Don't** introduce saturated color into chrome (buttons, panels, nav, headings). Color is for classification, engine arrows, and errors only.
- **Don't** create a filled "primary" button — all actions share the outlined secondary style.
- **Don't** encode evaluation or verdicts in color alone; always pair with the glyph or text.
- **Don't** exceed the five-step type scale or decorate type with color; hierarchy is weight and size.
- **Don't** round anything past 8px except genuinely circular elements (progress bar, markers).
