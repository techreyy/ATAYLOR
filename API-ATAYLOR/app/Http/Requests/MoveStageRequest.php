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

    public function messages(): array
    {
        return [
            'qc_photo.uploaded' => 'Foto QC gagal diunggah. Pastikan ukurannya maksimal 8 MB.',
            'qc_photo.max' => 'Foto QC maksimal 8 MB.',
            'qc_photo.image' => 'Foto QC harus berupa gambar (JPG/PNG/WEBP).',
        ];
    }
}
