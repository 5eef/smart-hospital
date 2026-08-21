<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    private const SUPPORTED = ['fr', 'en', 'ar'];

    public function handle(Request $request, Closure $next): Response
    {
        $preferred = $request->user()?->locale;

        if (! in_array($preferred, self::SUPPORTED, true)) {
            $header = strtolower((string) $request->header('Accept-Language', 'fr'));
            $preferred = substr(strtok($header, ',') ?: 'fr', 0, 2);
        }

        App::setLocale(in_array($preferred, self::SUPPORTED, true) ? $preferred : 'fr');

        return $next($request);
    }
}
