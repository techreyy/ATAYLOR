<?php

namespace App\Http\Resources;

use App\Services\FileStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Payment */
class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tenantId' => $this->tenant_id,
            'orderId' => $this->order_id,
            'orderCode' => $this->whenLoaded('order', fn () => $this->order->order_code),
            'customerName' => $this->whenLoaded('order', fn () => $this->order->customer_name),
            'method' => $this->method,
            'amount' => $this->amount,
            'proofUrl' => FileStorage::url($this->proof_url),
            'status' => $this->status,
            'recordedBy' => $this->whenLoaded('recorder', fn () => $this->recorder?->name),
            'verifiedBy' => $this->whenLoaded('verifier', fn () => $this->verifier?->name),
            'verifiedAt' => $this->verified_at?->toIso8601String(),
            'notes' => $this->notes,
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
