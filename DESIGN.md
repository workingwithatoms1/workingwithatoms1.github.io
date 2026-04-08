# Working with atoms. — Design Language Specification

## Overview

"Working with atoms." is a materials science wiki/learning resource. The visual identity draws from 1960s scientific print design — halftone dot patterns, film grain textures, and restrained Swiss-inspired typography — combined with generative computational art. The result should feel like a beautifully printed scientific handbook that's alive with subtle animation.

The design is built on a strict **white-on-blue** palette with off-white content cards. There are no gradients, no drop shadows, no rounded corners. Every decorative element is constructed from halftone dots on a grid.

---

## Colour Palette

| Token | Hex | Usage |
|---|---|---|
| `--blue` | `#2a2f7c` | Primary background, all blue surfaces, canvas base |
| `--blue-light` | `#4d5cf2` | Hover states on blue backgrounds |
| `--white` | `#f0f0f8` | Primary text on blue backgrounds |
| `--off-white` | `#d8d8e8` | Secondary text on blue (nav links, muted labels) |
| Card background | `#ecebf2` | All content cards (articles, featured topics) |
| Callout background | `#e1e0e8` | Callout/highlight boxes within cards |
| Dark text | `#1a1d3a` | Headings on light backgrounds |
| Body text | `#3a3d5a` | Body copy on light backgrounds |
| Muted text | `#888` | Metadata (reading time, counts) |
| Label text | `var(--blue)` on light bgs | Topic labels, callout labels, tags |

### Rules
- **Never introduce warm colours.** No yellows, oranges, reds. The palette is strictly cool — navy, blue-grey, white.
- **No opacity tricks for colour.** Use the defined tokens. Don't create new tints by layering white at 10% opacity.
- The blue speckle noise uses lighter variants of the base blue (approx `rgb(42+, 47+, 124+)` with subtle brightness offsets). Never introduce a different hue into the noise.

---

## Typography

Three typefaces, each with a distinct role:

### Instrument Serif — Brand / Display
- **Use for:** Hero titles, logo/wordmark, card titles on blue backgrounds, card numbers, decorative numerals
- **Character:** Narrow, compressed, distinctive. Gives the "AI-techy" identity.
- **Weight:** 400 (regular only — no bold)
- **Kerning:** Loose (`letter-spacing: 0.5px` at hero scale, `-0.3px` at logo scale, `-0.5px` on card titles)
- **Import:** `Instrument+Serif:ital@0;1`

### Cormorant Garamond — Content Headings
- **Use for:** Article titles, section h3 headings, browse/topic list names
- **Character:** Wide, elegant, scholarly. Old-style serif with generous counters.
- **Weight:** 600 (semibold) for all headings
- **Kerning:** `-0.3px` on article titles, `0px` on h3s and topic names
- **Sizes:** Article title `clamp(32px, 4vw, 48px)`, h3 `24px`, topic names `36px`
- **Import:** `Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400`

### Lora — Body Text
- **Use for:** Article body paragraphs, intro text, callout body text
- **Character:** Warm, open, highly readable. Calligraphic humanist serif.
- **Weight:** 400 (regular)
- **Sizes:** Body `16px` / line-height `1.75`, intro `18px` / line-height `1.65`, callout `15px` / line-height `1.7`
- **Max-width:** Body paragraphs capped at `640px`, intro at `680px`
- **Import:** `Lora:ital,wght@0,400;0,500;1,400`

### DM Sans — UI Chrome
- **Use for:** Nav links, section labels, tags, breadcrumbs, metadata, small uppercase labels
- **Character:** Clean, minimal sans-serif. Should be invisible — it's the functional workhorse.
- **Weight:** 300 (light) for body default, 400/500 for labels
- **Sizes:** Nav links `13px`, section labels `11px`, tags `10px`
- **Always uppercase** with `letter-spacing: 0.5px–2px`
- **Import:** `DM+Sans:wght@300;400;500`

### Typography Rules
- **Never use Instrument Serif on light/card backgrounds.** It's for blue surfaces only.
- **Never use Cormorant Garamond on blue backgrounds.** It's for content cards only.
- **All uppercase text uses DM Sans**, never a serif.
- **No bold in body text.** Emphasis comes from structure, not weight.

---

## Layout & Spacing

### Grid
- Page padding: `40px` (desktop), `24px` (mobile)
- Content max-width for articles: `900px` for the card, `640px` for body text within
- Cards grid: `repeat(3, 1fr)` with `20px` gap

