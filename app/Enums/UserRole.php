<?php

namespace App\Enums;

enum UserRole: string
{
    case Patient = 'patient';
    case Doctor = 'doctor';
    case Administrator = 'administrator';
    case Moderator = 'moderator';
}
