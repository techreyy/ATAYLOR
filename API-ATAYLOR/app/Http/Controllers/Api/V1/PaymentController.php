<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePaymentRequest;
use App\Http\Resources\PaymentResource;
use App\Models\Order;
use App\Models\Payment;
use App\Services\FileStorage;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PaymentController extends Controller
{
    public function __construct(
        private PaymentService $payments,
        private FileStorage $files,
    ) {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $status = $request->validate(['status' => ['nullable', 'in:pending,valid,rejected']])['status'] ?? null;

        return PaymentResource::collection(
            Payment::with(['order', 'verifier', 'recorder'])
                ->when($status, fn ($q) => $q->where('status', $status))
                ->latest()->limit(200)->get()
        );
    }

    public function store(StorePaymentRequest $request, string $order): JsonResponse
    {
        $model = Order::findOrFail($order);
        $proofUrl = $this->files->store($request->file('proof'), 'payment-proofs', $model->tenant_id);

        $payment = $this->payments->record($model, $request->validated(), $proofUrl, $request->user());

        return (new PaymentResource($payment->load(['order', 'recorder'])))->response()->setStatusCode(201);
    }

    public function validatePayment(Request $request, string $payment): PaymentResource
    {
        $notes = $request->validate(['notes' => ['nullable', 'string', 'max:1000']])['notes'] ?? null;
        $result = $this->payments->validate(Payment::findOrFail($payment), $request->user(), $notes);

        return new PaymentResource($result->load(['order', 'verifier', 'recorder']));
    }

    public function reject(Request $request, string $payment): PaymentResource
    {
        $notes = $request->validate(['notes' => ['required', 'string', 'min:5', 'max:1000']])['notes'];
        $result = $this->payments->reject(Payment::findOrFail($payment), $request->user(), $notes);

        return new PaymentResource($result->load(['order', 'verifier', 'recorder']));
    }
}
