<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Pengaturan tenant yang diubah Owner.
 */
class TenantController extends Controller
{
    public function __construct(private AuditLogger $audit)
    {
    }

    /**
     * Sakelar High/Low Season (BR-21): `low_off` mematikan pesan WA otomatis tanpa menghapus data.
     */
    public function updateAutomationMode(Request $request): JsonResponse
    {
        $mode = $request->validate([
            'automation_mode' => ['required', Rule::in(['high_on', 'low_off'])],
        ])['automation_mode'];

        $tenant = $request->user()->tenant;
        $old = $tenant->automation_mode;

        if ($old !== $mode) {
            $tenant->update(['automation_mode' => $mode]);
            $this->audit->log('AUTOMATION_MODE_CHANGED', $tenant, ['automation_mode' => $old], ['automation_mode' => $mode]);
        }

        return response()->json([
            'automationMode' => $mode,
            'message' => $mode === 'high_on' ? 'WhatsApp otomatis diaktifkan.' : 'WhatsApp otomatis dinonaktifkan.',
        ]);
    }
}
