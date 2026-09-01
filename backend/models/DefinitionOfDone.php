<?php

class DefinitionOfDone
{
    public static function all(PDO $db): array
    {
        $stmt = $db->query(
            'SELECT dod.*, d.name AS owner_developer_name
             FROM definition_of_done dod
             LEFT JOIN developers d ON d.id = dod.owner_developer_id
             ORDER BY dod.order_index'
        );
        return $stmt->fetchAll();
    }

    public static function find(PDO $db, int $id): ?array
    {
        $stmt = $db->prepare('SELECT * FROM definition_of_done WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function update(PDO $db, int $id, array $data): array
    {
        $fields = [];
        $params = [':id' => $id];
        foreach (['status', 'evidence', 'notes', 'verification'] as $key) {
            if (array_key_exists($key, $data) && $data[$key] !== null) {
                $fields[] = "{$key} = :{$key}";
                $params[":{$key}"] = $data[$key];
            }
        }
        if ($fields) {
            $fields[] = 'updated_at = now()';
            $sql = 'UPDATE definition_of_done SET ' . implode(', ', $fields) . ' WHERE id = :id';
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
        }
        $stmt = $db->prepare('SELECT * FROM definition_of_done WHERE id = :id');
        $stmt->execute([':id' => $id]);
        return $stmt->fetch();
    }
}
