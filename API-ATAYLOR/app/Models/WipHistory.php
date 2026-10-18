<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WipHistory extends TenantModel
{
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
