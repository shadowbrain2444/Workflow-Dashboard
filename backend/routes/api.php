<?php

require_once __DIR__ . '/../helpers/Router.php';
require_once __DIR__ . '/../helpers/Http.php';
require_once __DIR__ . '/../controllers/AuthController.php';
require_once __DIR__ . '/../controllers/DashboardController.php';
require_once __DIR__ . '/../controllers/DeveloperController.php';
require_once __DIR__ . '/../controllers/WorkItemController.php';
require_once __DIR__ . '/../controllers/ApiProgressController.php';
require_once __DIR__ . '/../controllers/VerificationController.php';
require_once __DIR__ . '/../controllers/IssueController.php';
require_once __DIR__ . '/../controllers/ActivityController.php';
require_once __DIR__ . '/../controllers/DefinitionOfDoneController.php';
require_once __DIR__ . '/../controllers/WeeklyProgressController.php';
require_once __DIR__ . '/../controllers/MetaController.php';
require_once __DIR__ . '/../controllers/UserManagementController.php';

function buildApiRouter(PDO $db): Router
{
    $router = new Router();

    $router->add('GET', '/api/health', function () {
        Http::json(['status' => 'ok']);
    });

    $router->add('POST', '/api/auth/login', function () use ($db) {
        AuthController::login($db);
    });
    $router->add('POST', '/api/auth/logout', function () {
        AuthController::logout();
    });
    $router->add('GET', '/api/auth/me', function () use ($db) {
        AuthController::me($db);
    });

    $router->add('GET', '/api/dashboard/summary', function () use ($db) {
        DashboardController::summary($db);
    });
    $router->add('GET', '/api/dashboard/daily-progress', function () use ($db) {
        DashboardController::dailyProgress($db);
    });
    $router->add('GET', '/api/dashboard/developer-progress', function () use ($db) {
        DashboardController::developerProgress($db);
    });

    $router->add('GET', '/api/developers', function () use ($db) {
        DeveloperController::index($db);
    });
    $router->add('GET', '/api/developers/{id}', function ($p) use ($db) {
        DeveloperController::show($db, (int) $p['id']);
    });

    $router->add('GET', '/api/work-items', function () use ($db) {
        WorkItemController::index($db);
    });
    $router->add('POST', '/api/work-items', function () use ($db) {
        WorkItemController::store($db);
    });
    $router->add('GET', '/api/work-items/{id}', function ($p) use ($db) {
        WorkItemController::show($db, (int) $p['id']);
    });
    $router->add('PUT', '/api/work-items/{id}', function ($p) use ($db) {
        WorkItemController::update($db, (int) $p['id']);
    });
    $router->add('DELETE', '/api/work-items/{id}', function ($p) use ($db) {
        WorkItemController::destroy($db, (int) $p['id']);
    });

    $router->add('GET', '/api/api-progress', function () use ($db) {
        ApiProgressController::index($db);
    });

    $router->add('GET', '/api/verification', function () use ($db) {
        VerificationController::index($db);
    });

    $router->add('GET', '/api/issues', function () use ($db) {
        IssueController::index($db);
    });
    $router->add('PUT', '/api/issues/{id}', function ($p) use ($db) {
        IssueController::update($db, (int) $p['id']);
    });

    $router->add('GET', '/api/activities', function () use ($db) {
        ActivityController::index($db);
    });

    $router->add('GET', '/api/definition-of-done', function () use ($db) {
        DefinitionOfDoneController::index($db);
    });
    $router->add('PUT', '/api/definition-of-done/{id}', function ($p) use ($db) {
        DefinitionOfDoneController::update($db, (int) $p['id']);
    });

    $router->add('GET', '/api/weekly-progress', function () use ($db) {
        WeeklyProgressController::index($db);
    });

    $router->add('GET', '/api/meta', function () use ($db) {
        MetaController::index($db);
    });

    $router->add('GET', '/api/users', function () use ($db) {
        UserManagementController::index($db);
    });
    $router->add('POST', '/api/users', function () use ($db) {
        UserManagementController::store($db);
    });
    $router->add('PUT', '/api/users/{id}/active', function ($p) use ($db) {
        UserManagementController::setActive($db, (int) $p['id']);
    });
    $router->add('PUT', '/api/users/{id}/password', function ($p) use ($db) {
        UserManagementController::setPassword($db, (int) $p['id']);
    });

    return $router;
}
