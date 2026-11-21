#!/usr/bin/env python3
"""PostToolUse hook for Edit/Write/MultiEdit: format, lint, and flag contract drift.

- PHP under backend_full_laravel/: ECS --fix (the same ruleset CI checks).
- TS/TSX/CSS under frontend_react/src/: Prettier --write, then ESLint on the file.
  Anything still wrong is fed back to Claude (exit 2) while the file is fresh.
- Files that mirror a file on the other side of the API get a reminder to keep
  the pair in step (additionalContext, non-blocking).

The stack being down is not an error: formatting is skipped, CI still checks.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _common import BACKEND, FRONTEND, emit, in_container, read_event, relative, run, running_services, tail  # noqa: E402

# Backend file -> what must change with it. Matched by path prefix.
CONTRACTS: list[tuple[str, str]] = [
    (f"{BACKEND}/app/Enums/PostTag.php",
     "PostTag mirrors frontend_react/src/config/tags.ts (POST_TAGS, TONE_LABEL) and theme.palette.tone."),
    (f"{BACKEND}/app/Enums/UserRole.php", "UserRole mirrors `UserRole` in frontend_react/src/interface/User.ts."),
    (f"{BACKEND}/app/Enums/UserPreference.php",
     "UserPreference mirrors USER_PREFERENCE_KEYS in frontend_react/src/interface/User.ts."),
    (f"{BACKEND}/app/Enums/Trivia", "Trivia enums mirror frontend_react/src/interface/Trivia.ts."),
    (f"{BACKEND}/app/Http/Resources/",
     "Resources define the API payload: update the matching frontend_react/src/interface/*.ts "
     "and the App.test.tsx fixtures that build that shape."),
    (f"{BACKEND}/routes/api.php",
     "New/changed route: literal segments go before apiResource(); add the path constant to "
     "frontend_react/src/config/api.ts and the README 'API surface' table."),
    (f"{BACKEND}/database/migrations/",
     "Pushing to main runs `migrate --force` on production Postgres only (deploy-db). A migration "
     "touching the `mongodb` connection has no Mongo there. See the data-migration skill."),
    (f"{BACKEND}/app/Models/Mongo/",
     "New Mongo collection? Add it to the per-test truncation in tests/Pest.php."),
    (f"{FRONTEND}/src/config/tags.ts", "tags.ts mirrors backend_full_laravel/app/Enums/PostTag.php."),
    (f"{FRONTEND}/src/interface/",
     "Interfaces describe what the API's JsonResources return; the backend Resource is the source of truth."),
]


def contract_note(rel: str) -> str | None:
    notes = [note for prefix, note in CONTRACTS if rel.startswith(prefix)]
    return " ".join(notes) if notes else None


def format_backend(rel: str) -> tuple[int, str]:
    inner = rel.removeprefix(f"{BACKEND}/")
    return run(in_container("app", "vendor/bin/ecs", "check", "--fix", "--no-progress-bar", inner), timeout=90)


def format_frontend(rel: str) -> tuple[int, str]:
    inner = rel.removeprefix(f"{FRONTEND}/")
    code, out = run(in_container("react", "node_modules/.bin/prettier", "--write", "--log-level", "warn", inner),
                    timeout=60)
    if code != 0 or not inner.endswith((".ts", ".tsx")):
        return code, out
    return run(in_container("react", "node_modules/.bin/eslint", "--max-warnings", "0", inner), timeout=90)


def main() -> int:
    event = read_event()
    tool_input = event.get("tool_input") or {}
    path = tool_input.get("file_path") if isinstance(tool_input, dict) else None
    if not isinstance(path, str):
        return 0
    rel = relative(path)
    if rel is None or not Path(path).is_file():
        return 0

    note = contract_note(rel)

    is_php = rel.startswith(f"{BACKEND}/") and rel.endswith(".php") and "/vendor/" not in rel
    is_web = rel.startswith(f"{FRONTEND}/src/") and rel.endswith((".ts", ".tsx", ".css"))

    if is_php or is_web:
        service = "app" if is_php else "react"
        if service in running_services():
            code, out = format_backend(rel) if is_php else format_frontend(rel)
            if code != 0:
                tool = "ECS" if is_php else "Prettier/ESLint"
                message = f"{tool} still reports problems in {rel} after autofix:\n{tail(out, 40)}"
                if note:
                    message += f"\n\nAlso: {note}"
                print(message, file=sys.stderr)
                return 2

    if note:
        emit({"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": note}})
    return 0


if __name__ == "__main__":
    sys.exit(main())
