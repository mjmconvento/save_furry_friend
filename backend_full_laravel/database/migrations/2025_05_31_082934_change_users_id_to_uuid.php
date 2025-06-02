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
            $table->uuid('new_uuid')->nullable();

            DB::table('users')->get()->each(function ($user) {
                DB::table('users')
                    ->where('id', $user->id)
                    ->update(['new_uuid' => Str::uuid()]);
            });

            $table->dropPrimary();
            $table->dropColumn('id');
        });

        Schema::table('users', function (Blueprint $table) {
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
