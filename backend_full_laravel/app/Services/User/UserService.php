<?php

declare(strict_types=1);

namespace App\Services\User;

use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Jobs\SyncAuthorName;
use App\Models\Eloquent\User;
use App\Models\Mongo\Post;
use App\Services\PostService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use MongoDB\Laravel\Connection as MongoConnection;

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
     * Counts for a profile header, filled in on the model.
     *
     * Three queries for one person, so only surfaces that display them ask: the
     * user index and people search leave `stats` null rather than paying it per
     * row.
     */
    public function attachProfileStats(User $user): void
    {
        $user->profileStats = [
            'posts' => Post::where('authorId', $user->id)->count(),
            'followers' => $user->followers()
                ->count(),
            'following' => $user->following()
                ->count(),
        ];
    }

    /**
     * The same counts for many people in three queries rather than three each.
     *
     * @param iterable<User> $users
     */
    public function attachBulkProfileStats(iterable $users): void
    {
        $ids = [];

        foreach ($users as $user) {
            $ids[] = $user->id;
        }

        if ($ids === []) {
            return;
        }

        $posts = $this->postCounts($ids);
        $followers = $this->pivotCounts($ids, 'followed_id');
        $following = $this->pivotCounts($ids, 'follower_id');

        foreach ($users as $user) {
            $user->profileStats = [
                'posts' => $posts[$user->id] ?? 0,
                'followers' => $followers[$user->id] ?? 0,
                'following' => $following[$user->id] ?? 0,
            ];
        }
    }

    /**
     * People the viewer does not follow yet, most prolific first.
     *
     * Ranked in Mongo, where the posts are: grouping authors by post count and
     * taking the top slice is one indexed aggregation, and the alternative -
     * counting posts per candidate from Postgres - is an N+1 across two stores.
     *
     * A wider slice than `$limit` is taken because the viewer and everyone they
     * already follow are then removed; asking for exactly ten would return fewer
     * than ten as soon as the top authors are all familiar.
     *
     * @return list<User>
     */
    public function suggestions(User $viewer, int $limit = 5): array
    {
        $excluded = $viewer->following()
            ->pluck('users.id')
            ->map(static fn (mixed $id): string => is_scalar($id) ? (string) $id : '')
            ->all();
        $excluded[] = $viewer->id;

        $ranked = $this->postCounts([], $limit * 4);
        $candidates = array_values(array_diff(array_keys($ranked), $excluded));

        if ($candidates === []) {
            return [];
        }

        /** @var array<string, User> $found */
        $found = User::whereIn('id', array_slice($candidates, 0, $limit))
            ->get()
            ->keyBy('id')
            ->all();

        // Reordered to the ranking: `whereIn` makes no promise about order, and
        // the whole point is "most posts first".
        $suggestions = [];

        foreach ($candidates as $id) {
            if (isset($found[$id])) {
                $suggestions[] = $found[$id];
            }
        }

        return $suggestions;
    }

    /**
     * Post counts per author, highest first.
     *
     * One pipeline serves both callers: unfiltered with a limit it ranks the most
     * prolific authors for suggestions, and filtered by ids it counts a known
     * set for their profile stats.
     *
     * @param list<string> $onlyAuthors empty counts every author
     * @return array<string, int>
     */
    private function postCounts(array $onlyAuthors = [], ?int $limit = null): array
    {
        $pipeline = [];

        if ($onlyAuthors !== []) {
            $pipeline[] = [
                '$match' => [
                    'authorId' => [
                        '$in' => $onlyAuthors,
                    ],
                ],
            ];
        }

        $pipeline[] = [
            '$group' => [
                '_id' => '$authorId',
                'posts' => [
                    '$sum' => 1,
                ],
            ],
        ];
        $pipeline[] = [
            '$sort' => [
                'posts' => -1,
            ],
        ];

        // `$limit: 0` is rejected by Mongo, so an absent limit means no stage
        // rather than a zero.
        if ($limit !== null && $limit > 0) {
            $pipeline[] = [
                '$limit' => $limit,
            ];
        }

        $post = new Post();
        /** @var MongoConnection $connection */
        $connection = $post->getConnection();

        $rows = $connection->getCollection($post->getTable())
            ->aggregate($pipeline, [
                'typeMap' => [
                    'root' => 'array',
                    'document' => 'array',
                ],
            ]);

        $counts = [];

        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }

            $id = $row['_id'] ?? null;
            $posts = $row['posts'] ?? null;

            if (is_string($id) && is_int($posts)) {
                $counts[$id] = $posts;
            }
        }

        return $counts;
    }

    /**
     * @param list<string> $ids
     * @return array<string, int>
     */
    private function pivotCounts(array $ids, string $column): array
    {
        $counts = [];

        $rows = DB::table('user_followers')
            ->select($column, DB::raw('count(*) as total'))
            ->whereIn($column, $ids)
            ->groupBy($column)
            ->get();

        foreach ($rows as $row) {
            $id = $row->{$column} ?? null;
            $total = $row->total ?? null;

            if (is_string($id) && is_numeric($total)) {
                $counts[$id] = (int) $total;
            }
        }

        return $counts;
    }

    public function storeUser(StoreUserRequest $request): User
    {
        return $this->createAccount($request);
    }

    /**
     * The one place accounts are created, shared by admin creation
     * (`StoreUserRequest`) and public registration (`RegisterRequest`).
     *
     * The two requests validate the same field names but answer different
     * questions - who may call them - so they stay separate classes while the
     * writing lives here. Neither can set `roles` or `preferences`: they are not
     * fillable, and nothing below touches them.
     */
    public function createAccount(StoreUserRequest|RegisterRequest $request): User
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
