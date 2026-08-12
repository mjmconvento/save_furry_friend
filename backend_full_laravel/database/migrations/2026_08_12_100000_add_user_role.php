<?php

declare(strict_types=1);

use App\Enums\UserRole;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    /**
     * A plain string with a default rather than a Postgres enum type: adding a
     * case to a native enum needs `ALTER TYPE`, which is exactly the migration
     * pain a two-value column does not justify.
     *
     * Defaulting to `user` is what makes this safe on a populated table - every
     * existing row becomes a non-admin, so the new authorization checks fail
     * closed rather than granting anyone administration by accident.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('role', 20)
                ->default(UserRole::User->value);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('role');
        });
    }
};
