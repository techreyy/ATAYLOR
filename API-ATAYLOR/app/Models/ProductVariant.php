<?php

namespace App\Models;

class ProductVariant extends TenantModel
{
    protected $casts = ['is_ready_stock' => 'boolean'];
}
