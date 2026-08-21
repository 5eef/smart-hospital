<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HospitalApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_patient_appointment_is_scoped_to_the_authenticated_patient_and_conflicts_are_rejected(): void
    {
        [$department, $doctor] = $this->createDoctor();
        $patient = $this->createPatient('patient-one@example.test');
        $otherPatient = $this->createPatient('patient-two@example.test');
        $scheduledAt = now()->addDay()->setTime(10, 0)->toDateTimeString();

        $payload = [
            'patient_id' => $otherPatient->id,
            'doctor_id' => $doctor->id,
            'department_id' => $department->id,
            'scheduled_at' => $scheduledAt,
            'reason' => 'Contrôle',
        ];

        $this->actingAs($patient->user, 'sanctum')->postJson('/api/appointments', $payload)
            ->assertCreated()
            ->assertJsonPath('patient_id', $patient->id)
            ->assertJsonPath('status', 'pending');

        $this->actingAs($patient->user, 'sanctum')->postJson('/api/appointments', $payload)
            ->assertUnprocessable()
            ->assertJsonStructure(['message']);
    }

    public function test_doctor_cannot_create_a_medical_record_for_an_unassigned_patient(): void
    {
        [, $doctor] = $this->createDoctor();
        $patient = $this->createPatient('unassigned@example.test');

        $this->actingAs($doctor->user, 'sanctum')->postJson('/api/medical-records', [
            'patient_id' => $patient->id,
            'diagnosis' => 'Observation',
        ])->assertForbidden();
    }

    public function test_admin_lists_resources_with_bounded_paginated_metadata(): void
    {
        $admin = $this->createUser('admin', 'admin@example.test');
        $this->createPatient('one@example.test');
        $this->createPatient('two@example.test');

        $this->actingAs($admin, 'sanctum')->getJson('/api/patients?per_page=1')
            ->assertOk()
            ->assertJsonPath('per_page', 1)
            ->assertJsonPath('total', 2)
            ->assertJsonCount(1, 'data');
    }

    private function createDoctor(): array
    {
        $department = Department::create(['name' => 'Cardiologie', 'is_active' => true]);
        $user = $this->createUser('doctor', 'doctor@example.test');
        $doctor = Doctor::create([
            'user_id' => $user->id,
            'department_id' => $department->id,
            'license_number' => 'DOC-001',
            'specialty' => 'Cardiologue',
            'status' => 'active',
        ]);

        return [$department, $doctor];
    }

    private function createPatient(string $email): Patient
    {
        return Patient::create(['user_id' => $this->createUser('patient', $email)->id]);
    }

    private function createUser(string $roleName, string $email): User
    {
        $role = Role::firstOrCreate(['name' => $roleName], ['label' => ucfirst($roleName)]);

        return User::create([
            'name' => ucfirst(strtok($email, '@')),
            'email' => $email,
            'password' => 'password123',
            'role_id' => $role->id,
            'is_active' => true,
        ]);
    }
}
