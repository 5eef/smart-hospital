<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClinicalOrder extends Model
{
    protected $fillable = [
        'patient_id',
        'doctor_id',
        'type',
        'exam_name',
        'priority',
        'status',
        'instructions',
        'result',
        'ordered_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'ordered_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }
}
