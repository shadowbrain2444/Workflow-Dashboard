<?php

require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../models/Developer.php';
require_once __DIR__ . '/../helpers/Http.php';

class DeveloperController
{
    public static function index(PDO $db): void
    {
        AuthMiddleware::requireAuth();
        Http::json(Developer::all($db));
    }

    public static function show(PDO $db, int $id): void
    {
        AuthMiddleware::requireAuth();
        $dev = Developer::find($db, $id);
        if (!$dev) {
            Http::json(['error' => 'Not found'], 404);
            return;
        }
        Http::json($dev);
    }
}
