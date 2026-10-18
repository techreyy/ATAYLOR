<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\OrderItem */
class OrderItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'orderId' => $this->order_id,
            'productId' => $this->product_id,
            'productName' => $this->whenLoaded('product', fn () => $this->product->name),
            'skuCode' => $this->sku_code,
            'color' => $this->color,
            'sleeveType' => $this->sleeve_type ?? 'pendek',
            'size' => $this->size,
            'qty' => $this->qty,
            'unitPrice' => $this->unit_price,
            'subtotal' => $this->subtotal,
        ];
    }
}
