<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        config()->set('broadcasting.connections', [
            'log' => ['driver' => 'log'],
            'null' => ['driver' => 'null'],
        ]);

        $limiters = [
            'auth.login' => 5,
            'auth.register' => 5,
            'password.forgot' => 3,
            'password.reset' => 5,
            'verification.resend' => 3,
            'admin.reset-link' => 3,
        ];

        foreach ($limiters as $name => $attempts) {
            RateLimiter::for($name, function (Request $request) use ($attempts) {
                $identifier = Str::lower(trim((string) ($request->input('email') ?: $request->user()?->email ?: 'anonymous')));

                return Limit::perMinute($attempts)
                    ->by($identifier.'|'.$request->ip())
                    ->response(fn () => response()->json(['message' => __('api.too_many_attempts')], 429));
            });
        }

        ResetPassword::createUrlUsing(function (User $user, string $token): string {
            return rtrim((string) config('app.frontend_url'), '/')
                .'/reset-password?token='.urlencode($token)
                .'&email='.urlencode($user->email);
        });
    }
}
