<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\MarketingCloser;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

class MasterDataController extends Controller
{
    public function products(): JsonResponse
    {
        $products = Product::where('is_active', true)->orderBy('name')->get()->map(fn (Product $p) => [
            'id' => $p->id,
            'name' => $p->name,
            'category' => $p->category,
            'basePrice' => $p->base_price,
            'moq' => $p->moq,
            'stdDurationDays' => $p->std_duration_days,
            'dailyCapacity' => $p->daily_capacity,
            'designSlaHours' => $p->design_sla_hours,
            'dpMinPercent' => $p->dp_min_percent,
            'freeRevisionLimit' => $p->free_revision_limit,
        ]);

        return response()->json(['data' => $products]);
    }

    public function closers(): JsonResponse
    {
        $closers = MarketingCloser::where('is_active', true)->orderBy('name')->get()->map(fn (MarketingCloser $c) => [
            'id' => $c->id,
            'name' => $c->name,
            'phone' => $c->phone,
            'isActive' => $c->is_active,
        ]);

        return response()->json(['data' => $closers]);
    }
}
