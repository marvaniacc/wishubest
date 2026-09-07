<?php

namespace App\Http\Controllers\Doctor;

use App\Enums\DoctorProfileStatus;
use App\Http\Controllers\Controller;
use App\Models\Doctor;
use App\Models\DoctorProfile;
use App\Models\Location;
use App\Models\MedicalService;
use App\Models\Specialty;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

class ProfileController extends Controller
{
    private function profile(Request $request): DoctorProfile
    {
        $doctor = Doctor::firstOrCreate(['user_id' => $request->user()->id]);

        return $doctor->profile()->firstOrCreate([], ['slug' => Str::uuid(), 'display_name' => $request->user()->name, 'status' => DoctorProfileStatus::Draft]);
    }

    public function edit(Request $request): View
    {
        $profile = $this->profile($request);

        return view('doctor.profile', compact('profile') + ['specialties' => Specialty::where('is_active', true)->get(), 'locations' => Location::where('is_active', true)->get(), 'services' => MedicalService::where('is_active', true)->get()]);
    }

    public function update(Request $request): RedirectResponse
    {
        $profile = $this->profile($request);
        $this->authorize('update', $profile);
        $data = $this->validated($request);
        $profile->update(['display_name' => $data['display_name'], 'photo_url' => $data['photo_url'] ?? null, 'biography' => $data['biography'] ?? null, 'status' => $profile->status === DoctorProfileStatus::Approved ? DoctorProfileStatus::Draft : $profile->status]);
        $profile->specialties()->sync($data['specialties']);
        $profile->locations()->sync($data['locations']);
        $profile->medicalServices()->sync($data['medical_services']);

        return back()->with('status', __('wishubest.directory.saved'));
    }

    public function submit(Request $request): RedirectResponse
    {
        $profile = $this->profile($request);
        $this->authorize('submit', $profile);
        if (! $profile->specialties()->exists() || ! $profile->locations()->exists() || ! $profile->medicalServices()->exists()) {
            return back()->withErrors(['profile' => __('wishubest.directory.references_required')]);
        }

        $profile->update(['status' => DoctorProfileStatus::Submitted, 'submitted_at' => now(), 'reviewed_at' => null, 'reviewed_by' => null, 'rejection_reason' => null]);

        return back()->with('status', __('wishubest.directory.submitted'));
    }

    private function validated(Request $request): array
    {
        return $request->validate(['display_name' => ['required', 'string', 'max:120'], 'photo_url' => ['nullable', 'url', 'max:2048'], 'biography' => ['nullable', 'string', 'max:5000'], 'specialties' => ['required', 'array', 'min:1'], 'specialties.*' => [Rule::exists('specialties', 'id')->where('is_active', true)], 'locations' => ['required', 'array', 'min:1'], 'locations.*' => [Rule::exists('locations', 'id')->where('is_active', true)], 'medical_services' => ['required', 'array', 'min:1'], 'medical_services.*' => [Rule::exists('medical_services', 'id')->where('is_active', true)]]);
    }
}
