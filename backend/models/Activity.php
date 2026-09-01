<?php

class Activity
{
    public static function create(PDO $db, string $eventType, ?int $developerId, ?int $workItemId, ?int $actorUserId, string $source, string $status, string $payload): void
    {
        $stmt = $db->prepare(
            'INSERT INTO activities (event_type, developer_id, work_item_id, actor_user_id, source, status, payload)
             VALUES (:event_type, :developer_id, :work_item_id, :actor_user_id, :source, :status, :payload)'
        );
        $stmt->execute([
            ':event_type' => $eventType,
            ':developer_id' => $developerId,
            ':work_item_id' => $workItemId,
            ':actor_user_id' => $actorUserId,
            ':source' => $source,
            ':status' => $status,
            ':payload' => $payload,
        ]);
    }

    public static function list(PDO $db, array $filters = []): array
    {
        $where = [];
        $params = [];
        if (!empty($filters['event_type'])) {
            $where[] = 'a.event_type = :event_type';
            $params[':event_type'] = $filters['event_type'];
        }
        if (!empty($filters['developer_id'])) {
            $where[] = 'a.developer_id = :developer_id';
            $params[':developer_id'] = $filters['developer_id'];
        }
        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
        $limit = min(300, max(1, (int) ($filters['limit'] ?? 100)));

        $stmt = $db->prepare(
            "SELECT a.*, a.created_at AS \"timestamp\", d.name AS developer_name, u.name AS actor_name
             FROM activities a
             LEFT JOIN developers d ON d.id = a.developer_id
             LEFT JOIN users u ON u.id = a.actor_user_id
             {$whereSql}
             ORDER BY a.created_at DESC
             LIMIT {$limit}"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
}
