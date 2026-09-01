<?php

require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../models/Developer.php';
require_once __DIR__ . '/../models/ApiItem.php';
require_once __DIR__ . '/../helpers/Http.php';

class MetaController
{
    public static function index(PDO $db): void
    {
        $user = AuthMiddleware::requireAuth();

        $developers = Developer::all($db);
        $apis = ApiItem::all($db);
        $modules = $db->query('SELECT DISTINCT module FROM work_items ORDER BY module')->fetchAll(PDO::FETCH_COLUMN);

        Http::json([
            'developers' => $developers,
            'apis' => array_map(fn($a) => ['id' => (int) $a['id'], 'endpoint' => $a['endpoint'], 'owner_id' => $a['owner_developer_id']], $apis),
            'modules' => $modules,
            'statuses' => ['Pending', 'Running', 'Verifying', 'Completed', 'Failed', 'Cancelled'],
            'verification_statuses' => ['Pending', 'Passed', 'Failed'],
            'priorities' => ['Low', 'Medium', 'High', 'Critical'],
            'issue_statuses' => ['Open', 'In Progress', 'Resolved'],
            'dod_statuses' => ['Not Started', 'In Progress', 'Verified', 'Blocked'],
            'current_user' => $user,
        ]);
    }
}
