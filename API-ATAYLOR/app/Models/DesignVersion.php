<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class DesignVersion extends TenantModel
{
    protected $casts = [
        'version_no' => 'integer',
        'sent_at' => 'datetime',
        'is_paid_revision' => 'boolean',
    ];

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(DesignTicket::class, 'design_ticket_id');
    }

    public function approval(): HasOne
    {
        return $this->hasOne(DesignApproval::class);
    }
}
