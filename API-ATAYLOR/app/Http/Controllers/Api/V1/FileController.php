<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\FileStorage;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FileController extends Controller
{
    /**
     * Sajikan berkas privat. Akses dijaga middleware `signed`: tautan hanya dibuat
     * oleh API Resource untuk user yang berhak, dan kedaluwarsa setelah 30 menit.
     */
    public function show(string $path): StreamedResponse
    {
        abort_if(str_contains($path, '..') || ! str_starts_with($path, 'tenants/'), 404);

        $disk = Storage::disk(FileStorage::DISK);
        abort_unless($disk->exists($path), 404);

        return $disk->response($path, null, [
            'Cache-Control' => 'private, max-age=600',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
