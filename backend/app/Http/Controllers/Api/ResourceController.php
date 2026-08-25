<?php

namespace App\Http\Controllers\Api;

use App\Enums\AppointmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\PatientSummaryResource;
use App\Models\Appointment;
use App\Models\Department;
use App\Models\Doctor;
use App\Models\MedicalRecord;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\Role;
use App\Models\User;
use App\Services\AppointmentWorkflowService;
use App\Services\AuditService;
use App\Services\DoctorPatientAccessPolicy;
use App\Services\NotificationService;
use App\Services\PrescriptionIntegrityService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ResourceController extends Controller
{
    public function __construct(
        private readonly AppointmentWorkflowService $appointments,
        private readonly DoctorPatientAccessPolicy $doctorPatientAccess,
        private readonly PrescriptionIntegrityService $prescriptionIntegrity,
        private readonly NotificationService $notifications,
        private readonly AuditService $audit,
    ) {}

    public function index(Request $request, string $model): JsonResponse
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'status' => ['nullable', 'string'],
            'department_id' => ['nullable', 'integer'],
            'doctor_id' => ['nullable', 'integer'],
        ]);
        $query = $this->baseQuery($request, $model);

        if ($search = $request->query('search')) {
            $this->applySearch($query, $model, (string) $search);
        }

        if ($status = $request->query('status')) {
            abort_unless(in_array($model, ['appointments', 'doctors'], true), 422, __('api.filter_unavailable'));
            $query->where('status', $status);
            $allowed = $model === 'appointments' ? AppointmentStatus::values() : ['active', 'inactive', 'leave'];
            $request->validate(['status' => [Rule::in($allowed)]]);
        }

        if ($departmentId = $request->integer('department_id')) {
            abort_unless(in_array($model, ['appointments', 'doctors'], true), 422, __('api.filter_unavailable'));
            $query->where('department_id', $departmentId);
        }
        $request->validate(['department_id' => ['exists:departments,id']]);

        if ($doctorId = $request->integer('doctor_id')) {
            abort_unless($model === 'appointments', 422, __('api.filter_unavailable'));
            $query->where('doctor_id', $doctorId);
        }
        $request->validate(['doctor_id' => ['exists:doctors,id']]);

        if ($date = $request->query('date')) {
            abort_unless($model === 'appointments', 422, __('api.filter_unavailable'));
            $request->validate(['date' => ['date_format:Y-m-d']]);
            $timezone = (string) config('app.hospital_timezone', 'UTC');
            $start = CarbonImmutable::createFromFormat('!Y-m-d', $date, $timezone)->startOfDay()->utc();
            $query->where('scheduled_at', '>=', $start)
                ->where('scheduled_at', '<', $start->addDay());
        }

        $perPage = min(max($request->integer('per_page', 20), 1), 100);

        $paginator = $query->latest()->paginate($perPage)->withQueryString();

        if ($model === 'patients') {
            $paginator->through(fn (Patient $patient) => (new PatientSummaryResource($patient))->resolve($request));
        }

        return response()->json($paginator);
    }

    public function store(Request $request, string $model): JsonResponse
    {
        $this->authorizeWrite($request, $model, false);
        $payload = $this->scopePayload($request, $model, $request->all());
        $validated = validator($payload, $this->rules($model))->validate();

        if ($model === 'doctors') {
            $doctor = $this->storeDoctor($validated)->load(['user', 'department']);
            $delivery = $this->sendInvitation($doctor->user);
            $this->audit->record($request, 'doctor.created', $doctor, array_keys($validated));

            return response()->json(['doctor' => $doctor, 'invitation_delivery' => $delivery], 201);
        }

        if ($model === 'patients') {
            $patient = $this->storePatient($validated)->load(['user']);
            $delivery = $this->sendInvitation($patient->user);
            $this->audit->record($request, 'patient.created', $patient, array_keys($validated));

            return response()->json(['patient' => $patient, 'invitation_delivery' => $delivery], 201);
        }

        $this->assertPayloadAccess($request, $model, $validated);

        if ($model === 'prescriptions') {
            $this->prescriptionIntegrity->assert($validated);
        }

        $class = $this->resolveModel($model);
        $record = $model === 'appointments'
            ? DB::transaction(function () use ($validated) {
                $this->appointments->lockParticipants($validated);
                $this->appointments->assertIntegrity($validated);

                return Appointment::create($validated);
            })
            : $class::create($validated);

        $record = $record->fresh($this->relations($model));
        if ($model === 'appointments') {
            $this->notifications->appointmentCreated($record, $request->user());
        }
        $this->audit->record($request, $model.'.created', $record, array_keys($validated));

        return response()->json($record, 201);
    }

    public function show(Request $request, string $model, int $id): JsonResponse
    {
        $record = $this->baseQuery($request, $model)->findOrFail($id);

        if ($model === 'patients' && $record instanceof Patient) {
            $this->loadPatientDetail($request, $record);
        }

        return response()->json($record);
    }

    public function update(Request $request, string $model, int $id): JsonResponse
    {
        $this->authorizeWrite($request, $model, true);
        $record = $this->baseQuery($request, $model)->findOrFail($id);
        $payload = $this->scopePayload($request, $model, $request->all());
        $validated = validator($payload, $this->rules($model, true, $id, $record->user_id ?? null))->validate();

        if ($model === 'appointments' && array_key_exists('scheduled_at', $validated)) {
            $rescheduled = CarbonImmutable::parse($validated['scheduled_at'])->utc();
            $current = CarbonImmutable::parse($record->scheduled_at)->utc();
            if (! $rescheduled->equalTo($current) && ! $rescheduled->isFuture()) {
                throw ValidationException::withMessages(['scheduled_at' => [__('api.appointment_future_required')]]);
            }
        }

        if ($model === 'doctors') {
            $this->updateDoctor($record, $validated);
            $this->audit->record($request, 'doctor.updated', $record, array_keys($validated));

            return response()->json($record->fresh(['user', 'department']));
        }

        if ($model === 'patients') {
            $this->updatePatient($record, $validated);
            $this->audit->record($request, 'patient.updated', $record, array_keys($validated));

            return response()->json($record->fresh(['user']));
        }

        $this->assertPayloadAccess($request, $model, $validated, $record);

        $notifyAppointment = $model === 'appointments'
            && (array_key_exists('status', $validated) || array_key_exists('scheduled_at', $validated));

        if ($model === 'appointments') {
            DB::transaction(function () use ($request, $record, $validated) {
                $locked = Appointment::whereKey($record->id)->lockForUpdate()->firstOrFail();
                if (isset($validated['status'])) {
                    $this->appointments->assertTransition($locked, $validated['status'], $request->user());
                }
                $next = array_merge($locked->only(['patient_id', 'doctor_id', 'department_id', 'scheduled_at', 'status', 'reason', 'notes']), $validated);
                if ($this->appointments->requiresIntegrityCheck($validated)) {
                    $this->appointments->lockParticipants($next);
                    $this->appointments->assertIntegrity($next, $locked->id);
                }
                $locked->update($validated);
            });
        } elseif (in_array($model, ['medical-records', 'prescriptions'], true)) {
            DB::transaction(function () use ($model, $record, $validated) {
                $locked = $record::whereKey($record->id)->lockForUpdate()->firstOrFail();
                $this->assertFreshVersion($locked, $validated);
                unset($validated['version']);
                if ($model === 'prescriptions') {
                    $this->prescriptionIntegrity->assert($validated, $locked);
                }
                $locked->update([...$validated, 'version' => $locked->version + 1]);
            });
        } else {
            $record->update($validated);
        }

        $record = $record->fresh($this->relations($model));
        if ($notifyAppointment) {
            $this->notifications->appointmentUpdated($record, $request->user());
        }
        $this->audit->record($request, $model.'.updated', $record, array_keys($validated));

        return response()->json($record);
    }

    public function destroy(Request $request, string $model, int $id): JsonResponse
    {
        abort_unless($request->user()->role?->name === 'admin', 403, __('api.access_denied'));
        $record = $this->baseQuery($request, $model)->findOrFail($id);
        DB::transaction(function () use ($request, $record, $model) {
            if ($model === 'doctors') {
                $this->deactivateUser($record->user);
                $record->update(['status' => 'inactive']);
            } elseif ($model === 'patients') {
                $this->deactivateUser($record->user);
            } elseif ($model === 'appointments') {
                $this->appointments->assertTransition($record, AppointmentStatus::Cancelled->value, $request->user());
                $record->update(['status' => 'cancelled']);
            } elseif (in_array($model, ['medical-records', 'prescriptions'], true)) {
                $record->update(['archived_at' => now()]);
            } elseif ($model === 'departments') {
                $record->update(['is_active' => false]);
            }
        });

        $this->audit->record($request, $model.'.archived', $record);

        return response()->json(['message' => __('api.resource_deleted'), 'archived' => true]);
    }

    public function resetDoctorPassword(Request $request, Doctor $doctor): JsonResponse
    {
        abort_unless($request->user()->role?->name === 'admin', 403, __('api.access_denied'));

        $delivery = $this->sendInvitation($doctor->user);
        $this->audit->record($request, 'doctor.password_reset_requested', $doctor);

        return response()->json([
            'message' => $delivery === 'sent' ? __('api.password_reset_link_sent') : __('api.password_reset_link_failed'),
            'delivery' => $delivery,
        ]);
    }

    private function baseQuery(Request $request, string $model): Builder
    {
        $class = $this->resolveModel($model);
        $query = $class::query();
        $role = $request->user()->role?->name;

        if ($role === 'doctor') {
            $doctorId = $request->user()->doctor?->id;
            abort_if(! $doctorId, 404, __('api.doctor_profile_missing'));

            match ($model) {
                'appointments', 'medical-records', 'prescriptions' => $query->where('doctor_id', $doctorId),
                'patients' => $this->doctorPatientAccess->scopePatients($query, $doctorId, 'identity'),
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
                'doctors' => $query->where('status', 'active')->whereHas('user', fn (Builder $q) => $q->where('is_active', true)),
                'departments' => $query->where('is_active', true),
                default => abort(403, __('api.access_denied')),
            };
        }

        $query->with($this->relations($model, $request));

        if (in_array($model, ['medical-records', 'prescriptions'], true)) {
            $query->whereNull('archived_at');
        }

        if ($model === 'patients') {
            if ($role === 'doctor') {
                $doctorId = (int) $request->user()->doctor->id;
                $query->withCount([
                    'medicalRecords as medical_records_count' => fn (Builder $q) => $q
                        ->where('doctor_id', $doctorId)
                        ->whereNull('archived_at'),
                    'appointments as appointments_count' => fn (Builder $q) => $q
                        ->where('doctor_id', $doctorId),
                ]);
            } else {
                $query->withCount([
                    'medicalRecords' => fn (Builder $q) => $q->whereNull('archived_at'),
                    'appointments',
                ]);
            }
        }

        return $query;
    }

    private function loadPatientDetail(Request $request, Patient $patient): void
    {
        $userColumns = 'id,name,email,phone,locale,is_active,email_verified_at';
        $doctorId = $request->user()->role?->name === 'doctor'
            ? (int) $request->user()->doctor->id
            : null;

        $patient->load([
            "user:$userColumns",
            'appointments' => fn ($query) => $query
                ->when($doctorId, fn ($scoped) => $scoped->where('doctor_id', $doctorId))
                ->with(["doctor.user:$userColumns", 'department'])
                ->latest('scheduled_at'),
            'medicalRecords' => fn ($query) => $query
                ->when($doctorId, fn ($scoped) => $scoped->where('doctor_id', $doctorId))
                ->whereNull('archived_at')
                ->with([
                    "doctor.user:$userColumns",
                    'prescriptions' => fn ($prescriptions) => $prescriptions
                        ->when($doctorId, fn ($scoped) => $scoped->where('doctor_id', $doctorId))
                        ->whereNull('archived_at'),
                ])
                ->latest(),
            'prescriptions' => fn ($query) => $query
                ->when($doctorId, fn ($scoped) => $scoped->where('doctor_id', $doctorId))
                ->whereNull('archived_at')
                ->with(["doctor.user:$userColumns", 'medicalRecord'])
                ->latest(),
            'clinicalOrders' => fn ($query) => $query
                ->when($doctorId, fn ($scoped) => $scoped->where('doctor_id', $doctorId))
                ->with(["doctor.user:$userColumns"])
                ->latest('ordered_at'),
        ]);
    }

    private function authorizeWrite(Request $request, string $model, bool $isUpdate): void
    {
        $role = $request->user()->role?->name;

        if ($role === 'admin') {
            return;
        }

        if ($role === 'doctor' && (in_array($model, ['medical-records', 'prescriptions'], true) || ($model === 'appointments' && $isUpdate))) {
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

    private function relations(string $model, ?Request $request = null): array
    {
        $userColumns = 'id,name,email,phone,locale,is_active,email_verified_at';

        return match ($model) {
            'doctors' => ["user:$userColumns", 'department'],
            'patients' => ["user:$userColumns"],
            'appointments' => ["patient.user:$userColumns", "doctor.user:$userColumns", 'department'],
            'medical-records' => ["patient.user:$userColumns", "doctor.user:$userColumns", 'prescriptions' => fn ($q) => $q->whereNull('archived_at')],
            'prescriptions' => ["patient.user:$userColumns", "doctor.user:$userColumns", 'medicalRecord'],
            default => [],
        };
    }

    private function rules(string $model, bool $isUpdate = false, ?int $id = null, ?int $userId = null): array
    {
        $required = $isUpdate ? 'sometimes' : 'required';

        return match ($model) {
            'departments' => [
                'name' => [$required, 'string', 'max:255', Rule::unique('departments', 'name')->ignore($id)],
                'description' => ['nullable', 'string', 'max:10000'],
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
                'birth_date' => ['nullable', 'date', 'before_or_equal:today'],
                'gender' => ['nullable', Rule::in(['female', 'male', 'other'])],
                'blood_group' => ['nullable', Rule::in(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])],
                'address' => ['nullable', 'string', 'max:255'],
                'emergency_contact' => ['nullable', 'string', 'max:255'],
            ],
            'appointments' => [
                'patient_id' => [$required, 'exists:patients,id'],
                'doctor_id' => [$required, 'exists:doctors,id'],
                'department_id' => [$required, 'exists:departments,id'],
                'scheduled_at' => [$required, 'date', ...($isUpdate ? [] : ['after:now'])],
                'status' => ['sometimes', Rule::enum(AppointmentStatus::class)],
                'reason' => ['nullable', 'string', 'max:255'],
                'notes' => ['nullable', 'string', 'max:10000'],
            ],
            'medical-records' => [
                'patient_id' => [$required, 'exists:patients,id'],
                'doctor_id' => ['nullable', 'exists:doctors,id'],
                'diagnosis' => ['nullable', 'string', 'max:30000'],
                'allergies' => ['nullable', 'string', 'max:30000'],
                'treatments' => ['nullable', 'string', 'max:30000'],
                'notes' => ['nullable', 'string', 'max:30000'],
                'version' => [$isUpdate ? 'required' : 'sometimes', 'integer', 'min:1'],
            ],
            'prescriptions' => [
                'medical_record_id' => [$required, 'exists:medical_records,id'],
                'doctor_id' => [$required, 'exists:doctors,id'],
                'patient_id' => [$required, 'exists:patients,id'],
                'medication' => [$required, 'string', 'max:255'],
                'dosage' => [$required, 'string', 'max:255'],
                'instructions' => ['nullable', 'string', 'max:30000'],
                'issued_at' => [$required, 'date'],
                'version' => [$isUpdate ? 'required' : 'sometimes', 'integer', 'min:1'],
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
                'password' => Str::random(64),
                'is_active' => $validated['is_active'] ?? true,
                'email_verified_at' => null,
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
                'password' => Str::random(64),
                'email_verified_at' => null,
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
        $isUpdate = $request->isMethod('put') || $request->isMethod('patch');

        if (array_key_exists('email', $payload)) {
            $payload['email'] = Str::lower(trim((string) $payload['email']));
        }

        if ($model === 'appointments') {
            if ($role === 'patient') {
                if ($isUpdate) {
                    $payload = collect($payload)->only(['status'])->all();
                } else {
                    $payload['patient_id'] = $request->user()->patient->id;
                    $payload['status'] = AppointmentStatus::Pending->value;
                }
            }

            if ($role === 'doctor' && $isUpdate) {
                $payload = collect($payload)->only(['status', 'notes'])->all();
            }

            if ($role === 'admin' && ! $isUpdate) {
                $payload['status'] = AppointmentStatus::Pending->value;
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
            $this->doctorPatientAccess->assert($request->user()->doctor->id, $patientId, 'create_medical_record');
        }

        if ($model === 'prescriptions') {
            $prescription = $record instanceof Prescription ? $record : null;
            $patientId = $validated['patient_id'] ?? $prescription?->patient_id;
            if ($role === 'doctor') {
                $this->doctorPatientAccess->assert($request->user()->doctor->id, $patientId, 'create_prescription');
            }
            $this->prescriptionIntegrity->assert($validated, $prescription);
        }
    }

    private function deactivateUser(?User $user): void
    {
        if (! $user) {
            return;
        }

        $user->update(['is_active' => false]);
        $user->tokens()->delete();
        DB::table('sessions')->where('user_id', $user->id)->delete();
    }

    private function sendInvitation(User $user): string
    {
        try {
            $status = Password::sendResetLink(['email' => $user->email]);
            $delivery = $status === Password::RESET_LINK_SENT ? 'sent' : 'failed';
        } catch (\Throwable $exception) {
            report($exception);
            $delivery = 'failed';
        }

        $user->forceFill([
            'invitation_status' => $delivery,
            'invitation_sent_at' => $delivery === 'sent' ? now() : null,
        ])->save();

        return $delivery;
    }

    private function assertFreshVersion(Model $record, array $validated): void
    {
        abort_unless((int) ($validated['version'] ?? 0) === (int) $record->version, 409, __('api.stale_record'));
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
