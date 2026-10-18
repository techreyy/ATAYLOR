<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\MarketingCloser;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MasterDataController extends Controller
{
    /** Produk aktif untuk form pesanan; Owner dapat meminta semua (termasuk nonaktif) untuk katalog. */
    public function products(Request $request): AnonymousResourceCollection
    {
        $all = $request->boolean('include_inactive') && $request->user()->role === 'owner';

        return ProductResource::collection(
            Product::when(! $all, fn ($q) => $q->where('is_active', true))->orderBy('name')->get()
        );
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
