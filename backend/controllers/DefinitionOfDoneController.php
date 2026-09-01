<?php

require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../models/DefinitionOfDone.php';
require_once __DIR__ . '/../models/Activity.php';
require_once __DIR__ . '/../helpers/Http.php';

class DefinitionOfDoneController
{
    private const VALID_STATUS = ['Not Started', 'In Progress', 'Verified', 'Blocked'];

    public static function index(PDO $db): void
    {
        AuthMiddleware::requireAuth();
        Http::json(DefinitionOfDone::all($db));
    }

    public static function update(PDO $db, int $id): void
    {
        $user = AuthMiddleware::requireAuth();
        $existing = DefinitionOfDone::find($db, $id);
        if (!$existing) {
            Http::json(['error' => 'Not found'], 404);
            return;
        }

        // Developers may only update requirements assigned to their own
        // developer_id; shared/unassigned requirements are admin-only.
        if ($user['role'] !== 'admin') {
            if ($existing['owner_developer_id'] === null || (int) $existing['owner_developer_id'] !== (int) $user['developer_id']) {
                Http::json(['error' => 'Forbidden', 'detail' => 'You may only update requirements assigned to you.'], 403);
                return;
            }
        }

        $body = Http::body();
        if (isset($body['status']) && !in_array($body['status'], self::VALID_STATUS, true)) {
            Http::json(['error' => 'Validation error', 'detail' => 'Invalid status.'], 422);
            return;
        }

        $updated = DefinitionOfDone::update($db, $id, $body);

        if (isset($body['status'])) {
            Activity::create(
                $db,
                $body['status'] === 'Verified' ? 'walkthrough.ready' : 'task.created',
                $existing['owner_developer_id'] !== null ? (int) $existing['owner_developer_id'] : null,
                null,
                (int) $user['id'],
                'dashboard',
                strtolower(str_replace(' ', '_', $body['status'])),
                "Day-7 requirement '" . mb_substr($existing['requirement'], 0, 60) . "' marked {$body['status']}"
            );
        }

        Http::json($updated);
    }
}
