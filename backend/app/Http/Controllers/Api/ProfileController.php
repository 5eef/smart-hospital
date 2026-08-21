<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProfileChangeRequest;
use App\Models\Role;
use App\Models\User;
use App\Services\NotificationService;
use App\Support\UserPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load(['role', 'doctor.department', 'patient']);

        return response()->json([
            'user' => UserPresenter::make($user),
            'profile' => $user->role?->name === 'doctor' ? $user->doctor : $user->patient,
        ]);
    }

    public function changeRequests(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        return response()->json(
            $request->user()->profileChangeRequests()->latest()->paginate($validated['per_page'] ?? 20)
        );
    }

    public function requestChange(Request $request, NotificationService $notifications): JsonResponse
    {
        $user = $request->user()->load(['role', 'doctor', 'patient']);
        $rules = [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'locale' => ['sometimes', 'required', Rule::in(['fr', 'en', 'ar'])],
        ];

        if ($user->role?->name === 'patient') {
            $rules['address'] = ['sometimes', 'nullable', 'string', 'max:255'];
        }

        $changes = $request->validate($rules);

        if ($changes === []) {
            throw ValidationException::withMessages(['profile' => [__('api.profile.no_changes')]]);
        }

        if ($user->role?->name === 'admin') {
            $user->update($changes);

            return response()->json([
                'message' => __('api.profile.updated'),
                'user' => UserPresenter::make($user->fresh()->load(['role', 'doctor', 'patient'])),
            ]);
        }

        $changeRequest = DB::transaction(function () use ($user, $changes) {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $pending = ProfileChangeRequest::where('user_id', $user->id)
                ->where('status', 'pending')
                ->exists();

            if ($pending) {
                throw ValidationException::withMessages(['profile' => [__('api.profile.pending_exists')]]);
            }

            return ProfileChangeRequest::create([
                'user_id' => $user->id,
                'requested_changes' => $changes,
                'status' => 'pending',
            ]);
        });

        Role::where('name', 'admin')->first()?->users()->where('is_active', true)->each(
            fn ($admin) => $notifications->send($admin, 'profile_change_requested', ['user' => $user->name])
        );

        return response()->json([
            'message' => __('api.profile.requested'),
            'status' => 'pending',
            'change_request' => $changeRequest,
            'user' => UserPresenter::make($user),
        ], 202);
    }
}
