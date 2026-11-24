---
name: data-migration
description: Change the data model in Save Furry Friend safely across PostgreSQL and MongoDB - new tables/columns/indexes, Mongo field backfills or reshapes, denormalized fields that cross the two stores, and seeder changes. Use when a task adds or renames a field, needs a migration, changes what a seeder writes, or touches backend_full_laravel/database/.
argument-hint: "[the data change]"
allowed-tools: Bash(docker compose exec -T app php artisan migrate:status *) Bash(docker compose exec -T app vendor/bin/pest *)
---

# Data-model change across Postgres and Mongo

Change requested: $ARGUMENTS

Most recent migrations (copy the filename timestamp format and the anonymous-class style):

!`ls backend_full_laravel/database/migrations | tail -6`

Local migration status:

!`docker compose exec -T app php artisan migrate:status 2>/dev/null | tail -8 || echo "(stack down - run make up)"`

## 1. Pick the store, then the mechanism

| Data | Store | Mechanism |
| --- | --- | --- |
| Accounts, follows, tokens, reference data with fixed shape (trivia) | Postgres | `Schema::table/create` migration, constraints in the database |
| Posts, comments, likes (document-shaped, array fields) | Mongo | No schema. Indexes via `Schema::connection('mongodb')`; reshapes via a backfill migration |
| A value copied from Postgres into Mongo documents | Both | Prefer **read-time attach** (how avatars work). Denormalize only when Mongo must filter/sort on it, and then add a fan-out job like `SyncAuthorName` |

State the choice and the reason to the user in one sentence before writing code.

## 2. Production reality - read before writing a migration

- Pushing to `main` runs the CI `deploy-db` job: `php artisan migrate --force` then
  `db:seed --class=TriviaSeeder --force`, against **Neon Postgres only** (`NEON_DIRECT_DB_URL`).
- That job has no MongoDB credentials; its `.env` comes from `.env.example`, which points at
  `mongo:27017`. A new migration that touches the `mongodb` connection will therefore fail there
  [inferred from `.github/workflows/main.yml`; the existing Mongo migrations predate the job].
  Before writing one, ask the user which they want:
  1. add a `MONGODB_URI` secret to `deploy-db` (and `MONGODB_DATABASE`), or
  2. ship the Mongo change as an idempotent artisan command run once against Atlas, with the
     Postgres half as a normal migration.
- **Never edit a migration that is on `origin/main`** - it has run in production and will not run
  again. The `protect_files` hook asks before such an edit; the answer is almost always a new file.
- Render's runtime `DB_URL` is the PgBouncer pooler; nothing at runtime may run migrations.

## 3. Writing the migration

Postgres (model: `2026_08_12_100300_add_user_avatar.php`, `2026_08_29_100000_create_trivias_table.php`):

- `declare(strict_types=1);`, `return new class() extends Migration { ... };`, a docblock on `up()`
  saying **why** this shape (nullable because..., unique because...).
- Always a real `down()`. Primary keys on account-linked tables are UUIDs.
- Enumerated string columns get a `CHECK` constraint via `DB::statement`, mirroring the PHP enum.
- New query path? Add the index in the same migration and say which query it serves.
- A JSON list column read through a cast must tolerate unknown values (see `App\Casts\UserRoles`,
  which drops them rather than 500-ing every request for that row).

Mongo backfill (model: `2026_08_11_100100_normalize_post_medias_to_keys.php`):

- Go through the driver: `DB::connection('mongodb')` → `getCollection('posts')`, `typeMap` arrays.
- **Idempotent**: filter on the old shape (`'$type' => 'array'`, a missing field), skip documents
  already converted, so a re-run or partial failure is safe.
- `down()` reverses the reshape, or documents in a comment why it cannot.
- Readers must still accept the old shape until the backfill has run everywhere
  (`$this->likes ?? []`).

## 4. Everything that moves with the schema

- [ ] Model: `#[Fillable]` (never privilege fields), `$casts`, and the `@property` docblock -
      Larastan's `checkModelProperties` fails on a property the docblock does not declare.
- [ ] Resource + `frontend_react/src/interface/*.ts` if the field is served.
- [ ] Enum ↔ frontend mirror if a vocabulary changed (`PostTag` ↔ `src/config/tags.ts`).
- [ ] New Mongo collection → add it to the truncation list in `tests/Pest.php`.
- [ ] Factory (`database/factories/Eloquent/UserFactory.php`) if a column is required.
- [ ] Seeders stay **idempotent**: users are matched on fixed UUIDs, sample posts carry `sample: true`
      and are deleted + rewritten with their S3 objects, `TriviaSeeder` replaces its table in one
      transaction. Counts that matter are pinned by `SampleSeederTest` / `TriviaSeederTest`.
- [ ] README: the store table, "Sample data", or the relevant feature section.

## 5. Verify

```bash
docker compose exec -T app php artisan migrate                       # applies to dev `blog`
docker compose exec -T app php artisan migrate:rollback --step=1    # proves down(); hook asks first
docker compose exec -T app php artisan migrate
docker compose exec -T app vendor/bin/pest                          # RefreshDatabase re-runs every migration on `testing`
```

For seeder changes: `docker compose exec -T app php artisan db:seed --class=<Seeder>` twice in a row
and confirm the second run changes nothing it should not. Then `python3 .claude/hooks/ci_gate.py`.

Report to the user: what runs in production on the next push to `main`, and anything that has to
happen by hand.
