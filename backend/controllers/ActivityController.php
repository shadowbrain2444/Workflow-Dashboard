<?php

require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../models/Activity.php';
require_once __DIR__ . '/../helpers/Http.php';

class ActivityController
{
    public static function index(PDO $db): void
    {
        AuthMiddleware::requireAuth();
        Http::json(Activity::list($db, [
            'event_type' => $_GET['event_type'] ?? null,
            'developer_id' => $_GET['developer_id'] ?? null,
            'limit' => $_GET['limit'] ?? 100,
        ]));
    }
}
