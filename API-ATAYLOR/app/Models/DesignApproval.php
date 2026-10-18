<?php

namespace App\Models;

class DesignApproval extends TenantModel
{
    protected $casts = ['approved_at' => 'datetime'];
}
