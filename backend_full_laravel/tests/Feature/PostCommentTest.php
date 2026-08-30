<?php

declare(strict_types=1);

use App\Enums\PostTag;
use App\Models\Eloquent\User;
use App\Models\Mongo\Comment;
use App\Models\Mongo\Post;
use Illuminate\Support\Carbon;

function commentedPost(User $author): Post
{
    return Post::create([
        'authorId' => $author->id,
        'authorName' => $author->first_name,
        'content' => 'A dog found his family today.',
        'tags' => [PostTag::Happy->value],
    ]);
}

function commentOn(Post $post, User $author, string $content, ?Carbon $at = null): Comment
{
    $comment = Comment::create([
        'postId' => $post->id,
        'authorId' => $author->id,
        'content' => $content,
    ]);

    if ($at instanceof Carbon) {
        // Written after the fact: `createdAt` is model-managed.
        $comment->createdAt = $at;
        $comment->save();
    }

    return $comment;
}

it('adds a comment to a post', function (): void {
    $post = commentedPost(User::factory()->create());
    $reader = User::factory()->create([
        'first_name' => 'Ada',
        'last_name' => 'Lovelace',
    ]);

    $this->actingAs($reader)
        ->postJson("/api/posts/{$post->id}/comments", [
            'content' => 'What a good boy.',
        ])
        ->assertCreated()
        ->assertJsonPath('data.content', 'What a good boy.')
        ->assertJsonPath('data.authorId', $reader->id)
        // Resolved from the account at render time, never stored on the
        // comment - the same rule avatars follow on posts, and the same
        // first-plus-last shape `storePost` writes onto a post.
        ->assertJsonPath('data.authorName', 'Ada Lovelace');
});

it('lists a thread oldest first, the way it is read', function (): void {
    $post = commentedPost(User::factory()->create());
    $reader = User::factory()->create();

    commentOn($post, $reader, 'second', Carbon::now()->subMinutes(5));
    commentOn($post, $reader, 'first', Carbon::now()->subHour());

    $this->actingAs($reader)
        ->getJson("/api/posts/{$post->id}/comments")
        ->assertOk()
        ->assertJsonPath('data.0.content', 'first')
        ->assertJsonPath('data.1.content', 'second');
});

it('keeps each post to its own thread', function (): void {
    $author = User::factory()->create();
    $mine = commentedPost($author);
    $other = commentedPost($author);

    commentOn($mine, $author, 'on mine');
    commentOn($other, $author, 'on the other');

    $this->actingAs($author)
        ->getJson("/api/posts/{$mine->id}/comments")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.content', 'on mine');
});

it('shows the current name and picture, not a copy made at write time', function (): void {
    // `authorName` on posts is denormalized and needs a job to stay honest.
    // Comments deliberately do not repeat that mistake.
    $post = commentedPost(User::factory()->create());
    $reader = User::factory()->create([
        'first_name' => 'Bea',
        'last_name' => 'Arthur',
    ]);

    commentOn($post, $reader, 'hello');
    $reader->update([
        'first_name' => 'Beatrix',
    ]);

    $this->actingAs($reader)
        ->getJson("/api/posts/{$post->id}/comments")
        ->assertOk()
        ->assertJsonPath('data.0.authorName', 'Beatrix Arthur');
});

it('pages a long thread', function (): void {
    $post = commentedPost(User::factory()->create());
    $reader = User::factory()->create();

    foreach (range(1, 7) as $index) {
        commentOn($post, $reader, "comment {$index}", Carbon::now()->subMinutes(60 - $index));
    }

    $response = $this->actingAs($reader)
        ->getJson("/api/posts/{$post->id}/comments?per_page=3")
        ->assertOk();

    expect($response->json('meta.total'))
        ->toBe(7)
        ->and($response->json('meta.last_page'))
        ->toBe(3)
        ->and($response->json('data'))
        ->toHaveCount(3);
});

it('reports the comment count on every post in a feed', function (): void {
    $viewer = User::factory()->create();
    $post = commentedPost($viewer);

    commentOn($post, $viewer, 'one');
    commentOn($post, $viewer, 'two');

    $this->actingAs($viewer)
        ->getJson('/api/posts')
        ->assertOk()
        ->assertJsonPath('data.0.commentCount', 2);
});

