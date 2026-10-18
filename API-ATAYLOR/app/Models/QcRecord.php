<?php

namespace App\Models;

class QcRecord extends TenantModel
{
    protected $casts = ['checked_at' => 'datetime'];
}
