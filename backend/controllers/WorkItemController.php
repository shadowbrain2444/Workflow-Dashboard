<?php

require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../middleware/OwnershipMiddleware.php';
require_once __DIR__ . '/../models/WorkItem.php';
require_once __DIR__ . '/../models/ApiItem.php';
require_once __DIR__ . '/../models/Verification.php';
require_once __DIR__ . '/../models/Issue.php';
require_once __DIR__ . '/../models/Activity.php';
require_once __DIR__ . '/../models/Developer.php';
require_once __DIR__ . '/../helpers/Http.php';

class WorkItemController
{
    private const VALID_STATUSES = ['Pending', 'Running', 'Verifying', 'Completed', 'Failed', 'Cancelled'];
    private const VALID_VERIFICATION = ['Pending', 'Passed', 'Failed'];

    private const EVENT_BY_STATUS = [
        'Pending' => 'task.created',
        'Running' => 'agent.running',
        'Verifying' => 'verification.started',
        'Completed' => 'agent.completed',
        'Failed' => 'verification.failed',
        'Cancelled' => 'agent.terminated',
    ];

    public static function index(PDO $db): void
    {
        AuthMiddleware::requireAuth();
        $filters = [
            'developer_id' => $_GET['developer_id'] ?? null,
            'day' => $_GET['day'] ?? null,
            'status' => $_GET['status'] ?? null,
            'module' => $_GET['module'] ?? null,
            'verification_status' => $_GET['verification_status'] ?? null,
            'work_date' => $_GET['date'] ?? null,
            'search' => $_GET['search'] ?? null,
            'sort_by' => $_GET['sort_by'] ?? 'updated_at',
            'sort_dir' => $_GET['sort_dir'] ?? 'desc',
            'page' => $_GET['page'] ?? 1,
            'page_size' => $_GET['page_size'] ?? 20,
        ];
        Http::json(WorkItem::list($db, $filters));
    }

    public static function show(PDO $db, int $id): void
    {
        AuthMiddleware::requireAuth();
        $item = WorkItem::find($db, $id);
        if (!$item) {
            Http::json(['error' => 'Not found'], 404);
            return;
        }
        Http::json($item);
    }

    public static function store(PDO $db): void
    {
        $user = AuthMiddleware::requireAuth();
        $body = Http::body();

        $developerId = OwnershipMiddleware::resolveDeveloperIdForWrite($user, isset($body['developer_id']) ? (int) $body['developer_id'] : null);

        $errors = self::validate($db, $body, $developerId);
        if ($errors) {
            Http::json(['error' => 'Validation error', 'detail' => $errors], 422);
            return;
        }

        $data = self::normalize($body, $developerId);
        $item = WorkItem::create($db, $data, (int) $user['id']);

        self::applySideEffects($db, $item, $data['api_ids'], $user, true, null);

        Http::json(WorkItem::find($db, (int) $item['id']), 201);
    }

    public static function update(PDO $db, int $id): void
    {
        $user = AuthMiddleware::requireAuth();
        $existing = WorkItem::find($db, $id);
        if (!$existing) {
            Http::json(['error' => 'Not found'], 404);
            return;
        }

        // Ownership is checked against the EXISTING record - a developer can
        // only edit a work item that is already theirs.
        OwnershipMiddleware::requireOwner($user, (int) $existing['developer_id']);

        $body = Http::body();
        // A non-admin cannot reassign their own work item to someone else's
        // developer_id, no matter what the request body claims.
        $developerId = OwnershipMiddleware::resolveDeveloperIdForWrite($user, isset($body['developer_id']) ? (int) $body['developer_id'] : (int) $existing['developer_id']);

        $errors = self::validate($db, $body, $developerId);
        if ($errors) {
            Http::json(['error' => 'Validation error', 'detail' => $errors], 422);
            return;
        }

        $data = self::normalize($body, $developerId);
        $oldVerification = $existing['verification_status'];
        $item = WorkItem::update($db, $id, $data, (int) $user['id']);

        self::applySideEffects($db, $item, $data['api_ids'], $user, false, $oldVerification);

        Http::json(WorkItem::find($db, $id));
    }

    public static function destroy(PDO $db, int $id): void
    {
        $user = AuthMiddleware::requireAuth();
        $existing = WorkItem::find($db, $id);
        if (!$existing) {
            Http::json(['error' => 'Not found'], 404);
            return;
        }
        OwnershipMiddleware::requireOwner($user, (int) $existing['developer_id']);
        WorkItem::delete($db, $id);
        Http::json(null, 204);
    }

