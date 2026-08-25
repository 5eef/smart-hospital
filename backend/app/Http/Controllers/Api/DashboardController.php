<?php

namespace App\Http\Controllers\Api;

use App\Enums\AppointmentStatus;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\MedicalRecord;
use App\Models\Patient;
use App\Models\User;
use App\Services\DoctorPatientAccessPolicy;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

class DashboardController extends Controller
{
    public function __construct(private readonly DoctorPatientAccessPolicy $doctorPatientAccess) {}

    public function admin(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'months' => ['nullable', 'integer', Rule::in([3, 6, 12])],
        ]);
        $months = $validated['months'] ?? 6;
        $timezone = (string) config('app.hospital_timezone', 'UTC');
        $hospitalNow = CarbonImmutable::now($timezone);
        $monthStart = $hospitalNow->startOfMonth()->utc();
        $periods = collect(range($months - 1, 0))->map(function (int $offset) use ($hospitalNow) {
            $localStart = $hospitalNow->subMonths($offset)->startOfMonth();

            return [
                'label' => $localStart->translatedFormat('M'),
                'start' => $localStart->utc(),
                'end' => $localStart->addMonth()->utc(),
            ];
        });
        $periodStart = $periods->first()['start'];
        $periodEnd = $periods->last()['end'];
        $appointmentsByMonth = $this->monthlyCounts(Appointment::query(), 'scheduled_at', $periods);
        $consultationsByMonth = $this->monthlyCounts(
            MedicalRecord::query()->whereNull('archived_at'),
            'created_at',
            $periods
        );

        $activity = $periods->values()->map(fn (array $period, int $index) => [
            'label' => $period['label'],
            'appointments' => $appointmentsByMonth[$index],
            'consultations' => $consultationsByMonth[$index],
        ]);
        $periodAppointments = Appointment::where('scheduled_at', '>=', $periodStart)
            ->where('scheduled_at', '<', $periodEnd);
        $appointmentStatuses = (clone $periodAppointments)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');
        $appointmentsByDepartment = (clone $periodAppointments)
            ->with('department:id,name')
            ->selectRaw('department_id, COUNT(*) as total')
            ->groupBy('department_id')
            ->orderByDesc('total')
            ->limit(8)
            ->get()
            ->map(fn (Appointment $appointment) => [
                'label' => $appointment->department?->name ?? __('api.not_provided'),
                'value' => (int) $appointment->total,
            ]);

        return response()->json([
            'total_patients' => Patient::count(),
            'total_doctors' => Doctor::count(),
            'total_appointments' => Appointment::count(),
            'period_appointments' => (clone $periodAppointments)->count(),
            'appointment_statuses' => $appointmentStatuses,
            'appointments_by_department' => $appointmentsByDepartment,
            'active_users' => User::where('is_active', true)->count(),
            'pending_appointments' => Appointment::where('status', 'pending')->count(),
            'completed_appointments' => Appointment::where('status', 'completed')->count(),
            'appointments_today' => Appointment::whereIn('status', AppointmentStatus::activeValues())
                ->where('scheduled_at', '>=', $hospitalNow->startOfDay()->utc())
                ->where('scheduled_at', '<', $hospitalNow->addDay()->startOfDay()->utc())
                ->count(),
            'new_patients_this_month' => Patient::where('created_at', '>=', $monthStart)
                ->where('created_at', '<', $hospitalNow->addMonth()->startOfMonth()->utc())
                ->count(),
            'active_doctors' => Doctor::where('status', 'active')->count(),
            'doctors_on_leave' => Doctor::where('status', 'leave')->count(),
            'new_doctors_this_month' => Doctor::where('created_at', '>=', $monthStart)->count(),
            'activity' => $activity,
            'recent_appointments' => Appointment::with(['patient.user', 'doctor.user', 'department'])
                ->latest('scheduled_at')
                ->limit(5)
                ->get(),
            'top_doctors' => Doctor::with(['user', 'department'])
                ->withCount('appointments')
                ->orderByDesc('appointments_count')
                ->limit(5)
                ->get(),
        ]);
    }

    public function doctor(Request $request): JsonResponse
    {
        $doctor = $request->user()->doctor;
        abort_if(! $doctor, 404, __('api.doctor_profile_missing'));

        $appointments = Appointment::with(['patient.user', 'department'])
            ->where('doctor_id', $doctor->id);
        $hospitalNow = CarbonImmutable::now((string) config('app.hospital_timezone', 'UTC'));
        $todayStart = $hospitalNow->startOfDay()->utc();
        $todayEnd = $hospitalNow->addDay()->startOfDay()->utc();

        return response()->json([
            'appointments_today' => (clone $appointments)
                ->whereIn('status', AppointmentStatus::activeValues())
                ->where('scheduled_at', '>=', $todayStart)
                ->where('scheduled_at', '<', $todayEnd)
                ->count(),
            'pending_appointments' => (clone $appointments)->where('status', 'pending')->count(),
            'total_patients' => $this->doctorPatientAccess->scopePatients(Patient::query(), $doctor->id, 'identity')->count(),
            'total_consultations' => MedicalRecord::where('doctor_id', $doctor->id)->whereNull('archived_at')->count(),
            'upcoming_appointments' => (clone $appointments)
                ->whereIn('status', AppointmentStatus::activeValues())
                ->where('scheduled_at', '>=', now())
                ->orderBy('scheduled_at')
                ->limit(6)
                ->get(),
            'recent_consultations' => MedicalRecord::with(['patient.user', 'prescriptions' => fn ($query) => $query->whereNull('archived_at')])
                ->where('doctor_id', $doctor->id)
                ->whereNull('archived_at')
                ->latest()
                ->limit(5)
                ->get(),
        ]);
    }

    /**
     * @param  Collection<int, array{label: string, start: CarbonImmutable, end: CarbonImmutable}>  $periods
     * @return list<int>
     */
    private function monthlyCounts(Builder $query, string $column, Collection $periods): array
    {
        $bindings = [];
        $expressions = [];

        foreach ($periods->values() as $index => $period) {
            $expressions[] = "COALESCE(SUM(CASE WHEN {$column} >= ? AND {$column} < ? THEN 1 ELSE 0 END), 0) AS bucket_{$index}";
            $bindings[] = $period['start'];
            $bindings[] = $period['end'];
        }

        $row = $query->selectRaw(implode(', ', $expressions), $bindings)->first();

        return $periods->keys()
            ->map(fn (int $index) => (int) $row->getAttribute("bucket_{$index}"))
            ->values()
            ->all();
    }

    public function patient(Request $request): JsonResponse
    {
        $patient = $request->user()->patient;
        abort_if(! $patient, 404, __('api.patient_profile_missing'));

        return response()->json([
            'next_appointment' => Appointment::with(['doctor.user', 'department'])
                ->where('patient_id', $patient->id)
                ->where('scheduled_at', '>=', now())
                ->whereIn('status', AppointmentStatus::activeValues())
                ->orderBy('scheduled_at')
                ->first(),
            'appointments_count' => Appointment::where('patient_id', $patient->id)->count(),
            'medical_record' => MedicalRecord::with(['doctor.user', 'prescriptions' => fn ($query) => $query->whereNull('archived_at')])
                ->where('patient_id', $patient->id)
                ->latest()
                ->whereNull('archived_at')
                ->first(),
            'notifications' => $request->user()->notifications()->latest()->limit(5)->get(),
        ]);
    }
}
