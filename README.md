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
  Browser -->|":3000"| React[Vite dev server]
  React -->|"http://localhost:8081"| Nginx[nginx]
  Nginx -->|"fastcgi app:9000"| App[php-fpm / Laravel]
  App --> PG[(postgres:5432)]
  App --> Mongo[(mongo:27017)]
  App --> Minio[(minio:9000)]
  Browser -->|"media http://localhost:9101"| Minio
```

## Layout

```
backend_full_laravel/   Laravel 12 API (PHP 8.2, Sanctum, mongodb/laravel-mongodb, Pest)
frontend_react/         React 19 SPA (Vite 7 + TypeScript 5.8, MUI 7, react-router 7, Vitest)
php/Dockerfile          php-fpm 8.2 image used by the `app` service
nginx/conf.d/           vhost that fronts php-fpm on :8081
docker-compose.yml      app, db, mongo, nginx, react, minio
```

## Ports

Every host port is a variable in the root `./.env`, so a clash with another
stack is a one-line edit rather than a compose-file diff.

| URL | What | `./.env` |
| --- | --- | --- |
| http://localhost:3000 | React app | `REACT_PORT` |
| http://localhost:8081 | Laravel API (through nginx) | `NGINX_PORT` |
| http://localhost:9101 | MinIO S3 API (media URLs point here) | `MINIO_API_PORT` |
| http://localhost:9102 | MinIO console | `MINIO_CONSOLE_PORT` |
| 127.0.0.1:5432 | PostgreSQL, loopback only — db `blog` | `POSTGRES_PORT` |
| 127.0.0.1:27017 | MongoDB, loopback only — db `sff` | `MONGO_PORT` |

Credentials live in `./.env` (copied from `.env.docker.example`), not in the compose file.
php-fpm is deliberately not published: fastcgi has no authentication and only nginx needs it.
MinIO sits on 9101/9102 rather than the conventional 9000/9001 because those are commonly taken by
other local stacks; `MINIO_API_PORT` and `AWS_URL` in `backend_full_laravel/.env` must move together.

Connecting a GUI client to MongoDB needs `authSource=admin` — the user lives in `admin` while the
data lives in `sff`, and omitting it fails authentication:

```
mongodb://admin:password@127.0.0.1:27017/sff?authSource=admin
```

## Running locally

Prerequisite: Docker Desktop and `make`. Nothing else is needed on the host — PHP, Composer and
Node all live in containers.

```bash
cp .env.docker.example .env          # compose credentials and published ports
make bootstrap                       # ~2 min on a cold cache
```

`docker compose up` on its own is still not enough — the backend source is bind-mounted over the
image, so `vendor/`, `.env` and the schema have to be created once. `make bootstrap` is that once:

1. creates `backend_full_laravel/.env` from `.env.example`, and `./.env` from
   `.env.docker.example` if you skipped the `cp` above — neither is overwritten if it exists;
2. `docker compose up -d --build --wait`. `--wait` blocks until every healthcheck reports healthy,
   so the next step cannot race Postgres creating its cluster on a fresh `pgdata` volume;
3. `composer install`, plus `php artisan key:generate` when `APP_KEY` is still empty;
4. `php artisan migrate --seed` — see [Sample data](#sample-data); re-running `make bootstrap`
   against a live stack is safe;
5. prints the URLs and the seeded login.

Creating the `uploads` bucket is no longer a manual click: the `minio-init` service creates it and
applies the anonymous-download policy as soon as MinIO reports healthy.

Check it:

```bash
curl -i http://localhost:8081/up          # Laravel health check
open http://localhost:3000                # React app
```

Log in with a seeded account — all eight share the password:

| Email | Name | Roles |
| --- | --- | --- |
| test1@user.com | Marisol Vega | **admin**, user |
| test2@user.com | Tomas Iker Iglesias | user |
| test3@user.com | Priya Raman | user |
| test4@user.com | Daniel Chukwu Okafor | user |
| test5@user.com | Ama Boateng | user |
| test6@user.com | Kwame Osei Mensah | user |
| test7@user.com | Lucia Ferrer | user |
| test8@user.com | Ines Duarte | user |

Password for every one of them: `password112233`. Only the admin sees the Users page — see
[Roles](#roles).

`make help` lists the rest: `up`, `down`, `env`, `deps`, `fresh`, `logs`, `shell`, `test`, `lint`.
Datastore credentials and the published ports live in `./.env` (gitignored, template in
`.env.docker.example`); everything Laravel reads lives in `backend_full_laravel/.env`.

## Sample data

`migrate --seed` runs `DatabaseSeeder`, which calls two seeders:

| Seeder | Creates |
| --- | --- |
| `SampleUserSeeder` | the eight accounts above with their roles, and a **partial** follow graph: each one follows the next three, wrapping round |
| `SamplePostSeeder` | 74 posts across those eight authors, three tones and 90 days |

The posts are a deliberate mix: roughly 50% text-only, 35% one image and 15% a gallery of two to
four, so the feed layout is exercised rather than just populated — sized so 74 posts still fit inside
the committed photo supply.

**Every photo is of a street animal, and no two posts share one.** `samples/` holds 56 committed
JPEGs — strays, colony cats and street dogs from LoremFlickr's keyword search, each carrying the small
CC attribution badge its licence asks for. The seeder consumes that
queue rather than cycling it, spending one photo per media slot — 42 of the 56 at the current
distribution. If the plan ever needs more slots than there are photos the seeder throws, naming both
numbers, because silently cycling is exactly the repetition the queue exists to prevent. Each is
uploaded as its own S3 object per post: sharing objects would be smaller, but deleting one post would
blank another's pictures. `samples/avatars/` holds eight more, one per sample account.

The copy matches: seventy-four lines about street animals found, fed, trapped, treated, homed or lost. The
neutral feed carries colony counts, trap nights and feeding rotas rather than shelter opening hours,
because this is a strays app and the sample data is what everyone judges it by.

Dates matter as much as the mix: six of the seventy-four are placed inside **today**, spread across the
hours already elapsed, and the corpus is shuffled before it is dated. Without the shuffle the tone
order in the seeder became chronological order — every recent post happy — and without recent posts
the home page's summary read all zeros on a fresh install, which looks broken rather than
empty. The rest walk back over ninety days, so a rolling week catches a handful beyond today's six.

Two properties make it safe to re-run, which matters because `make bootstrap` seeds every time:

- users are matched on a **fixed UUID**, not on email, so changing a name or address updates the
  same row instead of orphaning the posts that reference its id. Renaming also fans out to the
  `authorName` denormalized into every Mongo post, via the same `SyncAuthorName` job the API uses;
- every seeded post carries `sample: true`, and a re-run deletes exactly those documents and their
  S3 objects before writing the new 74. **Posts created through the app are never touched** — they
  have no such field.

The follow graph is not decoration: `PostService::getPosts()` scopes every feed to the accounts you
follow plus your own posts, so without it you would log in and see only the posts you wrote — and
with nothing but your own posts on screen there would be no way to see that Edit and Delete are
owner-only.

It is **partial** on purpose. Everyone-follows-everyone leaves "Who to follow" empty by construction
and every Follow button already pressed, so each account follows only the next three in the list,
wrapping round. That also makes it asymmetric — the people who follow you are not the people you
follow — which is what gives the two list pages different contents. `upsert` adds and updates but
never deletes, so the seeder clears the sample accounts' own rows first; without that a graph from a
previous shape survives a re-seed.

To wipe and reseed from scratch: `make fresh`.

## Day-to-day commands

Backend (all inside the `app` container):

```bash
docker compose exec app php artisan migrate:fresh --seed
docker compose exec app php artisan tinker
docker compose exec app composer test        # Pest, against real Postgres + Mongo
docker compose exec app composer phpstan
docker compose exec app composer ecs-check   # ecs-fix to apply
docker compose exec app composer rector      # rector-fix to apply
docker compose logs -f app
```

`make fresh` is the first line; `make test` and `make lint` run the backend checks above *and* the
frontend ones below in one go.

`composer test` needs two dedicated databases, not sqlite: a Postgres database named `testing` and
a Mongo database named `sff_testing` (see `phpunit.xml`). `RefreshDatabase` only migrates and
transacts the default connection, so `tests/Pest.php` truncates the Mongo `posts` collection per
test — and refuses to run at all unless the Mongo database name ends in `_testing`, because pointed
at `sff` that would delete real data. Create the Postgres one once:

```bash
docker compose exec db createdb -U root testing
```

Frontend:

```bash
docker compose logs -f react                 # Vite dev server output
docker compose exec react yarn add <pkg>
docker compose exec react yarn typecheck     # tsc --noEmit
docker compose exec react yarn lint          # eslint, --max-warnings 0
docker compose exec react yarn format:check  # prettier
docker compose exec react yarn test          # vitest
docker compose exec react yarn build         # production bundle into frontend_react/build
```

The build tool is **Vite 7** with **Vitest**; `react-scripts` is gone. `src/config/api.ts` reads
`VITE_API_BASE_URL` and *throws* when it is unset, so every build needs it — the `react` service
supplies it in `docker-compose.yml`, and `frontend_react/.env.example` documents it for host-side
builds (`cp .env.example .env`).

The frontend is **yarn only** — `yarn.lock` is the single lockfile and the image installs with
`yarn install --frozen-lockfile`. After changing `package.json`/`yarn.lock`, rebuild *and* discard
the stale dependency volume, or the container keeps serving the old tree:

```bash
docker compose up -d --build --force-recreate --renew-anon-volumes react
```

The React container mounts the source and keeps its own `node_modules` (anonymous volume), so
host-side `yarn install` is optional. Host edits hot-reload: `vite.config.ts` sets
`server.watch.usePolling` because inotify events are not delivered reliably over a Docker bind
mount. Polling costs some CPU; drop it if native file watching works on your machine.

`yarn lint` runs at `--max-warnings 0` and `yarn build` runs `tsc --noEmit` first, so both fail on
anything CI would fail on. The lint warnings this project used to carry (`eqeqeq`, unused
`setEditId`, `react-hooks/exhaustive-deps`) are fixed, and those three rules are now errors.

## API surface

Every endpoint is declared in `backend_full_laravel/routes/api.php` and served under the `/api`
prefix from `withRouting(apiPrefix: 'api')`. Auth is **stateless bearer token only** — no session,
no CSRF, no cookies. Errors are always JSON.

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/api/login` | public, `throttle:login` (5/min per email+IP, 20/min per IP) |
| POST | `/api/register` | **public**, `throttle:5,1` — creates an unverified account |
| GET | `/api/email/verify/{id}/{hash}` | **public but signed** — opened from the email |
| POST | `/api/email/verification-notification` | bearer — resend, for your own address |
| POST | `/api/logout` | bearer — revokes the presented token |
| GET/POST | `/api/users` | bearer, **admin only** (`UserPolicy`) |
| PUT/DELETE | `/api/users/{user}` | bearer, **admin only** (`UserPolicy`) |
| GET | `/api/users/{user}` | bearer — any signed-in user, for profile pages |
| GET | `/api/users/search/{keyword}` | bearer — any signed-in user |
| PATCH | `/api/user/preferences` | bearer — **your own** account, display preferences only |
| POST/DELETE | `/api/user/avatar` | bearer — **your own** picture only |
| POST | `/api/users/{user}/follow`, `/api/users/{user}/unfollow` | bearer — any signed-in user |
| GET | `/api/users/{user}/followers`, `/api/users/{user}/following` | bearer — any signed-in user, paginated |
| GET | `/api/users/suggestions` | bearer — five prolific authors you do not follow yet |
| GET | `/api/posts/summary` | bearer — post count per tone over a rolling week, feed-scoped |
| GET/POST | `/api/posts` | bearer |
| GET/PUT/DELETE | `/api/posts/{post}` | bearer, own posts only for writes (`PostPolicy`) |

