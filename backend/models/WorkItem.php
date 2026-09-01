<?php

class WorkItem
{
    private const SORTABLE = ['updated_at', 'created_at', 'day', 'status', 'work_date'];

    public static function isOwnedBy(array $workItem, int $developerId): bool
    {
        return (int) $workItem['developer_id'] === $developerId;
    }

    public static function find(PDO $db, int $id): ?array
    {
        $stmt = $db->prepare(
            'SELECT w.*, w.work_date AS date, d.name AS developer_name
             FROM work_items w JOIN developers d ON d.id = w.developer_id
             WHERE w.id = :id'
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }
        $row['apis'] = self::apiEndpointsFor($db, $id);
        return $row;
    }

    public static function apiEndpointsFor(PDO $db, int $workItemId): array
    {
        $stmt = $db->prepare(
            'SELECT a.endpoint FROM work_item_apis wa
             JOIN api_items a ON a.id = wa.api_id
             WHERE wa.work_item_id = :id
             ORDER BY a.endpoint'
        );
        $stmt->execute([':id' => $workItemId]);
        return array_column($stmt->fetchAll(), 'endpoint');
    }

    public static function list(PDO $db, array $filters): array
    {
        $where = [];
        $params = [];

        foreach (['developer_id' => 'w.developer_id', 'day' => 'w.day', 'status' => 'w.status',
                  'module' => 'w.module', 'verification_status' => 'w.verification_status',
                  'work_date' => 'w.work_date'] as $key => $col) {
            if (!empty($filters[$key])) {
                $where[] = "{$col} = :{$key}";
                $params[":{$key}"] = $filters[$key];
            }
        }

        if (!empty($filters['search'])) {
            $where[] = '(w.module ILIKE :search OR w.description ILIKE :search OR w.tasks_completed ILIKE :search)';
            $params[':search'] = '%' . $filters['search'] . '%';
        }

        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $sortBy = in_array($filters['sort_by'] ?? '', self::SORTABLE, true) ? $filters['sort_by'] : 'updated_at';
        $sortDir = strtolower($filters['sort_dir'] ?? 'desc') === 'asc' ? 'ASC' : 'DESC';

        $page = max(1, (int) ($filters['page'] ?? 1));
        $pageSize = min(200, max(1, (int) ($filters['page_size'] ?? 20)));
        $offset = ($page - 1) * $pageSize;

        $countStmt = $db->prepare("SELECT COUNT(*) FROM work_items w {$whereSql}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $sql = "SELECT w.*, w.work_date AS date, d.name AS developer_name
                FROM work_items w JOIN developers d ON d.id = w.developer_id
                {$whereSql}
                ORDER BY w.{$sortBy} {$sortDir}
                LIMIT :limit OFFSET :offset";
        $stmt = $db->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $items = $stmt->fetchAll();

        foreach ($items as &$item) {
            $item['apis'] = self::apiEndpointsFor($db, (int) $item['id']);
        }

        return ['items' => $items, 'total' => $total, 'page' => $page, 'page_size' => $pageSize];
    }

    public static function create(PDO $db, array $data, int $actorUserId): array
    {
        $stmt = $db->prepare(
            'INSERT INTO work_items
                (developer_id, day, work_date, module, description, tasks_completed, status,
                 evidence, verification_status, issues_blockers, next_planned_work,
                 is_seed, created_by, updated_by)
             VALUES
                (:developer_id, :day, :work_date, :module, :description, :tasks_completed, :status,
                 :evidence, :verification_status, :issues_blockers, :next_planned_work,
                 FALSE, :actor, :actor)
             RETURNING id'
        );
        $stmt->execute(self::bindParams($data) + [':actor' => $actorUserId]);
        $id = (int) $stmt->fetchColumn();
        return self::find($db, $id);
    }

    public static function update(PDO $db, int $id, array $data, int $actorUserId): array
    {
        $stmt = $db->prepare(
            'UPDATE work_items SET
                developer_id = :developer_id, day = :day, work_date = :work_date, module = :module,
                description = :description, tasks_completed = :tasks_completed, status = :status,
                evidence = :evidence, verification_status = :verification_status,
                issues_blockers = :issues_blockers, next_planned_work = :next_planned_work,
                updated_by = :actor, updated_at = now()
             WHERE id = :id'
        );
        $stmt->execute(self::bindParams($data) + [':actor' => $actorUserId, ':id' => $id]);
        return self::find($db, $id);
    }

    public static function delete(PDO $db, int $id): void
    {
        $stmt = $db->prepare('DELETE FROM work_items WHERE id = :id');
        $stmt->execute([':id' => $id]);
    }

    public static function syncApis(PDO $db, int $workItemId, array $apiIds): void
    {
        $del = $db->prepare('DELETE FROM work_item_apis WHERE work_item_id = :id');
        $del->execute([':id' => $workItemId]);

        $ins = $db->prepare('INSERT INTO work_item_apis (work_item_id, api_id) VALUES (:wi, :api) ON CONFLICT DO NOTHING');
        foreach ($apiIds as $apiId) {
            $ins->execute([':wi' => $workItemId, ':api' => (int) $apiId]);
        }
    }

    private static function bindParams(array $data): array
    {
        return [
            ':developer_id' => $data['developer_id'],
            ':day' => $data['day'],
            ':work_date' => $data['date'],
            ':module' => $data['module'],
            ':description' => $data['description'] ?? '',
            ':tasks_completed' => $data['tasks_completed'] ?? '',
            ':status' => $data['status'],
            ':evidence' => $data['evidence'] ?? '',
            ':verification_status' => $data['verification_status'] ?? 'Pending',
            ':issues_blockers' => $data['issues_blockers'] ?? '',
            ':next_planned_work' => $data['next_planned_work'] ?? '',
        ];
    }
}
