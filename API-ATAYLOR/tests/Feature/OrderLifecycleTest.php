<?php

namespace Tests\Feature;

use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Alur pesanan end-to-end + aturan bisnis (BR) yang dijaga server.
 */
class OrderLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private function poloId(): string
    {
        return collect($this->api('admin', 'GET', '/products')->json('data'))
            ->firstWhere('name', 'Polo Shirt Lacoste Pique Bordir')['id'];
    }

    private function closerId(): string
    {
        return $this->api('admin', 'GET', '/marketing-closers')->json('data.0.id');
    }

    private function createOrder(array $overrides = []): array
    {
        return $this->api('admin', 'POST', '/orders', array_merge([
            'customer_name' => 'Uji Otomatis',
            'customer_wa' => '0812-3333-4444',
            'channel' => 'offline',
            'marketing_closer_id' => $this->closerId(),
            'due_date' => now()->addDays(30)->toDateString(),
            'product_id' => $this->poloId(), 'color' => 'Hitam',
            'items' => [['sleeve_type' => 'pendek', 'size' => 'L', 'qty' => 20]],
        ], $overrides))->assertCreated()->json('data');
    }

    private function latestVersionId(string $orderId): string
    {
        return $this->api('admin', 'GET', "/orders/{$orderId}")->json('data.designTicket.versions.0.id');
    }

    /** Bawa pesanan baru sampai SPK terbit & masuk Antrean. */
    private function orderWithSpk(): array
    {
        $order = $this->createOrder();
        $this->api('admin', 'POST', "/orders/{$order['id']}/design-versions")->assertCreated();
        $this->api('admin', 'POST', '/design-versions/'.$this->latestVersionId($order['id']).'/approve', ['channel' => 'manual_admin'])->assertOk();
        $pay = $this->api('admin', 'POST', "/orders/{$order['id']}/payments", ['method' => 'transfer', 'amount' => $order['dpRequired']])->json('data');
        $this->api('admin', 'POST', "/payments/{$pay['id']}/validate")->assertOk();
        $spk = $this->api('admin', 'POST', "/orders/{$order['id']}/spk")->assertCreated()->json('data');

        return [$order, $spk];
    }

    public function test_offline_order_requires_marketing_closer_br02(): void
    {
        $this->api('admin', 'POST', '/orders', [
            'customer_name' => 'Tanpa Closer', 'customer_wa' => '0812-1111-2222', 'channel' => 'offline',
            'due_date' => now()->addDays(30)->toDateString(),
            'product_id' => $this->poloId(), 'color' => 'Merah',
            'items' => [['sleeve_type' => 'pendek', 'size' => 'L', 'qty' => 20]],
        ])->assertStatus(422)->assertJsonPath('code', 'BR-02');
    }

    public function test_quantity_below_moq_is_rejected(): void
    {
        $this->api('admin', 'POST', '/orders', [
            'customer_name' => 'Uji MOQ', 'customer_wa' => '0812-1111-2222', 'channel' => 'online',
            'due_date' => now()->addDays(30)->toDateString(),
            'product_id' => $this->poloId(), 'color' => 'Merah',
            'items' => [['sleeve_type' => 'pendek', 'size' => 'L', 'qty' => 2]],
        ])->assertStatus(422)->assertJsonPath('code', 'MOQ');
    }

    public function test_dp_is_calculated_by_server_and_design_ticket_created_br04_br10(): void
    {
        $order = $this->createOrder();

        $this->assertSame(1900000, $order['totalAmount']);
        $this->assertSame(950000, $order['dpRequired']);
        $this->assertSame('baru', $this->api('admin', 'GET', "/orders/{$order['id']}")->json('data.designTicket.status'));
    }

    public function test_full_lifecycle_until_completed(): void
    {
        $order = $this->createOrder();
        $id = $order['id'];

        // Gate SPK menolak sebelum ACC & bayar (BR-05, BR-09)
        $this->api('admin', 'POST', "/orders/{$id}/spk")->assertStatus(422);

        // Desain: v1 -> revisi -> v2 -> ACC (BR-06)
        $this->api('admin', 'POST', "/orders/{$id}/design-versions")->assertCreated();
        $v1 = $this->latestVersionId($id);
        $this->api('admin', 'POST', "/design-versions/{$v1}/request-revision", ['feedback' => 'Logo diperbesar'])->assertOk();
        $this->api('admin', 'POST', "/orders/{$id}/design-versions")->assertCreated();
        $v2 = $this->latestVersionId($id);
        $this->api('admin', 'POST', "/design-versions/{$v1}/approve", ['channel' => 'manual_admin'])->assertStatus(422)->assertJsonPath('code', 'BR-06');
        $this->api('admin', 'POST', "/design-versions/{$v2}/approve", ['channel' => 'manual_admin'])->assertOk();
        $this->api('admin', 'POST', "/design-versions/{$v2}/approve", ['channel' => 'manual_admin'])->assertStatus(422);

        $detail = $this->api('admin', 'GET', "/orders/{$id}")->json('data');
        $this->assertSame('menunggu_pembayaran', $detail['status']);
        $this->assertSame('temp_24h', $detail['slotLockStatus']);

        // Kasir manual (BR-08)
        $this->api('admin', 'POST', "/orders/{$id}/payments", ['method' => 'transfer', 'amount' => 99999999])->assertStatus(422);
        $pay = $this->api('admin', 'POST', "/orders/{$id}/payments", ['method' => 'transfer', 'amount' => 950000])->assertCreated()->json('data');
        $this->assertSame('pending', $pay['status']);
        $this->api('admin', 'POST', "/payments/{$pay['id']}/validate")->assertOk()->assertJsonPath('data.status', 'valid');

        $res = $this->api('admin', 'GET', "/orders/{$id}")->json();
        $this->assertSame('permanent', $res['data']['slotLockStatus']);
        $this->assertSame('pembayaran_valid', $res['data']['status']);
        $this->assertTrue(collect($res['spkGate'])->every(fn ($ok) => $ok === true));

        // SPK: hanya Admin, sekali (BR-09, BR-27)
        $this->api('manager', 'POST', "/orders/{$id}/spk")->assertForbidden();
        $spk = $this->api('admin', 'POST', "/orders/{$id}/spk")->assertCreated()->json('data');
        $this->assertMatchesRegularExpression('/^SPK-AT-\d{4}-\d{4}$/', $spk['spkNumber']);
        $this->api('admin', 'POST', "/orders/{$id}/spk")->assertStatus(422);

        // Dispatch: hanya Owner/Manager (BR-27)
        $dispatch = ['vendor_name' => 'Mitra Uji', 'spk_receiver' => 'Pak Uji', 'material_sent_date' => now()->toDateString(), 'vendor_due_date' => now()->addDays(7)->toDateString()];
        $this->api('admin', 'PATCH', "/spk/{$spk['id']}/dispatch", $dispatch)->assertForbidden();
        $this->api('manager', 'PATCH', "/spk/{$spk['id']}/dispatch", $dispatch)->assertOk()->assertJsonPath('data.dispatchedBy', 'Doni Pratama');

        // Kanban (BR-12, BR-24)
        $this->api('admin', 'POST', "/orders/{$id}/move-stage", ['target_stage' => 'qc_pabrik'])->assertStatus(422)->assertJsonPath('code', 'BR-12');
        $this->api('admin', 'POST', "/orders/{$id}/move-stage", ['target_stage' => 'proses_jahit'])->assertOk()->assertJsonPath('data.status', 'produksi');
        $this->api('admin', 'POST', "/orders/{$id}/move-stage", ['target_stage' => 'antrean'])->assertStatus(422);
        $this->api('admin', 'POST', "/orders/{$id}/move-stage", ['target_stage' => 'antrean', 'reason_note' => 'Jahitan kerah miring'])->assertOk();
        foreach (['proses_jahit', 'proses_bordir_sablon', 'qc_pabrik'] as $stage) {
            $this->api('admin', 'POST', "/orders/{$id}/move-stage", ['target_stage' => $stage])->assertOk();
        }
        $this->api('admin', 'POST', "/orders/{$id}/move-stage", ['target_stage' => 'tiba_di_gudang'])->assertStatus(422)->assertJsonPath('code', 'BR-24');

        Storage::fake('local');
        $this->api('admin', 'POST', "/orders/{$id}/move-stage", [
            'target_stage' => 'tiba_di_gudang',
            'qc_photo' => UploadedFile::fake()->image('qc.jpg'),
        ])->assertOk()->assertJsonPath('data.status', 'menunggu_pelunasan');

        // Pelunasan -> selesai (BR-11)
        $final = $this->api('admin', 'POST', "/orders/{$id}/payments", ['method' => 'cash', 'amount' => 950000])->json('data');
        $this->api('admin', 'POST', "/payments/{$final['id']}/validate")->assertOk();
        $done = $this->api('admin', 'GET', "/orders/{$id}")->json('data');
        $this->assertSame('selesai', $done['status']);
        $this->assertSame(0, $done['remainingBalance']);

        // Jejak WIP & audit
        $histories = $this->api('owner', 'GET', '/kanban/histories')->json('data');
        $this->assertTrue(collect($histories)->contains('reasonNote', 'Jahitan kerah miring'));
        $this->assertGreaterThan(10, count($this->api('owner', 'GET', '/audit-logs')->json('data')));
    }

    public function test_slot_lock_expires_after_24_hours_br07(): void
    {
        $order = $this->createOrder();
        $id = $order['id'];
        $this->api('admin', 'POST', "/orders/{$id}/design-versions")->assertCreated();
        $this->api('admin', 'POST', '/design-versions/'.$this->latestVersionId($id).'/approve', ['channel' => 'manual_admin'])->assertOk();
        $pay = $this->api('admin', 'POST', "/orders/{$id}/payments", ['method' => 'transfer', 'amount' => 950000])->json('data');

        $this->db(fn () => Order::whereKey($id)->update(['slot_lock_expires_at' => now()->subMinute()]));

        $detail = $this->api('admin', 'GET', "/orders/{$id}")->json('data');
        $this->assertSame('expired', $detail['slotLockStatus']);
        $this->assertSame('kedaluwarsa', $detail['status']);

        // Pembayaran tetap tercatat valid tetapi kuota tidak otomatis permanen tanpa ACC ulang
        $this->api('admin', 'POST', "/payments/{$pay['id']}/validate")->assertOk();
        $this->assertNotSame('permanent', $this->api('admin', 'GET', "/orders/{$id}")->json('data.slotLockStatus'));
    }

    public function test_kanban_board_and_executive_export(): void
    {
        $this->orderWithSpk();

        $board = $this->api('admin', 'GET', '/kanban')->assertOk()->json('data');
        $this->assertSame(['antrean', 'proses_jahit', 'proses_bordir_sablon', 'qc_pabrik', 'tiba_di_gudang'], array_keys($board));

        $summary = $this->api('owner', 'GET', '/executive/summary')->assertOk()->json('data');
        $this->assertGreaterThan(0, $summary['kpi']['revenue']);

        $this->app['auth']->forgetGuards();
        $csv = $this->withToken($this->issueToken('owner'))->get('/api/v1/executive/export.csv');
        $csv->assertOk();
        $this->assertStringContainsString('Order Code', $csv->streamedContent());
    }
}