Everything in the authenticated group also carries `throttle:api` (60/min per user, falling back to
IP). Sanctum tokens expire — `SANCTUM_TOKEN_EXPIRATION`, with `sanctum:prune-expired` scheduled
daily in `routes/console.php`.

Shapes worth knowing:

- `POST /api/login` returns `{ message, token, user }`, and `user.roles` is a list — `["admin","user"]`
  or `["user"]`. Send the token as `Authorization: Bearer <token>`.
- Single resources are wrapped: `{ "data": { … } }`. `GET /api/posts` is **paginated** —
  `{ data: [...], links, meta }` — and takes `tags[]`, `authorId`, `page` and `per_page` (max 50).
  The SPA reads `meta.current_page` / `meta.last_page` and offers **Load more**, appending the next
  page rather than replacing the list; `apiClient` exposes `apiPage` for that, beside `apiRequest`
  which peels the envelope and is right for everything unpaginated.
- The feed is always scoped to the follow graph plus your own posts. There is no "everything" mode.
- `GET /api/users/search/{keyword}` matches **one word at a time**: every word in the keyword must
  appear somewhere in the name, in any order, so "Daniel Okafor" finds `Daniel Chukwu Okafor` and
  "Okafor Daniel" finds him too. A single `ILIKE '%keyword%'` over the joined name was wrong twice —
  a middle name broke contiguity, and a null middle name left two spaces, so `Marisol Vega` was
  unsearchable by the name the app displays. Capped at five words and ten results, and it never
  returns the person searching.
