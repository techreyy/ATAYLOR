<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends TenantModel
{
    /** Urutan resmi Kanban WIP (BR-12). */
    public const WIP_STAGES = ['antrean', 'proses_jahit', 'proses_bordir_sablon', 'qc_pabrik', 'tiba_di_gudang'];

    protected $casts = [
        'total_amount' => 'integer',
        'dp_required' => 'integer',
        'paid_amount' => 'integer',
        'remaining_balance' => 'integer',
        'revision_count' => 'integer',
        'due_date' => 'date:Y-m-d',
        'slot_lock_expires_at' => 'datetime',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class)->latest();
    }

    public function closer(): BelongsTo
    {
        return $this->belongsTo(MarketingCloser::class, 'marketing_closer_id');
    }

    public function designTicket(): HasOne
    {
        return $this->hasOne(DesignTicket::class);
    }

    public function spk(): HasOne
    {
        return $this->hasOne(SpkDocument::class);
    }

    public function wipHistories(): HasMany
    {
        return $this->hasMany(WipHistory::class)->latest();
    }

    public function qcRecords(): HasMany
    {
        return $this->hasMany(QcRecord::class)->latest();
    }
}
