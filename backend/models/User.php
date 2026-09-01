<?php

class User
{
    public static function findByEmail(PDO $db, string $email): ?array
    {
        $stmt = $db->prepare('SELECT * FROM users WHERE email = :email');
        $stmt->execute([':email' => strtolower(trim($email))]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function findById(PDO $db, int $id): ?array
    {
        $stmt = $db->prepare('SELECT * FROM users WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function all(PDO $db): array
    {
        $sql = 'SELECT u.id, u.name, u.email, u.role, u.developer_id, u.is_active,
                       u.created_at, u.updated_at, d.name AS developer_name
                FROM users u
                LEFT JOIN developers d ON d.id = u.developer_id
                ORDER BY u.role DESC, u.id';
        return $db->query($sql)->fetchAll();
    }

    public static function create(PDO $db, string $name, string $email, string $password, string $role, ?int $developerId): array
    {
        $stmt = $db->prepare(
            'INSERT INTO users (name, email, password_hash, role, developer_id)
             VALUES (:name, :email, :password_hash, :role, :developer_id)
             RETURNING id, name, email, role, developer_id, is_active, created_at, updated_at'
        );
        $stmt->execute([
            ':name' => $name,
            ':email' => strtolower(trim($email)),
            ':password_hash' => password_hash($password, PASSWORD_BCRYPT),
            ':role' => $role,
            ':developer_id' => $developerId,
        ]);
        return $stmt->fetch();
    }

    public static function setActive(PDO $db, int $id, bool $active): void
    {
        $stmt = $db->prepare('UPDATE users SET is_active = :active, updated_at = now() WHERE id = :id');
        $stmt->execute([':active' => $active, ':id' => $id]);
    }

    public static function setPassword(PDO $db, int $id, string $newPassword): void
    {
        $stmt = $db->prepare('UPDATE users SET password_hash = :hash, updated_at = now() WHERE id = :id');
        $stmt->execute([':hash' => password_hash($newPassword, PASSWORD_BCRYPT), ':id' => $id]);
    }

    public static function emailExists(PDO $db, string $email): bool
    {
        $stmt = $db->prepare('SELECT 1 FROM users WHERE email = :email');
        $stmt->execute([':email' => strtolower(trim($email))]);
        return (bool) $stmt->fetch();
    }
}
