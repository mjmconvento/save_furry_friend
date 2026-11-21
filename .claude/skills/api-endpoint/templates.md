# Layer templates

Skeletons in the house style. Replace `Thing`/`things`; delete what the endpoint does not need.
Comments in real code explain **why** - replace the placeholder ones, do not ship them.

## Route (`routes/api.php`, inside `Route::middleware('auth:sanctum')->group(...)`)

```php
// Before apiResource('posts'), or `{post}` swallows the literal segment.
Route::post('posts/{post}/things', [ThingController::class, 'store'])->name('things.store');
```

## FormRequest (`app/Http/Requests/Post/StoreThingRequest.php`)

```php
<?php

declare(strict_types=1);

namespace App\Http\Requests\Post;

use App\Models\Eloquent\User;
use Illuminate\Foundation\Http\FormRequest;

class StoreThingRequest extends FormRequest
{
    /**
     * Checked here rather than in the controller so a stranger gets 403 before
     * validation can answer 422 and disclose whether the payload was well-formed.
     */
    public function authorize(): bool
    {
        return $this->user() instanceof User;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'content' => ['required', 'string', 'max:500'],
        ];
    }
}
```

## Controller method

```php
public function store(StoreThingRequest $request, Post $post): JsonResponse
{
    /** @var User $author */
    $author = $request->user();

    /** @var string $content */
    $content = $request->validated('content');

    $thing = $this->thingService->store($post, $author, $content);

    return new ThingResource($thing)
        ->response()
        ->setStatusCode(201);
}
```

## Pest feature test (`tests/Feature/ThingTest.php`)

```php
<?php

declare(strict_types=1);

use App\Enums\PostTag;
use App\Models\Eloquent\User;
use App\Models\Mongo\Post;

function postBy(User $author): Post
{
    return Post::create([
        'authorId' => $author->id,
        'authorName' => $author->first_name,
        'content' => 'A colony cat was trapped and neutered tonight.',
        'tags' => [PostTag::Neutral->value],
    ]);
}

it('creates a thing and answers with it', function (): void {
    $post = postBy(User::factory()->create());

    $this->actingAs(User::factory()->create())
        ->postJson("/api/posts/{$post->id}/things", ['content' => 'Fed at six.'])
        ->assertCreated()
        ->assertJsonPath('data.content', 'Fed at six.');
});

it('requires authentication', function (): void {
    $post = postBy(User::factory()->create());

    $this->postJson("/api/posts/{$post->id}/things", ['content' => 'x'])
        ->assertUnauthorized();
});

it('rejects an empty thing', function (): void {
    $post = postBy(User::factory()->create());

    $this->actingAs(User::factory()->create())
        ->postJson("/api/posts/{$post->id}/things", ['content' => ''])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('content');
});

it('404s on a post that does not exist', function (): void {
    $this->actingAs(User::factory()->create())
        ->postJson('/api/posts/2b1f4c9e-0000-4000-8000-000000000000/things', ['content' => 'x'])
        ->assertNotFound();
});
```

## Frontend service (`src/service/post/thingApi.ts`)

```ts
import { POSTS_ENDPOINT } from '../../config/api';
import { Thing } from '../../interface/Thing';
import { apiPage, apiRequest, Page } from '../apiClient';

export const fetchThings = async (
  token: string | null,
  postId: string,
  page = 1,
  signal?: AbortSignal
): Promise<Page<Thing>> =>
  apiPage<Thing>(`${POSTS_ENDPOINT}/${postId}/things`, {
    token,
    // Page 1 is the default, so it stays out of the URL.
    query: { page: page > 1 ? String(page) : null },
    signal,
  });

export const addThing = async (
  token: string | null,
  postId: string,
  content: string
): Promise<Thing> =>
  apiRequest<Thing>(`${POSTS_ENDPOINT}/${postId}/things`, {
    method: 'POST',
    token,
    json: { content },
  });
```

## App test (`src/App.test.tsx`)

```tsx
describe('things', () => {
  beforeEach(() => signIn());

  it('posts a thing and shows it without a reload', async () => {
    window.history.pushState({}, '', '/happy_posts');
    routes = {
      // Narrow fragments first: `respond` returns the first match.
      'api/posts/post-1/things': {
        status: 201,
        body: { data: { id: 't1', content: 'Fed at six.' } },
      },
      ...routes,
    };
    renderApp();

    // ...interact by role / accessible name, then:
    expect(await screen.findByText(/fed at six/i)).toBeInTheDocument();
  });
});
```