### Content Cards
All readable content sits on `#ecebf2` cards placed on the blue background. Cards have:
- No border, no border-radius, no shadow
- Padding: `clamp(40px, 5vw, 80px)` for article cards, `clamp(32px, 4vw, 60px)` for featured cards
- Sharp rectangular edges — the contrast between card and background IS the visual boundary

### Vertical Rhythm
- Sections: `120px` vertical padding
- Between headings and body: `16px–20px`
- Between body paragraphs: `16px`
- Before h3 subheadings: `48px`
- Callout boxes: `40px` vertical margin

### Responsive
- At `768px` and below: single-column cards, reduced padding, smaller topic names (`24px`)

---

## Texture System

The site's visual character comes from layered canvas-based textures. Every blue surface should have these layers:

### Layer 1: Speckle Noise (static)
Pre-rendered once on resize. The base blue `#2a2f7c` with sparse lighter blue pixels scattered:
```
threshold: hashNoise > 0.75
colour offset: R +3–4, G +4–5, B +6–8 (very subtle)
```
This gives the flat blue a paper-like tooth.

### Layer 2: Film Grain (static)
Pre-rendered once. A full-resolution noise texture composited with `globalCompositeOperation: 'luminosity'`:
```
per-pixel: hashNoise * 60 for RGB, alpha 45
blend mode: luminosity (critical — 'overlay' introduces warm colour shift)
```

### Layer 3: Scan Lines (static)
Faint horizontal lines every 3px: `rgba(0,0,30,0.02)`. Barely visible but adds print texture.

### Layer 4: CSS Grain Overlays
Two `body::before` / `body::after` pseudo-elements with SVG feTurbulence noise:
- Primary: `baseFrequency 0.75`, opacity `0.18`, `mix-blend-mode: luminosity`
- Secondary: `baseFrequency 1.2`, opacity `0.1`, `mix-blend-mode: luminosity`

**Critical:** Always use `luminosity` blend mode, never `overlay` or `soft-light` — these introduce yellow/warm tones that break the palette.

### Full-Page Background Canvas
A fixed `position: fixed` canvas behind all content renders the speckle + grain + scan lines once. All sections should have `background: transparent` so this shows through. Content sections need `position: relative; z-index: 1` to sit above it.

---

## Halftone Dot System

All decorative visual elements are built from halftone dots rendered on HTML canvas. This is the core visual language.

### Dot Properties
- **Colour:** `rgba(255, 255, 255, 0.9)` — pure white, never tinted
- **Grid spacing:** `10px` for hero/nav, `8px` for cards, `12px` for background accents
- **Max radius:** `5px` for hero, `3–4px` for cards, `3px` for backgrounds
- **Shape:** Perfect circles only

### Dot Animation
- **Speed:** `time += 0.0016` per frame (very slow, meditative)
- **Breathing:** Each dot has subtle size modulation: `1 + sin(time * 0.4 + x * 0.005 + y * 0.007) * 0.08` — ±8% size variation, offset by position so it ripples rather than pulses uniformly
- **Threshold:** Only render dots where `val > 0.05`

### FCC Lattice Modulation
Dots can be modulated by an FCC (face-centred cubic) pattern for crystallographic character:
```javascript
const s = 30; // lattice scale
const g1 = pow(cos(x/s*PI)*0.5+0.5, 0.3) * pow(cos(y/s*PI)*0.5+0.5, 0.3);
const g2 = pow(cos((x+s/2)/s*PI)*0.5+0.5, 0.3) * pow(cos((y+s/2)/s*PI)*0.5+0.5, 0.3);
const fcc = 0.6 + max(g1, g2) * 0.4; // 60% base + 40% lattice influence
```
This is subtle — it modulates existing shapes, not a standalone pattern.

### Text Avoidance
Where dots overlap text, use elliptical exclusion zones with quadratic falloff:
```javascript
const dist = sqrt(pow((dotX - zoneX) / radiusX, 2) + pow((dotY - zoneY) / radiusY, 2));
val *= pow(min(1, dist), 2); // quadratic for soft edge
```

### Hero Composition
The current hero uses a 3D ribbon shape — asymmetric profile with sharp top edge and softer bottom falloff, perspective tapering left-to-right, a secondary shadow ribbon below, and scattered dots near the curve. See the `heroCanvas` field function in the source for the exact implementation.

### Card Compositions
Each card has a unique field function:
- **Card 0 (Lattice Geometry):** Overlapping sine grids with radial falloff — grid/lattice feel
- **Card 1 (Molecular Dynamics):** Flowing S-curve path — trajectory/motion feel
- **Card 2 (Phase Transitions):** Starburst with radial rays — convergence/energy feel

