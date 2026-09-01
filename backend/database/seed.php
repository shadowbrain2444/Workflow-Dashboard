<?php

/**
 * Seeds the database with data derived from
 * Autonomous_AI_Workforce_7_Day_API_Architecture_3_Developers.pdf.
 *
 * Idempotent: does nothing if developers already exist. Run with:
 *   php backend/database/seed.php
 */

require_once __DIR__ . '/../config/database.php';

$db = Database::getConnection();

$existing = (int) $db->query('SELECT COUNT(*) FROM developers')->fetchColumn();
if ($existing > 0) {
    echo "Already seeded ({$existing} developers found). Nothing to do.\n";
    exit(0);
}

$db->beginTransaction();

try {
    // ---------------------------------------------------------------- developers
    $developers = [
        ['code' => 'developer_1', 'name' => 'Bharath', 'responsibility' => 'Core Intelligence & Control',
         'focus_areas' => 'Perception,Master Orchestrator,Planner,Capability Manager,Guardrail/Security,Execution Manager,Verification,Reflection/Re-plan,Retry control'],
        ['code' => 'developer_2', 'name' => 'Dhanuja', 'responsibility' => 'Local AI, Tools & Software Development',
         'focus_areas' => 'Local model runtime,Model Service,Reasoning/coding/ASR integration,Tool adapters,Docker,Filesystem,Terminal,Git,Browser,Software Development,Software Verification'],
        ['code' => 'developer_3', 'name' => 'Anshif', 'responsibility' => 'Memory, Twins, Specialists & Product',
         'focus_areas' => 'Obsidian Memory,Controlled research,Memory validation,Executive Twins,Specialist registry/lifecycle,Frontend/product integration,Walkthrough,Activity'],
    ];

    $devIns = $db->prepare('INSERT INTO developers (code, name, responsibility, focus_areas) VALUES (:code, :name, :resp, :focus) RETURNING id');
    $devIds = [];
    foreach ($developers as $d) {
        $devIns->execute([':code' => $d['code'], ':name' => $d['name'], ':resp' => $d['responsibility'], ':focus' => $d['focus_areas']]);
        $devIds[$d['code']] = (int) $devIns->fetchColumn();
    }

    // ---------------------------------------------------------------- users
    $userIns = $db->prepare(
        'INSERT INTO users (name, email, password_hash, role, developer_id) VALUES (:name, :email, :hash, :role, :dev_id)'
    );
    $seedUsers = [
        ['name' => 'Admin', 'email' => 'admin@workforce.local', 'password' => 'Admin@12345', 'role' => 'admin', 'dev_id' => null],
        ['name' => 'Bharath', 'email' => 'bharath@workforce.local', 'password' => 'Bharath@123', 'role' => 'developer', 'dev_id' => $devIds['developer_1']],
        ['name' => 'Dhanuja', 'email' => 'dhanuja@workforce.local', 'password' => 'Dhanuja@123', 'role' => 'developer', 'dev_id' => $devIds['developer_2']],
        ['name' => 'Anshif', 'email' => 'anshif@workforce.local', 'password' => 'Anshif@123', 'role' => 'developer', 'dev_id' => $devIds['developer_3']],
    ];
    foreach ($seedUsers as $u) {
        $userIns->execute([
            ':name' => $u['name'], ':email' => $u['email'],
            ':hash' => password_hash($u['password'], PASSWORD_BCRYPT),
            ':role' => $u['role'], ':dev_id' => $u['dev_id'],
        ]);
    }

    // ---------------------------------------------------------------- api_items
    $apiCatalog = [
        // Bharath - Dev1
        ['/api/v1/perception', 'POST', 'developer_1', 'Normalize voice/text/file input; intent, goals, constraints', 'Perception'],
        ['/api/v1/tasks', 'POST', 'developer_1', 'Task creation', 'Task/Orchestrator'],
        ['/api/v1/tasks/{id}', 'GET', 'developer_1', 'Task lifecycle/state', 'Task/Orchestrator'],
        ['/api/v1/tasks/{id}/cancel', 'POST', 'developer_1', 'Task cancellation', 'Task/Orchestrator'],
        ['/api/v1/tasks/{id}/plan', 'POST', 'developer_1', 'Steps, dependencies, criteria, stopping conditions', 'Planner'],
        ['/api/v1/capabilities/resolve', 'POST', 'developer_1', 'Capability -> worker/tool/model mapping', 'Capability Manager'],
        ['/api/v1/security/check', 'POST', 'developer_1', 'Allow/block/escalate + audit', 'Guardrail'],
        ['/api/v1/verifications', 'POST', 'developer_1', 'Objective tests, evidence, quality/security', 'Verification'],
        ['/api/v1/reflections', 'POST', 'developer_1', 'Failure analysis', 'Reflection/Re-plan'],
        ['/api/v1/replans', 'POST', 'developer_1', 'Validated recovery', 'Reflection/Re-plan'],
        ['/api/v1/tasks/{id}/retry', 'POST', 'developer_1', 'Bounded retry execution', 'Reflection/Re-plan'],
        ['/api/v1/projects', 'POST', 'developer_1', 'Initialize advanced project + versioned plan', 'Task/Orchestrator'],
        // Dhanuja - Dev2
        ['/api/v1/models/infer', 'POST', 'developer_2', 'Local reasoning/coding inference', 'Model Service'],
        ['/api/v1/models/transcribe', 'POST', 'developer_2', 'Audio -> transcript segments', 'Model Service'],
        ['/api/v1/models', 'GET', 'developer_2', 'Model inventory/status', 'Model Service'],
        ['/api/v1/tools/execute', 'POST', 'developer_2', 'Approved tool action', 'Tool Executor'],
        ['/api/v1/tools', 'GET', 'developer_2', 'Tool registry', 'Tool Executor'],
        ['/api/v1/executions', 'POST', 'developer_2', 'Start isolated workspace execution', 'Execution'],
        ['/api/v1/executions/{id}', 'GET', 'developer_2', 'Execution status/result', 'Execution'],
        ['/api/v1/executions/{id}/files', 'POST', 'developer_2', 'Read/write project files (diff/hash)', 'Software Development'],
        ['/api/v1/executions/{id}/commands', 'POST', 'developer_2', 'Run approved commands (stdout/stderr/exitCode)', 'Software Development'],
        ['/api/v1/executions/{id}/tests', 'POST', 'developer_2', 'Run unit/integration/E2E tests (test report)', 'Software Development'],
        ['/api/v1/executions/{id}/security-scan', 'POST', 'developer_2', 'Security scan (security report)', 'Software Development'],
        ['/api/v1/executions/{id}/artifacts', 'GET', 'developer_2', 'Return generated artifacts', 'Software Development'],
        // Anshif - Dev3
        ['/api/v1/memory/search', 'POST', 'developer_3', 'Retrieve Obsidian/company knowledge', 'Memory'],
        ['/api/v1/memory/research', 'POST', 'developer_3', 'Controlled external research', 'Memory'],
        ['/api/v1/memory/validate', 'POST', 'developer_3', 'Validate evidence before trust', 'Memory'],
        ['/api/v1/memory/write', 'POST', 'developer_3', 'Write approved state/knowledge', 'Memory'],
        ['/api/v1/memory/context/{taskId}', 'GET', 'developer_3', 'Task context + sources', 'Memory'],
        ['/api/v1/twins/resolve', 'POST', 'developer_3', 'Determine strategic need', 'Executive Twins'],
        ['/api/v1/twins/{id}/activate', 'POST', 'developer_3', 'Activate CEO/COO/CTO/CMO/CFO', 'Executive Twins'],
        ['/api/v1/twins/{id}/recommend', 'POST', 'developer_3', 'Strategic recommendation', 'Executive Twins'],
        ['/api/v1/twins/{id}/delegate', 'POST', 'developer_3', 'Delegate concrete work', 'Executive Twins'],
        ['/api/v1/twins/{id}/review', 'POST', 'developer_3', 'Review project result', 'Executive Twins'],
        ['/api/v1/agents', 'GET', 'developer_3', 'Registry/filter specialists', 'Specialists'],
        ['/api/v1/agents/spawn', 'POST', 'developer_3', 'Spawn worker', 'Specialists'],
        ['/api/v1/agents/{id}/assign', 'POST', 'developer_3', 'Assign task/step', 'Specialists'],
        ['/api/v1/agents/{id}/terminate', 'POST', 'developer_3', 'Terminate completed worker', 'Specialists'],
        ['/api/v1/agents/{id}', 'GET', 'developer_3', 'Status/progress/tools/model', 'Specialists'],
        ['/api/v1/events', 'GET', 'developer_3', 'Activity feed', 'Events'],
        ['/api/v1/ws/tasks/{id}', 'WS', 'developer_3', 'Live task/workforce updates', 'Events'],
        ['/api/v1/projects/{id}', 'GET', 'developer_3', 'Project state, artifacts', 'Project/Walkthrough'],
        ['/api/v1/projects/{id}/walkthrough', 'GET', 'developer_3', 'Final walkthrough', 'Project/Walkthrough'],
    ];

    $apiIns = $db->prepare(
        'INSERT INTO api_items (endpoint, method, owner_developer_id, purpose, category, status, tested, verification_status)
         VALUES (:endpoint, :method, :owner, :purpose, :category, :status, FALSE, :vstatus)'
    );
    foreach ($apiCatalog as [$endpoint, $method, $ownerCode, $purpose, $category]) {
        $apiIns->execute([
            ':endpoint' => $endpoint, ':method' => $method, ':owner' => $devIds[$ownerCode],
            ':purpose' => $purpose, ':category' => $category,
            ':status' => 'Not Started', ':vstatus' => 'Pending',
        ]);
    }

    // ---------------------------------------------------------------- work_items (seed = Pending)
    $deliverables = [
        'developer_1' => [
            1 => 'Backend skeleton, schemas, API conventions, logging',
            2 => 'Perception + Master Orchestrator + task state',
            3 => 'Planner + Capability Manager + Guardrail',
            4 => 'Workforce routing contracts',
            5 => 'Execution Manager + queues + timeouts + events',
            6 => 'Verification + evidence + Reflection + Re-plan Gate',
            7 => 'Full control-loop integration + stability',
        ],
        'developer_2' => [
            1 => 'GPU/model runtime', 2 => 'Model service', 3 => 'Tools', 4 => 'Software Development',
            5 => 'Real code execution', 6 => 'Tests/security evidence', 7 => 'Stabilization',
        ],
        'developer_3' => [
            1 => 'Frontend/contracts', 2 => 'Task/status integration', 3 => 'Obsidian Memory',
            4 => 'Twins + Specialist registry', 5 => 'Workforce/memory integration',
            6 => 'Walkthrough/activity', 7 => 'Final integration',
        ],
    ];
    $moduleByDay = [
        'developer_1' => [1 => 'Master Orchestrator', 2 => 'Perception', 3 => 'Planner', 4 => 'Capability Manager',
                           5 => 'Execution Manager', 6 => 'Verification', 7 => 'Reflection/Re-plan'],
        'developer_2' => [1 => 'Local model runtime', 2 => 'Model Service', 3 => 'Tool adapters', 4 => 'Software Development',
                           5 => 'Docker', 6 => 'Software Verification', 7 => 'Terminal'],
        'developer_3' => [1 => 'Frontend/product integration', 2 => 'Specialist registry/lifecycle', 3 => 'Obsidian Memory',
                           4 => 'Executive Twins', 5 => 'Memory validation', 6 => 'Walkthrough', 7 => 'Controlled research'],
    ];

    $wiIns = $db->prepare(
        'INSERT INTO work_items (developer_id, day, work_date, module, description, status, is_seed)
         VALUES (:dev_id, :day, :work_date, :module, :description, :status, TRUE)'
    );
    $today = new DateTime();
    foreach ($deliverables as $devCode => $days) {
        foreach ($days as $day => $deliverable) {
            $date = (clone $today)->modify('+' . ($day - 1) . ' days')->format('Y-m-d');
            $wiIns->execute([
                ':dev_id' => $devIds[$devCode], ':day' => $day, ':work_date' => $date,
                ':module' => $moduleByDay[$devCode][$day], ':description' => $deliverable, ':status' => 'Pending',
            ]);
        }
    }

    // ---------------------------------------------------------------- definition_of_done
    // owner_developer_id is NULL for shared-ownership requirements (#9, #14) - see
    // DefinitionOfDoneController for why those stay admin-only to edit.
    $dodItems = [
        ['Basic Mode can enter, route, execute, verify and return a result.', $devIds['developer_1'], 'Bharath'],
        ['Advanced Project Mode can initialize a project and create a versioned plan.', $devIds['developer_1'], 'Bharath'],
        ['Memory retrieves from the supplied Obsidian knowledge base.', $devIds['developer_3'], 'Anshif'],
        ['Capability Manager resolves capability to worker/tool/model requirements.', $devIds['developer_1'], 'Bharath'],
        ['Guardrail returns allow/block/escalate with audit record.', $devIds['developer_1'], 'Bharath'],
        ['Executive Twin activates when strategic reasoning is required and delegates to specialists.', $devIds['developer_3'], 'Anshif'],
        ['Specialists can spawn, assign, run, verify, complete and terminate.', $devIds['developer_3'], 'Anshif'],
        ['Software Development creates/modifies a controlled project and runs tests.', $devIds['developer_2'], 'Dhanuja'],
        ['Verification produces objective evidence.', null, 'Bharath & Dhanuja'],
        ['Reflection/Re-plan operates from verification evidence.', $devIds['developer_1'], 'Bharath'],
        ['Retry is bounded and observable.', $devIds['developer_1'], 'Bharath'],
        ['Frontend receives real task/agent/project events.', $devIds['developer_3'], 'Anshif'],
        ['Approved results can be written to Obsidian.', $devIds['developer_3'], 'Anshif'],
        ['Typecheck, production build and core integration tests pass.', null, 'Bharath, Dhanuja & Anshif'],
    ];
    $dodIns = $db->prepare(
        'INSERT INTO definition_of_done (requirement, owner_developer_id, owner_label, status, order_index)
         VALUES (:req, :owner_id, :owner_label, :status, :idx)'
    );
    foreach ($dodItems as $i => [$requirement, $ownerId, $ownerLabel]) {
        $dodIns->execute([
            ':req' => $requirement, ':owner_id' => $ownerId, ':owner_label' => $ownerLabel,
            ':status' => 'Not Started', ':idx' => $i + 1,
        ]);
    }

    // ---------------------------------------------------------------- initial activity entry
    $actIns = $db->prepare(
        'INSERT INTO activities (event_type, source, status, payload) VALUES (:type, :source, :status, :payload)'
    );
    $actIns->execute([
        ':type' => 'task.created', ':source' => 'dashboard', ':status' => 'info',
        ':payload' => 'Autonomous AI Workforce dashboard initialized. Seeded 3 developers, 4 user accounts, ' .
                      count($deliverables['developer_1']) * 3 . ' planned work items, ' . count($apiCatalog) .
                      ' tracked APIs and 14 Day-7 Definition of Done requirements.',
    ]);

    $db->commit();

    echo "Seed complete.\n\n";
    echo "Login credentials (change these before any real deployment):\n";
    foreach ($seedUsers as $u) {
        echo "  {$u['role']}: {$u['email']} / {$u['password']}\n";
    }
} catch (Throwable $e) {
    $db->rollBack();
    fwrite(STDERR, 'Seed failed: ' . $e->getMessage() . "\n");
    exit(1);
}
