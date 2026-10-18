<?php

namespace App\Services;

use App\Models\OrderItem;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Pola pesanan yang dipelajari AI dari SEMUA pesanan (online & input manual Admin — satu antrean, BR-01).
 * Hanya angka agregat: tanpa nama/nomor pelanggan, sehingga aman dipakai sebagai konteks chatbot.
 * Angka mengikat (harga, jadwal) tetap diambil dari katalog & mesin lead time, bukan dari sini.
 */
class OrderInsightsService
{
    public function summary(int $days): array
    {
        $from = CarbonImmutable::now()->subDays($days)->startOfDay();
        $orders = DB::table('orders')->where('created_at', '>=', $from)->where('status', '!=', 'dibatalkan');
        $items = DB::table('order_items')->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.created_at', '>=', $from)->where('orders.status', '!=', 'dibatalkan');

        $channels = (clone $orders)->select('channel', DB::raw('count(*) as total'))->groupBy('channel')->pluck('total', 'channel');
        $totalOrders = (int) $channels->sum();
        $totalPcs = (int) (clone $items)->sum('order_items.qty');

        $repeatCustomers = DB::table(
            (clone $orders)->select('customer_wa')->groupBy('customer_wa')->havingRaw('count(*) >= 2'), 'repeat'
        )->count();

        // Lama produksi nyata: SPK terbit → tiba di gudang (riwayat WIP)
        $durations = DB::table('spk_documents')
            ->join('orders', 'orders.id', '=', 'spk_documents.order_id')
            ->join('wip_histories', fn ($j) => $j->on('wip_histories.order_id', '=', 'orders.id')->where('wip_histories.to_stage', 'tiba_di_gudang'))
            ->where('orders.created_at', '>=', $from)
            ->select('orders.id as order_id', DB::raw('extract(epoch from (max(wip_histories.created_at) - spk_documents.issued_at)) / 86400 as days'))
            ->groupBy('orders.id', 'spk_documents.issued_at');
        $durationByProduct = DB::table('order_items')
            ->joinSub($durations, 'd', 'd.order_id', '=', 'order_items.order_id')
            ->select('order_items.product_id', DB::raw('avg(d.days) as days'), DB::raw('count(distinct d.order_id) as samples'))
            ->groupBy('order_items.product_id')->get()->keyBy('product_id');

        $products = (clone $items)
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->select('products.id', 'products.name', 'products.std_duration_days',
                DB::raw('count(distinct orders.id) as orders'), DB::raw('sum(order_items.qty) as pcs'), DB::raw('sum(order_items.subtotal) as revenue'))
            ->groupBy('products.id', 'products.name', 'products.std_duration_days')
            ->orderByDesc('pcs')->get()
            ->map(function ($p) use ($durationByProduct) {
                $d = $durationByProduct->get($p->id);

                return [
                    'productId' => $p->id,
                    'name' => $p->name,
                    'orders' => (int) $p->orders,
                    'pcs' => (int) $p->pcs,
                    'revenue' => (int) $p->revenue,
                    'avgPcsPerOrder' => $p->orders ? (int) round($p->pcs / $p->orders) : 0,
                    'stdDurationDays' => (int) $p->std_duration_days,
                    'actualDurationDays' => $d ? round((float) $d->days, 1) : null,
                    'durationSamples' => $d ? (int) $d->samples : 0,
                ];
            });

        $sizeRows = (clone $items)->select('order_items.size', DB::raw('sum(order_items.qty) as pcs'))->groupBy('order_items.size')->pluck('pcs', 'size');
        $sizes = collect(OrderItem::SIZES)->merge($sizeRows->keys()->diff(OrderItem::SIZES))
            ->map(fn ($s) => ['size' => $s, 'pcs' => (int) ($sizeRows[$s] ?? 0)])->values();
        $sleeveRows = (clone $items)->select('order_items.sleeve_type', DB::raw('sum(order_items.qty) as pcs'))->groupBy('order_items.sleeve_type')->pluck('pcs', 'sleeve_type');
        $sleeves = collect(OrderItem::SLEEVE_TYPES)->map(fn ($s) => ['sleeveType' => $s, 'pcs' => (int) ($sleeveRows[$s] ?? 0)])->values();

        $summary = [
            'orders' => $totalOrders,
            'offline' => (int) ($channels['offline'] ?? 0),
            'online' => (int) ($channels['online'] ?? 0),
            'pcs' => $totalPcs,
            'avgPcsPerOrder' => $totalOrders ? (int) round($totalPcs / $totalOrders) : 0,
            'repeatCustomers' => $repeatCustomers,
        ];

        return [
            'periodDays' => $days,
            'from' => $from->toDateString(),
            'summary' => $summary,
            'products' => $products->values(),
            'sizes' => $sizes,
            'sleeves' => $sleeves,
            'facts' => $this->facts($summary, $products->all(), $sizes->all(), $sleeves->all()),
        ];
    }

    /** Kalimat ringkas yang nanti diberikan ke chatbot sebagai konteks toko. */
    private function facts(array $s, array $products, array $sizes, array $sleeves): array
    {
        if ($s['orders'] === 0) {
            return ['Belum ada pesanan pada periode ini.'];
        }

        $facts = ["{$s['orders']} pesanan ({$s['offline']} input manual di toko, {$s['online']} online), total {$s['pcs']} pcs, rata-rata {$s['avgPcsPerOrder']} pcs per pesanan."];
        if ($top = $products[0] ?? null) {
            $facts[] = "Produk paling laku: {$top['name']} ({$top['pcs']} pcs dari {$top['orders']} pesanan, rata-rata {$top['avgPcsPerOrder']} pcs).";
        }
        $ranked = collect($sizes)->where('pcs', '>', 0)->sortByDesc('pcs')->take(3)->pluck('size')->all();
        if ($ranked) {
            $facts[] = 'Ukuran paling sering dipesan: '.implode(', ', $ranked).'.';
        }
        $sleeveTotal = array_sum(array_column($sleeves, 'pcs'));
        if ($sleeveTotal > 0) {
            $long = collect($sleeves)->firstWhere('sleeveType', 'panjang')['pcs'];
            $facts[] = 'Lengan panjang '.round($long / $sleeveTotal * 100).'% dari total pcs.';
        }
        foreach ($products as $p) {
            if ($p['actualDurationDays'] !== null && $p['actualDurationDays'] > $p['stdDurationDays']) {
                $facts[] = "Produksi {$p['name']} rata-rata {$p['actualDurationDays']} hari, lebih lama dari standar {$p['stdDurationDays']} hari — jangan menjanjikan lebih cepat.";
            }
        }
        if ($s['repeatCustomers'] > 0) {
            $facts[] = "{$s['repeatCustomers']} pelanggan memesan lebih dari sekali — sapa sebagai pelanggan lama.";
        }

        return $facts;
    }
}
