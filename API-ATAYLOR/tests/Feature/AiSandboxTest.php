<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Chat percobaan AI Training: katalog database masuk ke instruksi AI, tanpa data pelanggan; kunci tidak bocor.
 * Panggilan Gemini dipalsukan (Http::fake) — test tidak memakai kuota.
 */
class AiSandboxTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.gemini.key', 'kunci-uji-rahasia');
        config()->set('services.gemini.model', 'gemini-uji');
    }

    private function fakeGemini(string $reply = 'Halo Kak! Polo kami Rp 95.000/pcs.'): void
    {
        Http::fake(['generativelanguage.googleapis.com/*' => Http::response([
            'candidates' => [['content' => ['parts' => [['text' => 'pikiran internal', 'thought' => true], ['text' => $reply]]], 'finishReason' => 'STOP']],
            'usageMetadata' => ['promptTokenCount' => 900, 'candidatesTokenCount' => 30, 'thoughtsTokenCount' => 40],
            'modelVersion' => 'gemini-uji',
        ])]);
    }

    public function test_owner_chats_with_catalog_context_and_no_customer_data(): void
    {
        $this->fakeGemini();

        $res = $this->api('owner', 'POST', '/ai/sandbox-chat', ['messages' => [
            ['role' => 'user', 'text' => 'Halo, polo berapa?'],
            ['role' => 'assistant', 'text' => 'Halo Kak!'],
            ['role' => 'user', 'text' => 'Bisa diskon?'],
        ]])->assertOk();

        // Bagian "thought" tidak ikut ditampilkan
        $this->assertSame('Halo Kak! Polo kami Rp 95.000/pcs.', $res->json('reply'));
        $this->assertSame(['input' => 900, 'output' => 30, 'thinking' => 40], $res->json('usage'));
        $this->assertStringNotContainsString('kunci-uji-rahasia', $res->getContent());

        Http::assertSent(function (Request $req) {
            $system = $req['systemInstruction']['parts'][0]['text'];

            return $req->hasHeader('x-goog-api-key', 'kunci-uji-rahasia')
                && str_contains($req->url(), 'models/gemini-uji:generateContent')
                && str_contains($system, 'Polo Shirt Lacoste Pique Bordir (')
                && str_contains($system, 'Rp 95.000/pcs, MOQ 15 pcs, DP minimum 50%')
                && str_contains($system, 'Jangan memberi diskon')
                && str_contains($system, 'Jangan menjanjikan tanggal')
                && ! str_contains($system, 'Komunitas Futsal Bahteramas') // nama pelanggan tidak dikirim
                && ! str_contains($system, '0852-')
                && array_column($req['contents'], 'role') === ['user', 'model', 'user'];
        });
    }

    public function test_only_owner_and_valid_conversation(): void
    {
        $this->fakeGemini();
        $msg = ['messages' => [['role' => 'user', 'text' => 'Halo']]];

        $this->api('admin', 'POST', '/ai/sandbox-chat', $msg)->assertForbidden();
        $this->api('designer', 'POST', '/ai/sandbox-chat', $msg)->assertForbidden();
        $this->api('owner', 'POST', '/ai/sandbox-chat', ['messages' => []])->assertStatus(422);
        $this->api('owner', 'POST', '/ai/sandbox-chat', ['messages' => [['role' => 'assistant', 'text' => 'Halo']]])->assertStatus(422);
        $this->api('owner', 'POST', '/ai/sandbox-chat', ['messages' => [['role' => 'user', 'text' => str_repeat('a', 1001)]]])->assertStatus(422);
        Http::assertNothingSent();
    }

    public function test_missing_key_and_provider_error_give_clear_message(): void
    {
        config()->set('services.gemini.key', null);
        $msg = ['messages' => [['role' => 'user', 'text' => 'Halo']]];
        $this->api('owner', 'POST', '/ai/sandbox-chat', $msg)->assertStatus(503)->assertJsonPath('code', 'AI_UNAVAILABLE');

        config()->set('services.gemini.key', 'kunci-uji-rahasia');
        Http::fake(['generativelanguage.googleapis.com/*' => Http::response(['error' => ['status' => 'PERMISSION_DENIED']], 403)]);
        $res = $this->api('owner', 'POST', '/ai/sandbox-chat', $msg)->assertStatus(502);
        $this->assertStringContainsString('kode 403', $res->json('message'));
        $this->assertStringNotContainsString('kunci-uji-rahasia', $res->getContent());
    }

    public function test_busy_provider_is_retried_then_answers(): void
    {
        Http::fakeSequence('generativelanguage.googleapis.com/*')
            ->push(['error' => ['status' => 'UNAVAILABLE']], 503)
            ->push([
                'candidates' => [['content' => ['parts' => [['text' => 'Halo Kak!']]], 'finishReason' => 'STOP']],
                'usageMetadata' => ['promptTokenCount' => 10, 'candidatesTokenCount' => 3],
            ]);

        $this->api('owner', 'POST', '/ai/sandbox-chat', ['messages' => [['role' => 'user', 'text' => 'Halo']]])
            ->assertOk()
            ->assertJsonPath('reply', 'Halo Kak!');
        Http::assertSentCount(2);
    }
}
