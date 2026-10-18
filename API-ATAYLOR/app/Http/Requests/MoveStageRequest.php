<?php

namespace App\Http\Requests;

use App\Models\Order;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MoveStageRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'target_stage' => ['required', Rule::in(Order::WIP_STAGES)],
            'reason_note' => ['nullable', 'string', 'max:1000'],
            'qc_photo' => ['nullable', 'image', 'max:8192'],
        ];
    }
}
