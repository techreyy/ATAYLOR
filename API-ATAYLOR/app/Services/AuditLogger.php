<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;

class AuditLogger
{
    public function log(string $action, Model $entity, ?array $old = null, ?array $new = null): void
    {
        $request = request();

        AuditLog::create([
            'tenant_id' => $entity->tenant_id ?? null,
            'actor_id' => $request?->user()?->id,
            'action' => $action,
            'entity_type' => class_basename($entity),
            'entity_id' => $entity->getKey(),
            'old_values' => $old,
            'new_values' => $new,
            'correlation_id' => $request?->attributes->get('correlation_id'),
        ]);
    }
}
