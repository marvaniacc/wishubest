<?php

namespace Tests\Feature\Authorization;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleCapabilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_unauthenticated_visitor_is_redirected_from_protected_routes(): void
    {
        $this->get(route('dashboard'))->assertRedirect(route('login'));
        $this->get(route('administration'))->assertRedirect(route('login'));
        $this->get(route('moderation'))->assertRedirect(route('login'));
    }

    public function test_patients_and_doctors_cannot_access_administration_or_moderation(): void
    {
        foreach ([User::factory()->patient()->create(), User::factory()->doctor()->create()] as $user) {
            $this->actingAs($user)->get(route('administration'))->assertForbidden();
            $this->actingAs($user)->get(route('moderation'))->assertForbidden();
        }
    }

    public function test_only_administrators_can_access_administration(): void
    {
        $administrator = User::factory()->administrator()->create();
        $moderator = User::factory()->moderator()->create();

        $this->actingAs($administrator)->get(route('administration'))->assertNoContent();
        $this->actingAs($moderator)->get(route('administration'))->assertForbidden();
    }

    public function test_administrators_and_moderators_have_the_moderation_capability(): void
    {
        $this->actingAs(User::factory()->administrator()->create())
            ->get(route('moderation'))
            ->assertNoContent();

        $this->actingAs(User::factory()->moderator()->create())
            ->get(route('moderation'))
            ->assertNoContent();
    }
}
