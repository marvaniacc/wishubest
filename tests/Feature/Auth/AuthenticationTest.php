<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_authentication_pages_render_for_guests(): void
    {
        $this->get(route('login'))->assertOk()->assertSee('Sign in');
        $this->get(route('register'))->assertOk()->assertSee('Create patient account');
    }

    public function test_a_visitor_can_register_a_patient_account_and_is_authenticated(): void
    {
        $response = $this->post(route('register.store'), [
            'name' => 'Pat Example',
            'email' => 'patient@example.test',
            'password' => 'a-secure-password',
            'password_confirmation' => 'a-secure-password',
        ]);

        $response->assertRedirect(route('dashboard'));
        $this->assertAuthenticated();
        $this->assertDatabaseHas('users', [
            'email' => 'patient@example.test',
            'role' => UserRole::Patient->value,
        ]);
    }

    public function test_a_user_can_sign_in_and_sign_out_with_a_first_party_session(): void
    {
        $user = User::factory()->patient()->create([
            'email' => 'patient@example.test',
            'password' => 'a-secure-password',
        ]);

        $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'a-secure-password',
        ])->assertRedirect(route('dashboard'));

        $this->assertAuthenticatedAs($user);

        $this->delete(route('logout'))->assertRedirect(route('login'));

        $this->assertGuest();
    }

    public function test_invalid_sign_in_attempts_are_rate_limited(): void
    {
        RateLimiter::clear('patient@example.test|127.0.0.1');

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->from(route('login'))->post(route('login.store'), [
                'email' => 'patient@example.test',
                'password' => 'incorrect-password',
            ])->assertSessionHasErrors('email');
        }

        $this->from(route('login'))->post(route('login.store'), [
            'email' => 'patient@example.test',
            'password' => 'incorrect-password',
        ])->assertTooManyRequests();
    }
}
