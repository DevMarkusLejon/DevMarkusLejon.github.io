# Markus Lejon Portfolio

Static portfolio website for GitHub Pages. It uses plain HTML, CSS, and JavaScript, so there is no build step.

Repository: `DevMarkusLejon/DevMarkusLejon.github.io`
Site URL: `https://DevMarkusLejon.github.io/`

## Files

- `index.html` - page content and structure
- `styles.css` - responsive styling
- `script.js` - footer year and pause-on-hidden video behavior
- `projects/spot.html` - evidence-backed Spot thesis case study
- `assets/images/` - responsive photographs, deployment poster, hardware plot, social preview
- `assets/posters/` - retained project images (the Grids screenshot is used)
- `assets/videos/` - compressed Spot and public-safe RobotLab excerpts
- `assets/documents/` - public CV, full thesis, and Swedish popular-science summary
- `assets/MEDIA_SOURCES.md` - media provenance and derivation notes
- `scripts/check-portfolio.py` - local link, asset, fragment, and sitemap checks
- `tools/run_project.py` - local Python launcher for sibling project repos
- `.nojekyll` - tells GitHub Pages to serve the site as plain static files

## Preview Locally

Open `index.html` directly in a browser, or run a simple local server:

```powershell
npx serve .
```

## Portfolio verification

Run the portfolio check before publishing:

```powershell
python scripts/check-portfolio.py
```

The same check runs in `.github/workflows/portfolio-check.yml`. It does not
make remote requests or prove deployment is live. Serve the site and test both
pages at 320, 375, 390, 768, and 1440 px; check keyboard navigation, video
playback, reduced motion, and the no-JavaScript fallback.

For the repeatable browser checks, serve the repository on port 4173, open it
with Playwright CLI, then run the provided script:

```powershell
python -m http.server 4173 --bind 127.0.0.1
# In a second terminal:
npx --yes --package @playwright/cli playwright-cli -s=portfolio open http://127.0.0.1:4173/
npx --yes --package @playwright/cli playwright-cli -s=portfolio run-code --filename=scripts/check-portfolio-browser.js
```

Screenshots go to `output/playwright/` (ignored by Git). The browser script
checks both page layouts, local HTTP failures, images, playback, reduced motion,
and the no-JavaScript contact/work links. Keyboard behavior still needs a manual check.

## Project media

The Spot clip is a silent, 20-second hardware-test excerpt (about 543 KB).
It plays only on request, with a poster and a caption identifying the safety tether.
The case study separates simulation success rates from hardware limitations.
The thesis was co-authored with Fredrik Sundt in 2026.

See `assets/MEDIA_SOURCES.md` for sources. The old unused placeholder posters
are retained, but missing media slots and the visitor-facing localhost link have
been removed. The public CV has applied address/phone redactions; the supplied original
is unchanged. RobotLab footage has no audio, crops out the connection-control panel,
and masks the visible bystander. The clip documents a physical network demo, not
a network performance benchmark. Remaining content tasks are tracked in `PORTFOLIO_TODO.md`.

## Run Local Python AI Games

GitHub Pages cannot execute Python in the browser. For local demos, run:

```powershell
python tools/run_project.py --list
python tools/run_project.py --project grids_ai --mode terminal
python tools/run_project.py --project grids_ai --mode watch
python tools/run_project.py --project grids_ai --mode web
```

The launcher looks for the sibling repository at `../Grids_ai_python`.
Use `--mode web`, then open `http://127.0.0.1:8765/web/` for the browser version.
Use `--mode strongest` to play against the strongest bundled neural model.

## Publish With GitHub Pages

For a personal portfolio at `https://<username>.github.io/`:

1. Create a public GitHub repository named `<username>.github.io`.
2. Publish the repository, including `projects/`, `assets/`, `favicon.svg`, `robots.txt`, `sitemap.xml`, and `.nojekyll`.
3. In GitHub, go to `Settings` -> `Pages`.
4. Set `Build and deployment` to `Deploy from a branch`.
5. Select branch `main` and folder `/(root)`, then save.

For a project site at `https://<username>.github.io/<repo>/`, use any repository name and the same Pages settings.

## Notes

The site uses email, LinkedIn, and GitHub as contact methods and provides a public-safe
CV download. The private street address and phone are not included in the public CV.

Official GitHub Pages docs:

- https://docs.github.com/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
