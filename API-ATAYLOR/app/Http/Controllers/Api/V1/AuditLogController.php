<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;

class AuditLogController extends Controller
{
    public function index(): JsonResponse
    {
        $logs = AuditLog::with('actor:id,name,role')->latest()->limit(200)->get()->map(fn (AuditLog $log) => [
            'id' => $log->id,
            'actorName' => $log->actor ? "{$log->actor->name} ({$log->actor->role})" : 'Sistem',
            'action' => $log->action,
            'entityType' => $log->entity_type,
            'entityId' => $log->entity_id,
            'oldValues' => $log->old_values,
            'newValues' => $log->new_values,
            'correlationId' => $log->correlation_id,
            'createdAt' => $log->created_at?->toIso8601String(),
        ]);

        return response()->json(['data' => $logs]);
    }
}
