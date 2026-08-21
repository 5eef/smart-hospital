<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('doctors', function (Blueprint $table) {
            $table->unique('user_id');
            $table->index(['department_id', 'status']);
        });

        Schema::table('patients', function (Blueprint $table) {
            $table->unique('user_id');
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->index(['doctor_id', 'scheduled_at']);
            $table->index(['patient_id', 'scheduled_at']);
            $table->index(['status', 'scheduled_at']);
        });

        Schema::table('medical_records', function (Blueprint $table) {
            $table->index(['doctor_id', 'patient_id']);
        });
    }

    public function down(): void
    {
        // MySQL may remove a redundant single-column index when a composite
        // index with the same leading column is added. Recreate the indexes
        // required by foreign keys before dropping the composite/unique ones.
        $this->ensureForeignKeyIndex('medical_records', 'doctor_id');
        $this->ensureForeignKeyIndex('appointments', 'doctor_id');
        $this->ensureForeignKeyIndex('appointments', 'patient_id');
        $this->ensureForeignKeyIndex('patients', 'user_id');
        $this->ensureForeignKeyIndex('doctors', 'user_id');
        $this->ensureForeignKeyIndex('doctors', 'department_id');

        Schema::table('medical_records', function (Blueprint $table) {
            $table->dropIndex(['doctor_id', 'patient_id']);
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex(['doctor_id', 'scheduled_at']);
            $table->dropIndex(['patient_id', 'scheduled_at']);
            $table->dropIndex(['status', 'scheduled_at']);
        });

        Schema::table('patients', function (Blueprint $table) {
            $table->dropUnique(['user_id']);
        });

        Schema::table('doctors', function (Blueprint $table) {
            $table->dropUnique(['user_id']);
            $table->dropIndex(['department_id', 'status']);
        });
    }

    private function ensureForeignKeyIndex(string $tableName, string $column): void
    {
        $indexName = "{$tableName}_{$column}_foreign";

        if (Schema::hasIndex($tableName, $indexName)) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($column, $indexName) {
            $table->index($column, $indexName);
        });
    }
};
