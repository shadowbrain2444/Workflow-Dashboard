<?php

require_once __DIR__ . '/../helpers/Http.php';

class OwnershipMiddleware
{
    /**
     * Admins bypass ownership. A developer may only act on a resource whose
     * developer_id matches their own session developer_id - never a value
     * they merely claim in the request body, and never another developer's,
     * even via a hand-crafted API call.
     */
    public static function requireOwner(array $user, ?int $resourceDeveloperId): void
    {
        if ($user['role'] === 'admin') {
            return;
        }
        if ($resourceDeveloperId !== null && $user['developer_id'] === $resourceDeveloperId) {
            return;
        }
        Http::json(['error' => 'Forbidden', 'detail' => 'You may only modify your own work.'], 403);
        exit;
    }

    /**
     * For creating new records: forces the developer_id to the caller's own,
     * regardless of what the request body claims - admins may pick any
     * developer explicitly.
     */
    public static function resolveDeveloperIdForWrite(array $user, ?int $requestedDeveloperId): int
    {
        if ($user['role'] === 'admin') {
            if ($requestedDeveloperId === null) {
                Http::json(['error' => 'Validation error', 'detail' => 'developer_id is required.'], 422);
                exit;
            }
            return $requestedDeveloperId;
        }
        return (int) $user['developer_id'];
    }
}
