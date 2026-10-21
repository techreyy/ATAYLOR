<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Payment;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class ExecutiveService
{
    /** Status yang dihitung sebagai omzet terkonfirmasi (DP sudah valid & kuota permanen). */
    public const CONFIRMED_STATUSES = ['pembayaran_valid', 'spk_terbit', 'produksi', 'menunggu_pelunasan', 'selesai'];

    public function summary(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $period = fn ($q) => $q->whereBetween('orders.created_at', [$from->startOfDay(), $to->endOfDay()]);

        $orders = Order::query()->tap($period)->where('status', '!=', 'dibatalkan');
        $confirmed = Order::query()->tap($period)->whereIn('status', self::CONFIRMED_STATUSES);

        $channels = (clone $orders)
            ->select('channel', DB::raw('count(*) as orders'))
            ->groupBy('channel')->pluck('orders', 'channel');
        $channelRevenue = (clone $confirmed)
            ->select('channel', DB::raw('sum(total_amount) as revenue'))
            ->groupBy('channel')->pluck('revenue', 'channel');

        $statusDistribution = (clone $orders)
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')->pluck('total', 'status');

        // Bottleneck = posisi WIP saat ini (snapshot, tidak dibatasi periode)
        $wip = Order::whereNotNull('wip_stage')
            ->whereIn('status', ['spk_terbit', 'produksi'])
            ->select('wip_stage', DB::raw('count(*) as total'))
            ->groupBy('wip_stage')->pluck('total', 'wip_stage');
        $wipStages = collect(Order::WIP_STAGES)->mapWithKeys(fn ($s) => [$s => (int) ($wip[$s] ?? 0)]);
        $bottleneck = $wipStages->sum() > 0 ? $wipStages->sortDesc()->keys()->first() : null;

        $daily = (clone $confirmed)
            ->select(DB::raw("to_char(created_at, 'YYYY-MM-DD') as day"), DB::raw('sum(total_amount) as revenue'), DB::raw('count(*) as orders'))
            ->groupBy('day')->orderBy('day')->get()
            ->map(fn ($r) => ['date' => $r->day, 'revenue' => (int) $r->revenue, 'orders' => (int) $r->orders]);

        $leaderboard = (clone $confirmed)
            ->join('marketing_closers', 'marketing_closers.id', '=', 'orders.marketing_closer_id')
            ->select('marketing_closers.id', 'marketing_closers.name', DB::raw('count(orders.id) as orders'), DB::raw('sum(orders.total_amount) as revenue'))
            ->groupBy('marketing_closers.id', 'marketing_closers.name')
            ->orderByDesc('revenue')->get()
            ->map(fn ($r) => ['closerId' => $r->id, 'name' => $r->name, 'orders' => (int) $r->orders, 'revenue' => (int) $r->revenue]);

        $cashIn = (int) Payment::where('status', 'valid')
            ->whereBetween('verified_at', [$from->startOfDay(), $to->endOfDay()])
            ->sum('amount');

        return [
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'generatedAt' => now()->toIso8601String(),
            'kpi' => [
                'revenue' => (int) (clone $confirmed)->sum('total_amount'),
                'cashIn' => $cashIn,
                'totalOrders' => (clone $orders)->count(),
                'confirmedOrders' => (clone $confirmed)->count(),
                'outstanding' => (int) (clone $confirmed)->sum('remaining_balance'),
            ],
            'channels' => collect(['online', 'offline'])->map(fn ($c) => [
                'channel' => $c,
                'orders' => (int) ($channels[$c] ?? 0),
                'revenue' => (int) ($channelRevenue[$c] ?? 0),
            ])->values(),
            'statusDistribution' => $statusDistribution->map(fn ($v) => (int) $v),
            'wipStages' => $wipStages,
            'bottleneckStage' => $bottleneck,
            'dailyRevenue' => $daily,
            'closerLeaderboard' => $leaderboard,
            'definitions' => [
                'revenue' => 'Omzet = total nilai pesanan yang DP-nya sudah divalidasi (status pembayaran_valid s.d. selesai), berdasarkan tanggal pesanan dibuat.',
                'cashIn' => 'Kas masuk = jumlah pembayaran berstatus valid berdasarkan tanggal validasi kasir.',
                'outstanding' => 'Piutang = sisa tagihan pesanan terkonfirmasi.',
                'bottleneck' => 'Tahap WIP dengan jumlah pesanan aktif terbanyak saat ini.',
                'commission' => 'Komisi marketing belum dihitung: rumusnya belum disetujui Owner (MOCK).',
            ],
        ];
    }

    /**
     * Baris CSV rekap pesanan dalam periode.
     */
    public function csvRows(CarbonImmutable $from, CarbonImmutable $to): \Generator
    {
        yield ['Order Code', 'Tanggal', 'Pelanggan', 'Kanal', 'Marketing Closer', 'Status', 'Tahap WIP', 'Total (Rp)', 'Dibayar (Rp)', 'Sisa (Rp)', 'Tenggat'];

        $orders = Order::with('closer')
            ->whereBetween('created_at', [$from->startOfDay(), $to->endOfDay()])
            ->orderBy('created_at')
            ->cursor();

        foreach ($orders as $o) {
            yield [
                $o->order_code,
                $o->created_at->toDateString(),
                $o->customer_name,
                $o->channel,
                $o->closer?->name ?? '-',
                $o->status,
                $o->wip_stage ?? '-',
                $o->total_amount,
                $o->paid_amount,
                $o->remaining_balance,
                $o->due_date->toDateString(),
            ];
        }
    }
}
