#!/usr/bin/env python3
"""Local mirror of .github/workflows/main.yml, scoped to what you changed.

As a Claude Code `Stop` hook (`--hook`): runs the CI checks for whichever side
of the repo has uncommitted changes, and blocks the turn from ending (exit 2,
report on stderr) until they pass, so Claude fixes what CI would reject.

Loop safety: results are cached per fingerprint of the changed files. The same
failing state never blocks twice, a passing state never re-runs, and one session
is blocked at most MAX_BLOCKS times in a row.

By hand:
    python3 .claude/hooks/ci_gate.py            # checks for the sides you changed
    python3 .claude/hooks/ci_gate.py --all      # the whole pipeline, plus build + compose
    python3 .claude/hooks/ci_gate.py --scope backend
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _common import BACKEND, FRONTEND, ROOT, emit, in_container, read_event, run, running_services, tail  # noqa: E402

MAX_BLOCKS = 3
STATE_FILE = ROOT / ".claude" / ".cache" / "ci-gate.json"

# Same commands, same order as the CI jobs. Kept literal so a diff against
# main.yml is easy to eyeball when either side changes.
CHECKS: dict[str, list[tuple[str, list[str]]]] = {
    "backend": [
        ("PHPStan", in_container("app", "vendor/bin/phpstan", "analyse", "--configuration=phpstan.neon",
                                 "--memory-limit=512M", "--no-progress")),
        ("ECS", in_container("app", "vendor/bin/ecs", "check", "--no-progress-bar")),
        ("Rector", in_container("app", "vendor/bin/rector", "process", "--dry-run", "--no-progress-bar")),
        ("Pest", in_container("app", "vendor/bin/pest")),
    ],
    "frontend": [
        ("Typecheck", in_container("react", "yarn", "-s", "typecheck")),
        ("ESLint", in_container("react", "yarn", "-s", "lint")),
        ("Prettier", in_container("react", "yarn", "-s", "format:check")),
        ("Vitest", in_container("react", "yarn", "-s", "test")),
    ],
    "compose": [
        ("compose config", ["docker", "compose", "config", "-q"]),
    ],
}
# Slow or side-effecting, so only on an explicit full run.
FULL_ONLY: dict[str, list[tuple[str, list[str]]]] = {
    "frontend": [("Build", in_container("react", "yarn", "-s", "build"))],
}
NEEDS: dict[str, set[str]] = {
    "backend": {"app", "db", "mongo"},
    "frontend": {"react"},
    "compose": set(),
}
FIX_HINTS = {
    "ECS": "docker compose exec -T app composer ecs-fix",
    "Rector": "docker compose exec -T app composer rector-fix",
    "Prettier": "docker compose exec -T react yarn format",
}


@dataclass
class Result:
    side: str
    name: str
    code: int
    seconds: float
    output: str


def changed_files() -> list[str]:
    """Uncommitted paths (staged, unstaged, untracked), repo-relative."""
    try:
        out = subprocess.run(
            ["git", "status", "--porcelain=v1", "-z", "--untracked-files=all"],
            cwd=ROOT, capture_output=True, text=True, check=True,
        ).stdout
    except (OSError, subprocess.CalledProcessError):
        return []
    entries = out.split("\0")
    paths: list[str] = []
    i = 0
    while i < len(entries):
        entry = entries[i]
        i += 1
        if len(entry) < 4:
            continue
        paths.append(entry[3:])
        if entry[0] in "RC":  # rename/copy: the next entry is the old path
            i += 1
    return paths


def side_of(path: str) -> str | None:
    p = Path(path)
    parts = p.parts
    if not parts:
        return None
    if parts[0] == BACKEND:
        if any(seg in {"vendor", "storage"} for seg in parts) or path.startswith(f"{BACKEND}/bootstrap/cache/"):
            return None
        return "backend" if p.suffix in {".php", ".neon", ".xml", ".json", ".lock"} else None
    if parts[0] == FRONTEND:
        if any(seg in {"node_modules", "build", "coverage"} for seg in parts):
            return None
        if p.name == "Dockerfile":
            return "compose"
        return "frontend" if p.suffix in {".ts", ".tsx", ".css", ".js", ".json", ".jsonc", ".html", ".lock"} else None
    if path in {"docker-compose.yml", ".env.docker.example"} or parts[0] in {"php", "nginx"}:
        return "compose"
    return None


def fingerprint(paths: list[str]) -> str:
    digest = hashlib.sha256()
    for path in sorted(paths):
        digest.update(path.encode())
        file = ROOT / path
        digest.update(hashlib.sha256(file.read_bytes()).digest() if file.is_file() else b"<deleted>")
    return digest.hexdigest()


def run_side(side: str, full: bool) -> list[Result]:
    results = []
    for name, argv in CHECKS[side] + (FULL_ONLY.get(side, []) if full else []):
        started = time.monotonic()
        code, output = run(argv, timeout=600)
        results.append(Result(side, name, code, time.monotonic() - started, output))
    return results


def report(failures: list[Result]) -> str:
    lines = ["CI gate (local mirror of .github/workflows/main.yml) failed:", ""]
    for r in failures:
        lines.append(f"## {r.name} ({r.side}) - exit {r.code}")
        lines.append("```")
        lines.append(tail(r.output, 60))
        lines.append("```")
        if r.name in FIX_HINTS:
            lines.append(f"Autofix: `{FIX_HINTS[r.name]}`")
        lines.append("")
    lines.append(
        "Fix these before finishing. If a failure predates your change, say so to the user "
        "instead of working around it. Re-run one check with the command from CLAUDE.md."
    )
    return "\n".join(lines)


def load_state() -> dict:
    try:
        return json.loads(STATE_FILE.read_text())
    except (OSError, json.JSONDecodeError):
        return {}


def save_state(state: dict) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state))


def execute(sides: list[str], full: bool) -> tuple[list[Result], list[str]]:
    """Runs each side's checks; sides in parallel, checks within a side in CI order."""
    up = running_services()
    runnable, skipped = [], []
    for side in sides:
        missing = NEEDS[side] - up
        (skipped if missing else runnable).append(side)
    with ThreadPoolExecutor(max_workers=max(len(runnable), 1)) as pool:
        results = [r for batch in pool.map(lambda s: run_side(s, full), runnable) for r in batch]
    return results, skipped


