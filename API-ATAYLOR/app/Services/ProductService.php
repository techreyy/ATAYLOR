<?php

namespace App\Services;

use App\Models\Product;

/**
 * Katalog produk (FR-AT-01, BR-19). Harga baru hanya berlaku untuk pesanan baru:
 * order_items menyimpan unit_price sendiri. Produk tidak dihapus, cukup dinonaktifkan.
 */
class ProductService
{
    private const FIELDS = [
        'name', 'category', 'base_price', 'moq', 'std_duration_days', 'daily_capacity',
        'design_sla_hours', 'dp_min_percent', 'free_revision_limit', 'is_active',
    ];

    public function __construct(private AuditLogger $audit)
    {
    }

    public function create(array $data): Product
    {
        $product = Product::create(array_intersect_key($data, array_flip(self::FIELDS)));
        $this->audit->log('PRODUCT_CREATED', $product, null, $product->only(self::FIELDS));

        return $product;
    }

    public function update(Product $product, array $data): Product
    {
        $old = $product->only(self::FIELDS);
        $product->fill(array_intersect_key($data, array_flip(self::FIELDS)));
        if (! $product->isDirty()) {
            return $product;
        }

        $changed = array_keys($product->getDirty());
        $product->save();
        $this->audit->log('PRODUCT_UPDATED', $product, array_intersect_key($old, array_flip($changed)), $product->only($changed));

        return $product;
    }
}
