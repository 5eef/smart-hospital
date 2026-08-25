<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClinicalOrder;
use App\Services\AuditService;
use App\Services\DoctorPatientAccessPolicy;
use App\Services\NotificationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ClinicalOrderController extends Controller
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly AuditService $audit,
        private readonly DoctorPatientAccessPolicy $doctorPatientAccess,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['nullable', Rule::in(['laboratory', 'imaging'])],
            'status' => ['nullable', Rule::in(['requested', 'in_progress', 'completed', 'cancelled'])],
            'patient_id' => ['nullable', 'integer', 'exists:patients,id'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = $this->scopedQuery($request);
        foreach (['type', 'status', 'patient_id'] as $filter) {
            if ($validated[$filter] ?? null) {
                $query->where($filter, $validated[$filter]);
            }
        }

        return response()->json(
            $query->latest('ordered_at')->paginate($validated['per_page'] ?? 20)->withQueryString()
        );
    }

    public function show(Request $request, ClinicalOrder $clinicalOrder): JsonResponse
    {
        $order = $this->scopedQuery($request)->findOrFail($clinicalOrder->id);

        return response()->json($order);
    }

    public function store(Request $request): JsonResponse
    {
        $doctor = $request->user()->doctor;
        abort_unless($request->user()->role?->name === 'doctor' && $doctor, 403, __('api.access_denied'));

        $validated = $request->validate([
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'type' => ['required', Rule::in(['laboratory', 'imaging'])],
            'exam_name' => ['required', 'string', 'max:255'],
            'priority' => ['required', Rule::in(['routine', 'urgent'])],
            'instructions' => ['nullable', 'string', 'max:5000'],
        ]);

        $this->doctorPatientAccess->assert($doctor->id, $validated['patient_id'], 'create_clinical_order');

        $order = ClinicalOrder::create([
            ...$validated,
            'doctor_id' => $doctor->id,
            'status' => 'requested',
            'ordered_at' => now(),
        ])->fresh(['patient.user', 'doctor.user']);

        $this->notifications->send(
            $order->patient->user,
            $order->type.'_order_created',
            ['exam' => $order->exam_name, 'doctor' => $order->doctor->user->name]
        );
        $this->audit->record($request, 'clinical_order.created', $order, array_keys($validated));

        return response()->json($order, 201);
    }

    public function update(Request $request, ClinicalOrder $clinicalOrder): JsonResponse
    {
        abort_unless($request->user()->role?->name === 'doctor', 403, __('api.access_denied'));
        $order = $this->scopedQuery($request)->findOrFail($clinicalOrder->id);
        $validated = $request->validate([
            'exam_name' => ['sometimes', 'required', 'string', 'max:255'],
            'priority' => ['sometimes', 'required', Rule::in(['routine', 'urgent'])],
            'instructions' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'status' => ['sometimes', 'required', Rule::in(['requested', 'in_progress', 'completed', 'cancelled'])],
            'result' => ['nullable', 'string', 'max:10000', 'required_if:status,completed'],
            'version' => ['required', 'integer', 'min:1'],
        ]);

        $expectedVersion = (int) $validated['version'];
        abort_unless($expectedVersion === (int) $order->version, 409, __('api.stale_record'));
        unset($validated['version']);
        $nextStatus = $validated['status'] ?? $order->status;
        $allowedTransitions = [
            'requested' => ['in_progress', 'cancelled'],
            'in_progress' => ['completed', 'cancelled'],
            'completed' => [],
            'cancelled' => [],
        ];

        if ($nextStatus !== $order->status) {
            abort_unless(in_array($nextStatus, $allowedTransitions[$order->status] ?? [], true), 422, __('api.clinical_order_transition_invalid'));
        }
        if ($nextStatus === $order->status && array_diff(array_keys($validated), ['status']) === []) {
            return response()->json($order->fresh(['patient.user', 'doctor.user']));
        }

        if (in_array($order->status, ['completed', 'cancelled'], true) && array_diff(array_keys($validated), ['status']) !== []) {
            abort(409, 'Un ordre clinique finalisé ne peut plus être modifié.');
        }

        if (($validated['status'] ?? null) === 'completed' && $order->status !== 'completed') {
            $validated['completed_at'] = now();
        } elseif (array_key_exists('status', $validated)) {
            $validated['completed_at'] = null;
        }

        $updated = ClinicalOrder::whereKey($order->id)->where('version', $expectedVersion)
            ->update([...$validated, 'version' => $expectedVersion + 1]);
        abort_unless($updated === 1, 409, __('api.stale_record'));
        $order->refresh();

        $this->audit->record($request, 'clinical_order.updated', $order, array_keys($validated));

        return response()->json($order->fresh(['patient.user', 'doctor.user']));
    }

    private function scopedQuery(Request $request): Builder
    {
        $query = ClinicalOrder::query()->with(['patient.user', 'doctor.user']);
        $role = $request->user()->role?->name;

        if ($role === 'doctor') {
            $doctorId = $request->user()->doctor?->id;
            abort_if(! $doctorId, 404, __('api.doctor_profile_missing'));

            return $query->where('doctor_id', $doctorId);
        }

        if ($role === 'patient') {
            $patientId = $request->user()->patient?->id;
            abort_if(! $patientId, 404, __('api.patient_profile_missing'));

            return $query->where('patient_id', $patientId);
        }

        abort(403, __('api.access_denied'));
    }
}
