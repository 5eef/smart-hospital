<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clinical_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->string('exam_name');
            $table->string('priority')->default('routine');
            $table->string('status')->default('requested');
            $table->text('instructions')->nullable();
            $table->text('result')->nullable();
            $table->timestamp('ordered_at');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['doctor_id', 'patient_id', 'type']);
            $table->index(['patient_id', 'status', 'ordered_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinical_orders');
    }
};