    private static function validate(PDO $db, array $body, int $developerId): array
    {
        $errors = [];

        if (!Developer::find($db, $developerId)) {
            $errors[] = 'Unknown developer_id.';
        }

        $day = (int) ($body['day'] ?? 0);
        if ($day < 1 || $day > 7) {
            $errors[] = 'day must be between 1 and 7.';
        }

        if (empty($body['date'])) {
            $errors[] = 'date is required.';
        }

        if (empty(trim($body['module'] ?? ''))) {
            $errors[] = 'module is required.';
        }

        if (empty(trim($body['description'] ?? ''))) {
            $errors[] = 'description is required.';
        }

        $status = $body['status'] ?? '';
        if (!in_array($status, self::VALID_STATUSES, true)) {
            $errors[] = 'status must be one of: ' . implode(', ', self::VALID_STATUSES);
        }

        $verification = $body['verification_status'] ?? 'Pending';
        if (!in_array($verification, self::VALID_VERIFICATION, true)) {
            $errors[] = 'verification_status must be one of: ' . implode(', ', self::VALID_VERIFICATION);
        }

        if (!empty($body['api_ids']) && is_array($body['api_ids'])) {
            foreach ($body['api_ids'] as $apiId) {
                if (!ApiItem::find($db, (int) $apiId)) {
                    $errors[] = "Unknown API id {$apiId}.";
                    break;
                }
            }
        }

        return $errors;
    }

    private static function normalize(array $body, int $developerId): array
    {
        return [
            'developer_id' => $developerId,
            'day' => (int) $body['day'],
            'date' => $body['date'],
            'module' => trim($body['module']),
            'description' => trim($body['description']),
            'tasks_completed' => trim($body['tasks_completed'] ?? ''),
            'status' => $body['status'],
            'evidence' => trim($body['evidence'] ?? ''),
            'verification_status' => $body['verification_status'] ?? 'Pending',
            'issues_blockers' => trim($body['issues_blockers'] ?? ''),
            'next_planned_work' => trim($body['next_planned_work'] ?? ''),
            'api_ids' => array_map('intval', $body['api_ids'] ?? []),
        ];
    }

    private static function applySideEffects(PDO $db, array $item, array $apiIds, array $user, bool $isNew, ?string $oldVerification): void
    {
        WorkItem::syncApis($db, (int) $item['id'], $apiIds);
        foreach ($apiIds as $apiId) {
            ApiItem::applyWorkItemStatus($db, $apiId, $item['status'], $item['verification_status']);
        }

        if (in_array($item['verification_status'], ['Passed', 'Failed'], true) && $item['verification_status'] !== $oldVerification) {
            Verification::create($db, [
                'work_item_id' => (int) $item['id'],
                'checks' => "Verification for Day {$item['day']} - {$item['module']}",
                'evidence' => $item['evidence'] ?: 'No evidence attached',
                'passed' => $item['verification_status'] === 'Passed',
                'failures' => $item['verification_status'] === 'Passed' ? '' : ($item['issues_blockers'] ?: 'Verification failed'),
                'criteria' => $item['next_planned_work'] ?: 'Meets module success criteria',
                'verified_by' => (int) $user['id'],
            ]);
            Activity::create(
                $db,
                $item['verification_status'] === 'Passed' ? 'verification.passed' : 'verification.failed',
                (int) $item['developer_id'],
                (int) $item['id'],
                (int) $user['id'],
                'verification',
                strtolower($item['verification_status']),
                "Verification {$item['verification_status']} for {$item['module']} (Day {$item['day']})"
            );
        }

        if (trim($item['issues_blockers']) !== '') {
            $existingIssue = Issue::findOpenForWorkItem($db, (int) $item['id']);
            if ($existingIssue) {
                Issue::updateDescription($db, (int) $existingIssue['id'], $item['module'], $item['issues_blockers']);
            } else {
                Issue::create($db, [
                    'developer_id' => (int) $item['developer_id'],
                    'work_item_id' => (int) $item['id'],
                    'module' => $item['module'],
                    'description' => $item['issues_blockers'],
                    'priority' => $item['status'] === 'Failed' ? 'High' : 'Medium',
                ]);
            }
        }

        $eventType = self::EVENT_BY_STATUS[$item['status']] ?? 'task.created';
        if ($isNew && $item['status'] === 'Pending') {
            $eventType = 'task.created';
        }
        Activity::create(
            $db,
            $eventType,
            (int) $item['developer_id'],
            (int) $item['id'],
            (int) $user['id'],
            'dashboard',
            strtolower($item['status']),
            ($isNew ? 'Logged' : 'Updated') . " work on {$item['module']} (Day {$item['day']}) - status {$item['status']}"
        );
    }
}
