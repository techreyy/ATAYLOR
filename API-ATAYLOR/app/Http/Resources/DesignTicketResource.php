<?php

namespace App\Http\Resources;

use App\Services\FileStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\DesignTicket */
class DesignTicketResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'orderId' => $this->order_id,
            'status' => $this->status,
            'designerName' => $this->whenLoaded('designer', fn () => $this->designer?->name),
            'slaDueAt' => $this->sla_due_at?->toIso8601String(),
            'revisionCount' => $this->revision_count,
            'lastFeedback' => $this->last_feedback,
            // Konteks pesanan untuk board CRM Designer (hanya bila relasi order dimuat)
            $this->mergeWhen($this->relationLoaded('order'), fn () => [
                'orderCode' => $this->order->order_code,
                'orderStatus' => $this->order->status,
                'customerName' => $this->order->customer_name,
                'dueDate' => $this->order->due_date?->toDateString(),
                'notes' => $this->order->notes,
                'productName' => $this->order->items->first()?->product?->name,
                'color' => $this->order->items->first()?->color,
                'totalQty' => (int) $this->order->items->sum('qty'),
                'freeRevisionLimit' => (int) $this->order->items->min(fn ($i) => $i->product->free_revision_limit),
            ]),
            'versions' => $this->whenLoaded('versions', fn () => $this->versions->map(fn ($v) => [
                'id' => $v->id,
                'versionNo' => $v->version_no,
                'mockupUrl' => FileStorage::url($v->mockup_url),
                'sentAt' => $v->sent_at?->toIso8601String(),
                'isPaidRevision' => $v->is_paid_revision,
                'approval' => $v->relationLoaded('approval') && $v->approval ? [
                    'channel' => $v->approval->channel,
                    'approvedAt' => $v->approval->approved_at?->toIso8601String(),
                    'approvedByWa' => $v->approval->approved_by_wa,
                ] : null,
            ])),
        ];
    }
}
