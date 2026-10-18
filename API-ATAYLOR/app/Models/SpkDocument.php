<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SpkDocument extends TenantModel
{
    protected $casts = [
        'issued_at' => 'datetime',
        'dispatched_at' => 'datetime',
        'material_sent_date' => 'date:Y-m-d',
        'vendor_due_date' => 'date:Y-m-d',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function issuer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }

    public function dispatcher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dispatched_by');
    }
}
