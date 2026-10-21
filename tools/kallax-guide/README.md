# KALLAX in 3D

A small interactive portfolio project, published at [/projects/kallax/](https://devmarkuslejon.github.io/projects/kallax/).

The complete instructions support IKEA KALLAX 2×2, article 202.758.14, **AA-2703308-1 (10 dowels)**. Both floor-standing and wall-hung branches were checked visually against the official PDF. The 14-dowel kit has a different sequence and is linked separately. See [MANUAL-AUDIT.md](MANUAL-AUDIT.md) for every source page and the modelling limits. Physical assembly has not been tested; holes, panel thicknesses and hardware geometry are illustrative.

## Develop and publish

```sh
cd tools/kallax-guide
npm ci
npm run dev
npm run build
```

The build writes the static app to `projects/kallax/` with its own local Three.js bundle and manual assets. Commit that output alongside the source; GitHub Pages has no build dependency or sign-in requirement. Run `python scripts/check-portfolio.py` from the repository root before publishing.

`main.js` uses Vite's base URL for runtime manual paths so the guide works at its nested portfolio URL. The portfolio entry uses a static model capture, so opening the homepage does not load the 3D renderer.

The guide includes source drawings, parts inventory, camera controls, exploded and transparent views, replay/pause/scrubbing, browser-local saved progress, both installation paths, keyboard navigation, and reduced-motion support. The colour palette, typography and header follow the surrounding portfolio. No analytics or external runtime services are used.

Three.js and its included controls/geometries are MIT licensed; the original notice is retained in `public/THREE-LICENSE.txt` and the published output.

To refresh the homepage image, open `/poster.html` on the development server, frame the model, and capture the canvas. This development-only page is not included in the published build.
