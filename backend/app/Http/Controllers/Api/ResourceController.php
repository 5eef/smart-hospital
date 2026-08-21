<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Department;
use App\Models\Doctor;
use App\Models\MedicalRecord;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\Role;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class ResourceController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function index(Request $request, string $model): JsonResponse
    {
        $query = $this->baseQuery($request, $model);

        if ($search = $request->query('search')) {
            $this->applySearch($query, $model, (string) $search);
        }

        if ($status = $request->query('status')) {
            abort_unless(in_array($model, ['appointments', 'doctors'], true), 422, __('api.filter_unavailable'));
            $query->where('status', $status);
        }

        if ($departmentId = $request->integer('department_id')) {
            abort_unless(in_array($model, ['appointments', 'doctors'], true), 422, __('api.filter_unavailable'));
            $query->where('department_id', $departmentId);
        }

        if ($doctorId = $request->integer('doctor_id')) {
            abort_unless($model === 'appointments', 422, __('api.filter_unavailable'));
            $query->where('doctor_id', $doctorId);
        }

        if ($date = $request->query('date')) {
            abort_unless($model === 'appointments', 422, __('api.filter_unavailable'));
            $request->validate(['date' => ['date']]);
            $query->whereDate('scheduled_at', $date);
        }

        $perPage = min(max($request->integer('per_page', 20), 1), 100);

        return response()->json($query->latest()->paginate($perPage)->withQueryString());
    }

    public function store(Request $request, string $model): JsonResponse
    {
        $this->authorizeWrite($request, $model);
        $payload = $this->scopePayload($request, $model, $request->all());
        $validated = validator($payload, $this->rules($model))->validate();

        if ($model === 'doctors') {
            return response()->json($this->storeDoctor($validated)->load(['user', 'department']), 201);
        }

        if ($model === 'patients') {
            return response()->json($this->storePatient($validated)->load(['user']), 201);
        }

        $this->assertPayloadAccess($request, $model, $validated);

        $class = $this->resolveModel($model);
        $record = $model === 'appointments'
            ? DB::transaction(function () use ($validated) {
                $this->assertAppointmentIntegrity($validated);

                return Appointment::create($validated);
            })
            : $class::create($validated);

        $record = $record->fresh($this->relations($model));
        if ($model === 'appointments') {
            $this->notifications->appointmentCreated($record, $request->user());
        }

        return response()->json($record, 201);
    }

    public function show(Request $request, string $model, int $id): JsonResponse
    {
        $record = $this->baseQuery($request, $model)->findOrFail($id);

        return response()->json($record);
    }

    public function update(Request $request, string $model, int $id): JsonResponse
    {
        $this->authorizeWrite($request, $model);
        $record = $this->baseQuery($request, $model)->findOrFail($id);
        $payload = $this->scopePayload($request, $model, $request->all());
        $validated = validator($payload, $this->rules($model, true, $id, $record->user_id ?? null))->validate();

        if ($model === 'doctors') {
            $this->updateDoctor($record, $validated);

            return response()->json($record->fresh(['user', 'department']));
        }

        if ($model === 'patients') {
            $this->updatePatient($record, $validated);

            return response()->json($record->fresh(['user']));
        }

        $this->assertPayloadAccess($request, $model, $validated, $record);

        $notifyAppointment = $model === 'appointments'
            && (array_key_exists('status', $validated) || array_key_exists('scheduled_at', $validated));

        if ($model === 'appointments') {
            DB::transaction(function () use ($record, $validated) {
                $next = array_merge($record->only(['patient_id', 'doctor_id', 'department_id', 'scheduled_at', 'status', 'reason', 'notes']), $validated);
                $this->assertAppointmentIntegrity($next, $record->id);
                $record->update($validated);
            });
        } else {
            $record->update($validated);
        }

        $record = $record->fresh($this->relations($model));
        if ($notifyAppointment) {
            $this->notifications->appointmentUpdated($record, $request->user());
        }

        return response()->json($record);
    }

    public function destroy(Request $request, string $model, int $id): JsonResponse
    {
        $this->authorizeWrite($request, $model);
        $record = $this->baseQuery($request, $model)->findOrFail($id);
        DB::transaction(function () use ($record, $model) {
            if (in_array($model, ['doctors', 'patients'], true)) {
                $record->user?->delete();

                return;
            }

            $record->delete();
        });

        return response()->json(['message' => __('api.resource_deleted')]);
    }

    public function resetDoctorPassword(Request $request, Doctor $doctor): JsonResponse
    {
        abort_unless($request->user()->role?->name === 'admin', 403, __('api.access_denied'));

        $doctor->user->update([
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        return response()->json(['message' => __('api.password_reset')]);
    }

    private function baseQuery(Request $request, string $model): Builder
    {
        $class = $this->resolveModel($model);
        $query = $class::query()->with($this->relations($model));
        $role = $request->user()->role?->name;

        if ($role === 'doctor') {
            $doctorId = $request->user()->doctor?->id;
            abort_if(! $doctorId, 404, __('api.doctor_profile_missing'));

            match ($model) {
                'appointments', 'medical-records', 'prescriptions' => $query->where('doctor_id', $doctorId),
                'patients' => $query->whereHas('appointments', fn ($q) => $q->where('doctor_id', $doctorId)),
                'doctors' => $query->where('id', $doctorId),
                default => null,
            };
        }

        if ($role === 'patient') {
            $patientId = $request->user()->patient?->id;
            abort_if(! $patientId, 404, __('api.patient_profile_missing'));

            match ($model) {
                'appointments', 'medical-records', 'prescriptions' => $query->where('patient_id', $patientId),
                'patients' => $query->where('id', $patientId),
                'doctors', 'departments' => null,
                default => abort(403, __('api.access_denied')),
            };
        }

        return $query;
    }

    private function authorizeWrite(Request $request, string $model): void
    {
        $role = $request->user()->role?->name;

        if ($role === 'admin') {
            return;
        }

        if ($role === 'doctor' && in_array($model, ['medical-records', 'prescriptions', 'appointments'], true)) {
            return;
        }

        if ($role === 'patient' && $model === 'appointments') {
            return;
        }

        abort(403, __('api.access_denied'));
    }

    private function resolveModel(string $model): string
    {
        $models = [
            'departments' => Department::class,
            'doctors' => Doctor::class,
            'patients' => Patient::class,
            'appointments' => Appointment::class,
            'medical-records' => MedicalRecord::class,
            'prescriptions' => Prescription::class,
        ];

        abort_unless(isset($models[$model]), 404, __('api.resource_not_found'));

        /** @var class-string<Model> $resolved */
        $resolved = $models[$model];

        return $resolved;
    }

    private function relations(string $model): array
    {
        return match ($model) {
            'doctors' => ['user', 'department'],
            'patients' => ['user', 'medicalRecords.prescriptions', 'appointments.doctor.user', 'appointments.department'],
            'appointments' => ['patient.user', 'doctor.user', 'department'],
            'medical-records' => ['patient.user', 'doctor.user', 'prescriptions'],
            'prescriptions' => ['patient.user', 'doctor.user', 'medicalRecord'],
            default => [],
        };
    }

    private function rules(string $model, bool $isUpdate = false, ?int $id = null, ?int $userId = null): array
    {
        $required = $isUpdate ? 'sometimes' : 'required';

        return match ($model) {
            'departments' => [
                'name' => [$required, 'string', 'max:255', Rule::unique('departments', 'name')->ignore($id)],
                'description' => ['nullable', 'string'],
                'is_active' => ['sometimes', 'boolean'],
            ],
            'doctors' => [
                'name' => [$required, 'string', 'max:255'],
                'email' => [$required, 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
                'phone' => ['nullable', 'string', 'max:30'],
                'department_id' => [$required, 'exists:departments,id'],
                'license_number' => [$required, 'string', 'max:100', Rule::unique('doctors', 'license_number')->ignore($id)],
                'specialty' => [$required, 'string', 'max:255'],
                'status' => ['sometimes', Rule::in(['active', 'inactive', 'leave'])],
                'is_active' => ['sometimes', 'boolean'],
            ],
            'patients' => [
                'name' => [$required, 'string', 'max:255'],
                'email' => [$required, 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
                'phone' => ['nullable', 'string', 'max:30'],
                'birth_date' => ['nullable', 'date'],
                'gender' => ['nullable', Rule::in(['female', 'male', 'other'])],
                'blood_group' => ['nullable', 'string', 'max:5'],
                'address' => ['nullable', 'string', 'max:255'],
                'emergency_contact' => ['nullable', 'string', 'max:255'],
            ],
            'appointments' => [
                'patient_id' => [$required, 'exists:patients,id'],
                'doctor_id' => [$required, 'exists:doctors,id'],
                'department_id' => [$required, 'exists:departments,id'],
                'scheduled_at' => [$required, 'date', 'after:now'],
                'status' => ['sometimes', Rule::in(['pending', 'confirmed', 'cancelled', 'completed', 'no_show'])],
                'reason' => ['nullable', 'string', 'max:255'],
                'notes' => ['nullable', 'string'],
            ],
            'medical-records' => [
                'patient_id' => [$required, 'exists:patients,id'],
                'doctor_id' => ['nullable', 'exists:doctors,id'],
                'diagnosis' => ['nullable', 'string'],
                'allergies' => ['nullable', 'string'],
                'treatments' => ['nullable', 'string'],
                'notes' => ['nullable', 'string'],
            ],
            'prescriptions' => [
                'medical_record_id' => [$required, 'exists:medical_records,id'],
                'doctor_id' => [$required, 'exists:doctors,id'],
                'patient_id' => [$required, 'exists:patients,id'],
                'medication' => [$required, 'string', 'max:255'],
                'dosage' => [$required, 'string', 'max:255'],
                'instructions' => ['nullable', 'string'],
                'issued_at' => [$required, 'date'],
            ],
            default => [],
        };
    }

    private function storeDoctor(array $validated): Doctor
    {
        return DB::transaction(function () use ($validated) {
            $role = Role::where('name', 'doctor')->firstOrFail();
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'role_id' => $role->id,
                'password' => Hash::make('password'),
                'is_active' => $validated['is_active'] ?? true,
            ]);

            return Doctor::create([
                'user_id' => $user->id,
                'department_id' => $validated['department_id'],
                'license_number' => $validated['license_number'],
                'specialty' => $validated['specialty'],
                'status' => $validated['status'] ?? 'active',
            ]);
        });
    }

    private function updateDoctor(Doctor $doctor, array $validated): void
    {
        DB::transaction(function () use ($doctor, $validated) {
            $doctor->user->update([
                'name' => $validated['name'] ?? $doctor->user->name,
                'email' => $validated['email'] ?? $doctor->user->email,
                'phone' => $validated['phone'] ?? $doctor->user->phone,
                'is_active' => $validated['is_active'] ?? $doctor->user->is_active,
            ]);

            $doctor->update(collect($validated)->only(['department_id', 'license_number', 'specialty', 'status'])->all());
        });
    }

    private function storePatient(array $validated): Patient
    {
        return DB::transaction(function () use ($validated) {
            $role = Role::where('name', 'patient')->firstOrFail();
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'role_id' => $role->id,
                'password' => Hash::make('password'),
            ]);

            return Patient::create([
                'user_id' => $user->id,
                'birth_date' => $validated['birth_date'] ?? null,
                'gender' => $validated['gender'] ?? null,
                'blood_group' => $validated['blood_group'] ?? null,
                'address' => $validated['address'] ?? null,
                'emergency_contact' => $validated['emergency_contact'] ?? null,
            ]);
        });
    }

    private function updatePatient(Patient $patient, array $validated): void
    {
        DB::transaction(function () use ($patient, $validated) {
            $patient->user->update(collect($validated)->only(['name', 'email', 'phone'])->all());
            $patient->update(collect($validated)->only(['birth_date', 'gender', 'blood_group', 'address', 'emergency_contact'])->all());
        });
    }

    private function scopePayload(Request $request, string $model, array $payload): array
    {
        $role = $request->user()->role?->name;

        if ($model === 'appointments') {
            if ($role === 'patient') {
                if ($request->isMethod('put')) {
                    $payload = collect($payload)->only(['status'])->all();
                }
                $payload['patient_id'] = $request->user()->patient->id;
                $payload['status'] = $payload['status'] ?? 'pending';
            }

            if ($role === 'doctor') {
                if ($request->isMethod('put')) {
                    $payload = collect($payload)->only(['status', 'notes'])->all();
                }
                $payload['doctor_id'] = $request->user()->doctor->id;
            }
        }

        if ($model === 'medical-records' && $role === 'doctor') {
            $payload['doctor_id'] = $request->user()->doctor->id;
        }

        if ($model === 'prescriptions' && $role === 'doctor') {
            $payload['doctor_id'] = $request->user()->doctor->id;
        }

        return $payload;
    }

    private function assertPayloadAccess(Request $request, string $model, array $validated, ?Model $record = null): void
    {
        $role = $request->user()->role?->name;

        if ($model === 'appointments' && $role === 'patient') {
            abort_unless(in_array($validated['status'] ?? $record?->status, ['pending', 'cancelled'], true), 403, __('api.appointment_forbidden'));
        }

        if ($model === 'medical-records' && $role === 'doctor') {
            $patientId = $validated['patient_id'] ?? $record?->patient_id;
            $this->assertDoctorCanAccessPatient($request->user()->doctor->id, $patientId);
        }

        if ($model === 'prescriptions' && $role === 'doctor') {
            $prescription = $record instanceof Prescription ? $record : null;
            $medicalRecordId = $validated['medical_record_id'] ?? $prescription?->medical_record_id;
            $patientId = $validated['patient_id'] ?? $prescription?->patient_id;
            $medicalRecord = MedicalRecord::whereKey($medicalRecordId)
                ->where('doctor_id', $request->user()->doctor->id)
                ->where('patient_id', $patientId)
                ->first();
            abort_unless($medicalRecord, 403, __('api.prescription_forbidden'));
        }
    }

    private function assertAppointmentIntegrity(array $payload, ?int $exceptId = null): void
    {
        $doctor = Doctor::findOrFail($payload['doctor_id']);
        abort_unless((int) $doctor->department_id === (int) $payload['department_id'], 422, __('api.doctor_department_mismatch'));
        abort_unless($doctor->status === 'active', 422, __('api.doctor_unavailable'));

        $conflicts = Appointment::query()
            ->where('scheduled_at', $payload['scheduled_at'])
            ->whereNotIn('status', ['cancelled'])
            ->where(function (Builder $query) use ($payload) {
                $query->where('doctor_id', $payload['doctor_id'])->orWhere('patient_id', $payload['patient_id']);
            });

        if ($exceptId) {
            $conflicts->whereKeyNot($exceptId);
        }

        abort_if($conflicts->exists(), 422, __('api.appointment_conflict'));
    }

    private function assertDoctorCanAccessPatient(int $doctorId, int $patientId): void
    {
        abort_unless(
            Appointment::where('doctor_id', $doctorId)->where('patient_id', $patientId)->exists(),
            403,
            __('api.patient_not_assigned')
        );
    }

    private function applySearch(Builder $query, string $model, string $search): void
    {
        $query->where(function (Builder $query) use ($model, $search) {
            match ($model) {
                'departments' => $query->where('name', 'like', "%{$search}%")->orWhere('description', 'like', "%{$search}%"),
                'doctors' => $query->where('specialty', 'like', "%{$search}%")->orWhereHas('user', fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")),
                'patients' => $query->whereHas('user', fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")),
                'appointments' => $query->where('reason', 'like', "%{$search}%")->orWhere('status', 'like', "%{$search}%"),
                'medical-records' => $query->where('diagnosis', 'like', "%{$search}%")->orWhere('notes', 'like', "%{$search}%"),
                default => null,
            };
        });
    }
}
