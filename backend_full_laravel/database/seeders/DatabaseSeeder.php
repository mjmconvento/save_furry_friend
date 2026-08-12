<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Default seeder: `migrate --seed` and `db:seed` resolve
 * Database\Seeders\DatabaseSeeder, so its absence is what forced every
 * documented command to spell out `--seeder=`.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(TestUserSeeder::class);
    }
}
