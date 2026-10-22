"""Verify the deployed Grids files match the editable Python source."""
import ast
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
game = ROOT / "grids"
source = ROOT / "tools/grids"
for name in ["index.html", "index.js", "index.wasm", "index.pck", "browser-bridge.js", "browser-worker.mjs"]:
    assert (game / name).is_file(), f"Missing game file: {name}"
for name in ["browser-bridge.js", "browser-worker.mjs"]:
    assert (game / name).read_bytes() == (source / "godot/browser" / name).read_bytes(), f"Stale deployed bridge: {name}"
with zipfile.ZipFile(game / "python-engine.zip") as archive:
    for name in ["__init__", "game", "rules", "agents", "search", "browser_match"]:
        member = f"grids_ai/{name}.py"
        code = archive.read(member)
        assert code.decode("utf-8").replace("\r\n", "\n") == (source / "src" / member).read_text(encoding="utf-8"), f"Stale engine module: {name}"
        ast.parse(code)
    model = archive.read("models/search_v3.json")
    assert model.decode("utf-8").replace("\r\n", "\n") == (source / "models/search_v3.json").read_text(encoding="utf-8"), "Stale AI model"
    assert json.loads(model)["format"] == "grids-ai-linear-v1"
assert 'browser-bridge.js' in (game / "index.html").read_text(encoding="utf-8")
print("Grids check passed: static game, Python bundle, bridge and model are consistent.")
