"""Shared plumbing for the Claude Code hooks in this directory.

Hooks run on the host, which has Docker and Python but no PHP or Node, so every
check is a `docker compose exec -T <service> ...` from the repository root.
Stdlib only: nothing to install before the hooks work on a fresh clone.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

ROOT = Path(os.environ.get("CLAUDE_PROJECT_DIR") or Path(__file__).resolve().parents[2])
BACKEND = "backend_full_laravel"
FRONTEND = "frontend_react"

_ANSI = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]")


def read_event() -> dict[str, Any]:
    """The hook's JSON payload from stdin; empty when run by hand."""
    if sys.stdin.isatty():
        return {}
    raw = sys.stdin.read()
    if not raw.strip():
        return {}
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return payload if isinstance(payload, dict) else {}


def emit(payload: dict[str, Any]) -> None:
    print(json.dumps(payload))


def run(argv: list[str], timeout: int = 300) -> tuple[int, str]:
    """Runs from the repo root (where docker-compose.yml lives); merged output, ANSI stripped."""
    try:
        proc = subprocess.run(
            argv,
            cwd=ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            timeout=timeout,
        )
    except FileNotFoundError:
        return 127, f"{argv[0]}: not found"
    except subprocess.TimeoutExpired:
        return 124, f"timed out after {timeout}s: {' '.join(argv)}"
    return proc.returncode, _ANSI.sub("", proc.stdout)


def running_services() -> set[str]:
    """Compose services currently up. Empty when Docker or the stack is down."""
    code, out = run(["docker", "compose", "ps", "--status", "running", "--services"], timeout=20)
    if code != 0:
        return set()
    return {line.strip() for line in out.splitlines() if line.strip()}


def in_container(service: str, *argv: str) -> list[str]:
    return ["docker", "compose", "exec", "-T", service, *argv]


def tail(text: str, lines: int = 60) -> str:
    kept = text.rstrip().splitlines()[-lines:]
    return "\n".join(kept)


def relative(path: str) -> str | None:
    """Repo-relative POSIX path, or None when the file is outside the repo."""
    try:
        return Path(path).resolve().relative_to(ROOT.resolve()).as_posix()
    except ValueError:
        return None
