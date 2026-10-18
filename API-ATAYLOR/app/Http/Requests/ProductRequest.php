<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Tambah / ubah produk katalog (BR-19: hanya Owner, dijaga di route). */
class ProductRequest extends FormRequest
{
    public function rules(): array
    {
        $product = $this->route('product');

        return [
            'name' => ['required', 'string', 'max:150',
                Rule::unique('products', 'name')->where('tenant_id', $this->user()->tenant_id)->ignore($product)],
            'category' => ['required', 'string', 'max:80'],
            'base_price' => ['required', 'integer', 'min:1000', 'max:100000000'],
            'moq' => ['required', 'integer', 'min:1', 'max:100000'],
            'std_duration_days' => ['required', 'integer', 'min:1', 'max:365'],
            'daily_capacity' => ['required', 'integer', 'min:1', 'max:100000'],
            'design_sla_hours' => ['required', 'integer', 'min:1', 'max:720'],
            'dp_min_percent' => ['required', 'integer', 'min:0', 'max:100'],
            'free_revision_limit' => ['required', 'integer', 'min:0', 'max:20'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => 'nama produk',
            'category' => 'kategori',
            'base_price' => 'harga dasar',
            'moq' => 'MOQ',
            'std_duration_days' => 'durasi standar',
            'daily_capacity' => 'kapasitas harian',
            'design_sla_hours' => 'SLA desain',
            'dp_min_percent' => 'DP minimum',
            'free_revision_limit' => 'batas revisi gratis',
        ];
    }

    public function messages(): array
    {
        return ['name.unique' => 'Nama produk sudah dipakai di katalog.'];
    }
}
