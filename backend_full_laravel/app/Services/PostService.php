<?php

namespace App\Services;

use App\Http\Requests\Post\StorePostRequest;
use App\Http\Requests\Post\UpdatePostRequest;
use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class PostService
{
    public function getPosts(): Collection
    {
        $tags = request()->query('tags');
        $authorId = request()->query('authorId');

        if (is_null($tags)) {
            return Post::all();
        }

        $query = Post::query()
            ->whereIn('tags', $tags);

        if (!is_null($authorId)) {
            $query->where('authorId', $authorId);
        } else {
            /** @var User $user */
            $user = Auth::user();

            $followingIds = $user
                ->following()
                ->pluck('id')
                ->map(fn ($id) => (string) $id)
                ->toArray();

            $followingIds[] = Auth::id();

            $query->whereIn('authorId', $followingIds);
        }

        return $query->orderBy('createdAt', 'desc')->get();
    }

    public function storePost(StorePostRequest $request): Post
    {
        /** @var User $user */
        $user = Auth::user();

        $user = $user->toArray();

        $post = new Post;
        $post->authorId = $user['id'];
        $post->authorName = $user['first_name'] . ' ' . $user['last_name'];
        $post->content = $request->get('content');
        $post->createdAt = now();
        $post->tags = $request->get('tags');

        if (isset($request->all()["medias"])) {
            $urls = [];

            foreach ($request->file('medias') as $file) {
                if (!$file->isValid()) {
                    logger('Invalid file upload: ' . $file->getClientOriginalName());
                }

                $path = $file->store($user['id'], 's3');
                Storage::disk('s3')->setVisibility($path, 'public');
                $url = Storage::disk('s3')->url($path);

                /**
                 * TODO: This is a workaround for the MinIO URL. Remove this when using a real S3 service.
                 */
                $url = str_replace('http://minio:9000', 'http://localhost:9001', $url);
                $urls[] = $url;
            }

            $post->medias = $urls;
        }

        $post->save();

        return $post;
    }

    public function updatePost(UpdatePostRequest $request, Post $post): void
    {
        $post->update($request->only(['title', 'content', 'tags']));
    }
}
