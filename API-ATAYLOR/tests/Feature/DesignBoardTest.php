<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DesignBoardTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private function board(string $role): array
    {
        return $this->api($role, 'GET', '/design-tickets')->assertOk()->json('data');
    }

    private function ticketFor(string $role, string $orderCode): ?array
    {
        return collect($this->board($role))->firstWhere('orderCode', $orderCode);
    }

    public function test_board_lists_real_tickets_with_order_context_for_all_internal_roles(): void
    {
        $ticket = $this->ticketFor('designer', 'ORD-2026-005');
        // Seed ORD-2026-005: brief lengkap, belum ada desain, 120 pcs Kaos (revisi gratis 3x)
        $this->assertSame('baru', $ticket['status']);
        $this->assertSame('brief_lengkap', $ticket['orderStatus']);
        $this->assertSame(120, $ticket['totalQty']);
        $this->assertSame(3, $ticket['freeRevisionLimit']);
        $this->assertNotEmpty($ticket['productName']);
        $this->assertNotNull($ticket['slaDueAt']);
        $this->assertSame([], $ticket['versions']);

        // Tiket selesai ikut tampil beserta versi & bukti ACC
        $done = $this->ticketFor('designer', 'ORD-2026-002');
        $this->assertSame('selesai', $done['status']);
        $this->assertSame(2, $done['versions'][0]['versionNo']);
        $this->assertNotNull($done['versions'][0]['approval']);

        // Tiket berjalan tampil lebih dulu daripada tiket selesai
        $statuses = array_column($this->board('admin'), 'status');
        $this->assertSame('baru', $statuses[0]);

        foreach (['owner', 'manager'] as $role) {
            $this->assertNotNull($this->ticketFor($role, 'ORD-2026-005'));
        }
    }

    public function test_cancelled_orders_and_other_tenants_are_hidden(): void
    {
        $this->db(fn () => Order::where('order_code', 'ORD-2026-002')->update(['status' => 'dibatalkan']));
        $this->assertNull($this->ticketFor('designer', 'ORD-2026-002'));

        $this->app['auth']->forgetGuards();
        $token = $this->postJson('/api/v1/auth/login', ['email' => 'admin@tenantb.demo', 'password' => 'ataylor123'])->json('token');
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/v1/design-tickets')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_designer_starts_ticket_then_uploads_mockup(): void
    {
        $ticket = $this->ticketFor('designer', 'ORD-2026-005');

        // Designer yang mengambil tiket (Owner juga boleh karena mengakses semua fitur; Admin tidak)
        $this->api('admin', 'POST', "/design-tickets/{$ticket['id']}/start")->assertForbidden();

        $this->api('designer', 'POST', "/design-tickets/{$ticket['id']}/start")
            ->assertOk()
            ->assertJsonPath('data.status', 'dikerjakan')
            ->assertJsonPath('data.designerName', 'Rian Desain');

        $after = $this->ticketFor('designer', 'ORD-2026-005');
        $this->assertSame(['dikerjakan', 'desain_dikerjakan'], [$after['status'], $after['orderStatus']]);
        $this->assertTrue($this->db(fn () => AuditLog::where('action', 'DESIGN_TICKET_STARTED')->where('entity_id', $ticket['orderId'])->exists()));

        // Tidak bisa diambil dua kali
        $this->api('designer', 'POST', "/design-tickets/{$ticket['id']}/start")
            ->assertStatus(422)
            ->assertJsonPath('code', 'BR-04');

        // Mockup v1 dari board → menunggu ACC
        $this->api('designer', 'POST', "/orders/{$ticket['orderId']}/design-versions")->assertCreated();
        $sent = $this->ticketFor('designer', 'ORD-2026-005');
        $this->assertSame(['menunggu_acc', 'menunggu_acc'], [$sent['status'], $sent['orderStatus']]);
        $this->assertSame(1, $sent['versions'][0]['versionNo']);
    }

    public function test_cannot_start_ticket_that_already_has_progress(): void
    {
        $done = $this->ticketFor('designer', 'ORD-2026-004');
        $this->api('designer', 'POST', "/design-tickets/{$done['id']}/start")
            ->assertStatus(422)
            ->assertJsonPath('code', 'BR-04');
    }
}
