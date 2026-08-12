<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    /**
     * One `jsonb` column rather than a boolean per preference: the next one is
     * then an enum case and a validation entry, not another migration against a
     * table every request touches.
     *
     * Defaulting to an empty object is what makes every preference opt-in, so a
     * row that predates a preference behaves as if it were off.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->jsonb('preferences')
                ->default('{}');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('preferences');
        });
    }
};
