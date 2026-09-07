<?php

namespace App\Policies;

use App\Enums\DoctorProfileStatus;
use App\Enums\UserRole;
use App\Models\DoctorProfile;
use App\Models\User;

class DoctorProfilePolicy
{
    public function update(User $user, DoctorProfile $profile): bool
    {
        return $user->role === UserRole::Doctor && $profile->doctor->user_id === $user->id;
    }

    public function submit(User $user, DoctorProfile $profile): bool
    {
        return $this->update($user, $profile) && $profile->status !== DoctorProfileStatus::Approved;
    }

    public function review(User $user): bool
    {
        return in_array($user->role, [UserRole::Administrator, UserRole::Moderator], true);
    }
}
