<?php

/**
 * PDO connection factory for PostgreSQL. Credentials come from environment
 * variables so nothing sensitive is hard-coded; sensible local-dev defaults
 * are provided as fallbacks.
 */
class Database
{
    private static ?PDO $connection = null;

    public static function getConnection(): PDO
    {
        if (self::$connection !== null) {
            return self::$connection;
        }

        $host = getenv('DB_HOST') ?: '127.0.0.1';
        $port = getenv('DB_PORT') ?: '5432';
        $name = getenv('DB_NAME') ?: 'workforce_dashboard';
        $user = getenv('DB_USER') ?: 'workforce_app';
        $pass = getenv('DB_PASSWORD') ?: 'workforce_dev_pw';

        $dsn = "pgsql:host={$host};port={$port};dbname={$name}";

        try {
            self::$connection = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'error' => 'Database connection failed',
                'detail' => $e->getMessage(),
            ]);
            exit;
        }

        return self::$connection;
    }
}
