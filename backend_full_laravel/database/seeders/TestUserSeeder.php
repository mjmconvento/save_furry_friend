<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TestUserSeeder extends Seeder
{
    /**
     * Shared by both accounts; the README documents it as the login for a
     * fresh clone.
     */
    private const PASSWORD = 'password112233';

    public function run(): void
    {
        $this->upsertUser('test@user.com', [
            'first_name' => 'Test',
            'last_name' => 'User I',
        ]);

        $this->upsertUser('test2@user.com', [
            'first_name' => 'Test',
            'middle_name' => 'Test',
            'last_name' => 'User II',
        ]);
    }

    /**
     * Matched on email so the seeder is idempotent: `make bootstrap` runs
     * `migrate --seed` on every invocation, and a bare insert would abort on
     * the unique index the second time round.
     *
     * @param array<string, string> $attributes
     */
    private function upsertUser(string $email, array $attributes): void
    {
        $values = [
            ...$attributes,
            'password' => Hash::make(self::PASSWORD),
        ];

        DB::table('users')->updateOrInsert(
            [
                'email' => $email,
            ],
            // The uuid is generated on insert only. Rewriting it on a re-run
            // would repoint the follow graph and every Mongo post at an id
            // that no longer exists.
            static fn (bool $exists): array => $exists
                ? $values
                : [
                    ...$values,
                    'id' => (string) Str::uuid(),
                ],
        );
    }
}
