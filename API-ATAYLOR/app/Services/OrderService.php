<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Models\DesignTicket;
use App\Models\MarketingCloser;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderService
{
    public function __construct(
        private AuditLogger $audit,
        private SequenceService $sequence,
    ) {
    }

    public function list(array $filters): Collection
    {
        $this->expireSlotLocks();

        return Order::query()
            ->with(['items.product', 'closer'])
            ->when($filters['q'] ?? null, function (Builder $q, string $term) {
                $like = '%'.mb_strtolower($term).'%';
                $q->where(function (Builder $w) use ($like) {
                    $w->whereRaw('lower(order_code) like ?', [$like])
                        ->orWhereRaw('lower(customer_name) like ?', [$like])
                        ->orWhereHas('closer', fn (Builder $c) => $c->whereRaw('lower(name) like ?', [$like]));
                });
            })
            ->when($filters['channel'] ?? null, fn (Builder $q, $v) => $q->where('channel', $v))
            ->when($filters['status'] ?? null, fn (Builder $q, $v) => $q->whereIn('status', (array) $v))
            ->when($filters['date_from'] ?? null, fn (Builder $q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($filters['date_to'] ?? null, fn (Builder $q, $v) => $q->whereDate('created_at', '<=', $v))
            ->latest()
            ->get();
    }

    public function find(string $id): Order
    {
        $this->expireSlotLocks();

        return Order::with([
            'items.product', 'closer', 'payments.verifier', 'payments.recorder',
            'designTicket.versions.approval', 'designTicket.designer',
            'spk', 'wipHistories.actor', 'qcRecords',
        ])->where(Str::isUuid($id) ? 'id' : 'order_code', $id)->firstOrFail();
    }

    /**
     * BR-01 antrean terpusat, BR-02 closer wajib offline, BR-10 DP per produk, BR-04 tiket desain otomatis.
     */
    public function create(array $data, User $actor): Order
    {
        if ($data['channel'] === 'offline') {
            if (empty($data['marketing_closer_id'])) {
                throw new BusinessRuleException('BR-02', 'Pesanan offline wajib mencantumkan Marketing Closer.');
            }
            $closerActive = MarketingCloser::whereKey($data['marketing_closer_id'])->where('is_active', true)->exists();
            if (! $closerActive) {
                throw new BusinessRuleException('BR-02', 'Marketing Closer tidak ditemukan atau tidak aktif.');
            }
        }

        $product = Product::find($data['product_id']);
        if (! $product || ! $product->is_active) {
            throw new BusinessRuleException('BR-20', 'Produk tidak ditemukan di katalog aktif.');
        }

        // MOQ berlaku untuk total qty semua ukuran & jenis lengan
        $totalQty = (int) collect($data['items'])->sum('qty');
        if ($totalQty < $product->moq) {
            throw new BusinessRuleException('MOQ', "Kuantitas minimal (MOQ) {$product->name} adalah {$product->moq} pcs (total saat ini {$totalQty} pcs).");
        }

        // Harga satuan dari katalog server; Admin boleh memasang harga custom per jenis lengan untuk pesanan ini.
        // Harga/subtotal per item yang dikirim browser tetap diabaikan.
        $customPrices = array_filter($data['custom_unit_prices'] ?? [], fn ($price) => $price !== null);
        $items = collect($data['items'])->map(function (array $item) use ($product, $data, $customPrices) {
            $unitPrice = (int) ($customPrices[$item['sleeve_type']] ?? $product->base_price);

            return [
                'product_id' => $product->id,
                'color' => $data['color'],
                'sleeve_type' => $item['sleeve_type'],
                'size' => $item['size'],
                'qty' => $item['qty'],
                'unit_price' => $unitPrice,
                'subtotal' => $unitPrice * $item['qty'],
            ];
        });

        $total = (int) $items->sum('subtotal');
        $dpRequired = (int) ceil($total * $product->dp_min_percent / 100);
        $slaHours = (int) $product->design_sla_hours;

        return DB::transaction(function () use ($data, $actor, $items, $total, $dpRequired, $slaHours, $customPrices, $product) {
            $order = Order::create([
                'order_code' => $this->sequence->nextOrderCode($actor->tenant_id),
                'customer_name' => $data['customer_name'],
                'customer_wa' => $data['customer_wa'],
                'channel' => $data['channel'],
                'marketing_closer_id' => $data['marketing_closer_id'] ?? null,
                'status' => 'brief_lengkap',
                'total_amount' => $total,
                'dp_required' => $dpRequired,
                'paid_amount' => 0,
                'remaining_balance' => $total,
                'due_date' => $data['due_date'],
                'slot_lock_status' => 'none',
                'notes' => $data['notes'] ?? null,
                'created_by' => $actor->id,
            ]);

            foreach ($items as $item) {
                $order->items()->create($item);
            }

            DesignTicket::create([
                'order_id' => $order->id,
                'status' => 'baru',
                'sla_due_at' => now()->addHours($slaHours),
            ]);

            $this->audit->log('ORDER_CREATED', $order, null, $order->only([
                'order_code', 'channel', 'marketing_closer_id', 'total_amount', 'dp_required',
            ]) + ($customPrices ? ['custom_unit_prices' => $customPrices, 'catalog_unit_price' => $product->base_price] : []));

            return $order;
        });
    }

    /**
     * BR-07: slot lock sementara yang lewat 24 jam dilepas otomatis.
     * Dipanggil oleh scheduler (orders:expire-slot-locks) dan juga sebelum pembacaan data.
     */
    public function expireSlotLocks(): int
    {
        $expired = Order::where('slot_lock_status', 'temp_24h')
            ->where('slot_lock_expires_at', '<', now())
            ->get();

        foreach ($expired as $order) {
            $old = $order->only(['status', 'slot_lock_status']);
            $order->update(['slot_lock_status' => 'expired', 'status' => 'kedaluwarsa']);
            $this->audit->log('SLOT_LOCK_EXPIRED', $order, $old, $order->only(['status', 'slot_lock_status']));
        }

        return $expired->count();
    }

    /**
     * Hitung ulang total pembayaran valid & sisa tagihan.
     */
    public function recalculatePayments(Order $order): void
    {
        $paid = (int) $order->payments()->where('status', 'valid')->sum('amount');
        $order->paid_amount = $paid;
        $order->remaining_balance = max(0, $order->total_amount - $paid);
        $order->save();
    }
}
