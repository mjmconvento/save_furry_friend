<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    /**
     * The bare object key, not a URL - exactly as post `medias` are stored.
     * Baking a host into the database is what forces a data migration every time
     * the bucket moves; `UserResource` renders the URL at read time instead.
     *
     * Nullable, because having no picture is the normal state and the SPA falls
     * back to initials.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('avatar')
                ->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('avatar');
        });
    }
};
