<?php

namespace App\Services;

use App\Models\MedicalRecord;
use App\Models\Prescription;

class PrescriptionIntegrityService
{
    public function assert(array $validated, ?Prescription $existing = null): void
    {
        $medicalRecordId = $validated['medical_record_id'] ?? $existing?->medical_record_id;
        $patientId = $validated['patient_id'] ?? $existing?->patient_id;
        $doctorId = $validated['doctor_id'] ?? $existing?->doctor_id;
        $medicalRecord = MedicalRecord::findOrFail($medicalRecordId);

        abort_if($medicalRecord->archived_at !== null, 422, __('api.prescription_archived_record'));
        abort_unless(
            (int) $medicalRecord->patient_id === (int) $patientId
                && $medicalRecord->doctor_id !== null
                && (int) $medicalRecord->doctor_id === (int) $doctorId,
            422,
            __('api.prescription_inconsistent')
        );
    }
}
