<?php

namespace App\Http\Controllers\Doctor;

use App\Enums\DoctorProfileStatus;
use App\Http\Controllers\Controller;
use App\Models\DoctorProfile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ModerationController extends Controller
{
    public function index(Request $request): View
    {
        $this->authorize('review', DoctorProfile::class);

        return view('moderation.profiles', ['profiles' => DoctorProfile::with('doctor.user')->where('status', DoctorProfileStatus::Submitted)->get()]);
    }

    public function approve(Request $request, DoctorProfile $profile): RedirectResponse
    {
        $this->authorize('review', DoctorProfile::class);
        abort_unless($profile->status === DoctorProfileStatus::Submitted, 422);
        $profile->update(['status' => DoctorProfileStatus::Approved, 'reviewed_by' => $request->user()->id, 'reviewed_at' => now(), 'rejection_reason' => null]);

        return back();
    }

    public function reject(Request $request, DoctorProfile $profile): RedirectResponse
    {
        $this->authorize('review', DoctorProfile::class);
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:1000']]);
        abort_unless($profile->status === DoctorProfileStatus::Submitted, 422);
        $profile->update(['status' => DoctorProfileStatus::Rejected, 'reviewed_by' => $request->user()->id, 'reviewed_at' => now(), 'rejection_reason' => $data['reason'] ?? null]);

        return back();
    }
}
