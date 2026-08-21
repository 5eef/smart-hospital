<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use App\Support\UserPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role' => ['sometimes', Rule::in(['patient'])],
            'phone' => ['nullable', 'string', 'max:30'],
            'locale' => ['sometimes', Rule::in(['fr', 'en', 'ar'])],
        ]);

        $user = DB::transaction(function () use ($validated) {
            $role = Role::where('name', 'patient')->firstOrFail();
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
                'role_id' => $role->id,
                'phone' => $validated['phone'] ?? null,
                'locale' => $validated['locale'] ?? app()->getLocale(),
            ]);
            Patient::create(['user_id' => $user->id]);

            return $user->fresh()->load(['role', 'doctor', 'patient']);
        });

        return response()->json([
            'user' => UserPresenter::make($user),
            'token' => $user->createToken('smart-hospital')->plainTextToken,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::with(['role', 'doctor', 'patient'])->where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => [__('api.invalid_credentials')],
            ]);
        }

        abort_if(! $user->is_active, 403, __('api.account_disabled'));

        return response()->json([
            'user' => UserPresenter::make($user),
            'token' => $user->createToken('smart-hospital')->plainTextToken,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => UserPresenter::make($request->user()->load(['role', 'doctor', 'patient'])),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => __('api.session_closed')]);
    }
}
