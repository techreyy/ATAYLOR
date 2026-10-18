<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SequenceAndFilesTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private function newOrderPayload(): array
    {
        $productId = collect($this->api('admin', 'GET', '/products')->json('data'))->firstWhere('moq', 12)['id'];

        return [
            'customer_name' => 'Uji Nomor', 'customer_wa' => '0812-5555-6666', 'channel' => 'online',
            'due_date' => now()->addDays(30)->toDateString(),
            'items' => [['product_id' => $productId, 'color' => 'Putih', 'size' => 'M', 'qty' => 12]],
        ];
    }

    public function test_order_code_keeps_increasing_after_999(): void
    {
        $year = now()->year;
        $this->db(fn () => Order::where('order_code', "ORD-{$year}-008")->update(['order_code' => "ORD-{$year}-999"]));

        $first = $this->api('admin', 'POST', '/orders', $this->newOrderPayload())->assertCreated()->json('data.orderCode');
        $second = $this->api('admin', 'POST', '/orders', $this->newOrderPayload())->assertCreated()->json('data.orderCode');

        $this->assertSame("ORD-{$year}-1000", $first);
        $this->assertSame("ORD-{$year}-1001", $second); // dulu: bentrok karena "1000" < "999" secara teks
    }

    public function test_payment_proof_is_private_and_served_via_signed_url(): void
    {
        Storage::fake('local');
        $orderId = $this->api('admin', 'GET', '/orders', ['q' => 'ORD-2026-002'])->json('data.0.id')
            ?? $this->api('admin', 'GET', '/orders')->json('data.0.id');

        $payment = $this->api('admin', 'POST', "/orders/{$orderId}/payments", [
            'method' => 'transfer',
            'amount' => 1000,
            'proof' => UploadedFile::fake()->image('bukti.jpg'),
        ])->assertCreated()->json('data');

        // Tersimpan di disk privat sebagai path, bukan URL publik
        $stored = $this->db(fn () => Payment::find($payment['id'])->proof_url);
        $this->assertStringStartsWith('tenants/', $stored);
        Storage::disk('local')->assertExists($stored);

        // URL bertanda tangan bisa dibuka, tanpa tanda tangan / diubah ditolak
        $signed = $payment['proofUrl'];
        $this->assertStringContainsString('signature=', $signed);
        $this->get($signed)->assertOk();
        $this->get(strtok($signed, '?'))->assertForbidden();
        $tampered = str_replace('/files/tenants/', '/files/tenants/x', $signed);
        $this->assertNotSame($signed, $tampered);
        $this->get($tampered)->assertForbidden(); // path diubah => tanda tangan tidak cocok
    }
}
