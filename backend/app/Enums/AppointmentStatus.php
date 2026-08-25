<?php

namespace App\Enums;

enum AppointmentStatus: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Cancelled = 'cancelled';
    case Completed = 'completed';
    case NoShow = 'no_show';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /** @return list<string> */
    public static function activeValues(): array
    {
        return [self::Pending->value, self::Confirmed->value];
    }

    public static function allows(string $current, string $next): bool
    {
        if ($current === $next) {
            return true;
        }

        return in_array($next, match ($current) {
            self::Pending->value => [self::Confirmed->value, self::Cancelled->value],
            self::Confirmed->value => [self::Completed->value, self::NoShow->value, self::Cancelled->value],
            default => [],
        }, true);
    }
}
