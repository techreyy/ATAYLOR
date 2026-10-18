<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DesignVersionRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'mockup' => ['nullable', 'image', 'max:8192'],
        ];
    }
}
