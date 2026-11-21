#!/usr/bin/env python3
"""SessionStart hook: tell Claude what state the dev stack is in before it plans anything.

Plain stdout from a SessionStart hook is added to Claude's context. Kept to a few
lines and a couple of seconds: it runs on every startup, resume and compaction.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _common import in_container, run  # noqa: E402

EXPECTED = ["app", "db", "mongo", "minio", "nginx", "react"]


def git_summary() -> str:
    _, branch = run(["git", "branch", "--show-current"], timeout=5)
    _, status = run(["git", "status", "--porcelain"], timeout=5)
    code, ahead = run(["git", "rev-list", "--count", "origin/main..HEAD"], timeout=5)
    dirty = len([line for line in status.splitlines() if line.strip()])
    parts = [f"branch `{branch.strip() or 'detached'}`", f"{dirty} uncommitted file(s)"]
    if code == 0 and ahead.strip() not in {"", "0"}:
        parts.append(f"{ahead.strip()} commit(s) ahead of origin/main")
    return "Git: " + ", ".join(parts) + "."


def stack_summary() -> tuple[str, set[str]]:
    code, out = run(["docker", "compose", "ps", "--all", "--format", "json"], timeout=15)
    if code != 0:
        return "Docker: unavailable. Every check runs in a container; start Docker, then `make up`.", set()
    states: dict[str, str] = {}
    for line in out.splitlines():
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(row, dict) and row.get("Service"):
            health = row.get("Health") or row.get("State") or "?"
            states[str(row["Service"])] = str(health)
    running = {svc for svc, st in states.items() if st in {"healthy", "running"}}
    missing = [svc for svc in EXPECTED if svc not in running]
    if not missing:
        return "Stack: all services up (API http://localhost:8081, SPA http://localhost:3000).", running
    if not states:
        return ("Stack: not created. Run `make bootstrap` (fresh clone) or `make up`. Format/lint hooks "
                "and the CI gate skip until it is up."), running
    detail = ", ".join(f"{svc}={states.get(svc, 'absent')}" for svc in missing)
    return f"Stack: degraded ({detail}). `make up` to start; `docker compose logs <svc>` to diagnose.", running


def testing_db_summary(running: set[str]) -> str | None:
    if "db" not in running:
        return None
    sql = "select 1 from pg_database where datname = 'testing'"
    code, out = run(in_container("db", "sh", "-c", f'psql -U "$POSTGRES_USER" -d postgres -Atc "{sql}"'), timeout=10)
    if code == 0 and out.strip() == "1":
        return None
    return ("Postgres database `testing` is missing, so Pest will fail to connect. Create it once: "
            "`docker compose exec db createdb -U root testing`.")


def main() -> int:
    stack, running = stack_summary()
    lines = [git_summary(), stack]
    if (note := testing_db_summary(running)) is not None:
        lines.append(note)
    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    sys.exit(main())
