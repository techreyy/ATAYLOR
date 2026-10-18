<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Kasir manual tanpa payment gateway (BR-08, BR-10, BR-11).
 */
class PaymentService
{
    public function __construct(
        private AuditLogger $audit,
        private OrderService $orders,
    ) {
    }

    public function record(Order $order, array $data, ?string $proofUrl, User $actor): Payment
    {
        if (in_array($order->status, ['dibatalkan', 'selesai'], true)) {
            throw new BusinessRuleException('BR-08', 'Pesanan sudah selesai/dibatalkan; pembayaran tidak dapat dicatat.');
        }

        $pending = (int) $order->payments()->where('status', 'pending')->sum('amount');
        if ($data['amount'] > $order->remaining_balance - $pending) {
            throw new BusinessRuleException('BR-08', 'Nominal melebihi sisa tagihan (termasuk pembayaran yang masih menunggu validasi).');
        }

        $payment = Payment::create([
            'order_id' => $order->id,
            'method' => $data['method'],
            'amount' => $data['amount'],
            'proof_url' => $proofUrl,
            'status' => 'pending',
            'recorded_by' => $actor->id,
            'notes' => $data['notes'] ?? null,
        ]);

        $this->audit->log('PAYMENT_RECORDED', $payment, null, $payment->only(['order_id', 'method', 'amount']));

        return $payment;
    }

    /**
     * Validasi manual Admin. DP >= minimum saat slot lock 24 jam aktif => kuota permanen (BR-08).
     * Pelunasan penuh saat menunggu pelunasan => pesanan selesai/diserahkan (BR-11).
     */
    public function validate(Payment $payment, User $actor, ?string $notes): Payment
    {
        return DB::transaction(function () use ($payment, $actor, $notes) {
            $payment = Payment::whereKey($payment->id)->lockForUpdate()->firstOrFail();
            $order = Order::whereKey($payment->order_id)->lockForUpdate()->firstOrFail();

            if ($payment->status !== 'pending') {
                throw new BusinessRuleException('BR-08', 'Pembayaran ini sudah diproses sebelumnya.');
            }

            if ($order->slot_lock_status === 'temp_24h' && $order->slot_lock_expires_at?->isPast()) {
                throw new BusinessRuleException('BR-07', 'Slot Lock 24 jam sudah kedaluwarsa; kuota telah dilepas. Lakukan ACC ulang sebelum validasi.');
            }

            $payment->update([
                'status' => 'valid',
                'verified_by' => $actor->id,
                'verified_at' => now(),
                'notes' => $notes ?? $payment->notes,
            ]);

            $old = $order->only(['status', 'slot_lock_status', 'paid_amount']);
            $this->orders->recalculatePayments($order);

            if ($order->slot_lock_status === 'temp_24h' && $order->paid_amount >= $order->dp_required) {
                $order->update([
                    'slot_lock_status' => 'permanent',
                    'slot_lock_expires_at' => null,
                    'status' => 'pembayaran_valid',
                ]);
            } elseif ($order->status === 'menunggu_pelunasan' && $order->remaining_balance === 0) {
                $order->update(['status' => 'selesai']);
            }

            $this->audit->log('PAYMENT_VALIDATED', $order, $old, $order->only(['status', 'slot_lock_status', 'paid_amount']) + [
                'payment_id' => $payment->id,
                'amount' => $payment->amount,
            ]);

            return $payment->fresh();
        });
    }

    public function reject(Payment $payment, User $actor, string $notes): Payment
    {
        if ($payment->status !== 'pending') {
            throw new BusinessRuleException('BR-08', 'Pembayaran ini sudah diproses sebelumnya.');
        }

        $payment->update([
            'status' => 'rejected',
            'verified_by' => $actor->id,
            'verified_at' => now(),
            'notes' => $notes,
        ]);

        $this->audit->log('PAYMENT_REJECTED', $payment, null, ['notes' => $notes]);

        return $payment;
    }
}
