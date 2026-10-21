<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Sakelar High/Low Season (BR-21) tersimpan di tenants.automation_mode, diubah hanya oleh Owner.
 */
class AutomationModeTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_owner_switches_mode_and_every_role_sees_it(): void
    {
        $this->assertSame('high_on', $this->api('admin', 'GET', '/auth/me')->json('user.automationMode'));

        $this->api('owner', 'PATCH', '/tenant/automation-mode', ['automation_mode' => 'low_off'])
            ->assertOk()
            ->assertJsonPath('automationMode', 'low_off');

        // Tersimpan di database, bukan di browser: peran lain ikut melihat
        $this->assertSame('low_off', $this->api('admin', 'GET', '/auth/me')->json('user.automationMode'));
        $this->assertSame('low_off', $this->api('designer', 'GET', '/auth/me')->json('user.automationMode'));

        $log = $this->db(fn () => AuditLog::where('action', 'AUTOMATION_MODE_CHANGED')->first());
        $this->assertSame(['automation_mode' => 'high_on'], $log->old_values);
        $this->assertSame(['automation_mode' => 'low_off'], $log->new_values);
        $this->assertSame($log->entity_id, $log->tenant_id);
    }

    public function test_only_owner_can_switch_and_value_is_validated(): void
    {
        $this->api('admin', 'PATCH', '/tenant/automation-mode', ['automation_mode' => 'low_off'])->assertForbidden();
        $this->api('manager', 'PATCH', '/tenant/automation-mode', ['automation_mode' => 'low_off'])->assertForbidden();
        $this->api('owner', 'PATCH', '/tenant/automation-mode', ['automation_mode' => 'mati'])->assertStatus(422);

        $this->assertSame(['high_on'], $this->db(fn () => Tenant::pluck('automation_mode')->unique()->values()->all()));
    }
}
