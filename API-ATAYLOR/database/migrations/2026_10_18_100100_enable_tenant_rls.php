<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Row-Level Security PostgreSQL (AI_GUA.md §1, BR-26).
     * Server mengisi `app.tenant_id` per request dari user yang login (SetTenantContext).
     * `app.rls_bypass = on` hanya dipakai proses sistem (seeder, scheduler), bukan request user.
     * FORCE dipakai agar pemilik tabel (role aplikasi) tetap terkena policy.
     */
    public const TABLES = [
        'marketing_closers', 'products', 'product_variants', 'inventory_balances', 'stock_ledger',
        'orders', 'order_items', 'inventory_reservations', 'payments', 'design_tickets',
        'design_versions', 'design_approvals', 'wip_histories', 'spk_documents', 'qc_records', 'audit_logs',
    ];

    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        $predicate = "tenant_id::text = current_setting('app.tenant_id', true) OR current_setting('app.rls_bypass', true) = 'on'";

        foreach (self::TABLES as $table) {
            DB::statement("ALTER TABLE {$table} ENABLE ROW LEVEL SECURITY");
            DB::statement("ALTER TABLE {$table} FORCE ROW LEVEL SECURITY");
            DB::statement("CREATE POLICY tenant_isolation ON {$table} USING ({$predicate}) WITH CHECK ({$predicate})");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach (self::TABLES as $table) {
            DB::statement("DROP POLICY IF EXISTS tenant_isolation ON {$table}");
            DB::statement("ALTER TABLE {$table} NO FORCE ROW LEVEL SECURITY");
            DB::statement("ALTER TABLE {$table} DISABLE ROW LEVEL SECURITY");
        }
    }
};
