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
another independent match. Reloading resumes this tab's saved match. There is
no account, shared server session or cross-device continuation.

## Autosave, move log and inspection

After every accepted action or mode change, the worker sends a versioned JSON
snapshot to the bridge. The bridge commits it to localStorage before Godot
reveals or animates the action. A reload during an animation therefore resumes
the completed game action without repeating its damage. An interrupted AI
calculation resumes from the last committed action. Saved data includes both
hands and deck order, units/statuses, logs, fire, turn/revision, AI control and
pause mode, the last 500 log entries, speed and sound preferences.

sessionStorage identifies the tab's match. A Web Lock prevents duplicated tabs
from writing the same save: the new tab forks the saved position under a fresh
ID. A fresh tab starts a new match. Without Web Locks, navigation forks the
snapshot conservatively. Match data stays in this browser; clearing browser
storage removes it. A browser-restored tab can resume its session ID, but a new
tab after closing one does not provide a saved-match picker.

Save files use explicit JSON and the ruleset version, never pickle. Invalid or
incompatible files are retained under their original key; a new match uses a
new key and explains the issue in the log. Blocked/full storage also displays a
save notice. `Ny match` replaces this tab's current save with a new manual match.
The original pre-autosave release cannot save an already-running old match.

`Draglogg` (L) shows action descriptions, damage, HP changes, armor and deaths.
`Pausa båda` freezes either AI side after the current action, and `Nästa drag`
(N) plays exactly one action while remaining paused, even across turn changes.
These controls are also inside the log. Space toggles watch pause.

Hover over either team's units for HP, armor, damage/healing, movement, range,
costs and statuses; right-click pins the information. Green cells show movement
reach and red outlines show base attack range, including ranged sight blocking.
These are inspection previews, not a promise that a target is legal this turn;
selected human actions retain the stronger legal-action highlights. Hover over
cards for their cost, stats and descriptions adapted from `scr_getIconInfo`.
Descriptions match the port's implemented rules; Ninja invisibility is explicitly
marked as not implemented.

Pyodide/NumPy are loaded from the pinned official distribution on jsDelivr.
The game files, Python engine bundle and model are hosted here on GitHub Pages.
AI calculation runs off the UI thread. It still uses the same Python rules
and search implementation; this is not a second JavaScript rules engine.

AI turns advance through `/api/ai-step`, one action per worker request. The
Godot client waits one second between board updates, marks the affected cells
and shows the action description. Human moves are blocked during the AI turn;
resetting during a pause invalidates the pending step using the match revision.
Combat plays to completion before the next action can start. Its public event
records source/impact cells, HP and armor changes, and deaths for both players.
The client reveals the new board at impact, then animates knockback, HP bars,
rising red damage numbers, blue armor loss and green healing numbers. Lethal
hits retain their full damage value while the HP bar stops at zero.

## Auto play and sound

`Se AI mot AI` hands the current blue turn to the search AI without changing
units, cards, remaining actions or the turn. Both sides then advance one action
at a time using the same model and rules. `Ta över blått` gives blue back
to the human after an in-flight action finishes; red completes its current turn
if necessary. Mode changes invalidate pending timers through the revision and
clear the search cache. Reset returns to manual play, and terminal matches stop.
The mode belongs only to this tab's isolated worker.

The `AUTO PLAY-TEMPO` selector offers 0.5x, 1x (default), 2x and 4x.
It scales the pause, movement and combat presentation only while auto play is
active. Changes apply during the current wait or animation. Human play and
normal red AI replies retain their original pace; audio pitch and the AI's
search/rules are unchanged. Actual search time still depends on the position.
The selected speed remains through a match reset and is restored on reload.

Original WAV effects play at cast and impact times. Melee hits use the original
target materials; arrows, ice, meteors, fire and healing have their own effects.
`Ljud: på/av` stops active sounds and mutes future ones without stopping play.
See `godot/audio/ASSETS.md` for exact source files and timing.

## Source and build

- `godot/`: editable Godot project, GDScript, original PNGs and browser bridge.
- `src/grids_ai/`: the rules, match state, search AI and isolated-match adapter.
- `models/search_v3.json`: existing model weights and search settings.
- `scripts/package_browser.py`: package Python source and model into a ZIP for Pyodide.
- `tests/test_browser_save.py`: JSON restore, pause/step, inspector and history regressions.
- `../../grids/`: deployable, single-threaded Godot Web export.

With Godot 4.7.2 and matching Web export templates installed:

```powershell
.\build.ps1 -GodotBin 'C:\path\to\Godot_console.exe'
```

The build needs Python 3.11+ for packaging, but does not need NumPy on the build
machine. Visitors do not install Python, Godot or GameMaker.

For preview, serve the repository root using an ordinary static HTTP server.
There is no `/api` server to start. Use HTTP, not `file://`.
The pack, bridge, worker and Python bundle share a build token in their URLs to
avoid mixing cached versions after an update.

## Current scope

Plains and the default deck; movement, deployment, combat, healing, items,
draws, end turn and AI replies. Desktop/landscape controls. Basic movement
interpolation, melee lunges/rotation, arrow flight, casting, impact particles,
ice, healing and meteor effects use original artwork and sound effects. Pixel-level
line-of-sight, corner knockback, overlapping ice and fire along animated paths
remain fidelity comparisons. See `godot/ASSETS.md` for artwork provenance.

Publishing uses the portfolio's existing GitHub Pages deployment from `main`.
Changes in this folder do not affect older projects in other repositories.

## Verification, 22 October 2026

The live HTTPS page was tested in Chromium with two independent browser
contexts. A commander move, end turn, AI response and reset in the first
context did not change the second context's turn, revision or unit position.
The tested live page had zero console errors and warnings. The underlying
engine's 103 tests passed, including individual AI steps, reset invalidation,
damage, armor, lethal hits, healing, fire damage and auto play takeover,
both AI sides, pause, stale mode requests, reset and terminal stopping. Chromium render fixtures
cover melee, arrows, ice, healing, death, armor, logs, meteors and burning.
These fixtures use real engine results with the browser bridge stubbed for
repeatable visual inspection. Normal-speed AI pauses remain one second after animation.
An actual worker match continued from a partial human turn through blue and red
AI turns, preserved the takeover position and stopped on pause. Browser checks
also cover quick start/pause clicks and reset cancellation. Web Audio metering
confirmed nonzero output for original effects and zero output for a muted hit.
Controlled browser timing checks measured AI pauses of about 2.0, 1.0, 0.52
and 0.27 seconds at 0.5x/1x/2x/4x. Combat lasted about 2.74 seconds at 0.5x
and 0.36 seconds at 4x; a manual attack retained its 1.35-second duration.
A speed change during an attack immediately changed its remaining duration.
Browser reload checks cover manual play, active and paused auto play, speed and
sound restoration, and one-step playback. Same-context tabs and duplicated tabs
kept separate saves. Invalid saves were preserved, and blocked storage reported
its limitation while allowing play. Reloading during a hit restored its committed
HP result and one log entry without replaying damage. Log-window stepping also
stayed paused. CI runs the 20 save/inspector regressions,
links, deployed bundle
consistency and worker JavaScript syntax. A full browser match to victory and
mobile/Safari have not been validated.
