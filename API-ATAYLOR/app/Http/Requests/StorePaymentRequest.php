<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePaymentRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'method' => ['required', Rule::in(['cash', 'transfer'])],
            'amount' => ['required', 'integer', 'min:1000'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'proof' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ];
    }

    public function messages(): array
    {
        // "uploaded" = file ditolak PHP (melebihi upload_max_filesize) sebelum sampai ke aturan lain
        return [
            'proof.uploaded' => 'Bukti bayar gagal diunggah. Pastikan ukurannya maksimal 5 MB.',
            'proof.max' => 'Bukti bayar maksimal 5 MB.',
            'proof.mimes' => 'Bukti bayar harus berupa foto JPG, PNG, WEBP, atau PDF.',
        ];
    }
}
