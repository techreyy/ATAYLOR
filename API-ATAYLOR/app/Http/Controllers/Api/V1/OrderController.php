<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Resources\OrderResource;
use App\Services\OrderService;
use App\Services\SpkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OrderController extends Controller
{
    public function __construct(private OrderService $orders)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'channel' => ['nullable', 'in:online,offline'],
            'status' => ['nullable'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
        ]);

        return OrderResource::collection($this->orders->list($filters));
    }

    public function store(StoreOrderRequest $request): JsonResponse
    {
        $order = $this->orders->create($request->validated(), $request->user());

        return (new OrderResource($order->load(['items.product', 'closer'])))->response()->setStatusCode(201);
    }

    public function show(string $order, SpkService $spk): JsonResponse
    {
        $model = $this->orders->find($order);

        return response()->json([
            'data' => new OrderResource($model),
            'spkGate' => $spk->gate($model),
        ]);
    }
}
