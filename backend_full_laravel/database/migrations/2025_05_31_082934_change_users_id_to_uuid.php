<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class() extends Migration {
    public function up(): void
    {
        // A Blueprint closure only *collects* statements; they run after it
        // returns. The backfill therefore has to live between two separate
        // Schema::table() calls, or it targets a column that does not exist yet.
        Schema::table('users', function (Blueprint $table): void {
            $table->uuid('new_uuid')
                ->nullable();
        });

        DB::table('users')->orderBy('id')->each(function (object $user): void {
            DB::table('users')
                ->where('id', $user->id)
                ->update([
                    'new_uuid' => (string) Str::uuid(),
                ]);
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropPrimary();
            $table->dropColumn('id');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->renameColumn('new_uuid', 'id');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->uuid('id')
                ->nullable(false)
                ->change();
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->primary('id');
        });
    }

    public function down(): void
    {
        // bigIncrements() already declares the primary key, so the old
        // additional primary('id') call was a guaranteed duplicate-key error.
        Schema::table('users', function (Blueprint $table): void {
            $table->dropPrimary();
            $table->dropColumn('id');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->bigIncrements('id');
        });
    }
};
