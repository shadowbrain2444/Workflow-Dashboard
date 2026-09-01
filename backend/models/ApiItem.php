<?php

class ApiItem
{
    public static function all(PDO $db, array $filters = []): array
    {
        $where = [];
        $params = [];
        if (!empty($filters['owner_id'])) {
            $where[] = 'a.owner_developer_id = :owner_id';
            $params[':owner_id'] = $filters['owner_id'];
        }
        if (!empty($filters['category'])) {
            $where[] = 'a.category = :category';
            $params[':category'] = $filters['category'];
        }
        if (!empty($filters['status'])) {
            $where[] = 'a.status = :status';
            $params[':status'] = $filters['status'];
        }
        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $stmt = $db->prepare(
            "SELECT a.*, d.name AS owner_name
             FROM api_items a LEFT JOIN developers d ON d.id = a.owner_developer_id
             {$whereSql}
             ORDER BY a.owner_developer_id, a.category, a.endpoint"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function find(PDO $db, int $id): ?array
    {
        $stmt = $db->prepare('SELECT * FROM api_items WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function applyWorkItemStatus(PDO $db, int $apiId, string $workStatus, string $verificationStatus): void
    {
        $apiStatus = match ($workStatus) {
            'Completed' => 'Implemented',
            'Running', 'Verifying', 'Failed' => 'In Progress',
            default => 'Not Started',
        };

        $sql = 'UPDATE api_items SET status = :status, updated_at = now()';
        $params = [':status' => $apiStatus, ':id' => $apiId];

        if ($verificationStatus === 'Passed') {
            $sql .= ', tested = TRUE, verification_status = :vstatus';
            $params[':vstatus'] = 'Passed';
        } elseif ($verificationStatus === 'Failed') {
            $sql .= ', verification_status = :vstatus';
            $params[':vstatus'] = 'Failed';
        }

        $sql .= ' WHERE id = :id';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
    }
}
