<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Step 1: Add a new column for UUIDs
            $table->uuid('new_uuid')->nullable();

            // Generate and populate UUIDs for existing data
            DB::table('users')->get()->each(function ($user) {
                DB::table('users')
                    ->where('id', $user->id)
                    ->update(['new_uuid' => Str::uuid()]);
            });

            // Step 2: Drop current primary key and column 'id'
            $table->dropPrimary();
            $table->dropColumn('id');
        });

        Schema::table('users', function (Blueprint $table) {
            // Step 3: Rename 'new_uuid' to 'id' and set as primary key
            $table->renameColumn('new_uuid', 'id');
            $table->uuid('id')->change();
            $table->primary('id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Reverse the migration by adding back the integer id
            $table->dropPrimary();
            $table->dropColumn('id');
            $table->bigIncrements('id');
            $table->primary('id');
        });
    }
};
