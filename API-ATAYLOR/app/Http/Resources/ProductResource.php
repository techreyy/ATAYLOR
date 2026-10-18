<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Product */
class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'category' => $this->category,
            'basePrice' => $this->base_price,
            'moq' => $this->moq,
            'stdDurationDays' => $this->std_duration_days,
            'dailyCapacity' => $this->daily_capacity,
            'designSlaHours' => $this->design_sla_hours,
            'dpMinPercent' => $this->dp_min_percent,
            'freeRevisionLimit' => $this->free_revision_limit,
            'isActive' => $this->is_active,
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
