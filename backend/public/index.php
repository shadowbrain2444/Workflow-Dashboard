<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../routes/api.php';
require_once __DIR__ . '/../helpers/Http.php';

// --- Session setup -------------------------------------------------------
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

// --- CORS (only relevant if the frontend is ever served from a different
// origin; session cookies still require the browser to treat it as same-site
// for SameSite=Lax to be sent, so the combined-server setup remains primary) -
$origin = $_SERVER['HTTP_ORIGIN'] ?? null;
if ($origin) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if (str_starts_with($path, '/api/')) {
    $db = Database::getConnection();
    $router = buildApiRouter($db);
    $matched = $router->dispatch($method, $path);
    if (!$matched) {
        Http::json(['error' => 'Not found', 'detail' => "No route for {$method} {$path}"], 404);
    }
    exit;
}

// --- Static frontend file serving ----------------------------------------
$frontendDir = realpath(__DIR__ . '/../../frontend');
$requestedPath = $path === '/' ? '/index.html' : $path;
$filePath = realpath($frontendDir . $requestedPath);

if ($filePath && str_starts_with($filePath, $frontendDir) && is_file($filePath)) {
    serveStaticFile($filePath);
    exit;
}

// Unknown path: fall back to the login page so a bare/typo'd URL still lands
// somewhere sensible instead of a bare 404.
$fallback = $frontendDir . '/login.html';
if (is_file($fallback)) {
    serveStaticFile($fallback);
    exit;
}

http_response_code(404);
echo 'Not found';

function serveStaticFile(string $filePath): void
{
    static $mimeTypes = [
        'html' => 'text/html; charset=utf-8',
        'css' => 'text/css; charset=utf-8',
        'js' => 'application/javascript; charset=utf-8',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'json' => 'application/json',
        'ico' => 'image/x-icon',
    ];
    $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
    header('Content-Type: ' . ($mimeTypes[$ext] ?? 'application/octet-stream'));
    readfile($filePath);
}
