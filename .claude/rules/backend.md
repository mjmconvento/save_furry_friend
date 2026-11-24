---
paths:
  - "backend_full_laravel/**/*.php"
  - "backend_full_laravel/phpstan.neon"
  - "backend_full_laravel/phpunit.xml"
  - "backend_full_laravel/composer.json"
---

# Backend rules (Laravel 13, PHP 8.5)

Run everything through `docker compose exec -T app …`; there is no PHP on the host.

## Layering

- `routes/api.php` → FormRequest (`app/Http/Requests/<Area>/`) → thin controller → service
  (`app/Services/`) → `JsonResource` (`app/Http/Resources/`). Controllers never query directly.
- Inject services through constructor promotion: `private readonly PostService $postService`.
- Postgres models live in `App\Models\Eloquent`, Mongo models in `App\Models\Mongo`
  (`MongoDB\Laravel\Eloquent\Model`, `#[Connection('mongodb')]`, UUID string keys, camelCase fields
  `authorId` / `createdAt`). Postgres columns are snake_case. Do not mix the two conventions.
- Model configuration uses Laravel 13's class attributes - `#[Table]`, `#[Connection]`,
  `#[Fillable]`, `#[Hidden]` - not the `$table` / `$fillable` / `$hidden` properties.
- Ownership checks on a bound model: `#[Authorize('ability', 'param')]` on the controller method,
  never `$this->authorize()` in its body, which runs after the FormRequest has already validated.
- Policies are registered explicitly in `AppServiceProvider` with `Gate::policy(...)`. Register new
  ones there too; do not rely on auto-discovery with the nested `Models\Eloquent` / `Models\Mongo`
  namespaces. An ability with no resolvable policy is denied, so a missing line reads as a 403 bug.

## Static analysis is level 10

- `declare(strict_types=1);` on every file (Rector enforces it).
- Narrow `mixed` instead of casting blindly: `is_string($x)`, `assert(...)`, or a typed `@var` on the
  line that reads `$request->validated(...)` / `$request->user()`. Follow the existing idiom:
  `/** @var User $viewer */ $viewer = $request->user();`.
- Give every array a shape: `@param array<int, Post>`, `@return array<string, int>`,
  `LengthAwarePaginator<int, Post>`. New `ignoreErrors` entries in `phpstan.neon` need a comment
  explaining why the code cannot be typed; never add a baseline.
- Add `#[\Override]` to overridden properties and methods, as the models do.

## Mongo specifics

- Atomic operators for sets: `$post->push('likes', $id, true)` / `$post->pull(...)`; never
  read-modify-write an array field.
- Fields absent on old documents must be read as their empty value (`$this->likes ?? []`).
- Aggregations go straight to the driver via `getCollection()->aggregate(...)` with
  `typeMap => ['root' => 'array', 'document' => 'array']`.
- No transactions (standalone server). Order multi-store writes so the source of truth is written
  first and cleanup (S3 objects, orphan comments) is best-effort, as `PostService::deletePost()` does.

## Tests (Pest, `tests/Feature`)

- Real Postgres + Mongo; `RefreshDatabase` covers Postgres, `tests/Pest.php` truncates `posts` and
  `comments` per test. A new Mongo collection must be added to that truncation list.
- Style: `it('says what the user observes', function (): void { ... })`, `User::factory()->create()`,
  `->admin()` / `->unverified()` states, `$this->actingAs($user)->postJson(...)->assertJsonPath(...)`.
- Cover the authorization edge, not just the happy path: unauthenticated (401), wrong user (403),
  missing record (404), invalid payload (422). Assert the database did not change on a refusal.
- Filter while iterating: `docker compose exec -T app vendor/bin/pest --filter=PostLike`.
