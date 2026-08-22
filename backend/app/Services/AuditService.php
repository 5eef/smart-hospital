<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AuditService
{
    private const SENSITIVE_FIELDS = [
        'password', 'password_confirmation', 'token', 'diagnosis', 'allergies', 'treatments',
        'notes', 'instructions', 'result', 'reason',
    ];

    public function record(Request $request, string $action, ?Model $entity = null, array $changedFields = []): void
    {
        $fields = array_values(array_diff(array_unique($changedFields), self::SENSITIVE_FIELDS));

        AuditLog::create([
            'actor_user_id' => $request->user()?->id,
            'action' => $action,
            'entity_type' => $entity ? class_basename($entity) : null,
            'entity_id' => $entity?->getKey(),
            'metadata' => $fields === [] ? null : ['changed_fields' => $fields],
            'ip_address' => $request->ip(),
            'user_agent' => mb_substr((string) $request->userAgent(), 0, 500) ?: null,
        ]);
    }
}