- `GET /api/posts/summary` powers the home page: `{ data: { from, to, counts } }`, where `counts` always
  carries all three tones, zeros included, so the client never fills a gap. It counts a **rolling
  week** — `PostController::SUMMARY_DAYS`, today plus the previous six — over whole days bounded by
  midnight in the API's **own** timezone (`config/app.php`). Both dates travel with the counts and the
  page prints them: the browser is on a different clock and does not know how many days the window
  spans, so widening it here needs no client change. A calendar week was the alternative and lost —
  Monday to Sunday collapses to near-zero every Monday morning, which is the emptiness the original
  single-day window suffered from. Scoped like the feeds, so the number counts posts by the same
  authors clicking through would show you.
- `medias` is stored in Mongo as bare object keys and rendered to absolute URLs by `PostResource`.
  `avatar` on a user and `authorAvatar` on a post work the same way.
- `stats` on a user (`posts` / `followers` / `following`) is **null wherever nothing displays it** —
  the admin user index, people search — and filled in by `GET /api/users/{id}` and the follower,
  following and suggestion lists, which show it on every row. Those fill it in **bulk**: three
  aggregate queries for the whole page, not three per person, because per-row hydration is an N+1
  nobody notices until the list grows. The fields are per-request properties on the model rather than
  columns, so nothing can accidentally persist them.
