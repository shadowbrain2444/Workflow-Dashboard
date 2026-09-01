<?php

require_once __DIR__ . '/../models/Developer.php';
require_once __DIR__ . '/../models/WorkItem.php';
require_once __DIR__ . '/../models/Issue.php';
require_once __DIR__ . '/../models/DefinitionOfDone.php';

/**
 * Team-wide progress aggregation. Every role can read this data (the access
 * matrix grants "View all team progress" to Admin, Own User and Other Users
 * alike) - only mutations are ownership-restricted, enforced elsewhere.
 */
class ProgressService
{
    private const IN_PROGRESS_STATUSES = ['Running', 'Verifying'];

    private static function allWorkItems(PDO $db): array
    {
        return $db->query('SELECT * FROM work_items')->fetchAll();
    }

    public static function computeCurrentDay(PDO $db): int
    {
        $items = self::allWorkItems($db);
        if (!$items) {
            return 1;
        }
        $byDay = [];
        foreach ($items as $item) {
            $byDay[(int) $item['day']][] = $item;
        }
        for ($day = 1; $day <= 7; $day++) {
            if (empty($byDay[$day])) {
                continue;
            }
            foreach ($byDay[$day] as $item) {
                if ($item['status'] !== 'Completed') {
                    return $day;
                }
            }
        }
        return 7;
    }

    private static function projectStatus(int $completed, int $running, int $total): string
    {
        if ($total === 0) {
            return 'Not Started';
        }
        if ($completed === $total) {
            return 'Completed';
        }
        if ($completed === 0 && $running === 0) {
            return 'Not Started';
        }
        return 'In Progress';
    }

    public static function summary(PDO $db): array
    {
        $items = self::allWorkItems($db);
        $total = count($items);
        $completed = count(array_filter($items, fn($i) => $i['status'] === 'Completed'));
        $running = count(array_filter($items, fn($i) => in_array($i['status'], self::IN_PROGRESS_STATUSES, true)));
        $pending = count(array_filter($items, fn($i) => $i['status'] === 'Pending'));
        $failedItems = count(array_filter($items, fn($i) => $i['status'] === 'Failed'));
        $openIssues = (int) $db->query("SELECT COUNT(*) FROM issues WHERE status != 'Resolved'")->fetchColumn();
        $verified = count(array_filter($items, fn($i) => $i['verification_status'] === 'Passed'));
        $progress = $total ? round(($completed / $total) * 100, 1) : 0.0;

        return [
            'overall_progress' => $progress,
            'completed' => $completed,
            'running' => $running,
            'pending' => $pending,
            'failed' => $failedItems + $openIssues,
            'verified' => $verified,
            'total' => $total,
            'current_day' => self::computeCurrentDay($db),
            'project_status' => self::projectStatus($completed, $running, $total),
            'today' => date('Y-m-d'),
        ];
    }

    public static function dailyProgress(PDO $db): array
    {
        $currentDay = self::computeCurrentDay($db);
        $developers = Developer::all($db);
        $result = [];

        for ($day = 1; $day <= 7; $day++) {
            $stmt = $db->prepare('SELECT * FROM work_items WHERE day = :day');
            $stmt->execute([':day' => $day]);
            $dayItems = $stmt->fetchAll();
            $total = count($dayItems);
            $completed = count(array_filter($dayItems, fn($i) => $i['status'] === 'Completed'));
            $progress = $total ? round(($completed / $total) * 100, 1) : 0.0;

            if ($total > 0 && $completed === $total) {
                $state = 'completed';
            } elseif ($day === $currentDay) {
                $state = 'current';
            } elseif ($day < $currentDay) {
                $state = 'completed';
            } else {
                $state = 'upcoming';
            }

            $devMap = [];
            foreach ($developers as $dev) {
                $devItems = array_values(array_filter($dayItems, fn($i) => (int) $i['developer_id'] === (int) $dev['id']));
                foreach ($devItems as &$di) {
                    $di['apis'] = WorkItem::apiEndpointsFor($db, (int) $di['id']);
                    $di['date'] = $di['work_date'];
                }
                unset($di);
                $devMap[$dev['name']] = [
                    'developer_id' => (int) $dev['id'],
                    'total' => count($devItems),
                    'completed' => count(array_filter($devItems, fn($i) => $i['status'] === 'Completed')),
                    'running' => count(array_filter($devItems, fn($i) => in_array($i['status'], self::IN_PROGRESS_STATUSES, true))),
                    'pending' => count(array_filter($devItems, fn($i) => $i['status'] === 'Pending')),
                    'failed' => count(array_filter($devItems, fn($i) => $i['status'] === 'Failed')),
                    'items' => $devItems,
                ];
            }

            $result[] = [
                'day' => $day,
                'label' => "Day {$day}",
                'state' => $state,
                'total' => $total,
                'completed' => $completed,
                'progress' => $progress,
                'developers' => $devMap,
            ];
        }

        return $result;
    }

