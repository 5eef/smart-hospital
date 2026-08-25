<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('invitation_status', 20)->nullable()->after('is_active');
            $table->timestamp('invitation_sent_at')->nullable()->after('invitation_status');
        });

        Schema::table('medical_records', fn (Blueprint $table) => $table->unsignedInteger('version')->default(1)->after('archived_at'));
        Schema::table('prescriptions', fn (Blueprint $table) => $table->unsignedInteger('version')->default(1)->after('archived_at'));
        Schema::table('clinical_orders', fn (Blueprint $table) => $table->unsignedInteger('version')->default(1)->after('completed_at'));

        $this->replaceForeignKey('doctors', 'user_id', 'users');
        $this->replaceForeignKey('patients', 'user_id', 'users');
        $this->replaceForeignKey('appointments', 'patient_id', 'patients');
        $this->replaceForeignKey('appointments', 'doctor_id', 'doctors');
        $this->replaceForeignKey('medical_records', 'patient_id', 'patients');
        $this->replaceForeignKey('medical_records', 'doctor_id', 'doctors');
        $this->replaceForeignKey('prescriptions', 'medical_record_id', 'medical_records');
        $this->replaceForeignKey('prescriptions', 'patient_id', 'patients');
        $this->replaceForeignKey('prescriptions', 'doctor_id', 'doctors');
        $this->replaceForeignKey('clinical_orders', 'patient_id', 'patients');
        $this->replaceForeignKey('clinical_orders', 'doctor_id', 'doctors');

        $this->addIndex('appointments', ['doctor_id', 'status', 'scheduled_at'], 'appointments_doctor_status_scheduled_index');
        $this->addIndex('appointments', ['patient_id', 'status', 'scheduled_at'], 'appointments_patient_status_scheduled_index');
        $this->addIndex('appointments', ['department_id', 'scheduled_at'], 'appointments_department_scheduled_index');
        $this->addIndex('medical_records', ['doctor_id', 'archived_at', 'created_at'], 'medical_records_doctor_archive_created_index');
        $this->addIndex('medical_records', ['patient_id', 'archived_at', 'created_at'], 'medical_records_patient_archive_created_index');
        $this->addIndex('prescriptions', ['medical_record_id', 'archived_at'], 'prescriptions_record_archive_index');
        $this->addIndex('prescriptions', ['patient_id', 'archived_at', 'created_at'], 'prescriptions_patient_archive_created_index');
        $this->addIndex('notifications', ['user_id', 'read_at', 'created_at'], 'notifications_user_read_created_index');
        $this->addIndex('audit_logs', ['actor_user_id', 'created_at'], 'audit_logs_actor_created_index');
        $this->addIndex('audit_logs', ['created_at'], 'audit_logs_created_index');
    }

    public function down(): void
    {
        $this->dropIndex('audit_logs', 'audit_logs_created_index');
        $this->dropIndex('audit_logs', 'audit_logs_actor_created_index');
        $this->dropIndex('notifications', 'notifications_user_read_created_index');
        $this->dropIndex('prescriptions', 'prescriptions_patient_archive_created_index');
        $this->dropIndex('prescriptions', 'prescriptions_record_archive_index');
        $this->dropIndex('medical_records', 'medical_records_patient_archive_created_index');
        $this->dropIndex('medical_records', 'medical_records_doctor_archive_created_index');
        $this->dropIndex('appointments', 'appointments_department_scheduled_index');
        $this->dropIndex('appointments', 'appointments_patient_status_scheduled_index');
        $this->dropIndex('appointments', 'appointments_doctor_status_scheduled_index');

        $this->restoreForeignKey('doctors', 'user_id', 'users', 'cascade');
        $this->restoreForeignKey('patients', 'user_id', 'users', 'cascade');
        $this->restoreForeignKey('appointments', 'patient_id', 'patients', 'cascade');
        $this->restoreForeignKey('appointments', 'doctor_id', 'doctors', 'cascade');
        $this->restoreForeignKey('medical_records', 'patient_id', 'patients', 'cascade');
        $this->restoreForeignKey('medical_records', 'doctor_id', 'doctors', 'set null');
        $this->restoreForeignKey('prescriptions', 'medical_record_id', 'medical_records', 'cascade');
        $this->restoreForeignKey('prescriptions', 'patient_id', 'patients', 'cascade');
        $this->restoreForeignKey('prescriptions', 'doctor_id', 'doctors', 'cascade');
        $this->restoreForeignKey('clinical_orders', 'patient_id', 'patients', 'cascade');
        $this->restoreForeignKey('clinical_orders', 'doctor_id', 'doctors', 'cascade');

        Schema::table('clinical_orders', fn (Blueprint $table) => $table->dropColumn('version'));
        Schema::table('prescriptions', fn (Blueprint $table) => $table->dropColumn('version'));
        Schema::table('medical_records', fn (Blueprint $table) => $table->dropColumn('version'));
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn(['invitation_status', 'invitation_sent_at']));
    }

    private function replaceForeignKey(string $tableName, string $column, string $references): void
    {
        Schema::table($tableName, function (Blueprint $table) use ($column, $references) {
            $table->dropForeign([$column]);
            $table->foreign($column)->references('id')->on($references)->restrictOnDelete();
        });
    }

    private function restoreForeignKey(string $tableName, string $column, string $references, string $onDelete): void
    {
        Schema::table($tableName, function (Blueprint $table) use ($column, $references, $onDelete) {
            $table->dropForeign([$column]);
            $table->foreign($column)->references('id')->on($references)->onDelete($onDelete);
        });
    }

    private function dropIndex(string $tableName, string $name): void
    {
        if (Schema::hasIndex($tableName, $name)) {
            Schema::table($tableName, fn (Blueprint $table) => $table->dropIndex($name));
        }
    }

    /** @param list<string> $columns */
    private function addIndex(string $tableName, array $columns, string $name): void
    {
        if (! Schema::hasIndex($tableName, $name)) {
            Schema::table($tableName, fn (Blueprint $table) => $table->index($columns, $name));
        }
    }
};