- `is_following` is likewise per row, and always relative to **the viewer**, not to whoever's list you
  are reading: on somebody else's followers page each button reflects your own relationship with that
  person. Your own row never carries it — you cannot follow yourself.
- Validation failures are `422` with `{ message, errors: { field: [...] } }`; missing records are `404` JSON.

No CSRF dance is needed any more:

```bash
TOKEN=$(curl -s -X POST http://localhost:8081/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test1@user.com","password":"password112233"}' | jq -r .token)

curl -s -H "Authorization: Bearer $TOKEN" \
  -F 'content=hello' -F 'tags[]=happy_post' -F 'medias[]=@./cat.png' \
  http://localhost:8081/api/posts
```

CORS (`config/cors.php`) allows exactly one origin, `env('FRONTEND_URL', 'http://localhost:3000')`,
so the SPA must be served from wherever `FRONTEND_URL` in `backend_full_laravel/.env` points.

## Roles

Each user holds a **list** of roles in `users.roles` — a `jsonb` column defaulting to `["user"]`,
cast to a collection of `App\Enums\UserRole`. Two cases exist today, `admin` and `user`. No
permission package and no pivot table: with two roles and no per-role metadata, both would serve one
boolean question, and `whereJsonContains('roles', 'admin')` covers the queries a pivot would be for.

The list is **additive**, so the admin carries `user` as well and nothing has to special-case "an
admin can also do what a user can". Checks are membership, never equality — `$user->hasRole(...)`,
with `isAdmin()` as the shorthand every call site actually uses. Adding a third role later is a new
enum case and a seeder line; no check has to change.

Administering accounts is admin-only; seeing and following them is not. So listing, creating,
editing and deleting users need an admin, while `GET /api/users/{user}`, the people search and
follow/unfollow stay open to every signed-in user — gating those would break profile pages and the
follow graph, which are the product rather than its administration.

Three consequences worth knowing:

