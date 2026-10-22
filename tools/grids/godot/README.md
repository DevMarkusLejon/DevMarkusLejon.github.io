# Grids Godot prototype

Godot 4.7.2, GDScript, Compatibility renderer, single-threaded Web export.
This is a first local browser client using the original Grids 1.5.7 artwork
and the existing Python engine. It is not a GameMaker build.

## Run the exported prototype

From the repository root:

```powershell
python scripts/serve_godot.py
```

Open http://127.0.0.1:8766/ if the browser does not open automatically.
Python 3.11+ and NumPy are required. The server hosts one shared local match
and binds to loopback only. Keep the server running while playing.

Select your blue commander or a card, then click a highlighted square.
You can move, deploy, attack, heal, draw cards, use the default items, end your
turn, and reset the match. The existing search AI plays red. Movement between
positions is animated; attack/ability effects currently update directly.
There is no sound yet. The interface targets desktop and landscape use.

## Develop and export

Import `project.godot` in Godot. The client also runs natively against the
same local Python server. Gameplay rules stay in Python; the client renders
the public state and the server-provided legal actions.

Export using the `Web` preset to `../web/index.html`. Install export templates
matching your Godot version, or set the preset's custom template paths.
Avoid C# for this Web prototype.

## Current limits

This is one local match, not public multiplayer hosting. GitHub Pages alone
cannot run the Python service. Publishing requires a hosted match service,
per-player sessions, and configuring the client API address. No website has
been modified or published by this prototype work.

The existing v3 weights are reused with corrected rules and have not been
retrained or benchmarked again. Historical win rates are not claims about
this ruleset. See `RULESET_VERSION` in `src/grids_ai/rules.py`.

Fire ignites units on their destination tile, including deployment, teleport,
melee movement and knockback. Ignition along the original animation path,
pixel-level sight lines, corner/path knockback and overlapping ice effects
remain follow-up comparisons. No GameMaker runner was executed for this work.
