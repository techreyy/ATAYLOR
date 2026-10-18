<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Services\OrderInsightsService;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Katalog AI Training (FR-AT-01): ubah hanya Owner (BR-19, dijaga di route). */
class ProductController extends Controller
{
    public function __construct(private ProductService $products)
    {
    }

    public function store(ProductRequest $request): JsonResponse
    {
        return (new ProductResource($this->products->create($request->validated())))->response()->setStatusCode(201);
    }

    // ID string (bukan route model binding): binding berjalan sebelum middleware tenant menyalakan RLS
    public function update(ProductRequest $request, string $product): ProductResource
    {
        return new ProductResource($this->products->update(Product::findOrFail($product), $request->validated()));
    }

    public function insights(Request $request, OrderInsightsService $insights): JsonResponse
    {
        $data = $request->validate(['days' => ['nullable', 'integer', 'in:30,90,365']]);

        return response()->json(['data' => $insights->summary((int) ($data['days'] ?? 90))]);
    }
}
