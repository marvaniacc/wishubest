<?php

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use App\Models\DoctorProfile;
use Illuminate\View\View;

class PublicDirectoryController extends Controller
{
    public function index(string $locale): View
    {
        return view('public.doctors.index', ['profiles' => DoctorProfile::approved()->with(['specialties', 'locations'])->orderBy('display_name')->get(), 'locale' => $locale]);
    }

    public function show(string $locale, string $slug): View
    {
        $profile = DoctorProfile::approved()->with(['doctor.user', 'specialties', 'locations', 'medicalServices'])->where('slug', $slug)->firstOrFail();

        return view('public.doctors.show', compact('profile', 'locale'));
    }
}
