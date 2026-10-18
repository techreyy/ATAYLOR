<?php

namespace App\Http\Resources;

use App\Services\FileStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Order */
class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tenantId' => $this->tenant_id,
            'orderCode' => $this->order_code,
            'customerName' => $this->customer_name,
            'customerWa' => $this->customer_wa,
            'channel' => $this->channel,
            'marketingCloserId' => $this->marketing_closer_id,
            'marketingCloserName' => $this->whenLoaded('closer', fn () => $this->closer?->name),
            'status' => $this->status,
            'wipStage' => $this->wip_stage,
            'totalAmount' => $this->total_amount,
            'dpRequired' => $this->dp_required,
            'paidAmount' => $this->paid_amount,
            'remainingBalance' => $this->remaining_balance,
            'slotLockStatus' => $this->slot_lock_status,
            'slotLockExpiresAt' => $this->slot_lock_expires_at?->toIso8601String(),
            'revisionCount' => $this->revision_count,
            'dueDate' => $this->due_date?->toDateString(),
            'notes' => $this->notes,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),
            'designTicket' => $this->whenLoaded('designTicket', fn () => $this->designTicket ? new DesignTicketResource($this->designTicket) : null),
            'spk' => $this->whenLoaded('spk', fn () => $this->spk ? new SpkResource($this->spk) : null),
            'wipHistories' => WipHistoryResource::collection($this->whenLoaded('wipHistories')),
            'qcRecords' => $this->whenLoaded('qcRecords', fn () => $this->qcRecords->map(fn ($qc) => [
                'id' => $qc->id,
                'photoUrl' => FileStorage::url($qc->photo_url),
                'checkedAt' => $qc->checked_at?->toIso8601String(),
            ])),
        ];
    }
}
