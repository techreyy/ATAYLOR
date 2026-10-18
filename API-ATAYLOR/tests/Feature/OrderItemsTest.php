<?php

namespace Tests\Feature;

use App\Models\OrderItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Rincian pesanan per ukuran × jenis lengan (form tambah pesanan).
 * Produk uji: Polo — Rp95.000/pcs, MOQ 15, DP 50%.
 */
class OrderItemsTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private function poloId(): string
    {
        return collect($this->api('admin', 'GET', '/products')->json('data'))
            ->firstWhere('name', 'Polo Shirt Lacoste Pique Bordir')['id'];
    }

    private function postOrder(array $items, array $overrides = []): \Illuminate\Testing\TestResponse
    {
        return $this->api('admin', 'POST', '/orders', array_merge([
            'customer_name' => 'Uji Rincian', 'customer_wa' => '0812-7777-8888', 'channel' => 'online',
            'due_date' => now()->addDays(30)->toDateString(),
            'product_id' => $this->poloId(), 'color' => 'Navy / Emas',
            'items' => $items,
        ], $overrides));
    }

    public function test_multi_size_and_two_sleeve_types_are_saved_with_server_totals(): void
    {
        $order = $this->postOrder([
            ['sleeve_type' => 'pendek', 'size' => 'M', 'qty' => 10],
            ['sleeve_type' => 'pendek', 'size' => 'L', 'qty' => 8],
            ['sleeve_type' => 'panjang', 'size' => 'L', 'qty' => 5],
        ])->assertCreated()->json('data');

        $this->assertSame(23 * 95000, $order['totalAmount']);
        $this->assertSame((int) ceil(23 * 95000 / 2), $order['dpRequired']);
        $this->assertCount(3, $order['items']);
        $this->assertSame(23, collect($order['items'])->sum('qty'));

        $panjang = collect($order['items'])->where('sleeveType', 'panjang')->values();
        $this->assertCount(1, $panjang);
        $this->assertSame(['L', 5, 5 * 95000, 'Navy / Emas'], [$panjang[0]['size'], $panjang[0]['qty'], $panjang[0]['subtotal'], $panjang[0]['color']]);

        $rows = $this->db(fn () => OrderItem::withoutGlobalScopes()->where('order_id', $order['id'])->get());
        $this->assertSame(['panjang' => 5, 'pendek' => 18], $rows->groupBy('sleeve_type')->map->sum('qty')->sortKeys()->all());
    }

    public function test_zero_or_negative_qty_is_rejected(): void
    {
        $this->postOrder([['sleeve_type' => 'pendek', 'size' => 'M', 'qty' => 0], ['sleeve_type' => 'pendek', 'size' => 'L', 'qty' => 20]])
            ->assertStatus(422)->assertJsonValidationErrors('items.0.qty');
        $this->postOrder([['sleeve_type' => 'pendek', 'size' => 'M', 'qty' => -3], ['sleeve_type' => 'pendek', 'size' => 'L', 'qty' => 20]])
            ->assertStatus(422)->assertJsonValidationErrors('items.0.qty');
        $this->postOrder([])->assertStatus(422)->assertJsonValidationErrors('items');
    }

    public function test_invalid_size_or_sleeve_type_is_rejected(): void
    {
        $this->postOrder([['sleeve_type' => 'pendek', 'size' => 'XXXL', 'qty' => 20]])
            ->assertStatus(422)->assertJsonValidationErrors('items.0.size');
        $this->postOrder([['sleeve_type' => 'pendek', 'size' => 'All Size', 'qty' => 20]])
            ->assertStatus(422)->assertJsonValidationErrors('items.0.size');
        $this->postOrder([['sleeve_type' => 'tanpa_lengan', 'size' => 'L', 'qty' => 20]])
            ->assertStatus(422)->assertJsonValidationErrors('items.0.sleeve_type');
    }

    public function test_duplicate_sleeve_and_size_combination_is_rejected(): void
    {
        $this->postOrder([
            ['sleeve_type' => 'pendek', 'size' => 'L', 'qty' => 10],
            ['sleeve_type' => 'pendek', 'size' => 'L', 'qty' => 10],
        ])->assertStatus(422)->assertJsonValidationErrors('items.1.size');

        // Ukuran sama dengan jenis lengan berbeda tetap boleh
        $this->postOrder([
            ['sleeve_type' => 'pendek', 'size' => 'L', 'qty' => 10],
            ['sleeve_type' => 'panjang', 'size' => 'L', 'qty' => 10],
        ])->assertCreated();
    }

    public function test_moq_is_checked_against_total_qty(): void
    {
        // 7 + 7 = 14 < MOQ 15
        $this->postOrder([
            ['sleeve_type' => 'pendek', 'size' => 'M', 'qty' => 7],
            ['sleeve_type' => 'panjang', 'size' => 'M', 'qty' => 7],
        ])->assertStatus(422)->assertJsonPath('code', 'MOQ');

        // tiap baris < MOQ, tetapi total 16 ≥ MOQ → diterima
        $this->postOrder([
            ['sleeve_type' => 'pendek', 'size' => 'M', 'qty' => 8],
            ['sleeve_type' => 'panjang', 'size' => 'M', 'qty' => 8],
        ])->assertCreated();
    }

    public function test_prices_sent_by_browser_are_ignored(): void
    {
        $order = $this->postOrder(
            [['sleeve_type' => 'pendek', 'size' => 'L', 'qty' => 20, 'unit_price' => 1, 'subtotal' => 20]],
            ['unit_price' => 1, 'total_amount' => 20, 'dp_required' => 0],
        )->assertCreated()->json('data');

        $this->assertSame(20 * 95000, $order['totalAmount']);
        $this->assertSame(10 * 95000, $order['dpRequired']);
        $this->assertSame(95000, $order['items'][0]['unitPrice']);
        $this->assertSame(20 * 95000, $order['items'][0]['subtotal']);
    }

    public function test_old_rows_without_sleeve_type_default_to_pendek(): void
    {
        $sleeve = $this->db(function () {
            $row = (array) DB::table('order_items')->first();
            unset($row['sleeve_type']);
            $row['id'] = (string) Str::uuid();
            DB::table('order_items')->insert($row);

            return DB::table('order_items')->where('id', $row['id'])->value('sleeve_type');
        });
        $this->assertSame('pendek', $sleeve);

        $items = $this->api('admin', 'GET', '/orders/ORD-2026-005')->assertOk()->json('data.items');
        $this->assertSame(['panjang' => 20, 'pendek' => 100], collect($items)->groupBy('sleeveType')->map->sum('qty')->sortKeys()->all());
    }
}
