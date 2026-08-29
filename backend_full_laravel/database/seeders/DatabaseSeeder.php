<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Default seeder: `migrate --seed` and `db:seed` resolve
 * Database\Seeders\DatabaseSeeder, so its absence is what forced every
 * documented command to spell out `--seeder=`.
 *
 * All children are idempotent - users are matched on a fixed id, and the post
 * and trivia seeders replace their own previous output - so `make bootstrap`
 * is safe to run against a live stack.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            SampleUserSeeder::class,
            SamplePostSeeder::class,
            TriviaSeeder::class,
        ]);
    }
}
