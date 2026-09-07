<?php

namespace Tests\Feature\Directory;

use App\Enums\DoctorProfileStatus;
use App\Models\Doctor;
use App\Models\DoctorProfile;
use App\Models\Location;
use App\Models\MedicalService;
use App\Models\Specialty;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DoctorDirectoryTest extends TestCase
{
    use RefreshDatabase;

    private function refs(): array
    {
        return [Specialty::create(['name' => 'Cardiology', 'slug' => 'cardiology']), Location::create(['name' => 'Madrid', 'slug' => 'madrid']), MedicalService::create(['name' => 'Consultation', 'slug' => 'consultation'])];
    }

    private function profile(User $user, DoctorProfileStatus $status = DoctorProfileStatus::Draft): DoctorProfile
    {
        $doctor = Doctor::create(['user_id' => $user->id]);

        return DoctorProfile::create(['doctor_id' => $doctor->id, 'slug' => 'doctor-'.$doctor->id, 'display_name' => $user->name, 'status' => $status]);
    }

    public function test_doctor_can_create_edit_and_submit_own_profile_with_controlled_references(): void
    {
        $doctor = User::factory()->doctor()->create();
        [$specialty,$location,$service] = $this->refs();
        $this->actingAs($doctor)->get(route('doctor.profile.edit'))->assertOk();
        $this->actingAs($doctor)->put(route('doctor.profile.update'), ['display_name' => 'Dr Example', 'specialties' => [$specialty->id], 'locations' => [$location->id], 'medical_services' => [$service->id]])->assertSessionHas('status');
        $profile = Doctor::whereUserId($doctor->id)->firstOrFail()->profile;
        $this->assertSame('Dr Example', $profile->display_name);
        $this->actingAs($doctor)->post(route('doctor.profile.submit'))->assertSessionHas('status');
        $this->assertSame(DoctorProfileStatus::Submitted, $profile->fresh()->status);
    }

    public function test_invalid_reference_ids_are_rejected(): void
    {
        $doctor = User::factory()->doctor()->create();
        $this->actingAs($doctor)->put(route('doctor.profile.update'), ['display_name' => 'Dr Example', 'specialties' => [9999], 'locations' => [9999], 'medical_services' => [9999]])->assertSessionHasErrors(['specialties.0', 'locations.0', 'medical_services.0']);
    }

    public function test_patient_and_visitors_cannot_author_profiles_and_doctor_cannot_manage_another(): void
    {
        $patient = User::factory()->patient()->create();
        $doctor = User::factory()->doctor()->create();
        $other = User::factory()->doctor()->create();
        $profile = $this->profile($other);
        $this->get(route('doctor.profile.edit'))->assertRedirect(route('login'));
        $this->actingAs($patient)->get(route('doctor.profile.edit'))->assertForbidden();
        $this->assertFalse($doctor->can('update', $profile));
    }

    public function test_only_operators_can_moderate_and_moderators_remain_outside_administration(): void
    {
        $doctor = User::factory()->doctor()->create();
        $profile = $this->profile($doctor, DoctorProfileStatus::Submitted);
        $admin = User::factory()->administrator()->create();
        $moderator = User::factory()->moderator()->create();
        $this->actingAs($doctor)->post(route('moderation.profiles.approve', $profile))->assertForbidden();
        $this->actingAs($admin)->post(route('moderation.profiles.approve', $profile))->assertRedirect();
        $this->assertSame(DoctorProfileStatus::Approved, $profile->fresh()->status);
        $profile->fresh()->update(['status' => DoctorProfileStatus::Submitted]);
        $this->actingAs($moderator)->post(route('moderation.profiles.reject', $profile), ['reason' => 'Needs revision'])->assertRedirect();
        $this->assertSame(DoctorProfileStatus::Rejected, $profile->fresh()->status);
        $this->actingAs($moderator)->get(route('administration'))->assertForbidden();
    }

    public function test_only_approved_profiles_are_visible_on_both_localized_public_routes(): void
    {
        [$specialty,$location,$service] = $this->refs();
        $approvedUser = User::factory()->doctor()->create(['name' => 'Approved Doctor']);
        $approved = $this->profile($approvedUser, DoctorProfileStatus::Approved);
        $approved->specialties()->attach($specialty);
        $approved->locations()->attach($location);
        $approved->medicalServices()->attach($service);
        foreach ([DoctorProfileStatus::Submitted, DoctorProfileStatus::Rejected, DoctorProfileStatus::Draft] as $status) {
            $this->profile(User::factory()->doctor()->create(), $status);
        }

        foreach (['en', 'es'] as $locale) {
            $this->get(route('public.doctors.index', $locale))->assertOk()->assertSee('Approved Doctor');
            $this->get(route('public.doctors.show', [$locale, $approved->slug]))->assertOk()->assertSee('Approved Doctor');
        }

        $hidden = DoctorProfile::where('status', DoctorProfileStatus::Submitted)->firstOrFail();
        $this->get(route('public.doctors.show', ['en', $hidden->slug]))->assertNotFound();
        $this->actingAs(User::factory()->patient()->create())->get(route('public.doctors.index', 'en'))->assertOk()->assertSee('Approved Doctor');
    }
}
