<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Jobs\SyncAuthorName;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class SampleUserSeeder extends Seeder
{
    /** Shared by every sample account; the README documents it as the login. */
    public const PASSWORD = 'password112233';

    /**
     * Ids are fixed rather than generated, because posts live in MongoDB and
     * reference their author by uuid across a boundary no join spans. A
     * regenerated id on `migrate:fresh --seed` would orphan every existing
     * post. The first two ids are the ones this database already had, so
     * re-seeding renames those rows in place instead of stranding their posts.
     *
     * @var list<array{id: string, email: string, first_name: string, middle_name: ?string, last_name: string, roles: list<UserRole>}>
     */
    public const USERS = [
        [
            'id' => '838a3265-53be-4c03-a893-ccb95904ebe4',
            'email' => 'test1@user.com',
            'first_name' => 'Marisol',
            'middle_name' => null,
            'last_name' => 'Vega',
            // Additive: the admin is a user too, so nothing has to special-case
            // "an admin can also do what a user can".
            'roles' => [UserRole::Admin, UserRole::User],
        ],
        [
            'id' => '1a58cd7a-92bf-4020-900c-08f7cdd0a806',
            'email' => 'test2@user.com',
            'first_name' => 'Tomas',
            'middle_name' => 'Iker',
            'last_name' => 'Iglesias',
            'roles' => [UserRole::User],
        ],
        [
            'id' => 'e7ab3db6-8650-4804-858a-8ddaccbd940f',
            'email' => 'test3@user.com',
            'first_name' => 'Priya',
            'middle_name' => null,
            'last_name' => 'Raman',
            'roles' => [UserRole::User],
        ],
        [
            'id' => '88206f0f-0eaf-443c-8f53-faa05cf689ce',
            'email' => 'test4@user.com',
            'first_name' => 'Daniel',
            'middle_name' => 'Chukwu',
            'last_name' => 'Okafor',
            'roles' => [UserRole::User],
        ],
        [
            'id' => '1a80c442-e846-49a2-8099-7f8cc8a67bd8',
            'email' => 'test5@user.com',
            'first_name' => 'Ama',
            'middle_name' => null,
            'last_name' => 'Boateng',
            'roles' => [UserRole::User],
        ],
        [
            'id' => '75f515bc-ddfe-40b4-aca7-1d057a23de7a',
            'email' => 'test6@user.com',
            'first_name' => 'Lucia',
            'middle_name' => 'Pilar',
            'last_name' => 'Ferrer',
            'roles' => [UserRole::User],
        ],
        [
            'id' => '15a6aba1-7491-430a-bd06-a435c431f1d0',
            'email' => 'test7@user.com',
            'first_name' => 'Ines',
            'middle_name' => null,
            'last_name' => 'Duarte',
            'roles' => [UserRole::User],
        ],
        [
            'id' => '9f00c818-0cb0-425d-af18-3bef631df114',
            'email' => 'test8@user.com',
            'first_name' => 'Kwame',
            'middle_name' => 'Osei',
            'last_name' => 'Mensah',
            'roles' => [UserRole::User],
        ],
    ];

    public function run(): void
    {
        $now = now();
        $avatars = $this->avatarPaths();

        foreach (self::USERS as $index => $user) {
            $values = [
                'email' => $user['email'],
                'first_name' => $user['first_name'],
                'middle_name' => $user['middle_name'],
                'last_name' => $user['last_name'],
                // Re-seeding resets roles, so one changed by hand in the database
                // does not survive `make bootstrap`.
                'roles' => json_encode(array_map(
                    static fn (UserRole $role): string => $role->value,
                    $user['roles'],
                )),
                'password' => Hash::make(self::PASSWORD),
                'email_verified_at' => $now,
                'updated_at' => $now,
                'avatar' => $this->uploadAvatar($user['id'], $avatars[$index] ?? null),
            ];

            // Matched on the fixed id, so a re-run updates the same row - which
            // is also what lets an email change without creating a duplicate.
            DB::table('users')->updateOrInsert(
                [
                    'id' => $user['id'],
                ],
                static fn (bool $exists): array => $exists
                    ? $values
                    : [
                        ...$values,
                        'created_at' => $now,
                    ],
            );

            // `authorName` is denormalized into every Mongo post, so renaming a
            // user here leaves existing posts showing the old name - the same
            // staleness the API avoids by dispatching this job on rename.
            // Dispatched synchronously because a deploy seeding step cannot
            // assume a queue worker is running.
            SyncAuthorName::dispatchSync(
                $user['id'],
                trim($user['first_name'] . ' ' . $user['last_name']),
            );
        }

        $this->followEachOther($now);
    }

    /**
     * @return list<string>
     */
    private function avatarPaths(): array
    {
        $paths = glob(__DIR__ . '/samples/avatars/*.jpg');

        return $paths === false ? [] : $paths;
    }

    /**
     * Uploaded on every run, replacing the previous object rather than
     * accumulating one per re-seed. Returns the bare key the column stores; the
     * URL is rendered by `UserResource`.
     *
     * A missing file leaves the account without a picture, which the SPA renders
     * as initials - a seeder is not the place to fail over a decoration.
     */
    private function uploadAvatar(string $userId, ?string $path): ?string
    {
        if ($path === null || ! is_file($path)) {
            return null;
        }

        $key = $userId . '/avatar.' . pathinfo($path, PATHINFO_EXTENSION);

        Storage::disk('s3')->put($key, (string) file_get_contents($path));

        return $key;
    }

    /**
     * A partial follow graph: each account follows the next three in the list,
     * wrapping round.
     *
     * Two things depend on it. Feeds are scoped to the follow graph plus your own
     * posts, so without any follows a freshly seeded account sees only itself -
     * and with nothing but your own posts on screen there is no way to tell that
     * Edit and Delete are owner-only. But *everyone following everyone* is just as
     * useless: "who to follow" is then empty by construction, because there is
     * nobody left to suggest. Three of eight leaves four strangers each.
     */
    private function followEachOther(\Carbon\CarbonInterface $now): void
    {
        $users = self::USERS;
        $total = count($users);
        $rows = [];

        foreach ($users as $index => $follower) {
            foreach ([1, 2, 3] as $step) {
                $followed = $users[($index + $step) % $total];

                $rows[] = [
                    'follower_id' => $follower['id'],
                    'followed_id' => $followed['id'],
                    // Staggered so "newest follow first" has something to order
                    // by, rather than eight rows sharing a timestamp.
                    'created_at' => $now->copy()
                        ->subMinutes($index * 10 + $step),
                ];
            }
        }

        // Cleared first, scoped to rows the sample accounts own: `upsert` adds and
        // updates but never deletes, so a graph that used to be everyone-follows-
        // everyone left its extra edges behind and the corpus stopped being
        // deterministic. Rows where a real account follows a sample one are keyed
        // by that account and are not touched.
        DB::table('user_followers')
            ->whereIn('follower_id', array_column($users, 'id'))
            ->delete();

        DB::table('user_followers')->insert($rows);
    }
}