New cards should have similarly distinct compositions. Avoid repeating the same field function.

---

## Navigation

### Structure
Fixed position, `z-index: 100`. Logo left, links right.

### Background Behaviour
- **Over hero:** Fully transparent — the hero canvas shows through
- **After scrolling past hero:** A canvas background fades in (`opacity 0 → 1`, `transition: 0.4s ease`) rendering the same halftone composition as the hero, clipped to nav height
- Uses `IntersectionObserver` or scroll listener to toggle `.scrolled` class

### Text Avoidance in Nav
The nav canvas has elliptical exclusion zones around the logo (left) and nav links (right) so dots fade out near text.

---

## Component Patterns

### Article Page
```
[Blue background with halftone canvas]
  [Breadcrumb — DM Sans, uppercase, 12px, 0.4 opacity]
  [#ecebf2 card]
    [Header: topic label left, reading time right]
    [Title — Cormorant Garamond 600, clamp(32-48px)]
    [Intro — Lora 18px, #3a3d5a]
    [Body sections]
      [H3 — Cormorant Garamond 600, 24px]
      [Paragraphs — Lora 16px, max-width 640px]
      [Callout box — #e1e0e8 bg, label + body]
    [Related topics — pill-style links with border, hover fills blue]
```

### Featured Topics Card
```
[Blue background]
  [#ecebf2 card with generous padding]
    [Section label — DM Sans uppercase, dark text, 0.35 opacity]
    [3-column grid of square blue cards with halftone canvases]
```

### Browse List
```
[Blue background, transparent]
  [Section label — white, 0.4 opacity]
  [Rows with top/bottom border at 0.08 opacity]
    [Topic name — Cormorant Garamond 600, 36px]
    [Article count — right-aligned, 12px, 0.3 opacity]
    [Hover: indent 12px left, border brightens, name turns blue-light]
```

---

## Animation Principles

1. **Slow and meditative.** Time increment is `0.0016` per frame. Nothing should feel urgent.
2. **Entrance animations** use `fadeUp` (30px translate + opacity) with staggered delays and `cubic-bezier(0.16, 1, 0.3, 1)` easing.
3. **Hover states** use `transform: scale(0.97)` on cards (shrink, not grow) with `cubic-bezier(0.16, 1, 0.3, 1)`.
4. **Topic rows** indent on hover with `padding-left: 12px` transition.
5. **No bouncing, no elastic, no spring physics.** Everything is smooth and deliberate.

---

## Performance Rules

1. **Grain is always static.** Pre-render once on resize, blit as texture. Never compute per-pixel noise per frame.
2. **The site background canvas renders once and stops.** No animation loop.
3. **Only halftone dot positions animate** — these are cheap arc draws.
4. **Use IntersectionObserver** to pause off-screen canvas animation loops.
5. **Canvas DPR capped at 2** — `Math.min(window.devicePixelRatio, 2)`.
6. **hashNoise function** for all procedural noise: `sin(x * 127.1 + y * 311.7) * 43758.5453` fractional part. Fast, deterministic, no dependencies.

---

## File Structure Recommendation

```
/
├── index.html              # Landing page (hero + featured + browse)
├── article.html            # Article page template
├── styles/
│   ├── tokens.css          # CSS custom properties, fonts
│   ├── layout.css          # Grid, spacing, responsive
│   ├── typography.css       # Font styles per element
│   └── components.css      # Cards, callouts, nav, footer
├── scripts/
│   ├── noise.js            # hashNoise, smoothNoise utilities
│   ├── halftone.js         # createHalftoneRenderer factory
│   ├── fields.js           # Field functions for each composition
│   ├── site-bg.js          # Full-page background canvas (render once)
│   └── nav.js              # Nav scroll behaviour + canvas
└── DESIGN.md               # This file
```

---

## Do's and Don'ts

### Do
- Keep the palette strictly cool (blue, grey, white)
- Use halftone dots as the primary decorative element
- Let the texture do the work — restraint in layout, boldness in surface
- Maintain generous whitespace on content cards
- Use `luminosity` blend mode for all grain/noise overlays

### Don't
- Add gradients, shadows, or rounded corners
- Use `overlay` or `soft-light` blend modes (introduces warm colour)
- Animate grain per-frame
- Use Instrument Serif on light backgrounds
- Use more than the four defined typefaces
- Add colour outside the defined palette
- Make animations fast or bouncy
