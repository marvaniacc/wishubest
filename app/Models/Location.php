<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Location extends Model
{
    protected $guarded = [];

    public function doctorProfiles(): BelongsToMany
    {
        return $this->belongsToMany(DoctorProfile::class);
    }
}
