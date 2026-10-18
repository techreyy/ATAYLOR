<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\WipHistory */
class WipHistoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'orderId' => $this->order_id,
            'orderCode' => $this->whenLoaded('order', fn () => $this->order?->order_code),
            'fromStage' => $this->from_stage,
            'toStage' => $this->to_stage,
            'actorId' => $this->actor_id,
            'actorName' => $this->whenLoaded('actor', fn () => $this->actor ? "{$this->actor->name} ({$this->actor->role})" : null),
            'reasonNote' => $this->reason_note,
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