- **Signing yourself up and administering accounts are different endpoints.** `POST /api/users` needs
  an admin token; `POST /api/register` is public. Sharing one route would mean a single edit could
  make account administration public by accident, so they stay apart — see
  [Registration and email verification](#registration-and-email-verification).
- **There is no self-service exception.** A non-admin cannot edit or delete even their own account.
  Nothing in the SPA offers that, and an exception nobody exercises is one to forget about. Note
  `UpdateUserRequest`'s `current_password` rule validates against the *authenticated* user, so an
  admin changing someone's password confirms with their own.
- **`roles` is not mass-assignable,** so no request payload can promote an account — there is a test
  firing `"roles": ["admin"]` at the create endpoint and asserting the result is still `["user"]`.
  Roles are set by `SampleUserSeeder`, which writes through the query builder. Making another admin
  means the seeder or a SQL update; there is no role-management UI.

A value in the column that is not a known case is **dropped**, by `App\Casts\UserRoles`. Laravel's
own `AsEnumCollection` resolves with `UserRole::from()`, which throws — so a single hand-edited row
would answer 500 to every request that account made, and to any admin listing it. Dropping costs the
account that role instead, which is the safe direction, and it matches what the SPA does with the
same payload.

Authorization for these lives in the FormRequests (`IndexUserRequest`, `StoreUserRequest`,
`UpdateUserRequest`) rather than the controller, because `authorize()` runs *before* validation — an
unauthorized caller gets `403` instead of a `422` that would disclose whether their payload was
well-formed. `destroy` has no request class, so it authorizes in the controller.

In the SPA the Users nav group is hidden for non-admins and `/users` is wrapped in `AdminRoute`,
which redirects — hiding a link does not stop anyone typing the URL. Both are UI only: the roles are
read from `localStorage`, which the user can edit, and editing them just buys an empty page full of
403s. A stored list with nothing recognisable in it — including sessions predating the field — ends
the session at the login form rather than rendering a half-known identity.

## Registration and email verification

`/register` sits beside `/login` and each links to the other. Registering **signs you straight in** —
the response carries a token, exactly as login does — so there is no "now go and log in" step. The
address starts unverified.

Verification is **reported, not enforced**: an unverified account can do everything, and a banner in
the app shell says the address is not confirmed. Tightening that later means adding Laravel's
`verified` middleware to the write routes; nothing here assumes it never will.

### Seeing the link locally

`MAIL_MAILER=log`, so nothing is sent anywhere — the whole email lands in
`backend_full_laravel/storage/logs/laravel.log`. Finding the URL in there means reading a few hundred
lines of inlined CSS, so there is a command:

```bash
docker compose exec app php artisan email:verification-link you@example.com
```

It builds the same signed URL, with the same lifetime, and grants nothing reading the log does not —
both need shell access to the container. Paste it into a browser: it verifies the address and
redirects to the SPA with `?verified=1`, which toasts, re-reads the account and strips the parameter.

### Why not Laravel's own request class

`Illuminate\Foundation\Auth\EmailVerificationRequest` reads `$request->user()`. A link opened from an
email carries no bearer token and this app keeps no session, so that dies on null — it returned a 500
the first time it was tried here. `EmailVerificationController` instead resolves the account from the
route id, which is safe because the `signed` middleware has already proved the URL was not tampered
with, and still compares the hash: the hash is of the address, so a link stops working once the
address changes. Tests cover the tampered signature, a hash pointed at another account, a deleted
account, a changed address, and opening a valid link twice.

## Profiles and pictures

`/my_profile` and `/profile/:id` share one `ProfileHeader`: picture, name, and post / follower /
following counts. They differ only by their action — an upload control on your own, a follow button
on somebody else's — so they are one component rather than two that drift.

### Followers, following and who to follow

The follower and following counts are links, to `/profile/:id/followers` and `/following`. Both sides
of the graph are one `FollowListPage` and one route shape: `/my_profile` links here with its own id
rather than needing a second pair of routes, and the heading names the person when it is not you.

Each row is a `PersonRow` — picture, name, `9 posts · 3 followers`, and a Follow button that flips in
place rather than reloading the list, the same optimistic-with-rollback shape as the profile button.
Clicking the row goes to their profile. Your own row has no button.

**Who to follow** appears under your own following list, never on somebody else's, where it would be a
non sequitur. It ranks by post count over the accounts you do not follow yet, from
`GET /api/users/suggestions`. The ranking slice is deliberately wider than the five it returns —
taking exactly five would come back empty the moment the five busiest are all followed already, which
is the state the seeded graph used to start in.

Uploading is the **second** narrow self-service exception, alongside preferences: `POST` and `DELETE
/api/user/avatar` act on the token's own account, take no `{user}` parameter, and write one column.
Name, email, password and roles remain admin-only. Limits are tighter than post media on purpose —
4 MB, JPEG/PNG/WebP only — because an avatar renders at 40px.

`users.avatar` holds a bare object key, and the previous object is deleted when a picture is replaced
or removed, so changing your picture ten times leaves one file rather than ten.

**Author pictures on posts are read, not denormalized.** `authorName` *is* denormalized into every
post document and needs `SyncAuthorName` to fan out on rename — the staleness this codebase already
carries a job for. Avatars deliberately do not repeat that: `PostService::attachAuthorAvatars()` fills
them in from Postgres with one `whereIn` per page, so replacing your picture updates every post you
have ever written, immediately, with nothing to backfill. Verified in the browser: a new upload
appears in the feed on the next navigation.

### Finding people

The Topbar search is an MUI `Autocomplete` over `GET /api/users/search/{keyword}`, debounced at
300ms with one `AbortController` per window, so a slow answer for an earlier keystroke can never
overwrite a newer result set.

The popup opens as soon as anything is typed rather than only when there are rows, because it is also
what carries **Searching…** and **No people match "…"** — gated on results, an empty search showed
nothing at all and read as a dead field. The spinner is set on the keystroke rather than when the
request leaves, or it flashes for the 200ms the network takes and looks like a glitch. Each row shows
the person's picture, name and address; picking one navigates to their profile by mouse or keyboard,
and Escape closes without navigating.

## Preferences and the content warning

`/heartbreaking_posts` opens behind a content warning: those posts are about
abandonment, illness and endings that are not happy ones, and the feed is worth an explicit yes.

The feed is rendered **inside** the warning rather than beside it, because `PostFeed` fetches on
mount — a banner layered over a live feed would load the posts and their photos behind the notice
warning about them. Verified: no `tags[]=heartbreaking_post` request is made until the reader
continues.

The warning appears on **every** visit, from whichever link brought the reader there — including the
home page's Heartbreaking card, which also says so at the link rather than making anyone click to find
out why.

**"Don't show this warning again" is the only thing that stops it**, and it is remembered on the
**account** in `users.preferences`, so it follows you to another browser or device.

It briefly also remembered "continued" for the whole browser session, in `sessionStorage`. That was a
shortcut nobody asked for: one click suppressed the warning for ever after, which is
indistinguishable from the feature being broken, and it is why the home page link appeared to stop
warning. Removed — a regression test now continues once, remounts, and asserts the warning is back.

Saving it needs a self-service write, which is awkward next to admin-only account CRUD — hence
`PATCH /api/user/preferences` rather than an exception inside `PUT /api/users/{user}`. Singular
`user` means the token's own account, and **the route has no `{user}` parameter at all**, so there is
nothing to aim elsewhere. It merges only keys defined by `App\Enums\UserPreference`; a payload
carrying `email`, `first_name` or `roles` alongside a preference writes the preference and ignores
the rest, and one carrying no known preference is a `422` rather than a silent no-op that would look
saved. There are tests for each of those.

Every preference is a boolean defaulting to **off**, and off is always the safe answer: an account or
cached session that has never heard of a preference shows the warning rather than suppressing it. The
save is deliberately not awaited before revealing the feed — consent was already given — but a
failure is reported, because silence would look like the checkbox did not work.

## Troubleshooting

**`bind: address already in use` / `port is already allocated`** — the stack publishes only what a
browser or a local client needs: `REACT_PORT` (3000), `NGINX_PORT` (8081), `MINIO_API_PORT` (9101),
`MINIO_CONSOLE_PORT` (9102), and Postgres and MongoDB on loopback (`POSTGRES_PORT` 5432,
`MONGO_PORT` 27017). php-fpm is not published at all. `MONGO_PORT` is the one most likely to clash,
since 27017 is what every other Mongo stack takes too. One clash still aborts the whole `up`, but the
fix is a variable, not a file edit:

```bash
# ./.env
REACT_PORT=3100
```

then `make up`. For anything more involved than a port number, copy
`docker-compose.override.yml.example` to `docker-compose.override.yml` (gitignored, merged
automatically) rather than editing the tracked compose file.

Two couplings to respect when remapping. Moving the SPA means moving `FRONTEND_URL` in
`backend_full_laravel/.env` too, or login fails the CORS preflight with nothing in the Laravel log.
Moving MinIO's API port means moving `AWS_URL` — media URLs are not baked into the database (Mongo
stores bare object keys and `PostResource` builds the URL at render time), so that is a one-line
`.env` change rather than a data migration.

