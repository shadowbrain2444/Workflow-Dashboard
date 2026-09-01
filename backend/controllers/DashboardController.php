<?php

require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../services/ProgressService.php';
require_once __DIR__ . '/../helpers/Http.php';

class DashboardController
{
    public static function summary(PDO $db): void
    {
        AuthMiddleware::requireAuth();
        Http::json(ProgressService::summary($db));
    }

    public static function dailyProgress(PDO $db): void
    {
        AuthMiddleware::requireAuth();
        Http::json(ProgressService::dailyProgress($db));
    }

    public static function developerProgress(PDO $db): void
    {
        AuthMiddleware::requireAuth();
        Http::json(ProgressService::developerProgress($db));
    }
}
