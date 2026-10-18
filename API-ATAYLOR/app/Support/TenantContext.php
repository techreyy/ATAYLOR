<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Menyimpan tenant aktif untuk request ini dan menyinkronkannya ke session PostgreSQL (RLS).
 */
class TenantContext
{
    private ?string $tenantId = null;

    public function set(?string $tenantId): void
    {
        $this->tenantId = $tenantId;

        if (DB::getDriverName() === 'pgsql') {
            DB::select("select set_config('app.tenant_id', ?, false)", [$tenantId ?? '']);
        }
    }

    public function id(): ?string
    {
        return $this->tenantId;
    }

    /**
     * Jalankan callback sebagai proses sistem (seeder/scheduler) yang boleh melihat semua tenant.
     */
    public function bypass(callable $callback): mixed
    {
        if (DB::getDriverName() !== 'pgsql') {
            return $callback();
        }

        DB::select("select set_config('app.rls_bypass', 'on', false)");

        try {
            return $callback();
        } finally {
            DB::select("select set_config('app.rls_bypass', 'off', false)");
        }
    }
}
