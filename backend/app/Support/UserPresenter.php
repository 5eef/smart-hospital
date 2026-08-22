<?php

namespace App\Support;

use App\Models\User;

final class UserPresenter
{
    public static function make(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role?->name,
            'phone' => $user->phone,
            'locale' => $user->locale,
            'is_active' => $user->is_active,
            'email_verified' => $user->hasVerifiedEmail(),
            'doctor_id' => $user->doctor?->id,
            'patient_id' => $user->patient?->id,
        ];
    }
}
