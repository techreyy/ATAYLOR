<?php

namespace App\Models;

class Product extends TenantModel
{
    protected $casts = [
        'base_price' => 'integer',
        'moq' => 'integer',
        'std_duration_days' => 'integer',
        'daily_capacity' => 'integer',
        'design_sla_hours' => 'integer',
        'dp_min_percent' => 'integer',
        'free_revision_limit' => 'integer',
        'is_active' => 'boolean',
    ];
}
