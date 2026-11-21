#!/usr/bin/env python3
"""PreToolUse hook for Bash: stop commands that are wrong for this repo before they run.

`deny` for commands that cannot be right here, with the right command in the
reason so Claude retries correctly. `ask` for commands that are legitimate but
destroy local data or reach production, so a human confirms.
"""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _common import ROOT, emit, read_event  # noqa: E402

SEGMENT_SPLIT = re.compile(r"&&|\|\||;|\||\n")

DENY: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\b(npm|pnpm)\s+(install|i|ci|add|update|up|uninstall|remove|rm)\b"),
     "The frontend is yarn-only (yarn.lock is the single lockfile). Use "
     "`docker compose exec react yarn add <pkg>`, then "
     "`docker compose up -d --build --force-recreate --renew-anon-volumes react`."),
    (re.compile(r"\bgit\s+push\b.*\s(--force|-f)(\s|$)"),
     "Force-push is blocked. Use `--force-with-lease` on your own branch, never on main."),
    (re.compile(r"\b(pest|phpunit|artisan\s+test)\b.*MONGODB_DATABASE=(?!\S*_testing)"),
     "Tests wipe Mongo collections; MONGODB_DATABASE must end in `_testing`."),
]

ASK: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bdocker\s+compose\s+down\b.*\s(-v|--volumes)\b|\bdocker\s+volume\s+(rm|prune)\b"
                r"|\bdocker\s+system\s+prune\b.*--volumes"),
     "Deletes the pgdata/mongodata/minio-data volumes: every local account, post and upload. "
     "Hand-made accounts cannot be re-seeded."),
    (re.compile(r"\b(migrate:fresh|migrate:reset|migrate:rollback|db:wipe)\b|\bmake\s+fresh\b"),
     "Drops or rolls back tables in the development database (`blog`). Tests do not need this; "
     "Pest refreshes its own `testing` database."),
    (re.compile(r"\bartisan\s+(migrate|db:seed)\b.*--force|\bDB_URL=\S*neon"),
     "Looks like a production database operation. deploy-db in CI owns production migrations."),
]

# Programs that only exist inside a container, and the prefix that reaches them.
CONTAINER_ONLY: list[tuple[re.Pattern[str], str, str]] = [
    (re.compile(r"^(php|composer|\./?vendor/bin/|vendor/bin/)"), "php", "docker compose exec -T app"),
    (re.compile(r"^(yarn|node|npx|vitest|tsc|eslint|prettier)\b"), "node", "docker compose exec -T react"),
]


def current_branch() -> str:
    try:
        return subprocess.run(["git", "branch", "--show-current"], cwd=ROOT,
                              capture_output=True, text=True, timeout=5).stdout.strip()
    except (OSError, subprocess.TimeoutExpired):
        return ""


def decide(decision: str, reason: str) -> int:
    emit({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": decision,
        "permissionDecisionReason": reason,
    }})
    return 0


def pushes_to_main(command: str) -> bool:
    match = re.search(r"\bgit\s+push\b([^;&|\n]*)", command)
    if match is None:
        return False
    positional = [arg for arg in match.group(1).split() if not arg.startswith("-")]
    if len(positional) >= 2:  # explicit `<remote> <refspec>...`
        return any(re.search(r"(^|:)(refs/heads/)?main$", ref) for ref in positional[1:])
    return current_branch() == "main"


def main() -> int:
    event = read_event()
    command = (event.get("tool_input") or {}).get("command")
    if not isinstance(command, str) or not command.strip():
        return 0

    for pattern, reason in DENY:
        if pattern.search(command):
            return decide("deny", reason)

    for raw in SEGMENT_SPLIT.split(command):
        segment = re.sub(r"^(cd\s+\S+\s*|\w+=\S+\s+)+", "", raw.strip())
        for pattern, binary, prefix in CONTAINER_ONLY:
            if pattern.match(segment) and shutil.which(binary) is None:
                return decide("deny", f"`{binary}` is not installed on the host; it lives in a container. "
                                      f"Run `{prefix} {segment}` from the repo root instead.")

    for pattern, reason in ASK:
        if pattern.search(command):
            return decide("ask", reason)

    if pushes_to_main(command):
        return decide("ask", "Pushing to main runs the deploy-db job: `migrate --force` and the trivia "
                             "seeder against production Postgres.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
