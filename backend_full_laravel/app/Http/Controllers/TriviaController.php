<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Trivia\IndexTriviaRequest;
use App\Http\Resources\TriviaResource;
use App\Models\Eloquent\Trivia;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TriviaController extends Controller
{
    /**
     * The whole corpus (or the requested tones of it) in one response, not a
     * page: a couple of hundred short rows, and the card's Next button cycles
     * client-side so every click stays instant.
     */
    public function index(IndexTriviaRequest $request): AnonymousResourceCollection
    {
        /** @var ?list<string> $tones */
        $tones = $request->validated('tones');

        $query = Trivia::query()->orderBy('id');

        if ($tones !== null && $tones !== []) {
            $query->whereIn('tone', $tones);
        }

        return TriviaResource::collection($query->get());
    }
}
