<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Models\Order;
use App\Models\SpkDocument;
use App\Models\User;
use App\Models\WipHistory;
use Illuminate\Support\Facades\DB;

class SpkService
{
    public function __construct(
        private AuditLogger $audit,
        private SequenceService $sequence,
    ) {
    }

    /**
     * Prasyarat SPK Final (BR-09, BR-05). Dipakai juga oleh UI untuk menampilkan checklist gate.
     */
    public function gate(Order $order): array
    {
        $hasValidPayment = $order->payments()->where('status', 'valid')->exists();

        return [
            'payment_valid' => $hasValidPayment && $order->paid_amount >= $order->dp_required,
            'slot_permanent' => $order->slot_lock_status === 'permanent',
            'design_approved' => $order->designTicket?->versions()->whereHas('approval')->exists() ?? false,
            'not_issued' => ! $order->spk()->exists(),
        ];
    }

    /**
     * Admin menerbitkan SPK Final bernomor unik (BR-09, BR-27). Pesanan masuk kolom Antrean Kanban.
     */
    public function issue(Order $order, User $actor): SpkDocument
    {
        return DB::transaction(function () use ($order, $actor) {
            $order = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();
            $gate = $this->gate($order);

            if (! $gate['not_issued']) {
                throw new BusinessRuleException('BR-09', 'SPK untuk pesanan ini sudah pernah diterbitkan.');
            }
            if (! $gate['design_approved']) {
                throw new BusinessRuleException('BR-05', 'Produksi tidak boleh dimulai tanpa ACC desain yang sah.');
            }
            if (! $gate['payment_valid'] || ! $gate['slot_permanent']) {
                throw new BusinessRuleException('BR-09', 'SPK hanya dapat diterbitkan jika pembayaran Valid DAN kuota terkunci permanen.');
            }

            $spk = SpkDocument::create([
                'order_id' => $order->id,
                'spk_number' => $this->sequence->nextSpkNumber($actor->tenant),
                'issued_by' => $actor->id,
                'issued_at' => now(),
            ]);

            $old = $order->only(['status', 'wip_stage']);
            $order->update(['status' => 'spk_terbit', 'wip_stage' => 'antrean']);

            WipHistory::create([
                'order_id' => $order->id,
                'from_stage' => null,
                'to_stage' => 'antrean',
                'actor_id' => $actor->id,
            ]);

            $this->audit->log('SPK_ISSUED', $spk, $old, [
                'spk_number' => $spk->spk_number,
                'order_code' => $order->order_code,
            ]);

            return $spk;
        });
    }

    /**
     * Dispatch vendor hanya oleh Owner/Manager (BR-27); peran dicek di route.
     */
    public function dispatch(SpkDocument $spk, array $data, User $actor): SpkDocument
    {
        $old = $spk->only(['vendor_name', 'material_sent_date', 'spk_receiver', 'vendor_due_date']);

        $spk->update($data + [
            'dispatched_by' => $actor->id,
            'dispatched_at' => now(),
        ]);

        $this->audit->log('SPK_DISPATCHED', $spk, $old, $data);

        return $spk;
    }
}
