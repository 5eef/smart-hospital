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
};
