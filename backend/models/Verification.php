<?php

class Verification
{
    public static function create(PDO $db, array $data): array
    {
        $stmt = $db->prepare(
            'INSERT INTO verifications (work_item_id, checks, evidence, passed, failures, criteria, verified_by)
             VALUES (:work_item_id, :checks, :evidence, :passed, :failures, :criteria, :verified_by)
             RETURNING *'
        );
        $stmt->execute([
            ':work_item_id' => $data['work_item_id'],
            ':checks' => $data['checks'],
            ':evidence' => $data['evidence'],
            ':passed' => $data['passed'],
            ':failures' => $data['failures'],
            ':criteria' => $data['criteria'],
            ':verified_by' => $data['verified_by'],
        ]);
        return $stmt->fetch();
    }

    public static function list(PDO $db, array $filters = []): array
    {
        $where = [];
        $params = [];
        if (!empty($filters['developer_id'])) {
            $where[] = 'w.developer_id = :developer_id';
            $params[':developer_id'] = $filters['developer_id'];
        }
        if (isset($filters['passed']) && $filters['passed'] !== '') {
            $where[] = 'v.passed = :passed';
            $params[':passed'] = filter_var($filters['passed'], FILTER_VALIDATE_BOOLEAN);
        }
        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $stmt = $db->prepare(
            "SELECT v.*, w.module, w.developer_id, d.name AS developer_name
             FROM verifications v
             JOIN work_items w ON w.id = v.work_item_id
             JOIN developers d ON d.id = w.developer_id
             {$whereSql}
             ORDER BY v.\"timestamp\" DESC"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function summary(PDO $db): array
    {
        $passed = (int) $db->query("SELECT COUNT(*) FROM verifications WHERE passed = TRUE")->fetchColumn();
        $failed = (int) $db->query("SELECT COUNT(*) FROM verifications WHERE passed = FALSE")->fetchColumn();
        $pending = (int) $db->query("SELECT COUNT(*) FROM work_items WHERE verification_status = 'Pending'")->fetchColumn();
        return ['passed' => $passed, 'failed' => $failed, 'pending' => $pending];
    }
}