def hook_main() -> int:
    event = read_event()
    session = str(event.get("session_id", "manual"))

    paths = [p for p in changed_files() if side_of(p)]
    if not paths:
        return 0
    sides = sorted({side_of(p) for p in paths if side_of(p)})
    fp = fingerprint(paths)

    state = load_state()
    if state.get("pass") == fp:
        return 0
    blocks = state.get("blocks", {}).get(session, 0)
    if state.get("fail") == fp or blocks >= MAX_BLOCKS:
        emit({"systemMessage": "CI gate: still failing for these changes; not blocking again. "
                               "Run `python3 .claude/hooks/ci_gate.py` for the report."})
        return 0

    started = time.monotonic()
    results, skipped = execute(sides, full=False)
    failures = [r for r in results if r.code != 0]
    note = f" (skipped {', '.join(skipped)}: stack not running, `make up`)" if skipped else ""

    if failures:
        state["fail"] = fp
        state.setdefault("blocks", {})[session] = blocks + 1
        save_state(state)
        print(report(failures) + note, file=sys.stderr)
        return 2

    if results:
        state["pass"] = fp
    state.get("blocks", {}).pop(session, None)
    save_state(state)
    ran = ", ".join(f"{r.name}" for r in results) or "nothing"
    emit({"systemMessage": f"CI gate passed in {time.monotonic() - started:.0f}s: {ran}{note}"})
    return 0


def cli_main(args: argparse.Namespace) -> int:
    if args.all:
        sides = list(CHECKS)
    elif args.scope != "auto":
        sides = [args.scope]
    else:
        sides = sorted({s for p in changed_files() if (s := side_of(p))})
        if not sides:
            print("No uncommitted backend/frontend/compose changes; use --all to run everything.")
            return 0

    results, skipped = execute(sides, full=args.all)
    for r in results:
        status = "ok  " if r.code == 0 else "FAIL"
        print(f"{status} {r.side:<8} {r.name:<15} {r.seconds:5.1f}s")
    for side in skipped:
        print(f"SKIP {side:<8} needs {', '.join(sorted(NEEDS[side]))} running (`make up`)")
    failures = [r for r in results if r.code != 0]
    if failures:
        print()
        print(report(failures))
        return 1
    return 1 if skipped and not results else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--hook", action="store_true", help="run as a Claude Code Stop hook")
    parser.add_argument("--all", action="store_true", help="every check, plus the production build")
    parser.add_argument("--scope", choices=["auto", *CHECKS], default="auto")
    args = parser.parse_args()
    return hook_main() if args.hook else cli_main(args)


if __name__ == "__main__":
    sys.exit(main())