**A container is `Up` but unreachable by service name** — long-lived containers can be left attached
to a deleted network (`docker inspect -f '{{.NetworkSettings.Networks}}' <name>` prints empty), which
shows up as `Could not resolve host: minio` or `could not translate host name "db"`. Recreate them:
`docker compose rm -sf <service> && docker compose up -d <service>`.

**`could not translate host name "db"`** — the `db` container is not running. `docker compose ps -a`;
if Postgres exited, check `docker compose logs db`.

**Postgres starts but the data is gone after a recreate** — check the `db` volume mount. Postgres 18
moved `PGDATA` to `/var/lib/postgresql/18/docker` and moved its declared `VOLUME` up to the parent, so
`docker-compose.yml` mounts `pgdata:/var/lib/postgresql`, **not** `/var/lib/postgresql/data` as it did
on 16. With the old path the server initialises into the container's own writable layer, works
perfectly, and loses everything the next time the container is replaced.

**Upgrading a `pgdata` volume from an older Postgres** — major versions are not in-place compatible;
18 refuses a 16 data directory outright. Dump with the *newer* client, then restore into a fresh
volume:

```bash
docker run --rm --network save_furry_friend_data -e PGPASSWORD=<pw> postgres:18 \
    pg_dump -h db -U root -d blog --no-owner --no-privileges > blog.sql
docker compose down db && docker volume rm save_furry_friend_pgdata
docker compose up -d db                       # initialises an empty 18 cluster
docker compose exec -T db psql -U root -d blog -v ON_ERROR_STOP=1 < blog.sql
docker compose exec db createdb -U root testing   # not in the per-database dump
```

