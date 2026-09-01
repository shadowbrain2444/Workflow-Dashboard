<?php

class Issue
{
    public static function findOpenForWorkItem(PDO $db, int $workItemId): ?array
    {
        $stmt = $db->prepare(
            "SELECT * FROM issues WHERE work_item_id = :wi AND status != 'Resolved' LIMIT 1"
        );
        $stmt->execute([':wi' => $workItemId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function create(PDO $db, array $data): array
    {
        $stmt = $db->prepare(
            'INSERT INTO issues (developer_id, work_item_id, module, description, priority, status)
             VALUES (:developer_id, :work_item_id, :module, :description, :priority, :status)
             RETURNING *'
        );
        $stmt->execute([
            ':developer_id' => $data['developer_id'],
            ':work_item_id' => $data['work_item_id'],
            ':module' => $data['module'],
            ':description' => $data['description'],
            ':priority' => $data['priority'],
            ':status' => 'Open',
        ]);
        return $stmt->fetch();
    }

    public static function updateDescription(PDO $db, int $id, string $module, string $description): void
    {
        $stmt = $db->prepare('UPDATE issues SET module = :module, description = :description, updated_at = now() WHERE id = :id');
        $stmt->execute([':module' => $module, ':description' => $description, ':id' => $id]);
    }

    public static function find(PDO $db, int $id): ?array
    {
        $stmt = $db->prepare('SELECT * FROM issues WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function update(PDO $db, int $id, array $data): array
    {
        $fields = [];
        $params = [':id' => $id];
        foreach (['status', 'resolution', 'priority'] as $key) {
            if (array_key_exists($key, $data) && $data[$key] !== null) {
                $fields[] = "{$key} = :{$key}";
                $params[":{$key}"] = $data[$key];
            }
        }
        if ($fields) {
            $fields[] = 'updated_at = now()';
            $sql = 'UPDATE issues SET ' . implode(', ', $fields) . ' WHERE id = :id';
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
        }
        $stmt = $db->prepare(
            'SELECT i.*, d.name AS developer_name FROM issues i
             LEFT JOIN developers d ON d.id = i.developer_id WHERE i.id = :id'
        );
        $stmt->execute([':id' => $id]);
        return $stmt->fetch();
    }

    public static function list(PDO $db, array $filters = []): array
    {
        $where = [];
        $params = [];
        if (!empty($filters['status'])) {
            $where[] = 'i.status = :status';
            $params[':status'] = $filters['status'];
        }
        if (!empty($filters['developer_id'])) {
            $where[] = 'i.developer_id = :developer_id';
            $params[':developer_id'] = $filters['developer_id'];
        }
        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $stmt = $db->prepare(
            "SELECT i.*, d.name AS developer_name FROM issues i
             LEFT JOIN developers d ON d.id = i.developer_id
             {$whereSql}
             ORDER BY i.created_at DESC"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
}
