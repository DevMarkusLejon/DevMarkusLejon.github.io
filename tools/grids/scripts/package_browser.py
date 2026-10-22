"""Package the existing engine and model for isolated in-browser Python."""
from pathlib import Path
import argparse
import shutil
import zipfile
import hashlib
import re
import json

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
    version = hashlib.sha256()
    for name in ["browser-bridge.js", "browser-worker.mjs", "python-engine.zip", "index.pck"]:
        version.update((args.destination / name).read_bytes())
    html_path = args.destination / "index.html"
    html = html_path.read_text(encoding="utf-8")
    html = re.sub(r'browser-bridge\.js(?:\?v=[a-f0-9]+)?', "browser-bridge.js?v=" + version.hexdigest()[:16], html)
    def configure_pack(match):
        config = json.loads(match[1])
        pack = "index.pck?v=" + version.hexdigest()[:16]
        config["mainPack"] = pack
        config["fileSizes"][pack] = config["fileSizes"]["index.pck"]
        return "const GODOT_CONFIG = " + json.dumps(config, separators=(",", ":")) + ";"
    html = re.sub(r"const GODOT_CONFIG = (\{[^\n]+\});", configure_pack, html)
    html_path.write_text(html, encoding="utf-8")
    print(f"Browser engine packaged in {args.destination}")


if __name__ == "__main__":
    main()