it('keeps the count right on the payload a mutation answers with', function (): void {
    // Liking a commented post used to be able to hand back commentCount 0 and
    // make the number visibly drop, because only the feed hydrated it.
    $viewer = User::factory()->create();
    $post = commentedPost($viewer);
    commentOn($post, $viewer, 'one');

    $this->actingAs($viewer)
        ->postJson("/api/posts/{$post->id}/like")
        ->assertOk()
        ->assertJsonPath('data.commentCount', 1);
});

it('reports zero for a post nobody has commented on', function (): void {
    $viewer = User::factory()->create();
    $post = commentedPost($viewer);

    $this->actingAs($viewer)
        ->getJson("/api/posts/{$post->id}")
        ->assertOk()
        ->assertJsonPath('data.commentCount', 0);
});

it('lets the comment author delete their own comment', function (): void {
    $post = commentedPost(User::factory()->create());
    $reader = User::factory()->create();
    $comment = commentOn($post, $reader, 'mine to remove');

    $this->actingAs($reader)
        ->deleteJson("/api/comments/{$comment->id}")
        ->assertOk();

    expect(Comment::count())->toBe(0);
});

it('lets the post author remove a comment on their own story', function (): void {
    // Moderation over what is attached to your own post, mirroring how
    // PostPolicy treats the post itself.
    $author = User::factory()->create();
    $post = commentedPost($author);
    $comment = commentOn($post, User::factory()->create(), 'not mine');

    $this->actingAs($author)
        ->deleteJson("/api/comments/{$comment->id}")
        ->assertOk();

    expect(Comment::count())->toBe(0);
});

it('refuses a bystander deleting somebody else\'s comment', function (): void {
    $post = commentedPost(User::factory()->create());
    $comment = commentOn($post, User::factory()->create(), 'not yours');

    $this->actingAs(User::factory()->create())
        ->deleteJson("/api/comments/{$comment->id}")
        ->assertForbidden();

    expect(Comment::count())->toBeOne();
});

it('rejects an empty comment', function (): void {
    $post = commentedPost(User::factory()->create());

    $this->actingAs(User::factory()->create())
        ->postJson("/api/posts/{$post->id}/comments", [
            'content' => '   ',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['content']);
});

it('rejects a comment longer than the bound', function (): void {
    // Without one, a single request could write a document big enough to slow
    // every read of the thread.
    $post = commentedPost(User::factory()->create());

    $this->actingAs(User::factory()->create())
        ->postJson("/api/posts/{$post->id}/comments", [
            'content' => str_repeat('a', 2001),
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['content']);
});

it('keeps a comment whose author is gone, and says the author is missing', function (): void {
    // Unlike the like roster, which is a list of people and drops accounts that
    // no longer exist, a comment is content: the thread reads worse with holes
    // punched in it than with one entry whose author cannot be named.
    $post = commentedPost(User::factory()->create());
    $staying = User::factory()->create();
    $leaving = User::factory()->create();

    commentOn($post, $staying, 'still here', Carbon::now()->subHour());
    commentOn($post, $leaving, 'orphaned', Carbon::now()->subMinutes(5));
    $leaving->delete();

    $this->actingAs($staying)
        ->getJson("/api/posts/{$post->id}/comments")
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.1.content', 'orphaned')
        // The client renders the placeholder; the API just declines to invent
        // a name.
        ->assertJsonPath('data.1.authorName', null);
});

it('takes a post\'s comments with it when the post is deleted', function (): void {
    // Comments live in their own collection, so nothing removes them with the
    // document. Orphaned threads would accumulate for ever, invisible and
    // uncountable.
    $author = User::factory()->create();
    $post = commentedPost($author);
    $survivor = commentedPost($author);

    commentOn($post, $author, 'goes with it');
    commentOn($survivor, $author, 'stays');

    $this->actingAs($author)
        ->deleteJson("/api/posts/{$post->id}")
        ->assertOk();

    expect(Comment::count())->toBeOne()
        ->and(Comment::first()?->content)->toBe('stays');
});
it('404s when commenting on a post that does not exist', function (): void {
    $this->actingAs(User::factory()->create())
        ->postJson('/api/posts/2b1f4c9e-0000-4000-8000-000000000000/comments', [
            'content' => 'hello',
        ])
        ->assertNotFound();
});

it('requires authentication', function (): void {
    $post = commentedPost(User::factory()->create());

    $this->getJson("/api/posts/{$post->id}/comments")
        ->assertUnauthorized();
    $this->postJson("/api/posts/{$post->id}/comments", [
        'content' => 'hi',
    ])
        ->assertUnauthorized();
});
