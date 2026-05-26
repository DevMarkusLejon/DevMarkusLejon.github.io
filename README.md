# Markus Lejon Portfolio

Static portfolio website for GitHub Pages. It uses plain HTML, CSS, and JavaScript, so there is no build step.

Repository: `DevMarkusLejon/DevMarkusLejon.github.io`
Site URL: `https://DevMarkusLejon.github.io/`

## Files

- `index.html` - page content and structure
- `styles.css` - responsive styling
- `script.js` - small canvas animation and footer year
- `assets/posters/` - poster art for project video slots
- `assets/videos/` - place exported project videos here
- `tools/run_project.py` - local Python launcher for sibling project repos
- `.nojekyll` - tells GitHub Pages to serve the site as plain static files

## Preview Locally

Open `index.html` directly in a browser, or run a simple local server:

```powershell
npx serve .
```

## Project Videos

The site has three ready video slots. Add MP4 files with these names:

- `assets/videos/spot-rl-demo.mp4`
- `assets/videos/grids-ai-demo.mp4`
- `assets/videos/chess-robot-demo.mp4`

The existing poster images will show until the clips are added.

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
2. Upload `index.html`, `styles.css`, `script.js`, `.nojekyll`, and `assets/` to the repository root.
3. In GitHub, go to `Settings` -> `Pages`.
4. Set `Build and deployment` to `Deploy from a branch`.
5. Select branch `main` and folder `/(root)`, then save.

For a project site at `https://<username>.github.io/<repo>/`, use any repository name and the same Pages settings.

## Notes

The site currently uses email, LinkedIn, and GitHub as contact methods. A public phone number or downloadable CV PDF can be added later if desired.

Official GitHub Pages docs:

- https://docs.github.com/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
