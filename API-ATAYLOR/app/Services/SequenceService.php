<?php

namespace App\Services;

use App\Models\Order;
use App\Models\SpkDocument;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Builder;

/**
 * Nomor dokumen unik per tenant. Dipanggil di dalam transaksi; baris tenant dikunci
 * agar dua request bersamaan tidak mendapat nomor yang sama.
 */
class SequenceService
{
    public function nextOrderCode(string $tenantId): string
    {
        $year = now()->year;
        Tenant::whereKey($tenantId)->lockForUpdate()->first();

        $prefix = "ORD-{$year}-";
        $next = $this->maxSuffix(Order::query(), 'order_code', $prefix) + 1;

        return $prefix.str_pad((string) $next, 3, '0', STR_PAD_LEFT);
    }

    public function nextSpkNumber(Tenant $tenant): string
    {
        $year = now()->year;
        Tenant::whereKey($tenant->id)->lockForUpdate()->first();

        $prefix = 'SPK-'.strtoupper($tenant->code)."-{$year}-";
        $next = $this->maxSuffix(SpkDocument::query(), 'spk_number', $prefix) + 1;

        return $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Angka urut terbesar setelah prefix, dibandingkan sebagai angka — bukan teks —
     * agar "ORD-2026-1000" tetap dianggap lebih besar dari "ORD-2026-999".
     */
    private function maxSuffix(Builder $query, string $column, string $prefix): int
    {
        $values = $query->where($column, 'like', $prefix.'%')->pluck($column);

        return (int) $values
            ->map(fn (string $v) => substr($v, strlen($prefix)))
            ->filter(fn (string $suffix) => ctype_digit($suffix))
            ->map(fn (string $suffix) => (int) $suffix)
            ->max();
    }
}
