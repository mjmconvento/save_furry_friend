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
     * Every sample user follows every other one.
     *
     * Without this the sample corpus is invisible: `PostService::getPosts()`
     * scopes every feed to the follow graph plus the viewer's own posts, so a
     * freshly seeded account would see only its own output - and with nothing
     * but its own posts on screen there is no way to tell that Edit and Delete
     * are owner-only, because everything would be owned.
     */
    private function followEachOther(\Carbon\CarbonInterface $now): void
    {
        $rows = [];

        foreach (self::USERS as $follower) {
            foreach (self::USERS as $followed) {
                if ($follower['id'] === $followed['id']) {
                    continue;
                }

                $rows[] = [
                    'follower_id' => $follower['id'],
                    'followed_id' => $followed['id'],
                    'created_at' => $now,
                ];
            }
        }

        // The composite primary key makes a plain insert fail on a re-run.
        DB::table('user_followers')->upsert($rows, ['follower_id', 'followed_id'], ['created_at']);
    }
}
