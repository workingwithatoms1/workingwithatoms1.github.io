# Done

## Modular site build from atoms.html reference
Split monolithic atoms.html into modular CSS (tokens, typography, layout, components) and ES module JS (noise, halftone, fields, site-bg, nav, main).

## Curriculum structure on homepage
Replaced flat featured cards with 5-part curriculum: Parts I-IV + Supporting Modules, each with section header and card grid. 19 modules, each with a unique halftone field function.

## Section landing pages
Module overview pages listing sub-sections with number, title, description, and reading time. Rendered from JSON.

## Article pages from JSON
Data-driven article renderer with body block system (h3, p, callout), prev/next navigation, breadcrumbs, related topics. Content stored in central JSON files.

## Full module scaffolding
Generation script (`scripts/generate-modules.js`) creates all 19 module JSONs and 143 HTML shells. Empty content shows "Coming soon" / "Under Development" fallback.

## Static card rendering
Curriculum cards render halftone dots once and stop (no animation loop). Hero and nav remain animated.

## Cards link to module pages
All homepage cards are `<a>` tags linking to `/{slug}/`.

## KaTeX equation rendering, extended body blocks, widget framework, expandable derivation cards
Infrastructure for rich content: display/inline math, lists, figures, interactive widgets, and show/hide derivation cards.

## Thermodynamics module: all 15 articles written
5.1 What Thermodynamics Is For, 5.2 Systems/Boundaries/State, 5.3 Work/Heat/First Law (with Hess and Kirchhoff diagrams), 5.4 Entropy/Second Law (with configurational entropy derivation), 5.5 Temperature/Zeroth Law (with kBT scale), 5.6 Third Law, 5.7 Free Energy (with G vs T worked example), 5.8 Chemical Potential, 5.9 Activity, 5.10 Solutions & Mixing, 5.11 Regular Solution Model (with critical temperature derivation), 5.12 Phase Rule, 5.13 Free Energy to Phase Diagrams, 5.14 Ellingham Diagrams, 5.15 Predominance Diagrams.

## Mobile navigation
Hamburger menu (3-line → X animation) for screens below 768px. Full-screen overlay with centred links. Auto-closes on link tap. Applied to homepage, article.html, and all data-driven pages via page-shell renderer.
