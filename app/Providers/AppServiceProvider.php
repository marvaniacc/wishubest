<?php

namespace App\Providers;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        RateLimiter::for('login', fn (Request $request): Limit => Limit::perMinute(5)
            ->by(strtolower((string) $request->input('email')).'|'.$request->ip()));
        RateLimiter::for('registration', fn (Request $request): Limit => Limit::perMinute(5)->by($request->ip()));

        Gate::define('author-doctor-profile', fn (User $user): bool => $user->role === UserRole::Doctor);

        Gate::define('access-administration', fn (User $user): bool => $user->role === UserRole::Administrator);
        Gate::define('moderate-doctor-profiles', fn (User $user): bool => in_array(
            $user->role,
            [UserRole::Administrator, UserRole::Moderator],
            strict: true,
        ));
    }
}
