<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\MoveStageRequest;
use App\Http\Resources\OrderResource;
use App\Http\Resources\WipHistoryResource;
use App\Models\Order;
use App\Services\FileStorage;
use App\Services\KanbanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class KanbanController extends Controller
{
    public function __construct(private KanbanService $kanban)
    {
    }

    public function board(): JsonResponse
    {
        $grouped = $this->kanban->board();

        return response()->json([
            'data' => collect(Order::WIP_STAGES)->mapWithKeys(fn ($stage) => [
                $stage => OrderResource::collection($grouped->get($stage, collect()))->resolve(),
            ]),
        ]);
    }

    public function move(MoveStageRequest $request, string $order, FileStorage $files): OrderResource
    {
        $model = Order::findOrFail($order);
        $photoUrl = $request->hasFile('qc_photo')
            ? $files->store($request->file('qc_photo'), 'qc-photos', $model->tenant_id)
            : null;

        $updated = $this->kanban->move(
            $model,
            $request->validated('target_stage'),
            $request->validated('reason_note'),
            $photoUrl,
            $request->user(),
        );

        return new OrderResource($updated->load(['items.product', 'closer']));
    }

    public function histories(): AnonymousResourceCollection
    {
        return WipHistoryResource::collection($this->kanban->histories());
    }
}
