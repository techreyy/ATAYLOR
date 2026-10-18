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
