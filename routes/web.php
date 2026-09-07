<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Doctor\ModerationController;
use App\Http\Controllers\Doctor\ProfileController;
use App\Http\Controllers\Doctor\PublicDirectoryController;
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

Route::prefix('{locale}')->whereIn('locale', ['en', 'es'])->middleware('public-locale')->group(function (): void {
    Route::get('/doctors', [PublicDirectoryController::class, 'index'])->name('public.doctors.index');
    Route::get('/doctors/{slug}', [PublicDirectoryController::class, 'show'])->name('public.doctors.show');
});

Route::middleware(['auth', 'can:author-doctor-profile'])->prefix('doctor')->group(function (): void {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('doctor.profile.edit');
    Route::put('/profile', [ProfileController::class, 'update'])->name('doctor.profile.update');
    Route::post('/profile/submit', [ProfileController::class, 'submit'])->name('doctor.profile.submit');
});
Route::middleware(['auth', 'can:moderate-doctor-profiles'])->prefix('moderation')->group(function (): void {
    Route::get('/doctor-profiles', [ModerationController::class, 'index'])->name('moderation.profiles.index');
    Route::post('/doctor-profiles/{profile}/approve', [ModerationController::class, 'approve'])->name('moderation.profiles.approve');
    Route::post('/doctor-profiles/{profile}/reject', [ModerationController::class, 'reject'])->name('moderation.profiles.reject');
});
