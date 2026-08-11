<?php

declare(strict_types=1);

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| Feature tests get the application container and a migrated Postgres
| database. Unit tests get the container too, so they can resolve services
| without hand-building dependencies.
|
*/

pest()
    ->extend(Tests\TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

pest()
    ->extend(Tests\TestCase::class)
    ->in('Unit');

/*
|--------------------------------------------------------------------------
| MongoDB isolation
|--------------------------------------------------------------------------
|
| RefreshDatabase only migrates and transacts the DEFAULT connection, so it
| does nothing for MongoDB: documents a test creates are never rolled back.
| Mongo transactions are not an option either - they require a replica set and
| the container runs standalone. So the collection is wiped per test.
|
| The name guard is the important part: pointed at the real `sff` database this
| beforeEach would delete production data. Fail loudly instead.
|
*/

pest()
    ->beforeEach(function (): void {
        $database = config('database.connections.mongodb.database');

        if (! is_string($database) || ! str_ends_with($database, '_testing')) {
            throw new RuntimeException(sprintf(
                'Refusing to run: MongoDB database is "%s". Tests wipe collections, so it must be a dedicated database ending in "_testing". Set MONGODB_DATABASE in phpunit.xml.',
                is_string($database) ? $database : gettype($database)
            ));
        }

        DB::connection('mongodb')->table('posts')->truncate();
    })->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
*/

expect()
    ->extend('toBeOne', fn () => $this->toBe(1));
