<?php

declare(strict_types=1);

use App\Models\Mongo\Post;

// Replaces the old PostServiceTest, which mocked `only(['title', ...])` and
// asserted the model received a `title` key it silently discarded (BE-16). It
// would have passed even if updatePost() had done nothing observable.

it('resolves to the posts collection', function (): void {
    // BE-10: the collection used to be declared in a `$collection` property
    // that the framework never reads, so a class rename would have silently
    // pointed the model at a different collection.
    expect((new Post())->getTable())
        ->toBe('posts');
});

it('manages its own camelCase timestamps', function (): void {
    // BE-11: one convention, so documents stop carrying createdAt plus
    // created_at plus updated_at.
    expect(Post::CREATED_AT)->toBe('createdAt')
        ->and(Post::UPDATED_AT)->toBe('updatedAt')
        ->and((new Post())->usesTimestamps())
        ->toBeTrue();
});

it('does not accept a title or a hand-set createdAt by mass assignment', function (): void {
    $fillable = (new Post())->getFillable();

    expect($fillable)
        ->not->toContain('title')
        ->and($fillable)
        ->not->toContain('createdAt')
        ->and($fillable)
        ->toContain('content')
        ->and($fillable)
        ->toContain('tags')
        ->and($fillable)
        ->toContain('medias');
});

it('casts its timestamps to dates', function (): void {
    $casts = (new Post())->getCasts();

    expect($casts)
        ->toHaveKey('createdAt')
        ->and($casts)
        ->toHaveKey('updatedAt');
});
