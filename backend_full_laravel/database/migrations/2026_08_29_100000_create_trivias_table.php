<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    /**
     * Read-only reference data, seeded by `TriviaSeeder` and served by
     * `GET /api/trivia`. Postgres rather than Mongo on purpose: the shape is
     * fixed and the table is owned by a seeder, which is exactly what a
     * relational table with constraints is for.
     *
     * `text` is unique so a seeder edit that duplicates a fact fails loudly at
     * seed time instead of showing the same card twice. The check constraints
     * pin the two vocabularies at the database - the request layer validates
     * tones too, but the seeder writes below that layer.
     */
    public function up(): void
    {
        Schema::create('trivias', function (Blueprint $table): void {
            $table->id();
            $table->text('text')
                ->unique();
            $table->string('tone');
            $table->string('species');
            $table->timestamps();
        });

        DB::statement(
            "ALTER TABLE trivias ADD CONSTRAINT trivias_tone_check CHECK (tone IN ('happy', 'neutral', 'heartbreaking'))"
        );
        DB::statement(
            "ALTER TABLE trivias ADD CONSTRAINT trivias_species_check CHECK (species IN ('cat', 'dog', 'both'))"
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('trivias');
    }
};
