<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $userRole = $request->user()?->role?->name;

        if (! $userRole || ! in_array($userRole, $roles, true)) {
            return response()->json([
                'message' => __('api.forbidden_role'),
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
