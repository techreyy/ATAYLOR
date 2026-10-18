<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DispatchSpkRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'vendor_name' => ['required', 'string', 'max:150'],
            'spk_receiver' => ['required', 'string', 'max:150'],
            'material_sent_date' => ['required', 'date'],
            'vendor_due_date' => ['required', 'date', 'after_or_equal:material_sent_date'],
        ];
    }
}
