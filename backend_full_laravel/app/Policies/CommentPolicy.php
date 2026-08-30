<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Eloquent\User;
use App\Models\Mongo\Comment;
use App\Models\Mongo\Post;

class CommentPolicy
{
    /**
     * The comment's author may remove it, and so may the author of the post it
     * is attached to: it is their story, so they get moderation over what hangs
     * off it. Mirrors how `PostPolicy` treats the post itself.
     *
     * The post is looked up rather than passed so the policy can be checked
     * from a route bound only to the comment.
     */
    public function delete(User $user, Comment $comment): bool
    {
        if ($comment->authorId === $user->id) {
            return true;
        }

        return Post::find($comment->postId)?->authorId === $user->id;
    }
}
