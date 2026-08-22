<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            ['name' => 'admin', 'label' => 'Administrateur'],
            ['name' => 'doctor', 'label' => 'Médecin'],
            ['name' => 'patient', 'label' => 'Patient'],
        ] as $role) {
            Role::updateOrCreate(['name' => $role['name']], $role);
        }
    }
}
