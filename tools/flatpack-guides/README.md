# Flat-pack studies

Five independent, source-checked assembly companions on Markus Lejon's portfolio.
The collection lives at `/projects/flatpack/`. KALLAX and BILLY retain their existing
apps and URLs; LACK, POÄNG and MALM share this small Vite/Three.js app.

```sh
npm ci
npm run dev
npm run check
npm run build
```

Build output goes to `../../projects/flatpack/`. Commit source and output together.
The collection loads no Three.js until a guide is selected. Routes use
`?guide=lack`, `?guide=poang`, and `?guide=malm`, so GitHub Pages needs no rewrite.
Each guide saves its current action separately, keyed by its booklet revision.

## Source coverage

| Guide | Exact product | Booklet | Coverage |
| --- | --- | --- | --- |
| LACK | White 55 × 55 × 45 cm, 304.499.08 | AA-2606170-1, 2025-02-27 | Full unnumbered assembly diagram in two actions; warnings and final check |
| POÄNG | Birch armchair frame, 813.058.07 | AA-2615392-2, 2026-01-29 | All 11 numbered steps, six-bolt check p14, cushion fitting p15 |
| MALM | White 80 × 48 × 78 cm, 204.035.62 | AA-2022888-8, 2025-12-10 **and** AA-1971377-2, 2017-08-16 | All 29 case steps, all 9 drawer steps repeated three times, wall branches A/B/C |

The data modules contain per-action page references. `audits/` records the visual
manual checks and modelling limits. Original PDFs and page renders are in
`public/manual/`, with IKEA's attribution intact. Alternatives printed together
for one fitting are not additive quantities. MALM's final case and drawer actions
share one screen with both original drawings available.

Geometry is an illustrative reconstruction, not manufacturing data or a drilling
template. Overall product dimensions are from the official product pages; curves,
panel thicknesses, holes and fitting shapes are inferred. The sequences have been
checked against the drawings, not physically assembly-tested. Wall drilling stays
in the original diagrams rather than a generic animation.

`poster.html?guide=…` is a development-only 1000 × 678 model capture page. Captures
are encoded to WebP in the portfolio's `assets/images/`; they are not product photos.

The interface supports keyboard navigation, reduced motion, saved progress,
step replay/scrubbing, part labels, camera presets, exploded and transparent views.
Original instructions remain available if WebGL cannot start.

Third-party renderer: Three.js, MIT; see `public/THREE-LICENSE.txt`.
IKEA and its product names are trademarks of Inter IKEA Systems B.V. This project
is independent and is not affiliated with or endorsed by IKEA.
