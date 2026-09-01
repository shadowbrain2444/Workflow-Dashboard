<?php

require_once __DIR__ . '/../services/AuthService.php';

class AuthMiddleware
{
    /**
     * Returns the authenticated user's session payload, or halts the
     * request with 401 JSON and exits. Every protected controller action
     * must call this first - there is no client-side-only gate.
     */
    public static function requireAuth(): array
    {
        $user = AuthService::currentUser();
        if ($user === null) {
            Http::json(['error' => 'Unauthorized', 'detail' => 'Login required.'], 401);
            exit;
        }
        return $user;
    }
}
