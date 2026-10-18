<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

/**
 * Penyimpanan berkas (mockup, bukti bayar, foto QC) di disk PRIVAT.
 * Kolom *_url di database menyimpan path relatif; URL untuk browser dibuat sebagai
 * tautan bertanda tangan yang kedaluwarsa (lihat route `files.show`), hanya untuk
 * user yang memang berhak melihat resource-nya.
 * Produksi: arahkan disk `local` ke Cloudflare R2 (S3-compatible) lewat config filesystems.
 */
class FileStorage
{
    public const DISK = 'local';

    public const URL_TTL_MINUTES = 30;

    public function store(UploadedFile $file, string $folder, string $tenantId): string
    {
        return Storage::disk(self::DISK)->putFile("tenants/{$tenantId}/{$folder}", $file);
    }

    /**
     * Ubah path tersimpan menjadi URL yang bisa dibuka browser.
     * Nilai lama yang sudah berupa URL absolut / path publik (mis. aset demo) dikembalikan apa adanya.
     */
    public static function url(?string $stored): ?string
    {
        if (! $stored) {
            return null;
        }
        if (str_starts_with($stored, 'http://') || str_starts_with($stored, 'https://') || str_starts_with($stored, '/')) {
            return $stored;
        }

        return URL::temporarySignedRoute('files.show', now()->addMinutes(self::URL_TTL_MINUTES), ['path' => $stored]);
    }
}
