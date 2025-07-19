<?php

namespace App\Services;

use App\Http\Requests\Post\StorePostRequest;
use App\Http\Requests\Post\UpdatePostRequest;
use App\Models\Eloquent\User;
use App\Models\Mongo\Post;
use Illuminate\Filesystem\AwsS3V3Adapter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Database\Eloquent\Collection;

class PostService
{
    /**
     * @return Collection<int, Post>
     */
    public function getPosts(): Collection
    {
        $tags = request()->query('tags');
        $authorId = request()->query('authorId');

        if (is_null($tags)) {
            /** @var Collection<int, Post> $returnPost */
            $returnPost = Post::all();

            return $returnPost;
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
                ->map(function ($id): string {
                    assert(is_scalar($id));

                    return (string) $id;
                })
                ->toArray();

            $followingIds[] = Auth::id();

            $query->whereIn('authorId', $followingIds);
        }

        /** @var Collection<int, Post> $returnPost */
        $returnPost = $query->orderBy('createdAt', 'desc')->get();

        return $returnPost;
    }

    public function storePost(StorePostRequest $request): Post
    {
        /** @var User $user */
        $user = Auth::user();

        $user = $user->toArray();

        $post = new Post();
        $post->authorId = $user['id'];
        $post->authorName = $user['first_name'] . ' ' . $user['last_name'];

        /** @var string $content */
        $content = $request->get('content');
        $post->content = $content;
        $post->createdAt = now();

        /** @var array<string> $tags */
        $tags = $request->get('tags');
        $post->tags = $tags;

        if (isset($request->all()["medias"])) {
            $urls = [];

            /** @var array<UploadedFile> $medias */
            $medias = $request->file('medias');

            foreach ($medias as $file) {
                if (!$file->isValid()) {
                    logger('Invalid file upload: ' . $file->getClientOriginalName());
                }

                /** @var string $path */
                $path = $file->store($user['id'], 's3');

                /** @var AwsS3V3Adapter $filesystem */
                $filesystem = Storage::disk('s3');
                $filesystem->setVisibility($path, 'public');
                $url = $filesystem->url($path);

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
