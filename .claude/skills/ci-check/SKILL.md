---
name: ci-check
description: Run Save Furry Friend's GitHub Actions pipeline locally (PHPStan level 10, ECS, Rector, Pest, tsc, ESLint, Prettier, Vitest, Vite build, compose config) and fix what fails. Use before committing or opening a PR, when CI failed on GitHub, or when the user asks "is this ready", "run the checks", or "why is CI red".
argument-hint: "[backend|frontend|compose|all]"
allowed-tools: Bash(python3 .claude/hooks/ci_gate.py *) Bash(docker compose exec -T app composer *) Bash(docker compose exec -T app vendor/bin/pest *) Bash(docker compose exec -T react yarn *) Bash(docker compose config *) Bash(git status *) Bash(git diff *)
---

# Local CI: run, triage, fix

Scope requested: `$ARGUMENTS` (empty = whatever has uncommitted changes).

Uncommitted changes:

!`git status --short | head -40`

## 1. Run

```bash
python3 .claude/hooks/ci_gate.py                 # sides with uncommitted changes
python3 .claude/hooks/ci_gate.py --scope backend # or frontend | compose
python3 .claude/hooks/ci_gate.py --all           # everything + `yarn build`, before a PR
```

It runs the same commands as `.github/workflows/main.yml`, in CI order, inside the containers;
backend and frontend in parallel. Typical wall time: backend ~25s, frontend ~40s. It prints a
table, then the tail of each failing command. `SKIP` means the stack is down: `make up`.

Not covered locally (say so when reporting "ready"): the `compose` job's image builds, the `prod`
image boot test (`docker build -f php/Dockerfile --target prod -t sff-prod .` reproduces it, slowly),
and `deploy-db`, which only runs on `main`.

## 2. Triage - fix forward, never suppress

| Failure | Usual cause | Fix |
| --- | --- | --- |
| PHPStan `mixed` / `argument.type` | Reading `validated()`, `user()`, a Mongo attribute or a pluck untyped | Narrow at the read: `/** @var User $viewer */`, `is_string()`, `assert()`. Never `@phpstan-ignore` or a baseline |
| PHPStan `property.notFound` on a model | Field missing from the model's `@property` docblock | Add the `@property` line, with a note if it is not stored |
| ECS | Formatting | `docker compose exec -T app composer ecs-fix`, then re-check |
| Rector diff | New code a Rector set would rewrite | `composer rector-fix`, **read the diff**, keep it if behaviour-neutral |
| Rector "DeclareStrictTypesRector is deprecated" | Warning only, pre-existing | Not a failure; mention it, do not fix in an unrelated change |
| Pest `could not translate host name` / connection refused | Stack down, or `testing` DB missing | `make up`; `docker compose exec db createdb -U root testing` |
| Pest `Refusing to run: MongoDB database is "sff"` | Env override pointed tests at dev data | Remove the override. Never relax the guard in `tests/Pest.php` |
| Pest flake on dates | Window logic near midnight | Freeze time with `$this->travelTo(...)`; do not widen the assertion |
| `tsc` | Index access is `T \| undefined` under `noUncheckedIndexedAccess` | Narrow or default (`?? 0`); no `!` |
| ESLint `exhaustive-deps` | Missing hook dependency | Add it and stabilise the value with `useCallback`/`useMemo`; never disable the rule inline |
| Prettier | Formatting | `docker compose exec -T react yarn format` |
| Vitest timeout on first render | Lazy route chunk compiling | `findBy…(…, undefined, { timeout: 5000 })`, as the existing tests do |
| Vitest "VITE_API_BASE_URL is not set" | Ran outside the `react` container | Run through `docker compose exec -T react` |
| `docker compose config` `required variable ... is missing` | New `${VAR:?}` in compose without a default | Add the key to `.env.docker.example` |

If a failure is in code you did not touch, confirm with `git stash` + re-run of that one check
before calling it pre-existing, then tell the user rather than fixing it silently in this change.

## 3. Report

One line per job: `backend ok`, `frontend FAIL (ESLint: 2 errors in PostCard.tsx)`, plus what was
not run locally (section 1). If everything passed, say which scope ran - "frontend only, no backend
changes" is different from "all green".
