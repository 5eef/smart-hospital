<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Department;
use App\Models\Doctor;
use App\Models\MedicalRecord;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use RuntimeException;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new RuntimeException('Demo data is forbidden outside local/testing environments.');
        }

        $cardiology = Department::updateOrCreate(['name' => 'Cardiologie'], ['description' => 'Soins cardiovasculaires complets.', 'is_active' => true]);
        Department::updateOrCreate(['name' => 'Neurologie'], ['description' => 'Diagnostic et suivi neurologique.', 'is_active' => true]);
        Department::updateOrCreate(['name' => 'Pédiatrie'], ['description' => 'Soins enfants et adolescents.', 'is_active' => true]);

        $this->demoUser('admin@smarthospital.test', 'Admin User', 'admin');
        $doctorUser = $this->demoUser('doctor@smarthospital.test', 'Dr. Julian', 'doctor');
        $patientUser = $this->demoUser('patient@smarthospital.test', 'Khadija', 'patient');
        $doctor = Doctor::updateOrCreate(['license_number' => 'DOC-12903'], [
            'user_id' => $doctorUser->id, 'department_id' => $cardiology->id, 'specialty' => 'Cardiologue', 'status' => 'active',
        ]);
        $patient = Patient::updateOrCreate(['user_id' => $patientUser->id], [
            'birth_date' => '1996-04-12', 'gender' => 'female', 'blood_group' => 'A+', 'address' => 'Casablanca',
        ]);
        Appointment::updateOrCreate(
            ['patient_id' => $patient->id, 'doctor_id' => $doctor->id, 'scheduled_at' => now()->addDay()->setTime(10, 30)->format('Y-m-d H:i:s')],
            ['department_id' => $cardiology->id, 'status' => 'confirmed', 'reason' => 'Consultation cardiologie']
        );
        $record = MedicalRecord::updateOrCreate(['patient_id' => $patient->id, 'doctor_id' => $doctor->id], [
            'diagnosis' => 'Suivi tension artérielle', 'notes' => 'Patient stable.',
        ]);
        Prescription::updateOrCreate(['medical_record_id' => $record->id, 'medication' => 'Vitamine D'], [
            'doctor_id' => $doctor->id, 'patient_id' => $patient->id, 'dosage' => '1000 UI', 'issued_at' => now(),
        ]);
    }

    private function demoUser(string $email, string $name, string $role): User
    {
        return User::updateOrCreate(['email' => $email], [
            'name' => $name,
            'role_id' => Role::where('name', $role)->value('id'),
            'password' => Str::random(64),
            'email_verified_at' => now(),
            'is_active' => true,
        ]);
    }
}
