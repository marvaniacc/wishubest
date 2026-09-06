<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\RegisteredUserController;
use Illuminate\Support\Facades\Route;

Route::view('/', 'welcome')->name('home');

Route::middleware('guest')->group(function (): void {
    Route::get('/register', [RegisteredUserController::class, 'create'])->name('register');
    Route::post('/register', [RegisteredUserController::class, 'store'])
        ->middleware('throttle:registration')
        ->name('register.store');

    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])
        ->middleware('throttle:login')
        ->name('login.store');
});

Route::middleware('auth')->group(function (): void {
    Route::view('/dashboard', 'dashboard')->name('dashboard');
    Route::delete('/logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');

    Route::get('/administration', fn () => response()->noContent())
        ->middleware('can:access-administration')
        ->name('administration');

    Route::get('/moderation', fn () => response()->noContent())
        ->middleware('can:moderate-doctor-profiles')
        ->name('moderation');
});
