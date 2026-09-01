<?php

require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../models/ApiItem.php';
require_once __DIR__ . '/../helpers/Http.php';

class ApiProgressController
{
    public static function index(PDO $db): void
    {
        AuthMiddleware::requireAuth();
        Http::json(ApiItem::all($db, [
            'owner_id' => $_GET['owner_id'] ?? null,
            'category' => $_GET['category'] ?? null,
            'status' => $_GET['status'] ?? null,
        ]));
    }
}
