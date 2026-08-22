<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Department;
use App\Models\Doctor;
use App\Models\MedicalRecord;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\Role;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class FinalProductionHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_spa_csrf_cookie_is_available_and_stateful_mutations_require_a_token(): void
    {
        $this->get('/sanctum/csrf-cookie')->assertNoContent()->assertCookie('XSRF-TOKEN');
        $this->flushHeaders();
        $this->withHeader('Origin', 'http://localhost:5173')->postJson('/api/auth/login', [
            'email' => 'nobody@example.test', 'password' => 'invalid',
        ])->assertStatus(419);
    }

    public function test_signed_email_verification_link_works_without_an_existing_browser_session(): void
    {
        $user = $this->user('patient', 'verify@example.test');
        $user->forceFill(['email_verified_at' => null])->save();
        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(30), [
            'id' => $user->id, 'hash' => sha1($user->email),
        ]);

        $this->getJson($url)->assertOk();
        $this->assertTrue($user->fresh()->hasVerifiedEmail());
    }

    public function test_admin_password_reset_sends_a_broker_link_without_reactivating_the_doctor(): void
    {
        Notification::fake();
        $admin = $this->user('admin', 'admin-reset@example.test');
        [, $doctor] = $this->doctor('inactive-doctor@example.test');
        $doctor->update(['status' => 'inactive']);
        $doctor->user->update(['is_active' => false]);

        $this->actingAs($admin, 'sanctum')->postJson("/api/doctors/{$doctor->id}/reset-password")
            ->assertOk();

        $this->assertFalse($doctor->user->fresh()->is_active);
        Notification::assertSentTo($doctor->user, ResetPassword::class);
        $this->assertDatabaseHas('audit_logs', [
            'actor_user_id' => $admin->id,
            'action' => 'doctor.password_reset_requested',
            'entity_id' => $doctor->id,
        ]);
    }

    public function test_password_reset_revokes_tokens_and_database_sessions(): void
    {
        $user = $this->user('patient', 'password-reset@example.test');
        Patient::create(['user_id' => $user->id]);
        $user->createToken('external-client');
        DB::table('sessions')->insert([
            'id' => 'old-session', 'user_id' => $user->id, 'ip_address' => null,
            'user_agent' => null, 'payload' => 'test', 'last_activity' => now()->timestamp,
        ]);
        $token = Password::createToken($user);

        $this->postJson('/api/auth/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'a-new-password-2026',
            'password_confirmation' => 'a-new-password-2026',
        ])->assertOk();

        $this->assertTrue(Hash::check('a-new-password-2026', $user->fresh()->password));
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $user->id]);
        $this->assertDatabaseMissing('sessions', ['user_id' => $user->id]);
    }

    public function test_doctor_patient_detail_scopes_every_nested_clinical_relation(): void
    {
        [, $doctorA] = $this->doctor('doctor-a@example.test');
        [, $doctorB] = $this->doctor('doctor-b@example.test');
        $patient = $this->patient('shared-patient@example.test');

        foreach ([$doctorA, $doctorB] as $doctor) {
            Appointment::create([
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'department_id' => $doctor->department_id,
                'scheduled_at' => now()->addDays($doctor->id),
                'status' => 'confirmed',
            ]);
        }
        $recordA = MedicalRecord::create(['patient_id' => $patient->id, 'doctor_id' => $doctorA->id, 'diagnosis' => 'A']);
        $recordB = MedicalRecord::create(['patient_id' => $patient->id, 'doctor_id' => $doctorB->id, 'diagnosis' => 'B private']);
        Prescription::create([
            'medical_record_id' => $recordB->id, 'doctor_id' => $doctorB->id, 'patient_id' => $patient->id,
            'medication' => 'Private B', 'dosage' => '1', 'issued_at' => today(),
        ]);

        $response = $this->actingAs($doctorA->user, 'sanctum')->getJson("/api/patients/{$patient->id}")
            ->assertOk()
            ->assertJsonCount(1, 'medical_records')
            ->assertJsonCount(1, 'appointments')
            ->assertJsonPath('medical_records.0.id', $recordA->id);

        $this->assertStringNotContainsString('B private', $response->getContent());
        $this->assertStringNotContainsString('Private B', $response->getContent());
    }

    public function test_delete_actions_preserve_medical_history_and_deactivate_accounts(): void
    {
        $admin = $this->user('admin', 'archive-admin@example.test');
        [, $doctor] = $this->doctor('archive-doctor@example.test');
        $patient = $this->patient('archive-patient@example.test');
        $appointment = Appointment::create([
            'patient_id' => $patient->id, 'doctor_id' => $doctor->id, 'department_id' => $doctor->department_id,
            'scheduled_at' => now()->addDay(), 'status' => 'confirmed',
        ]);
        $record = MedicalRecord::create(['patient_id' => $patient->id, 'doctor_id' => $doctor->id, 'diagnosis' => 'Historique']);

        $this->actingAs($admin, 'sanctum')->deleteJson("/api/patients/{$patient->id}")
            ->assertOk()->assertJsonPath('archived', true);

        $this->assertFalse($patient->user->fresh()->is_active);
        $this->assertDatabaseHas('appointments', ['id' => $appointment->id]);
        $this->assertDatabaseHas('medical_records', ['id' => $record->id]);
    }

    public function test_status_only_cancellation_survives_inactive_doctor_and_new_booking_rejects_inactive_department(): void
    {
        [$department, $doctor] = $this->doctor('availability-doctor@example.test');
        $patient = $this->patient('availability-patient@example.test');
        $appointment = Appointment::create([
            'patient_id' => $patient->id, 'doctor_id' => $doctor->id, 'department_id' => $department->id,
            'scheduled_at' => now()->addDay(), 'status' => 'confirmed',
        ]);
        $doctor->update(['status' => 'leave']);
        $department->update(['is_active' => false]);

        $this->actingAs($doctor->user, 'sanctum')->putJson("/api/appointments/{$appointment->id}", ['status' => 'cancelled'])
            ->assertOk()->assertJsonPath('status', 'cancelled');

        $doctor->update(['status' => 'active']);
        $this->actingAs($patient->user, 'sanctum')->postJson('/api/appointments', [
            'doctor_id' => $doctor->id, 'department_id' => $department->id,
            'scheduled_at' => now()->addDays(2)->toDateTimeString(),
        ])->assertUnprocessable();
    }

    private function doctor(string $email): array
    {
        $department = Department::create(['name' => 'Service '.fake()->unique()->numerify('###'), 'is_active' => true]);
        $user = $this->user('doctor', $email);
        $doctor = Doctor::create([
            'user_id' => $user->id, 'department_id' => $department->id,
            'license_number' => fake()->unique()->bothify('DOC-#####'), 'specialty' => 'Médecine', 'status' => 'active',
        ]);

        return [$department, $doctor];
    }

    private function patient(string $email): Patient
    {
        return Patient::create(['user_id' => $this->user('patient', $email)->id]);
    }

    private function user(string $role, string $email): User
    {
        $roleModel = Role::firstOrCreate(['name' => $role], ['label' => ucfirst($role)]);

        return User::create([
            'name' => ucfirst(strtok($email, '@')), 'email' => $email, 'password' => 'password123',
            'role_id' => $roleModel->id, 'is_active' => true, 'email_verified_at' => now(),
        ]);
    }
}