    public static function developerProgress(PDO $db): array
    {
        $developers = Developer::all($db);
        $out = [];

        foreach ($developers as $dev) {
            $stmt = $db->prepare('SELECT * FROM work_items WHERE developer_id = :id');
            $stmt->execute([':id' => $dev['id']]);
            $items = $stmt->fetchAll();

            $total = count($items);
            $completed = count(array_filter($items, fn($i) => $i['status'] === 'Completed'));
            $inProgress = count(array_filter($items, fn($i) => in_array($i['status'], self::IN_PROGRESS_STATUSES, true)));
            $pending = count(array_filter($items, fn($i) => $i['status'] === 'Pending'));
            $blocked = count(array_filter($items, fn($i) => $i['status'] === 'Failed'));
            $verified = count(array_filter($items, fn($i) => $i['verification_status'] === 'Passed'));
            $progress = $total ? round(($completed / $total) * 100, 1) : 0.0;

            $active = array_values(array_filter($items, fn($i) => in_array($i['status'], self::IN_PROGRESS_STATUSES, true)));
            $currentWork = null;
            $latestUpdate = null;
            if ($active) {
                usort($active, fn($a, $b) => strcmp($b['updated_at'], $a['updated_at']));
                $currentWork = "Day {$active[0]['day']} - {$active[0]['module']}: {$active[0]['description']}";
                $latestUpdate = $active[0]['updated_at'];
            } elseif ($items) {
                usort($items, fn($a, $b) => strcmp($b['updated_at'], $a['updated_at']));
                $currentWork = "Day {$items[0]['day']} - {$items[0]['module']}: {$items[0]['description']}";
                $latestUpdate = $items[0]['updated_at'];
            }

            $completedList = array_values(array_map(
                fn($i) => ['module' => $i['module'], 'description' => $i['description'], 'day' => (int) $i['day']],
                array_filter($items, fn($i) => $i['status'] === 'Completed')
            ));

            $out[] = [
                'id' => (int) $dev['id'],
                'code' => $dev['code'],
                'name' => $dev['name'],
                'responsibility' => $dev['responsibility'],
                'focus_areas' => array_values(array_filter(explode(',', $dev['focus_areas']))),
                'progress' => $progress,
                'completed' => $completed,
                'in_progress' => $inProgress,
                'pending' => $pending,
                'blocked' => $blocked,
                'verified' => $verified,
                'current_work' => $currentWork,
                'latest_update' => $latestUpdate,
                'completed_work' => $completedList,
            ];
        }

        return $out;
    }

    public static function weeklyProgress(PDO $db): array
    {
        $summary = self::summary($db);
        $team = self::developerProgress($db);
        $daily = self::dailyProgress($db);

        $dailyTable = [];
        foreach ($daily as $d) {
            $stmt = $db->prepare('SELECT * FROM work_items WHERE day = :day');
            $stmt->execute([':day' => $d['day']]);
            $dayItems = $stmt->fetchAll();
            $pending = count(array_filter($dayItems, fn($i) => $i['status'] === 'Pending'));
            $verified = count(array_filter($dayItems, fn($i) => $i['verification_status'] === 'Passed'));

            $stmt2 = $db->prepare(
                'SELECT COUNT(*) FROM issues i JOIN work_items w ON w.id = i.work_item_id WHERE w.day = :day'
            );
            $stmt2->execute([':day' => $d['day']]);
            $blockers = (int) $stmt2->fetchColumn();

            $dailyTable[] = [
                'day' => $d['day'], 'label' => $d['label'], 'state' => $d['state'],
                'completed' => $d['completed'], 'pending' => $pending, 'blockers' => $blockers,
                'verified' => $verified, 'total' => $d['total'], 'progress' => $d['progress'],
            ];
        }

        $dodTotal = (int) $db->query('SELECT COUNT(*) FROM definition_of_done')->fetchColumn();
        $dodVerified = (int) $db->query("SELECT COUNT(*) FROM definition_of_done WHERE status = 'Verified'")->fetchColumn();
        $readiness = $dodTotal ? round(($dodVerified / $dodTotal) * 100, 1) : 0.0;

        return [
            'overall' => $summary,
            'team' => $team,
            'daily' => $dailyTable,
            'day7_readiness' => $readiness,
            'dod_verified' => $dodVerified,
            'dod_total' => $dodTotal,
        ];
    }
}
