<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use MongoDB\Laravel\Schema\Blueprint as MongoBlueprint;

return new class() extends Migration {
    /**
     * Compound Mongo indexes, keyed by the fields the feed queries filter and sort on.
     *
     * @var array<int, array<string, int>>
     */
    private const MONGO_POST_INDEXES = [
        [
            'authorId' => 1,
            'createdAt' => -1,
        ], // feed + author profile
        [
            'tags' => 1,
            'createdAt' => -1,
        ],     // tag filter
    ];

    private const USERS_TRGM_INDEX = 'users_names_trgm';

    public function up(): void
    {
        Schema::connection('mongodb')->table('posts', function (MongoBlueprint $collection): void {
            foreach (self::MONGO_POST_INDEXES as $keys) {
                $collection->index($keys);
            }
        });

        // The composite primary key (follower_id, followed_id) only serves
        // lookups led by follower_id; followers() filters on followed_id alone.
        Schema::table('user_followers', function (Blueprint $table): void {
            $table->index('followed_id');
        });

        $this->createTrigramIndex();
    }

    public function down(): void
    {
        Schema::connection('mongodb')->table('posts', function (MongoBlueprint $collection): void {
            foreach (self::MONGO_POST_INDEXES as $keys) {
                $collection->dropIndexIfExists($keys);
            }
        });

        Schema::table('user_followers', function (Blueprint $table): void {
            $table->dropIndex(['followed_id']);
        });

        DB::statement('DROP INDEX IF EXISTS ' . self::USERS_TRGM_INDEX);
    }

    /**
     * Trigram index for the leading-wildcard name search, which no b-tree can serve.
     *
     * Creating an extension needs privileges the application role may not have on
     * a managed Postgres, so a failure here degrades search to a sequential scan
     * rather than breaking the whole migration.
     */
    private function createTrigramIndex(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        try {
            DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        } catch (Throwable $e) {
            Log::warning('Skipping ' . self::USERS_TRGM_INDEX . ': pg_trgm is unavailable.', [
                'exception' => $e->getMessage(),
            ]);

            return;
        }

        DB::statement(
            'CREATE INDEX IF NOT EXISTS ' . self::USERS_TRGM_INDEX . ' ON users USING gin ('
            . "(first_name || ' ' || coalesce(middle_name, '') || ' ' || last_name) gin_trgm_ops)",
        );
    }
};
