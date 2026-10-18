<?php

namespace Tests\Feature;

use App\Models\DesignTicket;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private function notifications(string $role): array
    {
        return $this->api($role, 'GET', '/notifications')->assertOk()->json('data');
    }

    private function types(array $data): array
    {
        return array_values(array_unique(array_column($data['items'], 'type')));
    }

    public function test_admin_sees_actionable_items_with_links(): void
    {
        $data = $this->notifications('admin');
        $types = $this->types($data);

        // Seed: ORD-2026-002 punya pembayaran pending, ORD-2026-006 lewat tenggat, ORD-2026-008 menunggu pelunasan
        foreach (['payment_pending', 'overdue', 'awaiting_settlement'] as $type) {
            $this->assertContains($type, $types);
        }
        $this->assertNotContains('spk_not_dispatched', $types); // dispatch wewenang Owner/Manager (BR-27)
        $this->assertSame(count(array_filter($data['items'], fn ($i) => $i['severity'] === 'danger')), $data['urgent']);

        $overdue = collect($data['items'])->firstWhere('orderCode', 'ORD-2026-006');
        $this->assertSame('danger', $overdue['severity']);
        $this->assertSame('/orders/ORD-2026-006', $overdue['href']);
        // item paling mendesak tampil lebih dulu
        $this->assertSame('danger', $data['items'][0]['severity']);
    }

    public function test_owner_and_designer_see_role_specific_items(): void
    {
        $owner = $this->types($this->notifications('owner'));
        $this->assertContains('spk_not_dispatched', $owner);
        $this->assertNotContains('payment_pending', $owner);

        // Tiket desain yang melewati SLA muncul untuk Designer
        $this->db(fn () => DesignTicket::whereHas('order', fn ($q) => $q->where('order_code', 'ORD-2026-005'))
            ->update(['status' => 'dikerjakan', 'sla_due_at' => now()->subHour()]));
        $designer = $this->notifications('designer');
        $this->assertSame(['design_sla'], $this->types($designer));
        $item = collect($designer['items'])->firstWhere('orderCode', 'ORD-2026-005');
        $this->assertSame(['danger', 'SLA desain terlewat'], [$item['severity'], $item['title']]);
    }

    public function test_item_disappears_once_handled(): void
    {
        $pending = collect($this->notifications('admin')['items'])->where('type', 'payment_pending');
        $this->assertNotEmpty($pending);

        $orderId = $this->db(fn () => Order::where('order_code', $pending->first()['orderCode'])->value('id'));
        foreach ($this->api('admin', 'GET', "/orders/{$orderId}")->json('data.payments') as $payment) {
            if ($payment['status'] === 'pending') {
                $this->api('admin', 'POST', "/payments/{$payment['id']}/reject", ['notes' => 'Bukti tidak terbaca'])->assertOk();
            }
        }

        $after = collect($this->notifications('admin')['items'])->where('type', 'payment_pending')->pluck('orderCode');
        $this->assertNotContains($pending->first()['orderCode'], $after);
    }
}
