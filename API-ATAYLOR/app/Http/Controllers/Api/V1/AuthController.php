<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password) || ! $user->is_active) {
            throw ValidationException::withMessages(['email' => 'Email atau kata sandi salah.']);
        }

        return $this->issueToken($user);
    }

    /**
     * Role Switcher demo: masuk sebagai akun demo per peran. Hanya aktif bila DEMO_LOGIN_ENABLED=true.
     */
    public function demoLogin(Request $request): JsonResponse
    {
        abort_unless(config('app.demo_login_enabled'), 404);

        $data = $request->validate([
            'role' => ['required', Rule::in(['admin', 'owner', 'manager', 'designer', 'super_admin'])],
        ]);

        $user = User::where('role', $data['role'])->where('is_active', true)
            ->where('email', 'like', '%@ataylor.demo')
            ->orderBy('created_at')
            ->firstOrFail();

        return $this->issueToken($user);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->userPayload($request->user())]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Berhasil keluar.']);
    }

    private function issueToken(User $user): JsonResponse
    {
        $token = $user->createToken('web', ['*'], now()->addHours(12))->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->userPayload($user),
        ]);
    }

    private function userPayload(User $user): array
    {
        $user->loadMissing('tenant');

        return [
            'id' => $user->id,
            'tenantId' => $user->tenant_id,
            'tenantName' => $user->tenant?->name,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
        ];
    }
}
