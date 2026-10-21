<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * Layanan AI (LLM) tidak bisa dipakai: belum dikonfigurasi atau penyedia gagal merespons.
 * Pesan aman ditampilkan ke pengguna; kunci API tidak pernah ikut.
 */
class AiUnavailableException extends RuntimeException
{
    public function __construct(string $message, private int $status = 503)
    {
        parent::__construct($message);
    }

    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage(), 'code' => 'AI_UNAVAILABLE'], $this->status);
    }
}
