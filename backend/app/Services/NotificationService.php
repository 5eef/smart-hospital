<?php

namespace App\Services;

use App\Events\UserNotificationCreated;
use App\Models\Appointment;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Lang;

class NotificationService
{
    public function send(User $user, string $type, array $context = []): Notification
    {
        $locale = in_array($user->locale, ['fr', 'en', 'ar'], true) ? $user->locale : 'fr';
        $notification = $user->notifications()->create([
            'title' => Lang::get("notifications.$type.title", $context, $locale),
            'message' => Lang::get("notifications.$type.message", $context, $locale),
            'type' => $type,
        ]);

        UserNotificationCreated::dispatch($notification);

        return $notification;
    }

    public function appointmentCreated(Appointment $appointment, User $actor): void
    {
        $appointment->loadMissing(['patient.user', 'doctor.user', 'department']);
        $context = [
            'date' => $appointment->scheduled_at?->format('Y-m-d H:i'),
            'department' => $appointment->department?->name,
        ];

        foreach ([$appointment->patient?->user, $appointment->doctor?->user] as $recipient) {
            if ($recipient && $recipient->isNot($actor)) {
                $this->send($recipient, 'appointment_created', $context);
            }
        }
    }

    public function appointmentUpdated(Appointment $appointment, User $actor): void
    {
        $appointment->loadMissing(['patient.user', 'doctor.user', 'department']);
        foreach ([$appointment->patient?->user, $appointment->doctor?->user] as $recipient) {
            if ($recipient && $recipient->isNot($actor)) {
                $locale = in_array($recipient->locale, ['fr', 'en', 'ar'], true) ? $recipient->locale : 'fr';
                $this->send($recipient, 'appointment_updated', [
                    'date' => $appointment->scheduled_at?->format('Y-m-d H:i'),
                    'status' => Lang::get('api.statuses.'.$appointment->status, [], $locale),
                ]);
            }
        }
    }
}
