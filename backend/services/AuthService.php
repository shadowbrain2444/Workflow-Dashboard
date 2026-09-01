<?php

require_once __DIR__ . '/../models/User.php';

class AuthService
{
    public static function attemptLogin(PDO $db, string $email, string $password): ?array
    {
        $user = User::findByEmail($db, $email);
        if (!$user || !$user['is_active']) {
            return null;
        }
        if (!password_verify($password, $user['password_hash'])) {
            return null;
        }
        return $user;
    }

    public static function startSession(array $user): void
    {
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int) $user['id'];
        $_SESSION['name'] = $user['name'];
        $_SESSION['email'] = $user['email'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['developer_id'] = $user['developer_id'] !== null ? (int) $user['developer_id'] : null;
    }

    public static function currentUser(): ?array
    {
        if (empty($_SESSION['user_id'])) {
            return null;
        }
        return [
            'id' => $_SESSION['user_id'],
            'name' => $_SESSION['name'],
            'email' => $_SESSION['email'],
            'role' => $_SESSION['role'],
            'developer_id' => $_SESSION['developer_id'],
        ];
    }

    public static function logout(): void
    {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }
        session_destroy();
    }
}
