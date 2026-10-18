<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends TenantModel
{
    /** Ukuran baku form pesanan, urut kecil → besar. */
    public const SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];

    public const SLEEVE_TYPES = ['pendek', 'panjang'];

    protected $attributes = [
        'sleeve_type' => 'pendek',
    ];

    protected $casts = [
        'qty' => 'integer',
        'unit_price' => 'integer',
        'subtotal' => 'integer',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
