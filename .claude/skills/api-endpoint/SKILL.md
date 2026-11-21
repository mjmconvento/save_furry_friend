---
name: api-endpoint
description: Add or change a Laravel API endpoint in Save Furry Friend and wire it end to end - route, FormRequest, policy, service, JsonResource, Pest feature tests, the React service/interface, and the README API table. Use when the user asks for a new feature that needs the API, a new or changed route, a payload/field change, or "make the SPA able to ...".
argument-hint: "[what the endpoint should do]"
allowed-tools: Bash(docker compose exec -T -e COLUMNS=150 app php artisan route:list *) Bash(docker compose exec -T app vendor/bin/pest *) Bash(docker compose exec -T app composer phpstan) Bash(docker compose exec -T react yarn typecheck) Bash(docker compose exec -T react yarn test *)
---

# Add or change an API endpoint, end to end

Request: $ARGUMENTS

Current API routes (registration order matters - see step 1):

!`docker compose exec -T -e COLUMNS=150 app php artisan route:list --path=api --except-vendor 2>/dev/null | sed -E 's/ \.{2,} / /' || echo "(stack down - read backend_full_laravel/routes/api.php)"`

Work through the layers in this order. Each step names the file to copy the shape from; read it
before writing, because the house style (why-comments, typed array shapes) is part of the contract.
Templates for each layer are in [templates.md](templates.md).

## 1. Decide the shape first

Answer these before touching code, and state the answers to the user in one short list:

- **Who may call it?** Public (and then which `throttle:`), any signed-in user, the owner of the
  resource, or admin only. Self-service on the caller's own account uses singular `user/...` with no
  `{user}` parameter (see `user/preferences`), so it cannot be aimed at someone else.
- **Which store?** Postgres (`App\Models\Eloquent`) or Mongo (`App\Models\Mongo`). Data that crosses
  the two is joined in PHP with one `whereIn` per page, never per row.
- **Paginated?** Lists are. Return `Resource::collection($paginator)` and keep filters on the next
  page with `->appends($filters)`.
- **Repeat behaviour?** Both precedents exist: like/unlike are idempotent (atomic `$addToSet`/`$pull`,
  a retry is never an error), follow/unfollow answer `422` on a repeat. Pick one deliberately, say
  which, and test it.

## 2. Backend

1. **Route** in `backend_full_laravel/routes/api.php`, inside the `auth:sanctum` group unless public.
   Literal segments (`posts/summary`, `users/discover`, `posts/{post}/like`) go **above** the
   `apiResource(...)` lines with a comment saying why. Name every route (`->name('posts.like')`).
2. **FormRequest** in `app/Http/Requests/<Area>/`. Authorization that does not depend on a bound
   model goes in `authorize()` so a stranger gets 403 before 422 (see `IndexUserRequest`). Rules
   cap everything: string `max:`, array `max:`, `per_page` `max:50`.
3. **Policy** for ownership checks on a bound model (`PostPolicy`, `CommentPolicy`); register it with
   `Gate::policy()` in `AppServiceProvider`; call `$this->authorize('ability', $model)` in the controller.
4. **Service** method in `app/Services/`: all querying and writing. Keep fields that must never be
   client-set out of `$fillable` (`roles`, `likes`).
5. **Controller** method: resolve `$request->user()` with a `/** @var User $viewer */`, call the service,
   return a Resource. If it returns posts, call `$this->postService->hydrate([...])` **after** any save.
6. **Resource**: camelCase keys for Mongo-backed payloads, snake_case for Postgres ones, matching the
   existing resource for that model. Media are keys in storage, URLs only here via
   `Storage::disk('s3')->url()`. Never expose a roster or another user's private field "because it
   was there" - `PostResource` exposes `likeCount`, not `likes`.

## 3. Tests (`backend_full_laravel/tests/Feature/<Thing>Test.php`)

Pest, real databases. One `it()` per observable behaviour, named as the user would describe it.
Minimum set for a new endpoint:

- happy path asserting the JSON shape with `assertJsonPath`
- `401` unauthenticated (unless public), `403` for the wrong user/role, `404` for a missing id
- `422` for each meaningful validation rule
- for writes: the refusal left the database unchanged (`expect(Post::find($id)->content)->toBe(...)`)
- for privacy-sensitive payloads: assert the field is **absent** (`->not->toHaveKey('likes')`)

Run just yours while iterating: `docker compose exec -T app vendor/bin/pest --filter=<Thing>`.

## 4. Frontend

1. Path constant in `frontend_react/src/config/api.ts` (no leading slash).
2. Shape in `src/interface/<Model>.ts`, field-for-field with the Resource, with a doc comment for
   anything non-obvious (nullability, units, "absent on old documents").
3. Function in `src/service/<area>/<thing>Api.ts` using `apiRequest<T>` or `apiPage<T>`; take
   `token: string | null` and an optional `signal`. Mirror `postApi.ts`.
4. UI: optimistic update with rollback and `useNotify()` on failure, as `PostCard` does for likes.
   Tag/tone values come from `src/config/tags.ts`.
5. Test in `src/App.test.tsx` by stubbing `fetch` per URL fragment (narrow fragments first). Assert by
   role and accessible name, and assert the request that was sent when the body matters.

## 5. Documentation

Add the route to the **API surface** table in `README.md` (method, path, who may call it) and a bullet
under "Shapes worth knowing" if the payload has a non-obvious rule.

## 6. Done means

- `python3 .claude/hooks/ci_gate.py` passes (the Stop hook runs it for you too).
- Report to the user: the route(s), who can call them, and the tests that pin the authorization.
