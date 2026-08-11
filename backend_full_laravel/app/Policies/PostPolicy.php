<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Eloquent\User;
use App\Models\Mongo\Post;

class PostPolicy
{
    public function update(User $user, Post $post): bool
    {
        return $post->authorId === $user->id;
    }

    public function delete(User $user, Post $post): bool
    {
        return $this->update($user, $post);
    }
}
