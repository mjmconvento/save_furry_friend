<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Eloquent\User;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;

/**
 * Prints the verification link for an account.
 *
 * Locally `MAIL_MAILER=log`, so the real email does land in
 * `storage/logs/laravel.log` - but finding the URL there means reading a few
 * hundred lines of inlined CSS. This builds the same signed URL directly.
 *
 * It grants nothing that reading the log does not: both need shell access to the
 * container.
 */
class ShowVerificationLink extends Command
{
    protected $signature = 'email:verification-link {email}';

    protected $description = "Print the signed email verification link for an account";

    public function handle(): int
    {
        /** @var string $email */
        $email = $this->argument('email');

        $user = User::where('email', $email)->first();

        if (! $user instanceof User) {
            $this->error(sprintf('No account with the address %s.', $email));

            return self::FAILURE;
        }

        if ($user->hasVerifiedEmail()) {
            $this->warn(sprintf('%s is already verified.', $email));
            $this->line('A link is printed anyway; opening it changes nothing.');
        }

        // The same URL Laravel's own notification builds, with the same lifetime
        // from `auth.verification.expire`.
        $link = URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes(Config::integer('auth.verification.expire', 60)),
            [
                'id' => $user->id,
                'hash' => sha1($user->getEmailForVerification()),
            ],
        );

        $this->newLine();
        $this->line($link);
        $this->newLine();

        return self::SUCCESS;
    }
}
