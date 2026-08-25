<?php

namespace App\Services;

use App\Enums\AppointmentStatus;
use App\Models\Appointment;
use App\Models\Department;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

class AppointmentWorkflowService
{
    public function assertTransition(Appointment $appointment, string $nextStatus, User $actor): void
    {
        $role = $actor->role?->name;

        if ($role === 'doctor') {
            abort_unless((int) $appointment->doctor_id === (int) $actor->doctor?->id, 403, __('api.appointment_forbidden'));
        } elseif ($role === 'patient') {
            $mayCancel = (int) $appointment->patient_id === (int) $actor->patient?->id
                && $nextStatus === AppointmentStatus::Cancelled->value
                && in_array($appointment->status, AppointmentStatus::activeValues(), true)
                && $appointment->scheduled_at?->isFuture();
            abort_unless($mayCancel || $nextStatus === $appointment->status, 403, __('api.appointment_forbidden'));
        } else {
            abort_unless($role === 'admin', 403, __('api.access_denied'));
        }

        abort_unless(
            AppointmentStatus::allows($appointment->status, $nextStatus),
            422,
            __('api.appointment_transition_invalid')
        );
    }

    public function assertIntegrity(array $payload, ?int $exceptId = null): void
    {
        $doctor = Doctor::with('user')->findOrFail($payload['doctor_id']);
        $patient = Patient::with('user')->findOrFail($payload['patient_id']);
        $department = Department::findOrFail($payload['department_id']);

        abort_unless((int) $doctor->department_id === (int) $payload['department_id'], 422, __('api.doctor_department_mismatch'));
        abort_unless($doctor->status === 'active' && $doctor->user?->is_active, 422, __('api.doctor_unavailable'));
        abort_unless($department->is_active, 422, __('api.department_unavailable'));
        abort_unless($patient->user?->is_active, 422, __('api.patient_unavailable'));

        if (! in_array($payload['status'] ?? AppointmentStatus::Pending->value, AppointmentStatus::activeValues(), true)) {
            return;
        }

        $scheduledAt = CarbonImmutable::parse($payload['scheduled_at'])->utc();

        $conflicts = Appointment::query()
            ->where('scheduled_at', $scheduledAt)
            ->whereIn('status', AppointmentStatus::activeValues())
            ->where(function (Builder $query) use ($payload) {
                $query->where('doctor_id', $payload['doctor_id'])
                    ->orWhere('patient_id', $payload['patient_id']);
            });

        if ($exceptId !== null) {
            $conflicts->whereKeyNot($exceptId);
        }

        abort_if($conflicts->exists(), 422, __('api.appointment_conflict'));
    }

    public function lockParticipants(array $payload): void
    {
        Doctor::whereKey($payload['doctor_id'])->lockForUpdate()->firstOrFail();
        Patient::whereKey($payload['patient_id'])->lockForUpdate()->firstOrFail();
        Department::whereKey($payload['department_id'])->lockForUpdate()->firstOrFail();
    }

    public function requiresIntegrityCheck(array $validated): bool
    {
        if (array_intersect(array_keys($validated), ['doctor_id', 'patient_id', 'department_id', 'scheduled_at']) !== []) {
            return true;
        }

        return isset($validated['status']) && in_array($validated['status'], AppointmentStatus::activeValues(), true);
    }
}
