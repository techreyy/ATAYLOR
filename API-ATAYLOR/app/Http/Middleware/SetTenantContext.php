<?php

namespace App\Http\Middleware;

use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class SetTenantContext
{
    public function __construct(private TenantContext $context)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! $user->is_active) {
            return response()->json(['message' => 'Akun tidak aktif.'], 403);
        }

        $this->context->set($user?->tenant_id);

        // correlation_id untuk audit_logs (§5.5)
        $correlationId = $request->header('X-Correlation-Id');
        if (! $correlationId || ! Str::isUuid($correlationId)) {
            $correlationId = (string) Str::uuid();
        }
        $request->attributes->set('correlation_id', $correlationId);

        $response = $next($request);
        $response->headers->set('X-Correlation-Id', $correlationId);

        return $response;
    }
}
