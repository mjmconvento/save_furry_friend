<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Drop the existing user_id column (bigint)
        Schema::table('sessions', function (Blueprint $table) {
            $table->dropColumn('user_id');
        });

        // Recreate it as UUID and nullable
        Schema::table('sessions', function (Blueprint $table) {
            $table->uuid('user_id')->nullable()->after('id');

            // Optional: re-add foreign key if users.id is uuid
            // $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        // Reverse: drop uuid user_id and restore as bigint
        Schema::table('sessions', function (Blueprint $table) {
            $table->dropColumn('user_id');
        });

        Schema::table('sessions', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->after('id');
        });
    }
};
