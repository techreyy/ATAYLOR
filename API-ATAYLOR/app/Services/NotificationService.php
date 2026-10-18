<?php

namespace App\Services;

use App\Models\DesignTicket;
use App\Models\Order;
use App\Models\Payment;
use App\Models\SpkDocument;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Notifikasi "yang perlu ditindaklanjuti" dihitung langsung dari data saat ini (tanpa tabel sendiri):
 * item hilang dengan sendirinya setelah pekerjaannya selesai. Isi disesuaikan dengan peran.
 */
class NotificationService
{
    private const ROLE_TYPES = [
        'admin' => ['payment_pending', 'slot_lock_expiring', 'ready_for_spk', 'design_sla', 'overdue', 'awaiting_settlement'],
        'owner' => ['overdue', 'spk_not_dispatched', 'awaiting_settlement'],
        'manager' => ['overdue', 'spk_not_dispatched'],
        'designer' => ['design_sla'],
        'super_admin' => [],
    ];

    private const SEVERITY_ORDER = ['danger' => 0, 'warning' => 1, 'info' => 2];

    /** Status yang tidak lagi perlu dikejar tenggatnya. */
    private const CLOSED_STATUSES = ['selesai', 'dibatalkan', 'kedaluwarsa'];

    public function __construct(private OrderService $orders, private SpkService $spk)
    {
    }

    public function forUser(User $user): array
    {
        $this->orders->expireSlotLocks(); // BR-07: slot yang sudah lewat tidak ditampilkan sebagai "segera berakhir"

        $items = collect(self::ROLE_TYPES[$user->role] ?? [])
            ->flatMap(fn (string $type) => match ($type) {
                'payment_pending' => $this->collectPaymentPending(),
                'slot_lock_expiring' => $this->collectSlotLockExpiring(),
                'ready_for_spk' => $this->collectReadyForSpk(),
                'design_sla' => $this->collectDesignSla(),
                'overdue' => $this->collectOverdue(),
                'awaiting_settlement' => $this->collectAwaitingSettlement(),
                'spk_not_dispatched' => $this->collectSpkNotDispatched(),
            })
            ->sortBy([fn ($a, $b) => self::SEVERITY_ORDER[$a['severity']] <=> self::SEVERITY_ORDER[$b['severity']], fn ($a, $b) => strcmp($b['at'], $a['at'])])
            ->values();

        return [
            'items' => $items->take(30)->all(),
            'total' => $items->count(),
            'urgent' => $items->where('severity', 'danger')->count(),
        ];
    }

    private function collectPaymentPending(): Collection
    {
        return Payment::with('order')->where('status', 'pending')->latest()->get()
            ->map(fn (Payment $p) => $this->item('payment_pending', $p->id, 'warning', 'Pembayaran menunggu validasi',
                'Rp '.number_format($p->amount, 0, ',', '.').' ('.($p->method === 'cash' ? 'tunai' : 'transfer').') — '.$p->order->customer_name,
                $p->order, $p->created_at));
    }

    private function collectSlotLockExpiring(): Collection
    {
        return Order::where('slot_lock_status', 'temp_24h')->where('slot_lock_expires_at', '>', now())->get()
            ->map(function (Order $o) {
                $hours = (int) ceil(now()->diffInMinutes($o->slot_lock_expires_at) / 60);

                return $this->item('slot_lock_expiring', $o->id, $hours <= 6 ? 'danger' : 'warning', 'Slot lock 24 jam segera berakhir',
                    "Sisa ± {$hours} jam — DP belum divalidasi, kuota dilepas otomatis (BR-07).", $o, $o->slot_lock_expires_at);
            });
    }

    private function collectReadyForSpk(): Collection
    {
        return Order::with('designTicket')->where('status', 'pembayaran_valid')->doesntHave('spk')->get()
            ->filter(fn (Order $o) => ! in_array(false, $this->spk->gate($o), true))
            ->map(fn (Order $o) => $this->item('ready_for_spk', $o->id, 'info', 'Siap terbitkan SPK',
                'Desain ACC, DP valid, dan kuota terkunci — SPK Final bisa diterbitkan.', $o, $o->updated_at));
    }

    private function collectDesignSla(): Collection
    {
        return DesignTicket::with('order')
            ->whereIn('status', ['baru', 'dikerjakan', 'revisi'])
            ->whereNotNull('sla_due_at')
            ->where('sla_due_at', '<', now()->addHours(3))
            ->whereHas('order', fn ($q) => $q->whereNotIn('status', self::CLOSED_STATUSES))
            ->get()
            ->map(function (DesignTicket $t) {
                $late = $t->sla_due_at->isPast();

                return $this->item('design_sla', $t->id, $late ? 'danger' : 'warning',
                    $late ? 'SLA desain terlewat' : 'SLA desain hampir habis',
                    ($late ? 'Batas ' : 'Sisa waktu sampai ').$t->sla_due_at->format('d/m H:i').' — tiket '.str_replace('_', ' ', $t->status).'.',
                    $t->order, $t->sla_due_at);
            });
    }

    private function collectOverdue(): Collection
    {
        return Order::whereDate('due_date', '<', now()->toDateString())->whereNotIn('status', self::CLOSED_STATUSES)->get()
            ->map(fn (Order $o) => $this->item('overdue', $o->id, 'danger', 'Pesanan lewat tenggat',
                'Tenggat '.$o->due_date->format('d/m/Y').' — '.$o->customer_name.'.', $o, $o->due_date));
    }

    private function collectAwaitingSettlement(): Collection
    {
        return Order::where('status', 'menunggu_pelunasan')->get()
            ->map(fn (Order $o) => $this->item('awaiting_settlement', $o->id, 'info', 'Menunggu pelunasan',
                'Barang sudah di gudang; sisa tagihan Rp '.number_format($o->remaining_balance, 0, ',', '.').' (BR-11).', $o, $o->updated_at));
    }

    private function collectSpkNotDispatched(): Collection
    {
        return SpkDocument::with('order')->whereNull('dispatched_at')
            ->whereHas('order', fn ($q) => $q->whereNotIn('status', self::CLOSED_STATUSES))
            ->get()
            ->map(fn (SpkDocument $s) => $this->item('spk_not_dispatched', $s->id, 'warning', 'SPK belum diserahkan ke vendor',
                "{$s->spk_number} — isi data dispatch vendor (BR-27).", $s->order, $s->issued_at));
    }

    private function item(string $type, string $sourceId, string $severity, string $title, string $message, Order $order, ?CarbonInterface $at): array
    {
        return [
            'id' => "{$type}:{$sourceId}",
            'type' => $type,
            'severity' => $severity,
            'title' => $title,
            'message' => $message,
            'orderCode' => $order->order_code,
            'href' => $type === 'spk_not_dispatched' ? '/production/spk' : "/orders/{$order->order_code}",
            'at' => $at?->toIso8601String() ?? '',
        ];
    }
}
