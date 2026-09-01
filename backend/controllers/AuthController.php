<?php

require_once __DIR__ . '/../services/AuthService.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../helpers/Http.php';
require_once __DIR__ . '/../models/Developer.php';

class AuthController
{
    public static function login(PDO $db): void
    {
        $body = Http::body();
        $email = trim($body['email'] ?? '');
        $password = (string) ($body['password'] ?? '');

        if ($email === '' || $password === '') {
            Http::json(['error' => 'Validation error', 'detail' => 'Email and password are required.'], 422);
            return;
        }

        $user = AuthService::attemptLogin($db, $email, $password);
        if ($user === null) {
            Http::json(['error' => 'Unauthorized', 'detail' => 'Invalid email or password.'], 401);
            return;
        }

        AuthService::startSession($user);

        $developerName = null;
        if ($user['developer_id']) {
            $dev = Developer::find($db, (int) $user['developer_id']);
            $developerName = $dev['name'] ?? null;
        }

        Http::json([
            'id' => (int) $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role'],
            'developer_id' => $user['developer_id'] !== null ? (int) $user['developer_id'] : null,
            'developer_name' => $developerName,
        ]);
    }

    public static function logout(): void
    {
        AuthService::logout();
        Http::json(['status' => 'logged_out']);
    }

    public static function me(PDO $db): void
    {
        $user = AuthMiddleware::requireAuth();
        $developerName = null;
        if ($user['developer_id']) {
            $dev = Developer::find($db, (int) $user['developer_id']);
            $developerName = $dev['name'] ?? null;
        }
        Http::json($user + ['developer_name' => $developerName]);
    }
}
