<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\OrderItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Katalog AI Training (FR-AT-01, BR-19) dan pola pesanan untuk konteks AI.
 */
class CatalogTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private function productPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Rompi Proyek Reflektor', 'category' => 'Rompi', 'base_price' => 75000, 'moq' => 20,
            'std_duration_days' => 6, 'daily_capacity' => 90, 'design_sla_hours' => 24,
            'dp_min_percent' => 50, 'free_revision_limit' => 3, 'is_active' => true,
        ], $overrides);
    }

    /** Payload PATCH dari data produk saat ini (respons API camelCase) + perubahan. */
    private function payloadFrom(array $p, array $changes): array
    {
        return array_merge([
            'name' => $p['name'], 'category' => $p['category'], 'base_price' => $p['basePrice'], 'moq' => $p['moq'],
            'std_duration_days' => $p['stdDurationDays'], 'daily_capacity' => $p['dailyCapacity'],
            'design_sla_hours' => $p['designSlaHours'], 'dp_min_percent' => $p['dpMinPercent'],
            'free_revision_limit' => $p['freeRevisionLimit'], 'is_active' => $p['isActive'],
        ], $changes);
    }

    private function product(string $name): array
    {
        return collect($this->api('owner', 'GET', '/products?include_inactive=1')->json('data'))->firstWhere('name', $name);
    }

    private function orderPayload(string $productId, int $qty = 20): array
    {
        return [
            'customer_name' => 'Uji Katalog', 'customer_wa' => '0812-9999-0000', 'channel' => 'online',
            'due_date' => now()->addDays(30)->toDateString(), 'product_id' => $productId, 'color' => 'Hitam',
            'items' => [['sleeve_type' => 'pendek', 'size' => 'L', 'qty' => $qty]],
        ];
    }

    public function test_only_owner_can_add_and_edit_products(): void
    {
        $this->api('admin', 'POST', '/products', $this->productPayload())->assertForbidden();
        $created = $this->api('owner', 'POST', '/products', $this->productPayload())->assertCreated()->json('data');

        $this->assertSame(75000, $created['basePrice']);
        $this->assertContains('Rompi Proyek Reflektor', array_column($this->api('admin', 'GET', '/products')->json('data'), 'name'));

        $this->api('manager', 'PATCH', "/products/{$created['id']}", $this->productPayload(['base_price' => 1000]))->assertForbidden();
    }

    public function test_price_change_applies_to_new_orders_only_and_is_audited(): void
    {
        $polo = $this->product('Polo Shirt Lacoste Pique Bordir');
        $old = $this->api('admin', 'POST', '/orders', $this->orderPayload($polo['id']))->assertCreated()->json('data');

        $this->api('owner', 'PATCH', "/products/{$polo['id']}", $this->payloadFrom($polo, ['base_price' => 99000]))
            ->assertOk()->assertJsonPath('data.basePrice', 99000);

        $new = $this->api('admin', 'POST', '/orders', $this->orderPayload($polo['id']))->assertCreated()->json('data');
        $this->assertSame(20 * 99000, $new['totalAmount']);
        $this->assertSame(95000, $this->db(fn () => OrderItem::where('order_id', $old['id'])->value('unit_price')));

        $log = $this->db(fn () => AuditLog::where('action', 'PRODUCT_UPDATED')->where('entity_id', $polo['id'])->latest()->first());
        $this->assertSame(['base_price' => 95000], $log->old_values);
        $this->assertSame(['base_price' => 99000], $log->new_values);
    }

    public function test_inactive_product_is_hidden_from_order_form_and_rejected(): void
    {
        $polo = $this->product('Polo Shirt Lacoste Pique Bordir');
        $this->api('owner', 'PATCH', "/products/{$polo['id']}", $this->payloadFrom($polo, ['is_active' => false]))->assertOk();

        $this->assertNotContains($polo['name'], array_column($this->api('admin', 'GET', '/products')->json('data'), 'name'));
        // include_inactive hanya berlaku untuk Owner
        $this->assertNotContains($polo['name'], array_column($this->api('admin', 'GET', '/products?include_inactive=1')->json('data'), 'name'));
        $this->assertFalse($this->product($polo['name'])['isActive']);

        $this->api('admin', 'POST', '/orders', $this->orderPayload($polo['id']))->assertStatus(422)->assertJsonPath('code', 'BR-20');
    }

    public function test_product_validation(): void
    {
        $this->api('owner', 'POST', '/products', $this->productPayload(['name' => 'Polo Shirt Lacoste Pique Bordir']))
            ->assertStatus(422)->assertJsonValidationErrors('name');
        $this->api('owner', 'POST', '/products', $this->productPayload(['base_price' => 500, 'dp_min_percent' => 120, 'moq' => 0]))
            ->assertStatus(422)->assertJsonValidationErrors(['base_price', 'dp_min_percent', 'moq']);
    }

    public function test_order_insights_cover_manual_orders_without_customer_data(): void
    {
        $res = $this->api('admin', 'GET', '/ai/order-insights?days=90')->assertOk();
        $data = $res->json('data');

        $this->assertGreaterThan(0, $data['summary']['offline']); // pesanan input manual ikut dihitung
        $this->assertSame($data['summary']['offline'] + $data['summary']['online'], $data['summary']['orders']);
        $this->assertSame(array_sum(array_column($data['sizes'], 'pcs')), $data['summary']['pcs']);
        $this->assertGreaterThan(0, collect($data['sleeves'])->firstWhere('sleeveType', 'panjang')['pcs']);
        $this->assertNotEmpty($data['products']);
        $this->assertNotEmpty($data['facts']);

        // tidak membawa nama / nomor pelanggan
        $this->assertStringNotContainsString('(Contoh)', $res->getContent());
        $this->assertStringNotContainsString('0812-', $res->getContent());

        $this->api('designer', 'GET', '/ai/order-insights')->assertForbidden();
    }
}
