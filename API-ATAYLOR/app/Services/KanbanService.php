<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Models\Order;
use App\Models\QcRecord;
use App\Models\User;
use App\Models\WipHistory;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class KanbanService
{
    public function __construct(private AuditLogger $audit)
    {
    }

    public function board(): Collection
    {
        return Order::with(['items.product', 'closer', 'spk'])
            ->whereNotNull('wip_stage')
            ->whereNotIn('status', ['dibatalkan'])
            ->orderBy('due_date')
            ->get()
            ->groupBy('wip_stage');
    }

    /**
     * BR-12: maju tepat 1 tahap; mundur wajib alasan. BR-24: masuk "Tiba di Gudang" wajib foto QC.
     * BR-11: setelah tiba di gudang, pesanan menunggu pelunasan (atau selesai bila sudah lunas).
     */
    public function move(Order $order, string $target, ?string $reason, ?string $qcPhotoUrl, User $actor): Order
    {
        return DB::transaction(function () use ($order, $target, $reason, $qcPhotoUrl, $actor) {
            $order = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();

            if ($order->wip_stage === null) {
                throw new BusinessRuleException('BR-09', 'Pesanan belum memiliki SPK Final sehingga belum masuk antrean produksi.');
            }

            $from = array_search($order->wip_stage, Order::WIP_STAGES, true);
            $to = array_search($target, Order::WIP_STAGES, true);

            if ($to === false) {
                throw new BusinessRuleException('BR-12', 'Tahap tujuan tidak valid.');
            }
            if ($to === $from) {
                throw new BusinessRuleException('BR-12', 'Pesanan sudah berada di tahap tersebut.');
            }
            if ($to > $from + 1) {
                throw new BusinessRuleException('BR-12', 'Tidak boleh melompati tahap produksi. Hanya boleh maju 1 tahap secara berurutan.');
            }

            $isRework = $to < $from;
            if ($isRework && mb_strlen(trim((string) $reason)) < 5) {
                throw new BusinessRuleException('BR-12', 'Mundur tahap (rework) wajib menyertakan alasan tertulis minimal 5 karakter.');
            }

            if ($target === 'tiba_di_gudang') {
                if (! $qcPhotoUrl) {
                    throw new BusinessRuleException('BR-24', 'Foto fisik hasil QC wajib dilampirkan sebelum pesanan dinyatakan tiba di gudang.');
                }
                QcRecord::create([
                    'order_id' => $order->id,
                    'photo_url' => $qcPhotoUrl,
                    'checked_by' => $actor->id,
                    'checked_at' => now(),
                ]);
            }

            $old = $order->only(['wip_stage', 'status']);

            $status = match (true) {
                $target === 'tiba_di_gudang' => $order->remaining_balance > 0 ? 'menunggu_pelunasan' : 'selesai',
                $target === 'antrean' => 'spk_terbit',
                default => 'produksi',
            };
            $order->update(['wip_stage' => $target, 'status' => $status]);

            WipHistory::create([
                'order_id' => $order->id,
                'from_stage' => $old['wip_stage'],
                'to_stage' => $target,
                'actor_id' => $actor->id,
                'reason_note' => $isRework ? trim($reason) : null,
            ]);

            $this->audit->log($isRework ? 'WIP_REWORK' : 'WIP_ADVANCE', $order, $old, $order->only(['wip_stage', 'status']) + [
                'reason_note' => $isRework ? trim($reason) : null,
            ]);

            if ($target === 'tiba_di_gudang') {
                // Notifikasi WA Mini Agent belum terhubung (MOCK); dicatat sebagai jejak audit.
                $this->audit->log('CUSTOMER_NOTIFICATION_QUEUED_MOCK', $order, null, [
                    'template' => 'pesanan_selesai_tagihan_pelunasan',
                    'remaining_balance' => $order->remaining_balance,
                ]);
            }

            return $order;
        });
    }

    public function histories(int $limit = 100): Collection
    {
        return WipHistory::with(['order:id,order_code', 'actor:id,name,role'])->latest()->limit($limit)->get();
    }
}
