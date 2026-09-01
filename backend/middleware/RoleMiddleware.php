<?php

require_once __DIR__ . '/../helpers/Http.php';

class RoleMiddleware
{
    public static function requireAdmin(array $user): void
    {
        if ($user['role'] !== 'admin') {
            Http::json(['error' => 'Forbidden', 'detail' => 'Admin access required.'], 403);
            exit;
        }
    }
}
