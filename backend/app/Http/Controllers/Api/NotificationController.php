<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $payload = $request->user()->notifications()->latest()->paginate($validated['per_page'] ?? 20)->toArray();
        $payload['unread_count'] = $request->user()->notifications()->unread()->count();

        return response()->json($payload);
    }

    public function unread(Request $request): JsonResponse
    {
        return response()->json(['unread_count' => $request->user()->notifications()->unread()->count()]);
    }

    public function markRead(Request $request, Notification $notification): JsonResponse
    {
        abort_unless($notification->user_id === $request->user()->id, 404);
        $notification->update(['read_at' => $notification->read_at ?? now()]);

        return response()->json(['message' => __('api.notifications.read'), 'notification' => $notification->fresh()]);
    }

    public function readAll(Request $request): JsonResponse
    {
        $count = $request->user()->notifications()->unread()->update(['read_at' => now()]);

        return response()->json(['message' => __('api.notifications.read_all'), 'updated' => $count]);
    }
}
