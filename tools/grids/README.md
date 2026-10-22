# Grids: Godot + Python in the browser

Public entry point: https://devmarkuslejon.github.io/grids/

This replaces the portfolio's earlier Grids Python recreation. The Godot
client uses the original Grids 1.5.7 artwork and a source-derived Python
engine, plus the existing v3 search AI. The model has not been retrained or
given new win-rate benchmarks after the rule corrections.

## Separate matches

Every page creates its own module Web Worker. Pyodide 314.0.7 loads Python and
NumPy in that worker, then instantiates one `PrototypeMatch` with a fresh seed.
Godot sends intended actions through `JavaScriptBridge`. Match state never
goes to a shared server or another visitor. Opening another tab creates
another independent match; reloading starts a fresh one. There is no account,
server session, persistent save or cross-device continuation.

Pyodide/NumPy are loaded from the pinned official distribution on jsDelivr.
The game files, Python engine bundle and model are hosted here on GitHub Pages.
AI calculation runs off the UI thread. It still uses the same Python rules
and search implementation; this is not a second JavaScript rules engine.

## Source and build

- `godot/`: editable Godot project, GDScript, original PNGs and browser bridge.
- `src/grids_ai/`: the rules, match state, search AI and isolated-match adapter.
- `models/search_v3.json`: existing model weights and search settings.
- `scripts/package_browser.py`: package Python source and model into a ZIP for Pyodide.
- `../../grids/`: deployable, single-threaded Godot Web export.

With Godot 4.7.2 and matching Web export templates installed:

```powershell
.\build.ps1 -GodotBin 'C:\path\to\Godot_console.exe'
```

The build needs Python 3.11+ for packaging, but does not need NumPy on the build
machine. Visitors do not install Python, Godot or GameMaker.

For preview, serve the repository root using an ordinary static HTTP server.
There is no `/api` server to start. Use HTTP, not `file://`.

## Current scope

Plains and the default deck; movement, deployment, combat, healing, items,
draws, end turn and AI replies. Desktop/landscape controls. Basic movement
interpolation; combat effects and sound remain future work. Pixel-level
line-of-sight, corner knockback, overlapping ice and fire along animated paths
remain fidelity comparisons. See `godot/ASSETS.md` for artwork provenance.

Publishing uses the portfolio's existing GitHub Pages deployment from `main`.
Changes in this folder do not affect older projects in other repositories.
