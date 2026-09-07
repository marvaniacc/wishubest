<?php

namespace App\Models;

use App\Enums\DoctorProfileStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class DoctorProfile extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['status' => DoctorProfileStatus::class, 'submitted_at' => 'datetime', 'reviewed_at' => 'datetime'];
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function specialties(): BelongsToMany
    {
        return $this->belongsToMany(Specialty::class);
    }

    public function locations(): BelongsToMany
    {
        return $this->belongsToMany(Location::class);
    }

    public function medicalServices(): BelongsToMany
    {
        return $this->belongsToMany(MedicalService::class);
    }

    public function scopeApproved(Builder $query): void
    {
        $query->where('status', DoctorProfileStatus::Approved);
    }
}
