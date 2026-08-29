<?php

declare(strict_types=1);

namespace App\Models\Eloquent;

use App\Enums\TriviaSpecies;
use App\Enums\TriviaTone;
use Illuminate\Database\Eloquent\Model;

/**
 * A cat or dog fact for the dashboard and feed-page trivia cards. Rows come
 * from `TriviaSeeder` only - there is no write endpoint.
 *
 * @property int $id
 * @property string $text
 * @property TriviaTone $tone
 * @property TriviaSpecies $species
 */
class Trivia extends Model
{
    /**
     * Spelled out because the inflector cannot be trusted with a Latin plural:
     * `Str::plural('trivia')` need not be `trivias`, and the migration says
     * `trivias`.
     */
    protected $table = 'trivias';

    protected $fillable = ['text', 'tone', 'species'];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'tone' => TriviaTone::class,
        'species' => TriviaSpecies::class,
    ];
}
