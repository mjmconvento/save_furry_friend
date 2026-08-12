<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use App\Enums\UserPreference;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class UpdateUserPreferencesRequest extends FormRequest
{
    /**
     * Any signed-in account may edit its own preferences. There is nothing to
     * authorize beyond being authenticated: the route takes no user parameter,
     * so the only account this can reach is the token's own.
     *
     * This is deliberately not a crack in the admin-only rule on `PUT
     * /api/users/{user}` - that endpoint edits identity, this one writes booleans
     * from a fixed allowlist.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Built from the enum, so a new preference is one case rather than a rule
     * here as well. Keys outside it are never validated and never merged.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $rules = [];

        foreach (UserPreference::cases() as $preference) {
            $rules[$preference->value] = ['sometimes', 'boolean'];
        }

        return $rules;
    }

    /**
     * A payload of nothing but unknown keys would otherwise validate, merge
     * nothing and answer 200 - so a typo'd preference name would look saved.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($this->validated() === []) {
                    $validator->errors()
                        ->add(
                            'preferences',
                            'No known preference was supplied.'
                        );
                }
            },
        ];
    }
}
