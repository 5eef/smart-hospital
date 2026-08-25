<?php

namespace App\Services;

use App\Models\Appointment;
use Illuminate\Database\Eloquent\Builder;

class DoctorPatientAccessPolicy
{
    private const IDENTITY_STATUSES = ['pending', 'confirmed', 'completed'];

    private const CLINICAL_STATUSES = ['confirmed', 'completed'];

    public function scopePatients(Builder $query, int $doctorId, string $operation = 'identity'): Builder
    {
        $statuses = $this->statusesFor($operation);

        return $query->whereHas('appointments', fn (Builder $appointments) => $appointments
            ->where('doctor_id', $doctorId)
            ->whereIn('status', $statuses));
    }

    public function assert(int $doctorId, int $patientId, string $operation): void
    {
        abort_unless(
            Appointment::where('doctor_id', $doctorId)
                ->where('patient_id', $patientId)
                ->whereIn('status', $this->statusesFor($operation))
                ->exists(),
            403,
            __('api.patient_not_assigned')
        );
    }

    /** @return list<string> */
    private function statusesFor(string $operation): array
    {
        return match ($operation) {
            'identity' => self::IDENTITY_STATUSES,
            'create_medical_record',
            'create_prescription',
            'create_clinical_order' => self::CLINICAL_STATUSES,
            default => throw new \InvalidArgumentException("Unknown doctor-patient operation [{$operation}]."),
        };
    }
}
