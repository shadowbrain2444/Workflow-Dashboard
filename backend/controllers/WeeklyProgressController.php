<?php

require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../services/ProgressService.php';
require_once __DIR__ . '/../helpers/Http.php';

class WeeklyProgressController
{
    public static function index(PDO $db): void
    {
        AuthMiddleware::requireAuth();
        Http::json(ProgressService::weeklyProgress($db));
    }
}
