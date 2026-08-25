<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use App\Services\AuditService;
use App\Support\UserPresenter;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function register(Request $request): JsonResponse
    {
        $request->merge(['email' => Str::lower(trim((string) $request->input('email')))]);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:12', 'confirmed'],
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

        event(new Registered($user));
        Auth::guard('web')->login($user);
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }
        $this->audit->record($request, 'auth.register', $user, ['name', 'email']);

        return response()->json([
            'user' => UserPresenter::make($user),
            'email_verification_required' => true,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $request->merge(['email' => Str::lower(trim((string) $request->input('email')))]);

        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'role' => ['sometimes', Rule::in(['admin', 'doctor', 'patient'])],
        ]);

        $user = User::with(['role', 'doctor', 'patient'])->where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password) || (($credentials['role'] ?? null) && $user->role?->name !== $credentials['role'])) {
            throw ValidationException::withMessages([
                'email' => [__('api.invalid_credentials')],
            ]);
        }

        abort_if(! $user->is_active, 403, __('api.account_disabled'));

        Auth::guard('web')->login($user, false);
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }
        $this->audit->record($request, 'auth.login', $user);

        return response()->json([
            'user' => UserPresenter::make($user),
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
        $user = $request->user();
        $this->audit->record($request, 'auth.logout', $user);
        $user->tokens()->delete();
        Auth::guard('web')->logout();
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['message' => __('api.session_closed')]);
    }
}
