# Save Furry Friend

A small social-posting app: users log in, follow each other, and publish posts with image
attachments. Split into a Laravel API and a React SPA, with a polyglot data layer.

| Concern | Store |
| --- | --- |
| Users, sessions, Sanctum tokens, follows | PostgreSQL |
| Posts (content, tags, media URLs) | MongoDB |
| Uploaded media | MinIO (S3-compatible), bucket `uploads` |

```mermaid
graph LR
  Browser -->|":3000"| React[react_app CRA dev server]
  React -->|"http://localhost:8081"| Nginx[nginx]
  Nginx -->|"fastcgi app:9000"| App[php-fpm / Laravel]
  App --> PG[(postgres:5432)]
  App --> Mongo[(mongo:27017)]
  App --> Minio[(minio:9000)]
  Browser -->|"media http://localhost:9001"| Minio
```

## Layout

```
backend_full_laravel/   Laravel 12 API (PHP 8.2, Sanctum, mongodb/laravel-mongodb, Pest)
frontend_react/         React 19 SPA (CRA 5 + TypeScript 5.8, MUI 7, react-router 7)
php/Dockerfile          php-fpm 8.2 image used by the `app` service
nginx/conf.d/           vhost that fronts php-fpm on :8081
docker-compose.yml      app, db, mongo, nginx, react, minio
```

## Ports

| URL | What |
| --- | --- |
| http://localhost:3000 | React app |
| http://localhost:8081 | Laravel API (through nginx) |
| http://localhost:9001 | MinIO S3 API (media URLs point here) |
| http://localhost:9002 | MinIO console — `admin` / `password123` |
| localhost:5432 | PostgreSQL — `root` / `password`, db `blog` |
| localhost:27017 | MongoDB — `admin` / `password`, db `sff` |

## Running locally

Prerequisite: Docker Desktop. Nothing else is needed on the host — PHP, Composer and Node all
live in containers.

`docker compose up` alone is **not** enough: the backend source is bind-mounted over the image,
so `vendor/`, `.env` and the database schema have to be created once, by hand.

### 1. Start the containers

```bash
docker compose up -d --build
```

### 2. Create the backend `.env`

`.env.example` still carries pre-Docker defaults (`DB_HOST=127.0.0.1`, no Mongo/MinIO keys).
Inside the `app` container the services resolve by Compose service name:

```bash
cd backend_full_laravel
cp .env.example .env
```

Then set these values in `backend_full_laravel/.env`:

```dotenv
APP_URL=http://localhost:8081

DB_CONNECTION=pgsql
DB_HOST=db
DB_PORT=5432
DB_DATABASE=blog
DB_USERNAME=root
DB_PASSWORD=password

MONGODB_URI=mongodb://admin:password@mongo:27017
MONGODB_DATABASE=sff

# MinIO. The endpoint is the in-container address; Laravel rewrites returned
# media URLs to http://localhost:9001 so the browser can fetch them.
AWS_ACCESS_KEY_ID=admin
AWS_SECRET_ACCESS_KEY=password123
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=uploads
AWS_ENDPOINT=http://minio:9000

SANCTUM_STATEFUL_DOMAINS=localhost:3000
```

### 3. Install dependencies, key, schema, seed data

```bash
cd ..
docker compose exec app composer install
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate
docker compose exec app php artisan db:seed --class=TestUserSeeder
```

There is no `DatabaseSeeder`, so the seeder class must be named explicitly.

### 4. Create the MinIO bucket (fresh volume only)

Media uploads write to a bucket named `uploads`. If the `minio-data` volume is new, create it:
open http://localhost:9002 (`admin` / `password123`) → **Buckets** → **Create Bucket** → `uploads`.

### 5. Check it

```bash
curl -i http://localhost:8081/up          # Laravel health check
open http://localhost:3000                # React app
```

Log in with a seeded account:

| Email | Password |
| --- | --- |
| test@user.com | password112233 |
| test2@user.com | password112233 |

## Day-to-day commands

Backend (all inside the `app` container):

```bash
docker compose exec app php artisan migrate:fresh --seed --seeder=TestUserSeeder
docker compose exec app php artisan tinker
docker compose exec app composer test        # Pest (sqlite :memory:)
docker compose exec app composer phpstan
docker compose exec app composer ecs-check   # ecs-fix to apply
docker compose exec app composer rector      # rector-fix to apply
docker compose logs -f app
```

Frontend:

```bash
docker compose logs -f react                 # CRA compile output lives here
docker compose exec react yarn add <pkg>
docker compose exec react yarn build         # production bundle into frontend_react/build
```

The frontend is **yarn only** — `yarn.lock` is the single lockfile and the image installs with
`yarn install --frozen-lockfile`. After changing `package.json`/`yarn.lock`, rebuild *and* discard
the stale dependency volume, or the container keeps serving the old tree:

```bash
docker compose up -d --build --force-recreate --renew-anon-volumes react
```

The React container mounts the source and keeps its own `node_modules` (anonymous volume), so
host-side `yarn install` is optional. Host edits hot-reload — the `react` service sets
`WATCHPACK_POLLING=true`, which is the variable react-scripts 5 / webpack 5 actually reads (the
`CHOKIDAR_USEPOLLING` it replaced was a CRA 4 setting and did nothing). Polling costs some CPU;
drop it if native file watching works on your machine.

