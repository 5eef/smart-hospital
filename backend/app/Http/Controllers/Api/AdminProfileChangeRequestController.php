<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProfileChangeRequest;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class AdminProfileChangeRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', Rule::in(['pending', 'approved', 'rejected'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = ProfileChangeRequest::with(['user.role', 'reviewer'])->latest();
        if ($validated['status'] ?? null) {
            $query->where('status', $validated['status']);
        }

        return response()->json($query->paginate($validated['per_page'] ?? 20));
    }

    public function approve(Request $request, ProfileChangeRequest $profileChangeRequest, NotificationService $notifications): JsonResponse
    {
        $reviewed = DB::transaction(function () use ($request, $profileChangeRequest) {
            $locked = ProfileChangeRequest::whereKey($profileChangeRequest->id)->lockForUpdate()->firstOrFail();
            abort_unless($locked->status === 'pending', 409, __('api.profile.already_reviewed'));
            $user = $locked->user()->with(['role', 'patient'])->firstOrFail();
            $changes = Validator::make($locked->requested_changes, $this->rulesFor($user->role?->name))->validate();

            $user->update(collect($changes)->only(['name', 'phone', 'locale'])->all());
            if ($user->role?->name === 'patient' && array_key_exists('address', $changes)) {
                $user->patient?->update(['address' => $changes['address']]);
            }

            $locked->update([
                'status' => 'approved',
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'rejection_reason' => null,
            ]);

            return $locked->fresh(['user.role', 'reviewer']);
        });

        $notifications->send($reviewed->user, 'profile_change_approved');

        return response()->json(['message' => __('api.profile.approved'), 'change_request' => $reviewed]);
    }

    public function reject(Request $request, ProfileChangeRequest $profileChangeRequest, NotificationService $notifications): JsonResponse
    {
        $validated = $request->validate(['rejection_reason' => ['required', 'string', 'max:1000']]);
        $reviewed = DB::transaction(function () use ($request, $profileChangeRequest, $validated) {
            $locked = ProfileChangeRequest::whereKey($profileChangeRequest->id)->lockForUpdate()->firstOrFail();
            abort_unless($locked->status === 'pending', 409, __('api.profile.already_reviewed'));
            $locked->update([
                'status' => 'rejected',
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'rejection_reason' => $validated['rejection_reason'],
            ]);

            return $locked->fresh(['user.role', 'reviewer']);
        });

        $notifications->send($reviewed->user, 'profile_change_rejected', ['reason' => $reviewed->rejection_reason]);

        return response()->json(['message' => __('api.profile.rejected'), 'change_request' => $reviewed]);
    }

    private function rulesFor(?string $role): array
    {
        $rules = [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'locale' => ['sometimes', 'required', Rule::in(['fr', 'en', 'ar'])],
        ];
        if ($role === 'patient') {
            $rules['address'] = ['sometimes', 'nullable', 'string', 'max:255'];
        }

        return $rules;
    }
}
