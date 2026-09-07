<?php

namespace App\Enums;

enum DoctorProfileStatus: string
{
    case Draft = 'draft';
    case Submitted = 'submitted';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Retired = 'retired';
}