Throwing the data away instead is `docker compose down -v`, then migrate + seed. That also discards
any account you created by hand, which the seeder cannot recreate.

**`vite: not found` in the react container** — the `/app/node_modules` anonymous volume is stale and
shadows the image's own `node_modules`, so a rebuild alone does not help. Discard the volume too:
`docker compose up -d --build --force-recreate --renew-anon-volumes react`.

**Uploads fail with a bucket error** — the `minio-init` service creates the `uploads` bucket and sets
its anonymous download policy on every `up`; if uploads still fail, it exited non-zero:
`docker compose logs minio-init`.

**Upload returns 413 Request Entity Too Large** — the ceiling is 32 MB, set in two places that must
agree: `client_max_body_size 32m` in `nginx/conf.d/default.conf` and `upload_max_filesize=32M` /
`post_max_size=40M` in `php/uploads.ini`. The smaller of the two wins, so raise both. Changing
`php/uploads.ini` needs an image rebuild (`docker compose up -d --build app`).

**Frontend serves but shows a compile error overlay** — read `docker compose logs react`. The
container's filesystem is case-sensitive, so import paths whose casing differs from the file on
disk fail there while working fine on macOS.

## CI

`.github/workflows/main.yml` runs three jobs on every push and pull request, plus one deploy job on
pushes to `main`:

| Job | What it proves |
| --- | --- |
| `code-quality` | PHPStan, ECS, Rector (dry-run) and Pest against `backend_full_laravel`, with Composer downloads cached on `composer.lock` |
| `frontend` | `yarn typecheck`, `yarn lint`, `yarn format:check`, `yarn test` and `yarn build` against `frontend_react` |
| `compose` | `docker compose config -q` and `docker compose build`, then builds the `prod` target and boots it — a broken bind mount, a floating image tag, a key missing from `.env.docker.example`, or a deployable image that cannot serve HTTP all fail here instead of on someone's first clone |
| `deploy-db` | Push to `main` only, gated on `code-quality`: `php artisan migrate --force` plus the trivia seeder against the production database, using the `NEON_DIRECT_DB_URL` repository secret (the direct, non-`-pooler` Neon endpoint — see `ai_docs/deployment.md`) |

Pest needs real databases, so `code-quality` runs `postgres:18` and `mongo:8.0` service containers
and installs the `mongodb` PHP extension. `phpunit.xml` carries the Compose hostnames (`db`,
`mongo`) and the job exports `DB_HOST` / `MONGODB_URI` to point at `127.0.0.1` instead — PHPUnit
does not overwrite variables that already exist in the environment, so the exports win.

`compose` copies `.env.docker.example` to `.env` first, because compose interpolation aborts on the
`${VAR:?}` form when a credential is missing.

