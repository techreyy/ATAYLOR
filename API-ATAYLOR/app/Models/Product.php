<?php

namespace App\Models;

class Product extends TenantModel
{
    protected $casts = [
        'base_price' => 'integer',
        'is_active' => 'boolean',
    ];
}
