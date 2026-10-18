<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOrderRequest extends FormRequest
{
    public function rules(): array
    {
        $tenantId = $this->user()->tenant_id;

        return [
            'customer_name' => ['required', 'string', 'max:150'],
            'customer_wa' => ['required', 'string', 'max:30', 'regex:/^[0-9+\-\s]{8,30}$/'],
            'channel' => ['required', Rule::in(['online', 'offline'])],
            // BR-02: wajib untuk offline; pesan dari service bila kosong agar kode aturan ikut terkirim
            'marketing_closer_id' => ['nullable', 'uuid', Rule::exists('marketing_closers', 'id')->where('tenant_id', $tenantId)],
            'due_date' => ['required', 'date', 'after_or_equal:today'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1', 'max:20'],
            'items.*.product_id' => ['required', 'uuid', Rule::exists('products', 'id')->where('tenant_id', $tenantId)],
            'items.*.color' => ['required', 'string', 'max:100'],
            'items.*.size' => ['required', 'string', 'max:16'],
            'items.*.qty' => ['required', 'integer', 'min:1', 'max:100000'],
            'items.*.sku_code' => ['nullable', 'string', 'max:64'],
        ];
    }

    public function attributes(): array
    {
        return [
            'customer_name' => 'nama pelanggan',
            'customer_wa' => 'nomor WhatsApp',
            'due_date' => 'tenggat',
            'items.*.qty' => 'qty',
        ];
    }
}
