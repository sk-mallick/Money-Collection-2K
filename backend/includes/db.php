<?php
/**
 * MCMS — PDO MySQL Connection
 * Reads credentials from .env file
 */

// Load .env file
function load_env(): array {
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }

    $envFile = __DIR__ . '/../../.env';
    $env = [];

    if (!file_exists($envFile)) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'error' => 'Environment configuration file (.env) is missing.']);
        exit;
    }

    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($key, $value) = array_map('trim', explode('=', $line, 2));
        $env[$key] = $value;
    }

    // Ensure required keys exist
    $requiredKeys = ['DB_HOST', 'DB_NAME', 'DB_USER', 'JWT_SECRET'];
    $missing = [];
    foreach ($requiredKeys as $key) {
        if (!isset($env[$key]) || $env[$key] === '') {
            $missing[] = $key;
        }
    }

    if (!empty($missing)) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'error' => 'Missing required environment configuration keys: ' . implode(', ', $missing)]);
        exit;
    }

    // Validate JWT secret strength — reject defaults and weak secrets
    $jwtSecret = $env['JWT_SECRET'];
    $weakPatterns = [
        'mcms_jwt_secret_key_change_in_production',
        'CHANGE_ME',
        'your_jwt_secret_here',
        'secret',
        'password',
    ];
    $isWeak = strlen($jwtSecret) < 32;
    foreach ($weakPatterns as $pattern) {
        if (stripos($jwtSecret, $pattern) !== false) {
            $isWeak = true;
            break;
        }
    }
    if ($isWeak) {
        if (($env['APP_ENV'] ?? 'development') === 'production') {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'success' => false,
                'error' => 'JWT_SECRET is too weak or unchanged from default. Generate a strong secret: php -r "echo bin2hex(random_bytes(32));"'
            ]);
            exit;
        } else {
            header('X-MCMS-Security-Warning: JWT_SECRET is weak. Update before deploying to production.');
        }
    }

    $cache = $env;
    return $cache;
}

/**
 * Get PDO database connection
 * Handles automatic database creation and schema initialization (auto-import)
 * @return PDO
 */
function get_db(): PDO {
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo;
    }

    $env = load_env();

    $host = $env['DB_HOST'];
    $dbname = $env['DB_NAME'];
    $user = $env['DB_USER'];
    $pass = $env['DB_PASS'] ?? '';

    try {
        $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_PERSISTENT => false, // Disabled to prevent connection exhaustion on shared hosts
        ]);
    } catch (PDOException $e) {
        // Check if database doesn't exist (Catching 1049 Unknown Database or 1044 Access Denied to Database)
        $isUnknownDb = (
            $e->getCode() == 1049 || 
            $e->getCode() == 1044 || 
            (isset($e->errorInfo[1]) && ($e->errorInfo[1] == 1049 || $e->errorInfo[1] == 1044)) || 
            stripos($e->getMessage(), 'Unknown database') !== false || 
            (stripos($e->getMessage(), 'Access denied') !== false && stripos($e->getMessage(), 'to database') !== false)
        );
        
        if ($isUnknownDb) {
            // Attempt to connect without dbname and create it
            try {
                $dsnNoDb = "mysql:host=$host;charset=utf8mb4";
                $pdoNoDb = new PDO($dsnNoDb, $user, $pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                ]);
                $pdoNoDb->exec("CREATE DATABASE `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci");
                
                // Reconnect to the newly created database
                $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
                $pdo = new PDO($dsn, $user, $pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::ATTR_PERSISTENT => false,
                ]);
            } catch (PDOException $createEx) {
                // Connection/Creation failed
                http_response_code(500);
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode([
                    'success' => false,
                    'error' => "Database '$dbname' does not exist and could not be created automatically.",
                    'message' => "On shared hosting platforms like InfinityFree, database creation from PHP scripts is blocked. Please go to your hosting Control Panel, create a database named '$dbname' in the MySQL Databases section, update your .env file, and reload this page.",
                    'details' => $createEx->getMessage()
                ]);
                exit;
            }
        } else {
            if (function_exists('write_log')) {
                write_log('error', 'Database connection failed', ['error' => $e->getMessage(), 'host' => $host, 'db' => $dbname]);
            }
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'error' => 'Database connection failed: ' . $e->getMessage()]);
            exit;
        }
    }

    // Check if tables exist. If empty database, automatically import schema.sql
    try {
        $stmt = $pdo->query("SHOW TABLES LIKE 'settings'");
        $settingsExists = $stmt->rowCount() > 0;
        
        if (!$settingsExists) {
            $schemaPath = __DIR__ . '/../database/schema.sql';
            if (file_exists($schemaPath)) {
                $sql = file_get_contents($schemaPath);
                
                // Strip CREATE DATABASE / USE statements from schema.sql to run within currently selected database context safely
                $lines = explode("\n", $sql);
                $filteredLines = [];
                foreach ($lines as $line) {
                    $trimmed = trim($line);
                    if (preg_match('/^(CREATE DATABASE|USE)\b/i', $trimmed)) {
                        continue;
                    }
                    $filteredLines[] = $line;
                }
                $sql = implode("\n", $filteredLines);
                
                // Execute database import
                $pdo->exec($sql);
            }
        }
    } catch (PDOException $importEx) {
        if (function_exists('write_log')) {
            write_log('error', 'Database auto-import failed', ['error' => $importEx->getMessage()]);
        }
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'error' => "Database connected successfully, but database was empty and auto-initialization failed.",
            'details' => $importEx->getMessage()
        ]);
        exit;
    }

    // Self-healing: ensure remaining_months column exists in receipts table
    try {
        $stmtCol = $pdo->query("SHOW COLUMNS FROM `receipts` LIKE 'remaining_months'");
        if ($stmtCol->rowCount() === 0) {
            $pdo->exec("ALTER TABLE `receipts` ADD COLUMN `remaining_months` VARCHAR(100) DEFAULT NULL AFTER `remaining_amount`");
        }
    } catch (Exception $colEx) {
        if (function_exists('write_log')) {
            write_log('warning', 'Failed to auto-add remaining_months column', ['error' => $colEx->getMessage()]);
        }
    }

    return $pdo;
}

/**
 * Get JWT secret from env
 * @return string
 */
function get_jwt_secret(): string {
    $env = load_env();
    return $env['JWT_SECRET'];
}

/**
 * Get environment setting
 * @param string $key
 * @param string $default
 * @return string
 */
function get_env(string $key, string $default = ''): string {
    $env = load_env();
    return $env[$key] ?? $default;
}
