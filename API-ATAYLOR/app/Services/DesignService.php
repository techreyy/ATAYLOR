<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Models\DesignApproval;
use App\Models\DesignTicket;
use App\Models\DesignVersion;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class DesignService
{
    private const LOCKED_STATUSES = [
        'menunggu_pembayaran', 'pembayaran_valid', 'spk_terbit', 'produksi', 'menunggu_pelunasan', 'selesai', 'dibatalkan',
    ];

    public function __construct(private AuditLogger $audit)
    {
    }

    /**
     * Unggah mockup versi baru. Revisi melewati batas gratis produk ditandai berbayar (BR-17).
     */
    public function addVersion(Order $order, ?string $mockupUrl, User $actor): DesignVersion
    {
        if (in_array($order->status, self::LOCKED_STATUSES, true)) {
            throw new BusinessRuleException('BR-06', 'Desain sudah di-ACC / pesanan sudah berjalan; versi baru tidak dapat dikirim.');
        }

        return DB::transaction(function () use ($order, $mockupUrl, $actor) {
            $ticket = $order->designTicket()->lockForUpdate()->firstOrFail();
            $nextNo = (int) $ticket->versions()->max('version_no') + 1;
            $revisionCount = $nextNo - 1;
            $freeLimit = (int) $order->items()->with('product')->get()->min(fn ($i) => $i->product->free_revision_limit);

            $version = DesignVersion::create([
                'design_ticket_id' => $ticket->id,
                'version_no' => $nextNo,
                'mockup_url' => $mockupUrl,
                'uploaded_by' => $actor->id,
                'sent_at' => now(),
                'is_paid_revision' => $revisionCount > $freeLimit,
            ]);

            $ticket->update([
                'status' => 'menunggu_acc',
                'revision_count' => $revisionCount,
                'designer_id' => $ticket->designer_id ?? ($actor->role === 'designer' ? $actor->id : null),
            ]);
            $order->update(['status' => 'menunggu_acc', 'revision_count' => $revisionCount]);

            $this->audit->log('DESIGN_VERSION_SENT', $version, null, [
                'order_code' => $order->order_code,
                'version_no' => $nextNo,
                'is_paid_revision' => $version->is_paid_revision,
            ]);

            return $version;
        });
    }

    /**
     * ACC sah hanya untuk versi yang dikirim terakhir dan sekali pakai (BR-06).
     * ACC memulai Slot Lock sementara 24 jam (BR-07).
     */
    public function approve(DesignVersion $version, array $data, User $actor): DesignApproval
    {
        return DB::transaction(function () use ($version, $data, $actor) {
            $ticket = DesignTicket::whereKey($version->design_ticket_id)->lockForUpdate()->firstOrFail();
            $order = Order::whereKey($ticket->order_id)->lockForUpdate()->firstOrFail();

            if ($version->approval()->exists()) {
                throw new BusinessRuleException('BR-06', 'Versi desain ini sudah pernah di-ACC. Tombol ACC hanya berlaku sekali.');
            }
            $latestNo = (int) $ticket->versions()->max('version_no');
            if ($version->version_no !== $latestNo) {
                throw new BusinessRuleException('BR-06', "ACC hanya berlaku untuk versi terakhir yang dikirim (v{$latestNo}).");
            }
            if ($order->status !== 'menunggu_acc') {
                throw new BusinessRuleException('BR-06', 'Pesanan tidak sedang menunggu ACC.');
            }

            $approval = DesignApproval::create([
                'design_version_id' => $version->id,
                'order_id' => $order->id,
                'channel' => $data['channel'],
                'approved_by_wa' => $data['approved_by_wa'] ?? $order->customer_wa,
                'recorded_by' => $actor->id,
                'approved_at' => now(),
                'evidence_url' => $data['evidence_url'] ?? null,
            ]);

            $old = $order->only(['status', 'slot_lock_status']);
            $ticket->update(['status' => 'selesai']);
            // DP yang sudah divalidasi sebelum ACC langsung mengunci kuota permanen (BR-08).
            $order->update($order->paid_amount >= $order->dp_required
                ? ['status' => 'pembayaran_valid', 'slot_lock_status' => 'permanent', 'slot_lock_expires_at' => null]
                : ['status' => 'menunggu_pembayaran', 'slot_lock_status' => 'temp_24h', 'slot_lock_expires_at' => now()->addHours(24)]);

            $this->audit->log('DESIGN_APPROVED', $order, $old, [
                'status' => $order->status,
                'slot_lock_status' => $order->slot_lock_status,
                'design_version_id' => $version->id,
                'channel' => $approval->channel,
            ]);

            return $approval;
        });
    }

    public function requestRevision(DesignVersion $version, string $feedback, User $actor): void
    {
        DB::transaction(function () use ($version, $feedback) {
            $ticket = DesignTicket::whereKey($version->design_ticket_id)->lockForUpdate()->firstOrFail();
            $order = Order::whereKey($ticket->order_id)->firstOrFail();

            if ($order->status !== 'menunggu_acc') {
                throw new BusinessRuleException('BR-17', 'Revisi hanya dapat diminta saat pesanan menunggu ACC.');
            }

            $ticket->update(['status' => 'revisi', 'last_feedback' => $feedback]);
            $order->update(['status' => 'revisi']);

            $this->audit->log('DESIGN_REVISION_REQUESTED', $order, null, [
                'version_no' => $version->version_no,
                'feedback' => $feedback,
            ]);
        });
    }
}
