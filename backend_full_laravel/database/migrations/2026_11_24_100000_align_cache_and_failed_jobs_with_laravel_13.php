<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    /**
     * Brings the framework tables up to the Laravel 13 skeleton, which the
     * shipped `0001_01_01_*` migrations cannot be edited to do.
     *
     * `expiration` holds a Unix timestamp, and a 32-bit `integer` overflows in
     * January 2038 - closer than it looks for a store whose `forever()` writes
     * ten years ahead. The index serves the expired-row sweeps the database
     * cache and lock stores run.
     *
     * `failed_jobs` gets the skeleton's composite index, which the failed-job
     * provider's `count($connection, $queue)` filters on; `connection` and
     * `queue` become `varchar` to match the skeleton's column types.
     */
    public function up(): void
    {
        Schema::table('cache', function (Blueprint $table): void {
            $table->bigInteger('expiration')
                ->change();
            $table->index('expiration');
        });

        Schema::table('cache_locks', function (Blueprint $table): void {
            $table->bigInteger('expiration')
                ->change();
            $table->index('expiration');
        });

        Schema::table('failed_jobs', function (Blueprint $table): void {
            $table->string('connection')
                ->change();
            $table->string('queue')
                ->change();
            $table->index(['connection', 'queue', 'failed_at']);
        });
    }

    public function down(): void
    {
        Schema::table('failed_jobs', function (Blueprint $table): void {
            $table->dropIndex(['connection', 'queue', 'failed_at']);
            $table->text('connection')
                ->change();
            $table->text('queue')
                ->change();
        });

        Schema::table('cache_locks', function (Blueprint $table): void {
            $table->dropIndex(['expiration']);
            $table->integer('expiration')
                ->change();
        });

        Schema::table('cache', function (Blueprint $table): void {
            $table->dropIndex(['expiration']);
            $table->integer('expiration')
                ->change();
        });
    }
};