`CI=true yarn build` (what a CI runner does) currently **fails** on pre-existing lint warnings —
`eqeqeq`, unused vars and `react-hooks/exhaustive-deps` in `HappyPostPage.tsx` / `MyProfilePage.tsx`.
Plain `yarn build` succeeds.

## API surface

Every endpoint is declared in `backend_full_laravel/routes/web.php` — not `routes/api.php` — so
the whole API runs through Laravel's **web** middleware: session cookies plus CSRF.

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/api/login` | public (CSRF-exempt via `bootstrap/app.php`) |
| POST | `/api/logout` | session |
| GET | `/api/token/csrf`, `/api/token/user` | `auth:sanctum` |
| GET/POST | `/api/users` | `auth:sanctum` |
| GET/PUT/DELETE | `/api/users/{id}` | `auth:sanctum` |
| GET | `/api/users/search/{keyword}` | `auth:sanctum` |
| POST | `/api/users/follow/{id}`, `/api/users/unfollow/{id}` | `auth:sanctum` |
| GET/POST | `/api/posts` | `auth:sanctum` |
| GET/PUT/DELETE | `/api/posts/{id}` | `auth:sanctum` |

Consequences when poking the API with curl instead of the SPA:

- `POST /api/login` returns `{ token, user }`. Send that token as `Authorization: Bearer <token>`.
- Reads work with the bearer token alone.
- Writes (`POST`/`PUT`/`DELETE`) additionally need a CSRF token and its session cookie, otherwise
  you get **419 Page Expired**. `/api/token/csrf` is itself behind `auth:sanctum`, so log in first:

```bash
TOKEN=$(curl -s -X POST http://localhost:8081/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@user.com","password":"password112233"}' | jq -r .token)

CSRF=$(curl -s -c /tmp/jar -H "Authorization: Bearer $TOKEN" \
  http://localhost:8081/api/token/csrf | jq -r .csrfToken)

curl -s -b /tmp/jar -H "Authorization: Bearer $TOKEN" -H "X-CSRF-TOKEN: $CSRF" \
  -F 'content=hello' -F 'medias[]=@./cat.png' http://localhost:8081/api/posts
```

CORS (`config/cors.php`) and Sanctum stateful domains only allow `http://localhost:3000`, so the
SPA must be served from that origin.

## Troubleshooting

**`bind: address already in use` / `port is already allocated`** — this project publishes 3000,
5432, 8081, 9000, 9001, 9002 and 27017. One clash aborts the whole `docker compose up` and leaves
the other services stopped. Which fix applies depends on *what* clashes:

- **Only :3000 (the SPA)** — start everything else and deal with the SPA separately:
  `docker compose up -d app db mongo nginx minio`.
- **A datastore port** (another Compose project's MinIO on 9001 or Mongo on 27017 is the usual
  culprit) — selective start does *not* help, since those services publish the clashing port
  themselves. Stop the other stack, or remap the port in `docker-compose.yml` / a local
  `docker-compose.override.yml`. Nothing in this app needs host access to Mongo, so dropping its
  `ports:` entry is the cheapest fix.

Two caveats when remapping: moving the SPA off 3000 means adding the new origin to
`config/cors.php` and `SANCTUM_STATEFUL_DOMAINS`, and moving MinIO off host 9001 breaks media URLs,
because `PostService::storePost()` hardcodes the `minio:9000` → `localhost:9001` rewrite.

**A container is `Up` but unreachable by service name** — long-lived containers can be left attached
to a deleted network (`docker inspect -f '{{.NetworkSettings.Networks}}' <name>` prints empty), which
shows up as `Could not resolve host: minio` or `could not translate host name "db"`. Recreate them:
`docker compose rm -sf <service> && docker compose up -d <service>`.

**`could not translate host name "db"`** — the `db` container is not running. `docker compose ps -a`;
if Postgres exited, check `docker logs postgres`.

**Postgres refuses to start after an image bump** — the `db` service is pinned to `postgres:16` on
purpose. Postgres 18 changed its data directory layout and will not start against the existing
`pgdata` volume. Wiping local DB data is `docker compose down -v` followed by migrate + seed again.

**`react-scripts: not found` in the react container** — the `/app/node_modules` anonymous volume is
missing or was removed. Rebuild: `docker compose up -d --build --force-recreate react`.

**Uploads fail with a bucket error** — the `uploads` bucket does not exist yet; see step 4.

**Upload returns 413 Request Entity Too Large** — `nginx/conf.d/default.conf` sets no
`client_max_body_size`, so nginx caps request bodies at its 1 MB default. Add
`client_max_body_size 20m;` to the `server` block (and restart nginx) before uploading real photos.

**Frontend serves but shows a compile error overlay** — read `docker compose logs react`. The
container's filesystem is case-sensitive, so import paths whose casing differs from the file on
disk fail there while working fine on macOS.

## CI

`.github/workflows/main.yml` runs PHPStan, ECS, Rector (dry-run) and Pest against
`backend_full_laravel` on every push and pull request. There is no frontend job.

