<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\AiSandboxService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Validator;

/** Chat percobaan AI di halaman AI Training (khusus Owner). */
class AiSandboxController extends Controller
{
    public function __construct(private AiSandboxService $ai)
    {
    }

    public function chat(Request $request): JsonResponse
    {
        $validator = validator($request->all(), [
            'messages' => ['required', 'array', 'min:1', 'max:30'],
            'messages.*.role' => ['required', 'in:user,assistant'],
            'messages.*.text' => ['required', 'string', 'max:1000'],
        ], [
            'messages.*.text.max' => 'Satu pesan maksimal 1.000 karakter.',
            'messages.max' => 'Percakapan terlalu panjang; klik "Mulai ulang".',
        ]);
        $validator->after(function (Validator $v) use ($request) {
            if (data_get($request->input('messages'), (count((array) $request->input('messages')) - 1).'.role') !== 'user') {
                $v->errors()->add('messages', 'Pesan terakhir harus dari pelanggan.');
            }
        });
        $messages = $validator->validate()['messages'];

        return response()->json($this->ai->chat($request->user()->tenant, $messages));
    }
}
