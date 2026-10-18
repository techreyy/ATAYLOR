<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DesignTicket extends TenantModel
{
    protected $casts = [
        'sla_due_at' => 'datetime',
        'revision_count' => 'integer',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function designer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'designer_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(DesignVersion::class)->orderByDesc('version_no');
    }
}
