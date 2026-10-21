<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Tenant extends Model
{
    use HasUuids;

    protected $guarded = ['id'];

    /** Agar AuditLogger mencatat log perubahan tenant di bawah tenant itu sendiri (RLS audit_logs). */
    public function getTenantIdAttribute(): string
    {
        return $this->id;
    }
}
