<?php

declare(strict_types=1);

use App\Enums\UserRole;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    /**
     * One role per user became a list. `jsonb` rather than a `role_user` pivot:
     * with two roles and no per-role metadata, a table plus a relation plus
     * eager-loading care would all serve one boolean question. `whereJsonContains`
     * covers the queries a pivot would have been for.
     *
     * The single-role column is backfilled rather than dropped outright, so an
     * existing admin stays one. Admins carry `user` as well - the role list is
     * additive, and nothing has to special-case "an admin is also a user".
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->jsonb('roles')
                ->default('["' . UserRole::User->value . '"]');
        });

        DB::table('users')
            ->where('role', UserRole::Admin->value)
            ->update([
                'roles' => json_encode([UserRole::Admin->value, UserRole::User->value]),
            ]);

        DB::table('users')
            ->where('role', '!=', UserRole::Admin->value)
            ->update([
                'roles' => json_encode([UserRole::User->value]),
            ]);

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('role');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('role', 20)
                ->default(UserRole::User->value);
        });

        // Collapsing a list back to one value keeps the most privileged of them,
        // which is the only choice that does not silently demote an admin.
        DB::table('users')
            ->whereJsonContains('roles', UserRole::Admin->value)
            ->update([
                'role' => UserRole::Admin->value,
            ]);

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('roles');
        });
    }
};
