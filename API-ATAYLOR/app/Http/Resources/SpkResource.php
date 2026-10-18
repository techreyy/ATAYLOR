<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\SpkDocument */
class SpkResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $order = $this->relationLoaded('order') ? $this->order : null;

        return [
            'id' => $this->id,
            'tenantId' => $this->tenant_id,
            'orderId' => $this->order_id,
            'spkNumber' => $this->spk_number,
            'issuedBy' => $this->whenLoaded('issuer', fn () => $this->issuer?->name),
            'issuedAt' => $this->issued_at?->toIso8601String(),
            'vendorName' => $this->vendor_name,
            'materialSentDate' => $this->material_sent_date?->toDateString(),
            'spkReceiver' => $this->spk_receiver,
            'vendorDueDate' => $this->vendor_due_date?->toDateString(),
            'dispatchedBy' => $this->whenLoaded('dispatcher', fn () => $this->dispatcher?->name),
            'dispatchedAt' => $this->dispatched_at?->toIso8601String(),
            'order' => $order ? new OrderResource($order) : null,
        ];
    }
}
