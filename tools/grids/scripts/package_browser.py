"""Package the existing engine and model for isolated in-browser Python."""
from pathlib import Path
import argparse
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    args.destination.mkdir(parents=True, exist_ok=True)
    for name in ["browser-bridge.js", "browser-worker.mjs"]:
        shutil.copy2(ROOT / "godot/browser" / name, args.destination / name)
    modules = ["__init__", "game", "rules", "agents", "search", "browser_match"]
    with zipfile.ZipFile(args.destination / "python-engine.zip", "w", zipfile.ZIP_DEFLATED) as archive:
        for name in modules:
            path = ROOT / "src/grids_ai" / (name + ".py")
            archive.write(path, "grids_ai/" + path.name)
        archive.write(ROOT / "models/search_v3.json", "models/search_v3.json")
    print(f"Browser engine packaged in {args.destination}")


if __name__ == "__main__":
    main()
