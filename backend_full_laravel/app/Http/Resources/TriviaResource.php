<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Eloquent\Trivia;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Trivia
 */
class TriviaResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'text' => $this->text,
            'tone' => $this->tone->value,
            'species' => $this->species->value,
        ];
    }
}
