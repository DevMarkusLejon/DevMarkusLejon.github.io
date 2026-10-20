# Controller explorer

Interactive page: `/projects/controllers.html`. The site has no external runtime dependency: Three.js r160 is vendored under `vendor/` with its MIT license. It uses WebGL where available and a depth-buffered Canvas2D renderer otherwise. Rotation, zoom, assembly separation and underside views work with either renderer. No automatic motion.

## Wooden controller

Photo reconstruction of Markus Lejon's existing handwired build. The enclosure dimensions are 360.68 × 165.10 × 21 mm, matching JMatthewK/f1copy's README, as confirmed by Markus. These dimensions replaced the initial visual estimate before publication.

The 22 switch positions were perspective-corrected from the top photograph. There are 18 clear caps and four black H/K/G/E caps. The electronics represent a Pico and Treedix USB-C breakout. Interior dimensions, wire routes, component mounting, the USB opening and unseen bottom cover are approximations. No personal source photos are published. This is not manufacturing CAD.

## BubbleBox attribution and changes

Original design: **UMS-Ultra / BubbleBox**, https://github.com/UMS-Ultra/BubbleBox

Sources: `Controller Body Print Files/Mono Case Files/BubbleBox V4 RH Standard.3MF` and `BubbleBox V4 Mono Bottom Panel.3MF`.

License: **Creative Commons Attribution-NonCommercial 4.0 International**, see `BUBBLEBOX-LICENSE.txt` and https://creativecommons.org/licenses/by-nc/4.0/ . The derived BubbleBox geometry, GLB and rendered previews retain that license. Attribution is shown on the project page.

Changes: shell reconstructed from sampled CAD cross-sections (five height bands for body, three for bottom), contours simplified to reduce download size, reoriented for display, teal material assigned. Switches, round caps, hot-swap sockets, screws, Pico, Bird-D USB board and wiring are schematic additions. Dimensions and details are simplified; use original 3MF files for manufacture. The Treedix adaptation has not been designed.

## Rebuild

`geometry.json` stores the photo-derived key positions and CAD-derived section contours. `models.mjs` creates the shared scene for the viewer, downloads and previews.

- `node scripts/export-controllers.mjs`: regenerate both GLBs, including an Explode animation, in metre units.
- `node scripts/render-controllers.mjs`: regenerate six WebP previews; requires `@napi-rs/canvas`.
- `python scripts/check-portfolio.py`: check page links and metadata.

The GLB exporter uses glTF 2.0 geometry, PBR materials, a millimetre-to-metre root transform and animated part translations. All assets are hosted on the same GitHub Pages site.
