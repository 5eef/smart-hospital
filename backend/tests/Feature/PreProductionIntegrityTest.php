<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Department;
use App\Models\Doctor;
use App\Models\MedicalRecord;
use App\Models\Notification;
use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification as NotificationFacade;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\TestCase;

class PreProductionIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_appointment_transitions_actor_boundaries_and_future_rescheduling(): void
    {
        [$department, $doctor] = $this->doctor('workflow-doctor@example.test');
        $patient = $this->patient('workflow-patient@example.test');
        $appointment = $this->appointment($doctor, $patient, 'pending', now()->addDay());

        $this->actingAs($patient->user, 'sanctum')
            ->putJson("/api/appointments/{$appointment->id}", ['status' => 'completed'])
            ->assertForbidden();

        $this->actingAs($doctor->user, 'sanctum')
            ->putJson("/api/appointments/{$appointment->id}", ['status' => 'confirmed'])
            ->assertOk()
            ->assertJsonPath('status', 'confirmed');

        $this->actingAs($doctor->user, 'sanctum')
            ->putJson("/api/appointments/{$appointment->id}", ['status' => 'pending'])
            ->assertUnprocessable();

        $admin = $this->user('admin', 'workflow-admin@example.test');
        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/appointments/{$appointment->id}", [
                'scheduled_at' => now()->subHour()->toISOString(),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('scheduled_at');

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/appointments/{$appointment->id}", [
                'scheduled_at' => now()->addDays(2)->toISOString(),
            ])
            ->assertOk();

        $this->assertSame($department->id, $appointment->fresh()->department_id);
    }

    public function test_doctor_and_patient_conflicts_ignore_cancelled_appointments(): void
    {
        [, $doctorA] = $this->doctor('conflict-a@example.test');
        [, $doctorB] = $this->doctor('conflict-b@example.test');
        $patientA = $this->patient('conflict-patient-a@example.test');
        $patientB = $this->patient('conflict-patient-b@example.test');
        $slot = now()->addDays(3)->setTime(10, 0, 0);
        $existing = $this->appointment($doctorA, $patientA, 'confirmed', $slot);

        $this->actingAs($patientB->user, 'sanctum')->postJson('/api/appointments', [
            'doctor_id' => $doctorA->id,
            'department_id' => $doctorA->department_id,
            'scheduled_at' => $slot->toISOString(),
        ])->assertUnprocessable();

        $this->actingAs($patientA->user, 'sanctum')->postJson('/api/appointments', [
            'doctor_id' => $doctorB->id,
            'department_id' => $doctorB->department_id,
            'scheduled_at' => $slot->toISOString(),
        ])->assertUnprocessable();

        $existing->update(['status' => 'cancelled']);

        $this->actingAs($patientB->user, 'sanctum')->postJson('/api/appointments', [
            'doctor_id' => $doctorA->id,
            'department_id' => $doctorA->department_id,
            'scheduled_at' => $slot->toISOString(),
        ])->assertCreated();
    }

    public function test_doctor_patient_policy_is_explicit_for_every_appointment_status(): void
    {
        [, $doctor] = $this->doctor('policy-doctor@example.test');
        $patient = $this->patient('policy-patient@example.test');
        $appointment = $this->appointment($doctor, $patient, 'pending', now()->addDay());

        $expectations = [
            'pending' => [true, false],
            'confirmed' => [true, true],
            'cancelled' => [false, false],
            'completed' => [true, true],
            'no_show' => [false, false],
        ];

        foreach ($expectations as $status => [$maySeeIdentity, $mayCreateClinicalData]) {
            $appointment->update(['status' => $status]);

            $identity = $this->actingAs($doctor->user, 'sanctum')
                ->getJson("/api/patients/{$patient->id}");
            $maySeeIdentity ? $identity->assertOk() : $identity->assertNotFound();

            $creation = $this->actingAs($doctor->user, 'sanctum')
                ->postJson('/api/medical-records', [
                    'patient_id' => $patient->id,
                    'diagnosis' => "Status {$status}",
                ]);
            $mayCreateClinicalData ? $creation->assertCreated() : $creation->assertForbidden();
        }
    }

    public function test_patient_summary_and_detail_do_not_leak_another_doctors_data(): void
    {
        [, $doctorA] = $this->doctor('privacy-a@example.test');
        [, $doctorB] = $this->doctor('privacy-b@example.test');
        $patient = $this->patient('privacy-patient@example.test', [
            'address' => 'Private address',
            'emergency_contact' => 'Private contact',
        ]);
        $this->appointment($doctorA, $patient, 'confirmed', now()->addDay());
        $this->appointment($doctorB, $patient, 'confirmed', now()->addDays(2));
        MedicalRecord::create(['patient_id' => $patient->id, 'doctor_id' => $doctorA->id, 'diagnosis' => 'Doctor A']);
        MedicalRecord::create(['patient_id' => $patient->id, 'doctor_id' => $doctorB->id, 'diagnosis' => 'Doctor B private']);

        $list = $this->actingAs($doctorA->user, 'sanctum')->getJson('/api/patients')
            ->assertOk()
            ->assertJsonPath('data.0.medical_records_count', 1)
            ->assertJsonPath('data.0.appointments_count', 1)
            ->assertJsonMissingPath('data.0.address')
            ->assertJsonMissingPath('data.0.emergency_contact');

        $this->assertStringNotContainsString('Doctor B private', $list->getContent());

        $detail = $this->actingAs($doctorA->user, 'sanctum')
            ->getJson("/api/patients/{$patient->id}")
            ->assertOk()
            ->assertJsonCount(1, 'medical_records')
            ->assertJsonCount(1, 'appointments');

        $this->assertStringNotContainsString('Doctor B private', $detail->getContent());
    }

    public function test_prescription_integrity_and_optimistic_locking_for_clinical_records(): void
    {
        [, $doctor] = $this->doctor('integrity-doctor@example.test');
        $patientA = $this->patient('integrity-a@example.test');
        $patientB = $this->patient('integrity-b@example.test');
        $this->appointment($doctor, $patientA, 'confirmed', now()->addDay());
        $this->appointment($doctor, $patientB, 'confirmed', now()->addDays(2));

        $recordAId = $this->actingAs($doctor->user, 'sanctum')
            ->postJson('/api/medical-records', [
                'patient_id' => $patientA->id,
                'diagnosis' => 'Initial',
            ])
            ->assertCreated()
            ->assertJsonPath('version', 1)
            ->json('id');

        $this->actingAs($doctor->user, 'sanctum')
            ->putJson("/api/medical-records/{$recordAId}", [
                'diagnosis' => 'Updated',
                'version' => 1,
            ])
            ->assertOk()
            ->assertJsonPath('version', 2);

        $this->actingAs($doctor->user, 'sanctum')
            ->putJson("/api/medical-records/{$recordAId}", [
                'diagnosis' => 'Stale update',
                'version' => 1,
            ])
            ->assertConflict();

        $admin = $this->user('admin', 'integrity-admin@example.test');
        $this->actingAs($admin, 'sanctum')->postJson('/api/prescriptions', [
            'medical_record_id' => $recordAId,
            'doctor_id' => $doctor->id,
            'patient_id' => $patientB->id,
            'medication' => 'Mismatch',
            'dosage' => '1',
            'issued_at' => today()->toDateString(),
        ])->assertUnprocessable();

        $prescriptionId = $this->actingAs($doctor->user, 'sanctum')->postJson('/api/prescriptions', [
            'medical_record_id' => $recordAId,
            'patient_id' => $patientA->id,
            'medication' => 'Treatment',
            'dosage' => '1 daily',
            'issued_at' => today()->toDateString(),
        ])->assertCreated()
            ->assertJsonPath('version', 1)
            ->json('id');

        $this->actingAs($doctor->user, 'sanctum')
            ->putJson("/api/prescriptions/{$prescriptionId}", [
                'dosage' => '2 daily',
                'version' => 1,
            ])
            ->assertOk()
            ->assertJsonPath('version', 2);

        $this->actingAs($doctor->user, 'sanctum')
            ->putJson("/api/prescriptions/{$prescriptionId}", [
                'dosage' => 'stale',
                'version' => 1,
            ])
            ->assertConflict();
    }

    public function test_clinical_order_transitions_terminal_state_result_and_concurrency(): void
    {
        [, $doctor] = $this->doctor('order-doctor@example.test');
        [, $otherDoctor] = $this->doctor('order-other@example.test');
        $patient = $this->patient('order-patient@example.test');
        $this->appointment($doctor, $patient, 'confirmed', now()->addDay());

        $orderId = $this->actingAs($doctor->user, 'sanctum')->postJson('/api/clinical-orders', [
            'patient_id' => $patient->id,
            'type' => 'laboratory',
            'exam_name' => 'CBC',
            'priority' => 'routine',
        ])->assertCreated()
            ->assertJsonPath('version', 1)
            ->json('id');

        $this->actingAs($doctor->user, 'sanctum')
            ->putJson("/api/clinical-orders/{$orderId}", [
                'status' => 'completed',
                'result' => 'Invalid direct completion',
                'version' => 1,
            ])
            ->assertUnprocessable();

        $this->actingAs($doctor->user, 'sanctum')
            ->putJson("/api/clinical-orders/{$orderId}", [
                'status' => 'in_progress',
                'version' => 1,
            ])
            ->assertOk()
            ->assertJsonPath('version', 2);

        $this->actingAs($doctor->user, 'sanctum')
            ->putJson("/api/clinical-orders/{$orderId}", [
                'status' => 'cancelled',
                'version' => 1,
            ])
            ->assertConflict();

        $this->actingAs($doctor->user, 'sanctum')
            ->putJson("/api/clinical-orders/{$orderId}", [
                'status' => 'completed',
                'version' => 2,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('result');

        $this->actingAs($doctor->user, 'sanctum')
            ->putJson("/api/clinical-orders/{$orderId}", [
                'status' => 'completed',
                'result' => 'Normal',
                'version' => 2,
            ])
            ->assertOk()
            ->assertJsonPath('version', 3);

        $this->actingAs($doctor->user, 'sanctum')
            ->putJson("/api/clinical-orders/{$orderId}", [
                'exam_name' => 'Mutated terminal order',
                'version' => 3,
            ])
            ->assertConflict();

        $this->actingAs($otherDoctor->user, 'sanctum')
            ->putJson("/api/clinical-orders/{$orderId}", [
                'status' => 'cancelled',
                'version' => 3,
            ])
            ->assertNotFound();
    }

    public function test_admin_invitation_success_and_delivery_failure_are_explicit(): void
    {
        NotificationFacade::fake();
        $admin = $this->user('admin', 'invitation-admin@example.test');
        $department = Department::create(['name' => 'Invitations', 'is_active' => true]);

        $success = $this->actingAs($admin, 'sanctum')->postJson('/api/doctors', [
            'name' => 'Invited Doctor',
            'email' => 'INVITED@EXAMPLE.TEST',
            'department_id' => $department->id,
            'license_number' => 'INV-001',
            'specialty' => 'General',
        ])->assertCreated()
            ->assertJsonPath('invitation_delivery', 'sent')
            ->assertJsonMissingPath('doctor.user.password');

        $invited = User::where('email', 'invited@example.test')->firstOrFail();
        $this->assertNull($invited->email_verified_at);
        $this->assertSame('sent', $invited->invitation_status);
        $this->assertNotNull($invited->invitation_sent_at);
        $this->assertTrue((bool) $success->json('doctor.user.is_active'));

        Password::shouldReceive('sendResetLink')
            ->once()
            ->andThrow(new RuntimeException('SMTP unavailable'));

        $this->actingAs($admin, 'sanctum')->postJson('/api/patients', [
            'name' => 'Failed Invitation',
            'email' => 'failed-invitation@example.test',
        ])->assertCreated()
            ->assertJsonPath('invitation_delivery', 'failed')
            ->assertJsonMissingPath('patient.user.password');

        $failed = User::where('email', 'failed-invitation@example.test')->firstOrFail();
        $this->assertSame('failed', $failed->invitation_status);
        $this->assertNull($failed->invitation_sent_at);
        $this->assertTrue($failed->is_active);
    }

    public function test_registration_legacy_verification_and_normalized_rate_limit(): void
    {
        $this->ensureRoles();

        $this->postJson('/api/auth/register', [
            'name' => 'New Patient',
            'email' => ' NEW-VERIFY@EXAMPLE.TEST ',
            'password' => 'strong-password-2026',
            'password_confirmation' => 'strong-password-2026',
        ])->assertCreated()
            ->assertJsonPath('email_verification_required', true);

        $registered = User::where('email', 'new-verify@example.test')->firstOrFail();
        $this->assertNull($registered->email_verified_at);

        $legacy = $this->user('patient', 'legacy-unverified@example.test');
        $legacy->forceFill(['email_verified_at' => null])->save();
        $migration = require database_path('migrations/2026_08_22_000100_grandfather_existing_email_verification.php');
        $migration->up();
        $this->assertNull($legacy->fresh()->email_verified_at);

        foreach (range(1, 5) as $attempt) {
            $email = $attempt % 2 === 0
                ? ' RATE-LIMIT@EXAMPLE.TEST '
                : 'rate-limit@example.test';

            $this->postJson('/api/auth/login', [
                'email' => $email,
                'password' => 'invalid-password',
            ])->assertUnprocessable();
        }

        $this->postJson('/api/auth/login', [
            'email' => 'Rate-Limit@Example.Test',
            'password' => 'invalid-password',
        ])->assertTooManyRequests()
            ->assertJsonPath('message', __('api.too_many_attempts'));
    }

    public function test_timezone_filter_uses_half_open_local_day_boundaries(): void
    {
        config(['app.hospital_timezone' => 'Africa/Casablanca']);
        $admin = $this->user('admin', 'timezone-admin@example.test');
        [, $doctor] = $this->doctor('timezone-doctor@example.test');
        $patient = $this->patient('timezone-patient@example.test');

        $included = $this->appointment(
            $doctor,
            $patient,
            'confirmed',
            CarbonImmutable::parse('2026-08-24T23:30:00Z')
        );
        $excluded = $this->appointment(
            $doctor,
            $patient,
            'confirmed',
            CarbonImmutable::parse('2026-08-25T23:00:00Z')
        );

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/appointments?date=2026-08-25')
            ->assertOk();

        $ids = collect($response->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($included->id));
        $this->assertFalse($ids->contains($excluded->id));

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('appointments_today', 1);
        $this->actingAs($doctor->user, 'sanctum')->getJson('/api/doctor/dashboard')
            ->assertOk()
            ->assertJsonPath('appointments_today', 1);
    }

    public function test_readiness_notification_counts_queue_config_and_integrity_schema(): void
    {
        $user = $this->user('patient', 'probe@example.test');
        Patient::create(['user_id' => $user->id]);
        Notification::create([
            'user_id' => $user->id,
            'title' => 'Unread',
            'message' => 'One',
            'type' => 'info',
        ]);
        Notification::create([
            'user_id' => $user->id,
            'title' => 'Read',
            'message' => 'Two',
            'type' => 'info',
            'read_at' => now(),
        ]);

        $this->actingAs($user, 'sanctum')->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('unread_count', 1);
        $this->actingAs($user, 'sanctum')->getJson('/api/notifications/unread')
            ->assertOk()
            ->assertExactJson(['unread_count' => 1]);

        $this->getJson('/api/health')->assertOk()->assertJsonPath('status', 'ok');
        $this->getJson('/api/ready')->assertOk()->assertJsonPath('status', 'ready');

        config(['database.default' => 'missing-connection']);
        $unavailable = $this->getJson('/api/ready');
        config(['database.default' => 'sqlite']);
        $unavailable->assertServiceUnavailable()
            ->assertExactJson(['status' => 'unavailable']);

        $this->assertTrue((bool) config('queue.connections.database.after_commit'));
        $this->assertTrue((bool) config('queue.connections.redis.after_commit'));
        $this->assertTrue(Schema::hasColumn('medical_records', 'version'));
        $this->assertTrue(Schema::hasColumn('prescriptions', 'version'));
        $this->assertTrue(Schema::hasColumn('clinical_orders', 'version'));
        $this->assertTrue(Schema::hasColumn('users', 'invitation_status'));
        $this->assertTrue(Schema::hasIndex('appointments', 'appointments_doctor_status_scheduled_index'));
    }

    private function appointment(
        Doctor $doctor,
        Patient $patient,
        string $status,
        \DateTimeInterface $scheduledAt
    ): Appointment {
        return Appointment::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'department_id' => $doctor->department_id,
            'scheduled_at' => $scheduledAt,
            'status' => $status,
        ]);
    }

    private function doctor(string $email): array
    {
        $department = Department::create([
            'name' => 'Department '.fake()->unique()->numerify('#####'),
            'is_active' => true,
        ]);
        $user = $this->user('doctor', $email);
        $doctor = Doctor::create([
            'user_id' => $user->id,
            'department_id' => $department->id,
            'license_number' => fake()->unique()->bothify('DOC-#####'),
            'specialty' => 'General',
            'status' => 'active',
        ]);

        return [$department, $doctor];
    }

    private function patient(string $email, array $attributes = []): Patient
    {
        return Patient::create([
            ...$attributes,
            'user_id' => $this->user('patient', $email)->id,
        ]);
    }

    private function user(string $role, string $email): User
    {
        $this->ensureRoles();

        return User::create([
            'name' => ucfirst(strtok($email, '@')),
            'email' => strtolower(trim($email)),
            'password' => 'password123',
            'role_id' => Role::where('name', $role)->value('id'),
            'is_active' => true,
            'email_verified_at' => now(),
        ]);
    }

    private function ensureRoles(): void
    {
        foreach (['admin', 'doctor', 'patient'] as $role) {
            Role::firstOrCreate(['name' => $role], ['label' => ucfirst($role)]);
        }
    }
}
