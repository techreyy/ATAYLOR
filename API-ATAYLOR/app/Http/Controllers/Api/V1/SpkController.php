<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\DispatchSpkRequest;
use App\Http\Resources\SpkResource;
use App\Models\Order;
use App\Models\SpkDocument;
use App\Services\SpkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SpkController extends Controller
{
    public function __construct(private SpkService $spk)
    {
    }

    public function index(): AnonymousResourceCollection
    {
        return SpkResource::collection(
            SpkDocument::with(['order.items.product', 'order.closer', 'issuer', 'dispatcher'])->latest('issued_at')->get()
        );
    }

    public function show(string $spk): SpkResource
    {
        return new SpkResource(
            SpkDocument::with(['order.items.product', 'order.closer', 'issuer', 'dispatcher'])->findOrFail($spk)
        );
    }

    public function gate(string $order): JsonResponse
    {
        return response()->json(['data' => $this->spk->gate(Order::findOrFail($order))]);
    }

    public function store(Request $request, string $order): JsonResponse
    {
        $spk = $this->spk->issue(Order::findOrFail($order), $request->user());

        return (new SpkResource($spk->load(['order.items.product', 'issuer'])))->response()->setStatusCode(201);
    }

    public function dispatch(DispatchSpkRequest $request, string $spk): SpkResource
    {
        $model = $this->spk->dispatch(SpkDocument::findOrFail($spk), $request->validated(), $request->user());

        return new SpkResource($model->load(['order.items.product', 'issuer', 'dispatcher']));
    }
}
