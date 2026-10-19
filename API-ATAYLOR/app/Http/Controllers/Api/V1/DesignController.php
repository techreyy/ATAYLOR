<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ApproveDesignRequest;
use App\Http\Requests\DesignVersionRequest;
use App\Http\Resources\DesignTicketResource;
use App\Models\DesignTicket;
use App\Models\DesignVersion;
use App\Models\Order;
use App\Services\DesignService;
use App\Services\FileStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DesignController extends Controller
{
    public function __construct(
        private DesignService $designs,
        private FileStorage $files,
    ) {
    }

    public function index(): AnonymousResourceCollection
    {
        return DesignTicketResource::collection($this->designs->board());
    }

    public function start(Request $request, string $ticket): JsonResponse
    {
        $model = $this->designs->start(DesignTicket::findOrFail($ticket), $request->user());

        return response()->json([
            'message' => 'Tiket diambil. Status pesanan: Desain Dikerjakan.',
            'data' => new DesignTicketResource($model->load('designer')),
        ]);
    }

    public function storeVersion(DesignVersionRequest $request, string $order): JsonResponse
    {
        $model = Order::findOrFail($order);
        $url = $request->hasFile('mockup')
            ? $this->files->store($request->file('mockup'), 'mockups', $model->tenant_id)
            : null;

        $version = $this->designs->addVersion($model, $url, $request->user());

        return response()->json([
            'message' => "Mockup v{$version->version_no} tercatat dan menunggu ACC pelanggan.",
            'isPaidRevision' => $version->is_paid_revision,
        ], 201);
    }

    public function approve(ApproveDesignRequest $request, string $version): JsonResponse
    {
        $model = DesignVersion::findOrFail($version);
        $data = $request->validated();
        if ($request->hasFile('evidence')) {
            $data['evidence_url'] = $this->files->store($request->file('evidence'), 'acc-evidence', $model->tenant_id);
        }

        $this->designs->approve($model, $data, $request->user());

        return response()->json(['message' => 'ACC tercatat. Slot kuota dikunci sementara 24 jam (BR-07).']);
    }

    public function requestRevision(Request $request, string $version): JsonResponse
    {
        $data = $request->validate(['feedback' => ['required', 'string', 'min:3', 'max:1000']]);
        $this->designs->requestRevision(DesignVersion::findOrFail($version), $data['feedback'], $request->user());

        return response()->json(['message' => 'Permintaan revisi tercatat.']);
    }
}
