<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\MedicalRecord;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function admin(): JsonResponse
    {
        $monthStart = now()->startOfMonth();
        $activity = collect(range(5, 0))->map(function (int $offset) {
            $start = now()->subMonths($offset)->startOfMonth();
            $end = (clone $start)->endOfMonth();

            return [
                'label' => $start->translatedFormat('M'),
                'appointments' => Appointment::whereBetween('scheduled_at', [$start, $end])->count(),
                'consultations' => MedicalRecord::whereBetween('created_at', [$start, $end])->count(),
            ];
        });

        return response()->json([
            'total_patients' => Patient::count(),
            'total_doctors' => Doctor::count(),
            'total_appointments' => Appointment::count(),
            'active_users' => User::where('is_active', true)->count(),
            'pending_appointments' => Appointment::where('status', 'pending')->count(),
            'completed_appointments' => Appointment::where('status', 'completed')->count(),
            'appointments_today' => Appointment::whereDate('scheduled_at', today())->count(),
            'new_patients_this_month' => Patient::where('created_at', '>=', $monthStart)->count(),
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

        return response()->json([
            'appointments_today' => (clone $appointments)->whereDate('scheduled_at', today())->count(),
            'pending_appointments' => (clone $appointments)->where('status', 'pending')->count(),
            'total_patients' => Patient::whereHas('appointments', fn ($query) => $query->where('doctor_id', $doctor->id))->count(),
            'total_consultations' => MedicalRecord::where('doctor_id', $doctor->id)->count(),
            'upcoming_appointments' => (clone $appointments)
                ->where('scheduled_at', '>=', now())
                ->orderBy('scheduled_at')
                ->limit(6)
                ->get(),
            'recent_consultations' => MedicalRecord::with(['patient.user', 'prescriptions'])
                ->where('doctor_id', $doctor->id)
                ->latest()
                ->limit(5)
                ->get(),
        ]);
    }

    public function patient(Request $request): JsonResponse
    {
        $patient = $request->user()->patient;
        abort_if(! $patient, 404, __('api.patient_profile_missing'));

        return response()->json([
            'next_appointment' => Appointment::with(['doctor.user', 'department'])
                ->where('patient_id', $patient->id)
                ->where('scheduled_at', '>=', now())
                ->orderBy('scheduled_at')
                ->first(),
            'appointments_count' => Appointment::where('patient_id', $patient->id)->count(),
            'medical_record' => MedicalRecord::with(['doctor.user', 'prescriptions'])
                ->where('patient_id', $patient->id)
                ->latest()
                ->first(),
            'notifications' => $request->user()->notifications()->latest()->limit(5)->get(),
        ]);
    }
}
