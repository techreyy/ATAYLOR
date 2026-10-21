<?php

namespace App\Services;

use App\Exceptions\AiUnavailableException;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Tenant;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Chat percobaan AI Training (FR-AT sandbox): Owner menguji gaya & kepatuhan chatbot sebelum WhatsApp tersambung.
 * Angka (harga, MOQ, DP) hanya dari katalog database (BR-20); tidak ada data pelanggan yang dikirim ke LLM.
 * Belum ada mesin kapasitas, jadi AI dilarang menjanjikan tanggal (BR-15/16).
 */
class AiSandboxService
{
    /**
     * @param  array<int, array{role: string, text: string}>  $messages  percakapan, pesan terakhir dari pengguna
     * @return array{reply: string, model: string, usage: array{input: int, output: int, thinking: int}}
     */
    public function chat(Tenant $tenant, array $messages): array
    {
        $key = config('services.gemini.key');
        if (! $key) {
            throw new AiUnavailableException('AI belum dikonfigurasi di server (GEMINI_API_KEY kosong).');
        }
        $model = config('services.gemini.model');

        try {
            $response = Http::withHeaders(['x-goog-api-key' => $key])
                ->timeout(45)
                // Penyedia sibuk/limit sesaat (429/500/503): coba ulang 2x dengan jeda 1 detik
                ->retry(2, 1000, fn ($e) => $e instanceof RequestException && in_array($e->response->status(), [429, 500, 503], true), throw: false)
                ->post(rtrim(config('services.gemini.base_url'), '/')."/models/{$model}:generateContent", [
                    'systemInstruction' => ['parts' => [['text' => $this->systemPrompt($tenant)]]],
                    'contents' => array_map(fn (array $m) => [
                        'role' => $m['role'] === 'assistant' ? 'model' : 'user',
                        'parts' => [['text' => $m['text']]],
                    ], $messages),
                    'generationConfig' => [
                        'temperature' => 0.4,
                        'maxOutputTokens' => 800,
                        'thinkingConfig' => ['thinkingLevel' => 'low'],
                    ],
                ]);
        } catch (ConnectionException) {
            throw new AiUnavailableException('Tidak dapat terhubung ke layanan AI. Periksa koneksi internet server.', 502);
        }

        if (in_array($response->status(), [429, 500, 503], true)) {
            throw new AiUnavailableException('Layanan AI sedang sibuk. Coba kirim lagi beberapa detik lagi.', 503);
        }
        if ($response->failed()) {
            Log::warning('AI sandbox: penyedia menolak permintaan', ['status' => $response->status(), 'error' => $response->json('error.status')]);
            throw new AiUnavailableException("Layanan AI menolak permintaan (kode {$response->status()}). Coba lagi atau periksa kunci API.", 502);
        }

        $candidate = $response->json('candidates.0');
        $text = collect($candidate['content']['parts'] ?? [])
            ->reject(fn (array $p) => $p['thought'] ?? false)
            ->pluck('text')
            ->implode('');

        if (trim($text) === '') {
            $reason = $candidate['finishReason'] ?? $response->json('promptFeedback.blockReason') ?? 'tanpa alasan';
            throw new AiUnavailableException("AI tidak memberi jawaban ({$reason}). Coba ubah pertanyaan.", 502);
        }

        $usage = [
            'input' => (int) $response->json('usageMetadata.promptTokenCount', 0),
            'output' => (int) $response->json('usageMetadata.candidatesTokenCount', 0),
            'thinking' => (int) $response->json('usageMetadata.thoughtsTokenCount', 0),
        ];
        // Pantau biaya tanpa mencatat isi percakapan
        Log::info('AI sandbox chat', ['tenant_id' => $tenant->id, 'model' => $model] + $usage);

        return ['reply' => trim($text), 'model' => $response->json('modelVersion') ?? $model, 'usage' => $usage];
    }

    /** Persona + aturan wajib + katalog aktif tenant. */
    public function systemPrompt(Tenant $tenant): string
    {
        $catalog = Product::where('is_active', true)->orderBy('name')->get()
            ->map(fn (Product $p) => sprintf(
                '- %s (%s): Rp %s/pcs, MOQ %d pcs, DP minimum %d%%, durasi produksi standar %d hari kerja, revisi desain gratis %d kali.',
                $p->name, $p->category, number_format($p->base_price, 0, ',', '.'), $p->moq,
                $p->dp_min_percent, $p->std_duration_days, $p->free_revision_limit,
            ))
            ->implode("\n");

        $sizes = implode(', ', OrderItem::SIZES);

        return <<<PROMPT
Kamu adalah admin WhatsApp {$tenant->name}, usaha konveksi (pembuatan kaos, polo, jaket, seragam) di Kendari, Sulawesi Tenggara (zona waktu WITA).
Ini MODE UJI COBA untuk Owner: tidak ada pesan yang benar-benar terkirim ke pelanggan.

GAYA: ramah dan sopan, bahasa Indonesia santai-profesional, sapa pelanggan "Kak", jawab singkat seperti chat WhatsApp (maksimal 5 kalimat), tanpa format markdown.

ATURAN WAJIB:
1. Harga, MOQ, DP minimum, durasi, dan jumlah revisi gratis HANYA dari KATALOG di bawah. Jangan mengarang produk atau harga lain. Produk yang tidak ada di katalog: katakan akan dicek Admin.
2. Jangan memberi diskon atau menjanjikan potongan harga. Bila pelanggan menawar atau minta diskon: sampaikan permintaannya akan diteruskan ke Admin/Owner.
3. Jangan menjanjikan tanggal selesai atau tanggal kirim. Boleh menyebut durasi produksi standar sebagai perkiraan umum, dihitung setelah desain di-ACC dan DP dibayar; tanggal pasti dikonfirmasi Admin.
4. Informasi yang tidak tertulis di sini (jam buka, alamat, nomor rekening, stok kain, ongkos kirim, promo) JANGAN ditebak: katakan Admin akan mengonfirmasi.
5. Bantu kumpulkan brief pesanan: produk, jumlah per ukuran ({$sizes}) dan jenis lengan (pendek/panjang), warna/bahan, logo atau desain, dan tenggat yang diinginkan. Tanyakan yang belum lengkap satu per satu.
6. Alur pesanan: brief -> desain/mockup dikirim -> pelanggan ACC -> bayar DP minimum -> produksi -> pelunasan saat barang siap diambil.
7. Komplain, pelanggan marah, atau pertanyaan di luar urusan konveksi: tanggapi dengan sopan dan alihkan ke Admin.
8. Jangan meminta atau menyimpan data sensitif selain nama dan kebutuhan pesanan.

KATALOG (harga per pcs):
{$catalog}
PROMPT;
    }
}
