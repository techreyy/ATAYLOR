<?php

namespace Tests;

use App\Support\TenantContext;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Testing\TestResponse;

abstract class TestCase extends BaseTestCase
{
    /** @var array<string, string> token Sanctum per peran demo */
    private array $tokens = [];

    /**
     * Kirim request API sebagai akun demo peran tertentu (token asli lewat /auth/demo-login).
     */
    protected function api(string $role, string $method, string $uri, array $data = []): TestResponse
    {
        $token = $this->tokens[$role] ??= $this->issueToken($role);
        $this->app['auth']->forgetGuards(); // jangan bawa user dari request sebelumnya

        return $this->withToken($token)->json($method, '/api/v1'.$uri, $data);
    }

    protected function issueToken(string $role): string
    {
        $this->app['auth']->forgetGuards();
        $res = $this->postJson('/api/v1/auth/demo-login', ['role' => $role])->assertOk();

        return $res->json('token');
    }

    /**
     * Akses database langsung dari test melewati RLS (seperti proses sistem / seeder).
     */
    protected function db(callable $callback): mixed
    {
        return app(TenantContext::class)->bypass($callback);
    }
}
