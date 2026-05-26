#!/usr/bin/env python3
"""Run local project demos from sibling repositories.

This portfolio is hosted on GitHub Pages, which cannot execute Python for a
visitor. This helper is for local demos from the repository root.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
GITHUB_ROOT = ROOT.parent


@dataclass(frozen=True)
class Project:
    key: str
    title: str
    repo: Path
    package: str
    install_hint: str

    def is_ready(self) -> bool:
        return (self.repo / self.package / "__main__.py").exists()


PROJECTS = {
    "grids_ai": Project(
        key="grids_ai",
        title="Grids AI",
        repo=GITHUB_ROOT / "Grids_ai_python",
        package="grids_ai",
        install_hint="Expected grids_ai/__main__.py inside the Grids_ai_python repository.",
    )
}

PROJECT_MODES = {
    "grids_ai": {
        "terminal": (
            "Play a human-vs-heuristic terminal match.",
            ["-m", "grids_ai.cli", "--blue", "human", "--red", "heuristic"],
        ),
        "watch": (
            "Watch heuristic AI play both sides with a short action delay.",
            [
                "-m",
                "grids_ai.cli",
                "--blue",
                "heuristic",
                "--red",
                "heuristic",
                "--weights",
                "trained_weights.json",
                "--delay",
                "0.4",
            ],
        ),
        "strongest": (
            "Play against the strongest bundled neural value model.",
            [
                "-m",
                "grids_ai.cli",
                "--blue",
                "human",
                "--red",
                "neural",
                "--model",
                "checkpoints/value_model_torch_128_shaped_1000_300hp.json",
                "--neural-search-width",
                "3",
                "--neural-search-depth",
                "4",
            ],
        ),
        "web": (
            "Serve the static browser game at http://127.0.0.1:8765/web/.",
            ["-m", "http.server", "8765", "--bind", "127.0.0.1"],
        ),
    }
}


def list_projects() -> int:
    for project in PROJECTS.values():
        state = "ready" if project.is_ready() else "waiting for entrypoint"
        repo_display = project.repo.relative_to(GITHUB_ROOT)
        print(f"{project.key}: {project.title} ({state})")
        print(f"  repo: {repo_display}")
        if project.is_ready():
            print("  modes:")
            for mode, (description, _) in PROJECT_MODES[project.key].items():
                print(f"    {mode}: {description}")
        else:
            print(f"  next: {project.install_hint}")
    return 0


def run_project(key: str, mode: str, extra_args: list[str]) -> int:
    project = PROJECTS.get(key)
    if not project:
        names = ", ".join(sorted(PROJECTS))
        print(f"Unknown project '{key}'. Available projects: {names}", file=sys.stderr)
        return 2

    if not project.repo.exists():
        print(f"Repository not found: {project.repo}", file=sys.stderr)
        return 2

    if not project.is_ready():
        print(f"{project.title} is present, but no runnable Python entrypoint was found.")
        print(project.install_hint)
        print(f"Checked: {project.repo / project.package / '__main__.py'}")
        return 2

    project_modes = PROJECT_MODES[project.key]
    if mode not in project_modes:
        names = ", ".join(sorted(project_modes))
        print(f"Unknown mode '{mode}'. Available modes: {names}", file=sys.stderr)
        return 2

    _, mode_args = project_modes[mode]
    command = [sys.executable, *mode_args, *extra_args]
    if mode == "web":
        print("Serving Grids AI at http://127.0.0.1:8765/web/")
    print("Running:", " ".join(command))
    return subprocess.call(command, cwd=project.repo)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run local portfolio project demos.")
    parser.add_argument("--list", action="store_true", help="List configured local projects.")
    parser.add_argument("--project", choices=sorted(PROJECTS), help="Project key to run.")
    parser.add_argument(
        "--mode",
        default="terminal",
        help="Run mode. For grids_ai: terminal, watch, strongest, or web.",
    )
    parser.add_argument("project_args", nargs=argparse.REMAINDER, help="Arguments passed to the project.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if args.list or not args.project:
        return list_projects()

    extra_args = args.project_args
    if extra_args[:1] == ["--"]:
        extra_args = extra_args[1:]

    return run_project(args.project, args.mode, extra_args)


if __name__ == "__main__":
    raise SystemExit(main())
