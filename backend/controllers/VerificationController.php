<?php

require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../models/Verification.php';
require_once __DIR__ . '/../helpers/Http.php';

class VerificationController
{
    public static function index(PDO $db): void
    {
        AuthMiddleware::requireAuth();
        $items = Verification::list($db, [
            'developer_id' => $_GET['developer_id'] ?? null,
            'passed' => $_GET['passed'] ?? null,
        ]);
        Http::json(['items' => $items, 'summary' => Verification::summary($db)]);
    }
}
