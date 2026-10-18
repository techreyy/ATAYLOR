<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ApproveDesignRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            // Webhook tombol WA belum terhubung; Admin mencatat ACC manual (BR-21)
            'channel' => ['required', Rule::in(['manual_admin', 'wa_button'])],
            'approved_by_wa' => ['nullable', 'string', 'max:30'],
            'evidence' => ['nullable', 'image', 'max:8192'],
        ];
    }
}
