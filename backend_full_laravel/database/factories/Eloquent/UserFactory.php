<?php

declare(strict_types=1);

namespace Database\Factories\Eloquent;

use App\Models\Eloquent\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Eloquent\User>
 */
class UserFactory extends Factory
{
    /**
     * @var class-string<\App\Models\Eloquent\User>
     */
    protected $model = User::class;

    /**
     * The current password being used by the factory.
     */
    protected static ?string $password = null;

    /**
     * Define the model's default state.
     *
     * @return array<model-property<\App\Models\Eloquent\User>, mixed>
     */
    public function definition(): array
    {
        return [
            'id' => (string) Str::uuid(),
            'first_name' => fake()
                ->firstName(),
            'middle_name' => fake()
                ->optional()
                ->firstName(),
            'last_name' => fake()
                ->lastName(),
            'email' => fake()
                ->unique()
                ->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes): array => [
            'email_verified_at' => null,
        ]);
    }
}
