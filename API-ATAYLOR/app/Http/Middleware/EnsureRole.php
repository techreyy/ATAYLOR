<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Otorisasi berbasis peran di server (SRS §2.3). Menyembunyikan menu di frontend bukan otorisasi.
 * Owner selalu lolos: Owner dapat mengakses semua fitur tenant (keputusan pemilik 21 Okt 2026).
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ($user->role !== 'owner' && ! in_array($user->role, $roles, true))) {
            return response()->json([
                'message' => 'Peran Anda tidak memiliki akses ke aksi ini. Diizinkan: '.implode(', ', $roles).'.',
                'code' => 'FORBIDDEN_ROLE',
            ], 403);
        }

        return $next($request);
    }
}
