<?php

declare(strict_types=1);

namespace App\Models\Eloquent;

use App\Enums\TriviaSpecies;
use App\Enums\TriviaTone;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Model;

/**
 * A cat or dog fact for the dashboard and feed-page trivia cards. Rows come
 * from `TriviaSeeder` only - there is no write endpoint.
 *
 * The table is spelled out because the inflector cannot be trusted with a Latin
 * plural: `Str::plural('trivia')` need not be `trivias`, and the migration says
 * `trivias`.
 *
 * @property int $id
 * @property string $text
 * @property TriviaTone $tone
 * @property TriviaSpecies $species
 */
#[Table('trivias')]
#[Fillable(['text', 'tone', 'species'])]
class Trivia extends Model
{
    /**
     * @var array<string, string>
     */
    #[\Override]
    protected $casts = [
        'tone' => TriviaTone::class,
        'species' => TriviaSpecies::class,
    ];
}
