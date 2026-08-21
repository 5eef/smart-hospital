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

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $roles = collect([
            ['name' => 'admin', 'label' => 'Administrateur'],
            ['name' => 'doctor', 'label' => 'Medecin'],
            ['name' => 'patient', 'label' => 'Patient'],
        ])->mapWithKeys(fn (array $role) => [$role['name'] => Role::updateOrCreate(['name' => $role['name']], $role)]);

        $cardiology = Department::updateOrCreate(['name' => 'Cardiologie'], ['description' => 'Soins cardiovasculaires complets.', 'is_active' => true]);
        $neurology = Department::updateOrCreate(['name' => 'Neurologie'], ['description' => 'Diagnostic et suivi neurologique.', 'is_active' => true]);
        Department::updateOrCreate(['name' => 'Pediatrie'], ['description' => 'Soins enfants et adolescents.', 'is_active' => true]);

        User::updateOrCreate(
            ['email' => 'admin@smarthospital.test'],
            ['name' => 'Admin User', 'role_id' => $roles['admin']->id, 'password' => 'password', 'is_active' => true]
        );

        $doctorUser = User::updateOrCreate(
            ['email' => 'doctor@smarthospital.test'],
            ['name' => 'Dr. Julian', 'role_id' => $roles['doctor']->id, 'password' => 'password', 'is_active' => true]
        );

        $doctor = Doctor::updateOrCreate(
            ['license_number' => 'DOC-12903'],
            ['user_id' => $doctorUser->id, 'department_id' => $cardiology->id, 'specialty' => 'Cardiologue', 'status' => 'active']
        );

        $patientUser = User::updateOrCreate(
            ['email' => 'patient@smarthospital.test'],
            ['name' => 'Khadija', 'role_id' => $roles['patient']->id, 'password' => 'password', 'is_active' => true]
        );

        $patient = Patient::updateOrCreate(
            ['user_id' => $patientUser->id],
            ['birth_date' => '1996-04-12', 'gender' => 'female', 'blood_group' => 'A+', 'address' => 'Casablanca', 'emergency_contact' => '+212 600 000 000']
        );

        Appointment::updateOrCreate(
            ['patient_id' => $patient->id, 'doctor_id' => $doctor->id, 'scheduled_at' => now()->addDay()->setTime(10, 30)->format('Y-m-d H:i:s')],
            ['department_id' => $cardiology->id, 'status' => 'confirmed', 'reason' => 'Consultation cardiologie', 'notes' => 'Premier controle.']
        );

        $record = MedicalRecord::updateOrCreate(
            ['patient_id' => $patient->id, 'doctor_id' => $doctor->id],
            ['diagnosis' => 'Suivi tension arterielle', 'allergies' => 'Aucune allergie connue', 'treatments' => 'Controle regulier', 'notes' => 'Patient stable.']
        );

        Prescription::updateOrCreate(
            ['medical_record_id' => $record->id, 'medication' => 'Vitamine D'],
            ['doctor_id' => $doctor->id, 'patient_id' => $patient->id, 'dosage' => '1000 UI', 'instructions' => 'Une prise par jour apres le repas.', 'issued_at' => now()]
        );

        $secondPatientUser = User::updateOrCreate(
            ['email' => 'patient2@smarthospital.test'],
            ['name' => 'Omar Alaoui', 'role_id' => $roles['patient']->id, 'password' => 'password', 'is_active' => true]
        );

        $secondPatient = Patient::updateOrCreate(
            ['user_id' => $secondPatientUser->id],
            ['birth_date' => '1988-09-20', 'gender' => 'male', 'blood_group' => 'O+', 'address' => 'Rabat']
        );

        Appointment::updateOrCreate(
            ['patient_id' => $secondPatient->id, 'doctor_id' => $doctor->id, 'scheduled_at' => now()->addDays(2)->setTime(14, 0)->format('Y-m-d H:i:s')],
            ['department_id' => $neurology->id, 'status' => 'pending', 'reason' => 'Controle general']
        );
    }
}
