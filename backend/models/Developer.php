<?php

class Developer
{
    public static function all(PDO $db): array
    {
        return $db->query('SELECT * FROM developers ORDER BY id')->fetchAll();
    }

    public static function find(PDO $db, int $id): ?array
    {
        $stmt = $db->prepare('SELECT * FROM developers WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }
}
