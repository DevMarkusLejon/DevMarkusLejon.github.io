# BILLY in 3D

Interactive companion for the white **80 × 28 × 202 cm BILLY**, article **002.638.50**, published at [Markus Lejon’s portfolio](https://devmarkuslejon.github.io/projects/billy/).

All 14 numbered assembly steps were visually checked against IKEA booklet **AA-1823127-9 (2024-03-25)**. There are 17 guide screens: preparation, steps 1–14 with step 12 split into raising and anchoring, and a final check. See [MANUAL-AUDIT.md](MANUAL-AUDIT.md) for the complete mapping and modelling limits.

## Develop and publish

```sh
cd tools/billy-guide
npm ci
npm run dev
npm run build
```

Vite writes the static, self-contained app to `projects/billy/`. Commit that output with the source. Run `python scripts/check-portfolio.py` from the repository root. GitHub Pages serves the files without a build service or sign-in. Three.js is bundled locally; its MIT notice is retained in `public/THREE-LICENSE.txt`.

Controls match the KALLAX guide: orbit, camera presets, connection close-ups, exploded and transparent views, replay/pause/scrubbing, saved progress, keyboard steps and reduced-motion support. Each screen opens the original IKEA drawing and offers the complete PDF. Browser-local progress uses a BILLY-specific key. No analytics or external runtime service is used.

Use the actual furniture, factory holes and booklet. Model thicknesses, fitting shapes and hole positions are illustrative; this is not a drilling template and has not been physically assembly-tested. Wall screws and any plugs must suit the actual wall.

`poster.html` is a development-only canvas capture page for the homepage image. It is not included in the published build.
