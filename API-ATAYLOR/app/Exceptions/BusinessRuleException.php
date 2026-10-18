<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * Pelanggaran aturan bisnis (BR-xx). Dirender sebagai HTTP 422 dengan kode aturan.
 */
class BusinessRuleException extends RuntimeException
{
    public function __construct(public readonly string $rule, string $message)
    {
        parent::__construct($message);
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'code' => $this->rule,
        ], 422);
    }
}
