<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthAndTenancyTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_login_with_email_and_password(): void
    {
        $this->postJson('/api/v1/auth/login', ['email' => 'admin@ataylor.demo', 'password' => 'ataylor123'])
            ->assertOk()
            ->assertJsonPath('user.role', 'admin');

        $this->postJson('/api/v1/auth/login', ['email' => 'admin@ataylor.demo', 'password' => 'salah'])
            ->assertStatus(422);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/v1/orders')->assertUnauthorized();
    }

    public function test_tenant_data_is_isolated_by_rls(): void
    {
        $aTaylor = $this->api('admin', 'GET', '/orders')->assertOk()->json('data');
        $this->assertCount(8, $aTaylor);
        $this->assertFalse(collect($aTaylor)->contains(fn ($o) => str_contains($o['customerName'], 'Tenant B')));

        $this->app['auth']->forgetGuards();
        $token = $this->postJson('/api/v1/auth/login', ['email' => 'admin@tenantb.demo', 'password' => 'ataylor123'])->json('token');
        $this->app['auth']->forgetGuards();
        $tenantB = $this->withToken($token)->getJson('/api/v1/orders')->assertOk()->json('data');

        $this->assertCount(1, $tenantB);
        $this->assertSame('Pelanggan Rahasia Tenant B', $tenantB[0]['customerName']);
    }

    public function test_role_based_access_is_enforced_server_side(): void
    {
        $this->api('owner', 'POST', '/orders', [])->assertForbidden();          // hanya Admin input order
        $this->api('admin', 'GET', '/executive/summary')->assertForbidden();    // Executive khusus Owner
        $this->api('designer', 'GET', '/payments')->assertForbidden();          // Kasir khusus Admin
        $this->api('owner', 'GET', '/executive/summary')->assertOk();
    }
}
