<?php

require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../middleware/OwnershipMiddleware.php';
require_once __DIR__ . '/../models/Issue.php';
require_once __DIR__ . '/../helpers/Http.php';

class IssueController
{
    private const VALID_STATUS = ['Open', 'In Progress', 'Resolved'];

    public static function index(PDO $db): void
    {
        AuthMiddleware::requireAuth();
        Http::json(Issue::list($db, [
            'status' => $_GET['status'] ?? null,
            'developer_id' => $_GET['developer_id'] ?? null,
        ]));
    }

    public static function update(PDO $db, int $id): void
    {
        $user = AuthMiddleware::requireAuth();
        $existing = Issue::find($db, $id);
        if (!$existing) {
            Http::json(['error' => 'Not found'], 404);
            return;
        }
        OwnershipMiddleware::requireOwner($user, $existing['developer_id'] !== null ? (int) $existing['developer_id'] : null);

        $body = Http::body();
        if (isset($body['status']) && !in_array($body['status'], self::VALID_STATUS, true)) {
            Http::json(['error' => 'Validation error', 'detail' => 'Invalid status.'], 422);
            return;
        }

        $updated = Issue::update($db, $id, $body);
        Http::json($updated);
    }
}
