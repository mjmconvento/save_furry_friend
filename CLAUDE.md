# Save Furry Friend

Social app for street-animal rescuers: Laravel 12 API (`backend_full_laravel/`) + React 19 SPA
(`frontend_react/`), on Docker Compose. `README.md` is the long-form design record — read the
relevant section before changing a feature it describes; do not import it wholesale.

| Concern | Store |
| --- | --- |
| Users, follows, Sanctum tokens, trivia | PostgreSQL (`db`, database `blog`; tests use `testing`) |
| Posts, comments, likes | MongoDB (`mongo`, database `sff`; tests use `sff_testing`) |
| Uploaded media | MinIO/S3, bucket `uploads` — stored as **object keys**, URLs built at render time |

Production: API on Render, SPA on Cloudflare Workers, Postgres on Neon, Mongo on Atlas, media on R2.

## Running anything

The host has **no PHP, Composer or Node**. Every command runs in a container, from the repo root:

```bash
make bootstrap                                   # fresh clone -> working stack (idempotent)
make up | down | fresh | logs | shell            # `make help` lists all
docker compose exec -T app php artisan <cmd>     # backend; working dir /var/www
docker compose exec -T react yarn <cmd>          # frontend; working dir /app
```

Seeded login: `test1@user.com` / `password112233` (admin). API on :8081, SPA on :3000.

## Verifying a change (mirrors `.github/workflows/main.yml`)

| Side | Command | CI step |
| --- | --- | --- |
| Backend | `docker compose exec -T app composer phpstan` | PHPStan **level 10** + Larastan |
| Backend | `docker compose exec -T app composer ecs-check` (`ecs-fix` to apply) | ECS (PSR-12) |
| Backend | `docker compose exec -T app composer rector` (`rector-fix` to apply) | Rector dry-run |
| Backend | `docker compose exec -T app vendor/bin/pest [--filter=Name]` | Pest vs real Postgres + Mongo |
| Frontend | `docker compose exec -T react yarn typecheck` / `lint` / `format:check` / `test` | same names |
| Both | `make lint && make test`, or `python3 .claude/hooks/ci_gate.py --all` | whole pipeline |

Pest needs the Postgres `testing` database: `docker compose exec db createdb -U root testing` (once).
`yarn lint` runs at `--max-warnings 0`; a warning fails CI.

## Invariants — breaking one is a bug even if tests pass

- **Every endpoint lives in `routes/api.php`.** Literal segments (`users/search`, `posts/summary`,
  `posts/{post}/like`) must be declared **before** `apiResource(...)` or the `{id}` wildcard eats them.
- **Authorization runs before validation**: put it in the FormRequest's `authorize()` (403 before 422)
  or in a Policy via `$this->authorize()`. Self-service routes use singular `user/...` with no `{user}`
  parameter so they cannot be aimed at someone else.
- **No mass-assignable privilege.** `roles` is not fillable; `likes` is not fillable on `Post`.
- **Postgres and Mongo cannot join.** `authorName` is denormalized into posts and fanned out by the
  `SyncAuthorName` job on rename; avatars and comment counts are attached at read time by
  `PostService::hydrate()`, which must be called on **every** post a response returns.
- **N+1 is a bug.** Per-row stats/follow flags are filled in bulk (`attachBulkProfileStats`,
  `attachViewerFollows`) — one query per page, not per row.
- **Feeds are scoped** to people the viewer follows plus themselves. There is no "everything" mode.
- **Mirrored vocabularies stay in step**: `App\Enums\PostTag` ↔ `src/config/tags.ts`,
  `UserRole`/`UserPreference` ↔ `src/interface/User.ts`, each `*Resource` ↔ `src/interface/*.ts`.
- **Tests never touch real data.** `tests/Pest.php` refuses to run unless the Mongo database ends in
  `_testing`; never weaken that guard.
- **Pushing to `main` migrates production** (`deploy-db` job: `migrate --force` + `TriviaSeeder` on
  Neon). Never edit a migration that is already on `origin/main` — write a new one.
- Frontend is **yarn only** (`yarn.lock` is the single lockfile). `VITE_API_BASE_URL` is required;
  `src/config/api.ts` throws without it, on purpose.

## Conventions

- PHP: `declare(strict_types=1)` everywhere, constructor-promoted `readonly` deps, typed array shapes in
  PHPDoc so level 10 passes without baselines. Controllers stay thin; logic lives in `app/Services`.
- TS: `strict` + `noUncheckedIndexedAccess`, no `any`, `eqeqeq`, exhaustive hook deps. Network calls go
  through `src/service/apiClient.ts` (`apiRequest` peels `{data}`, `apiPage` reads `meta` pagination).
- Comments explain **why** (a constraint, a past bug, a rejected alternative), never what the line does.
  Match that tone; do not add narration comments.
- Commit subjects are imperative sentences describing the behaviour (`Add likes to posts, with a roster
  behind the count`), not conventional-commit prefixes, except dependabot's `chore(deps)`.

## Claude tooling in this repo

- Rules: `.claude/rules/backend.md`, `.claude/rules/frontend.md` load when touching those trees.
- Skills: `/api-endpoint` (new or changed endpoint, API to SPA), `/data-migration` (Postgres/Mongo
  schema, denormalized fields, seeders), `/ci-check` (run and triage the CI pipeline locally).
- Agent: `sff-reviewer` reviews a diff against the invariants above.
- Hooks (`.claude/settings.json`): format + lint each edited file, block edits to secrets/lockfiles/
  shipped migrations, guard destructive or host-side commands, run the CI gate before a turn ends.
