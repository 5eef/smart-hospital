<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PatientSummaryResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'birth_date' => $this->birth_date?->toDateString(),
            'gender' => $this->gender,
            'blood_group' => $this->blood_group,
            'address' => $this->when($request->user()?->role?->name === 'admin', $this->address),
            'emergency_contact' => $this->when($request->user()?->role?->name === 'admin', $this->emergency_contact),
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'phone' => $this->user->phone,
                'locale' => $this->user->locale,
                'is_active' => $this->user->is_active,
            ]),
            'medical_records_count' => $this->whenCounted('medicalRecords'),
            'appointments_count' => $this->whenCounted('appointments'),
        ];
    }
}
