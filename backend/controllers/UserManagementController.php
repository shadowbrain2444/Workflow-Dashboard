<?php

require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Developer.php';
require_once __DIR__ . '/../helpers/Http.php';

class UserManagementController
{
    public static function index(PDO $db): void
    {
        $user = AuthMiddleware::requireAuth();
        RoleMiddleware::requireAdmin($user);
        Http::json(User::all($db));
    }

    public static function store(PDO $db): void
    {
        $user = AuthMiddleware::requireAuth();
        RoleMiddleware::requireAdmin($user);

        $body = Http::body();
        $name = trim($body['name'] ?? '');
        $email = trim($body['email'] ?? '');
        $password = (string) ($body['password'] ?? '');
        $role = $body['role'] ?? '';
        $developerId = isset($body['developer_id']) && $body['developer_id'] !== '' ? (int) $body['developer_id'] : null;

        $errors = [];
        if ($name === '') $errors[] = 'name is required.';
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'a valid email is required.';
        if (strlen($password) < 8) $errors[] = 'password must be at least 8 characters.';
        if (!in_array($role, ['admin', 'developer'], true)) $errors[] = 'role must be admin or developer.';
        if ($role === 'developer' && (!$developerId || !Developer::find($db, $developerId))) {
            $errors[] = 'a valid developer_id is required for developer accounts.';
        }
        if ($email !== '' && User::emailExists($db, $email)) $errors[] = 'that email is already registered.';

        if ($errors) {
            Http::json(['error' => 'Validation error', 'detail' => $errors], 422);
            return;
        }

        $created = User::create($db, $name, $email, $password, $role, $role === 'developer' ? $developerId : null);
        Http::json($created, 201);
    }

    public static function setActive(PDO $db, int $id): void
    {
        $user = AuthMiddleware::requireAuth();
        RoleMiddleware::requireAdmin($user);

        if ((int) $user['id'] === $id) {
            Http::json(['error' => 'Forbidden', 'detail' => 'You cannot deactivate your own account.'], 403);
            return;
        }

        $body = Http::body();
        if (!array_key_exists('is_active', $body)) {
            Http::json(['error' => 'Validation error', 'detail' => 'is_active is required.'], 422);
            return;
        }
        if (!User::findById($db, $id)) {
            Http::json(['error' => 'Not found'], 404);
            return;
        }
        User::setActive($db, $id, (bool) $body['is_active']);
        Http::json(['status' => 'ok']);
    }

    public static function setPassword(PDO $db, int $id): void
    {
        $user = AuthMiddleware::requireAuth();
        RoleMiddleware::requireAdmin($user);

        $body = Http::body();
        $password = (string) ($body['password'] ?? '');
        if (strlen($password) < 8) {
            Http::json(['error' => 'Validation error', 'detail' => 'password must be at least 8 characters.'], 422);
            return;
        }
        if (!User::findById($db, $id)) {
            Http::json(['error' => 'Not found'], 404);
            return;
        }
        User::setPassword($db, $id, $password);
        Http::json(['status' => 'ok']);
    }
}
