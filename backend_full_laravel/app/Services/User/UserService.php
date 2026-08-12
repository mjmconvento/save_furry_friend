<?php

declare(strict_types=1);

namespace App\Services\User;

use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Jobs\SyncAuthorName;
use App\Models\Eloquent\User;
use App\Models\Mongo\Post;
use App\Services\PostService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserService
{
    public function __construct(
        private readonly PostService $postService
    ) {
    }

    /**
     * Whether $viewer follows $user. Always false for the viewer themselves.
     */
    public function isFollowing(User $viewer, User $user): bool
    {
        if ($viewer->id === $user->id) {
            return false;
        }

        return $viewer->following()
            ->wherePivot('followed_id', $user->id)
            ->exists();
    }

    /**
     * Counts for a profile header. Three queries, one of them against Mongo,
     * which is why only `show` asks for them - doing this per row on the user
     * index would be an N+1 nobody would notice until the list grew.
     *
     * @return array{posts: int, followers: int, following: int}
     */
    public function profileStats(User $user): array
    {
        return [
            'posts' => Post::where('authorId', $user->id)->count(),
            'followers' => $user->followers()
                ->count(),
            'following' => $user->following()
                ->count(),
        ];
    }

    public function storeUser(StoreUserRequest $request): User
    {
        $user = new User();
        $user->id = (string) Str::uuid();

        /** @var string $firstName */
        $firstName = $request->get('firstName');

        /** @var ?string $middleName */
        $middleName = $request->get('middleName');

        /** @var string $lastName */
        $lastName = $request->get('lastName');

        /** @var string $email */
        $email = $request->get('email');

        /** @var string $password */
        $password = $request->get('password');

        $user->first_name = $firstName;
        $user->middle_name = $middleName;
        $user->last_name = $lastName;
        $user->email = $email;
        $user->password = Hash::make($password);
        $user->save();

        return $user;
    }

    public function updateUser(UpdateUserRequest $request, User $user): void
    {
        if ($request->has('firstName')) {
            /** @var string $firstName */
            $firstName = $request->get('firstName');

            $user->first_name = $firstName;
        }

        if ($request->has('middleName')) {
            /** @var ?string $middleName */
            $middleName = $request->get('middleName');

            $user->middle_name = $middleName;
        }

        if ($request->has('lastName')) {
            /** @var string $lastName */
            $lastName = $request->get('lastName');

            $user->last_name = $lastName;
        }

        if ($request->has('email')) {
            /** @var string $email */
            $email = $request->get('email');

            $user->email = $email;
        }

        if ($request->has('password')) {
            /** @var string $password */
            $password = $request->get('password');

            $user->password = Hash::make($password);
        }

        $user->save();

        // `authorName` is denormalized into every Mongo post, so a rename has
        // to fan out to the documents that already carry the old name.
        if ($user->wasChanged(['first_name', 'last_name'])) {
            SyncAuthorName::dispatch($user->id, $user->first_name . ' ' . $user->last_name);
        }
    }

    /**
     * Deleting the Postgres row cascades the follow graph, but nothing else:
     * the user's Mongo posts would be left behind with a dangling `authorId`
     * (their S3 objects orphaned forever) and `personal_access_tokens` has no
     * foreign key, so its rows would survive too.
     */
    public function destroyUser(User $user): void
    {
        $this->postService->deletePostsByAuthor($user->id);
        $user->tokens()
            ->delete();

        $user->delete();
    }
}
