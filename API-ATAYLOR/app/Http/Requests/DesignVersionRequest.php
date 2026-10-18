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

    public function messages(): array
    {
        return [
            'mockup.uploaded' => 'File mockup gagal diunggah. Pastikan ukurannya maksimal 8 MB.',
            'mockup.max' => 'File mockup maksimal 8 MB.',
            'mockup.image' => 'File mockup harus berupa gambar (JPG/PNG/WEBP).',
        ];
    }
}
