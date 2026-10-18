<?php

namespace App\Http\Requests;

use App\Models\OrderItem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

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
            // Satu produk & satu kombinasi warna per pesanan, dirinci per jenis lengan × ukuran
            'product_id' => ['required', 'uuid', Rule::exists('products', 'id')->where('tenant_id', $tenantId)],
            'color' => ['required', 'string', 'max:100'],
            'items' => ['required', 'array', 'min:1', 'max:'.(count(OrderItem::SIZES) * count(OrderItem::SLEEVE_TYPES))],
            'items.*.sleeve_type' => ['required', Rule::in(OrderItem::SLEEVE_TYPES)],
            'items.*.size' => ['required', Rule::in(OrderItem::SIZES)],
            'items.*.qty' => ['required', 'integer', 'min:1', 'max:100000'],
        ];
    }

    /** Kombinasi (jenis lengan, ukuran) tidak boleh muncul dua kali. */
    public function after(): array
    {
        return [function (Validator $validator) {
            $seen = [];
            foreach ((array) $this->input('items', []) as $i => $item) {
                if (! is_array($item) || ! is_string($item['sleeve_type'] ?? null) || ! is_string($item['size'] ?? null)) {
                    continue;
                }
                $key = $item['sleeve_type'].'|'.$item['size'];
                if (isset($seen[$key])) {
                    $validator->errors()->add("items.{$i}.size", "Ukuran {$item['size']} lengan {$item['sleeve_type']} tercantum lebih dari sekali.");
                }
                $seen[$key] = true;
            }
        }];
    }

    public function attributes(): array
    {
        return [
            'customer_name' => 'nama pelanggan',
            'customer_wa' => 'nomor WhatsApp',
            'due_date' => 'tenggat',
            'product_id' => 'produk',
            'color' => 'kombinasi warna bahan',
            'items' => 'rincian ukuran',
            'items.*.sleeve_type' => 'jenis lengan',
            'items.*.size' => 'ukuran',
            'items.*.qty' => 'qty',
        ];
    }
}
