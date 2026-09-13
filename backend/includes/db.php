<?php
/**
 * MCMS — PDO MySQL Connection
 * Reads credentials from .env file
 */

// Helper to output user-friendly error responses based on request context
function mcms_render_fatal_error(string $title, string $message, array $steps = [], int $httpCode = 503): void {
    http_response_code($httpCode);
    
    // Check if client expects JSON (API call)
    $isApi = (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/api/') !== false)
          || (isset($_SERVER['HTTP_ACCEPT']) && stripos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false)
          || (isset($_SERVER['CONTENT_TYPE']) && stripos($_SERVER['CONTENT_TYPE'], 'application/json') !== false);

    if ($isApi) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'error' => $message,
            'title' => $title,
            'needs_setup' => true
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        exit;
    }

    // Interactive Browser page: Render styled dark-mode card instead of raw JSON
    header('Content-Type: text/html; charset=utf-8');
    $stepsHtml = '';
    if (!empty($steps)) {
        $stepsHtml = '<div class="steps"><div class="steps-title">Recommended Steps:</div><ul>';
        foreach ($steps as $step) {
            $stepsHtml .= '<li>' . $step . '</li>';
        }
        $stepsHtml .= '</ul></div>';
    }

    echo <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{$title} — MCMS</title>
    <style>
        :root {
            --bg: #09090b;
            --card: #18181b;
            --border: #27272a;
            --text: #f4f4f5;
            --muted: #a1a1aa;
            --primary: #3b82f6;
            --danger: #f87171;
            --danger-bg: rgba(248, 113, 113, 0.12);
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            padding: 30px 16px;
            background: var(--bg);
            color: var(--text);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 80vh;
        }
        .card {
            max-width: 520px;
            width: 100%;
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 28px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.6);
        }
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: var(--danger-bg);
            color: var(--danger);
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 14px;
        }
        h1 { font-size: 19px; margin: 0 0 8px; font-weight: 600; color: #fff; }
        p { color: var(--muted); font-size: 13.5px; line-height: 1.55; margin: 0 0 18px; }
        .steps {
            background: #111113;
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 14px 16px;
            margin-bottom: 22px;
            font-size: 13px;
        }
        .steps-title { font-weight: 600; color: #e4e4e7; margin-bottom: 6px; }
        .steps ul { margin: 0; padding-left: 18px; color: var(--muted); }
        .steps li { margin-bottom: 4px; }
        .actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: var(--primary);
            color: #fff;
            padding: 9px 16px;
            border-radius: 6px;
            text-decoration: none;
            font-size: 13px;
            font-weight: 500;
        }
        .btn:hover { opacity: 0.9; }
        .btn-outline {
            background: transparent;
            border: 1px solid var(--border);
            color: var(--text);
        }
        .btn-outline:hover { background: rgba(255,255,255,0.05); }
    </style>
</head>
<body>
    <div class="card">
        <div class="badge">
            <span style="width:6px;height:6px;border-radius:50%;background:var(--danger);display:inline-block;"></span>
            Configuration Notice
        </div>
        <h1>{$title}</h1>
        <p>{$message}</p>
        {$stepsHtml}
        <div class="actions">
            <a href="setup.php" class="btn">Open Setup Wizard</a>
            <a href="javascript:location.reload()" class="btn btn-outline">Reload Page</a>
        </div>
    </div>
</body>
</html>
HTML;
    exit;
}

// Load .env file with smart discovery and fallbacks
function load_env(bool $required = true): array {
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }

    $rootDir = dirname(__DIR__, 2);
    $envFile = $rootDir . '/.env';
    $prodFile = $rootDir . '/.env.production';

    // 1. Smart Discovery: If .env is missing but .env.production exists, auto-adopt it
    if (!file_exists($envFile) && file_exists($prodFile)) {
        @copy($prodFile, $envFile);
        if (file_exists($envFile)) {
            // Adopted .env.production as .env successfully
        } else {
            // Read directly from .env.production if root is read-only
            $envFile = $prodFile;
        }
    }

    $env = [];

    // If .env is completely missing
    if (!file_exists($envFile)) {
        if (!$required || defined('MCMS_SETUP')) {
            return [];
        }

        mcms_render_fatal_error(
            'Environment Configuration Missing',
            'The environment configuration file (<code>.env</code>) was not found on this server.',
            [
                'If you just uploaded to InfinityFree or cPanel, visit the <a href="setup.php" style="color:var(--primary);text-decoration:underline;">Setup Wizard</a> to configure your database.',
                'Alternatively, rename <code>.env.production</code> to <code>.env</code> via FTP or File Manager.',
                'Ensure your database credentials match your MySQL server.'
            ]
        );
    }

    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($key, $value) = array_map('trim', explode('=', $line, 2));
        $env[$key] = $value;
    }

    // Auto-generate strong JWT_SECRET if missing or too short
    if (empty($env['JWT_SECRET']) || strlen($env['JWT_SECRET']) < 32 || stripos($env['JWT_SECRET'], 'CHANGE_ME') !== false) {
        $generatedSecret = bin2hex(random_bytes(32)); // 64 chars
        $env['JWT_SECRET'] = $generatedSecret;
        if (file_exists($envFile) && is_writable($envFile)) {
            @file_put_contents($envFile, "\n# Auto-generated secure JWT secret\nJWT_SECRET={$generatedSecret}\n", FILE_APPEND);
        }
    }

    // Check essential DB keys
    $requiredKeys = ['DB_HOST', 'DB_NAME', 'DB_USER'];
    $missing = [];
    foreach ($requiredKeys as $key) {
        if (!isset($env[$key]) || $env[$key] === '') {
            $missing[] = $key;
        }
    }

    if (!empty($missing)) {
        if (!$required || defined('MCMS_SETUP')) {
            $env['_missing_keys'] = $missing;
            return $env;
        }

        mcms_render_fatal_error(
            'Incomplete Database Configuration',
            'Missing required configuration values in <code>.env</code>: <strong>' . implode(', ', $missing) . '</strong>.',
            [
                'Open <a href="setup.php" style="color:var(--primary);text-decoration:underline;">setup.php</a> to fill in and test your database connection.',
                'Make sure your host, database name, and username are correct.'
            ]
        );
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
    $port = $env['DB_PORT'] ?? 3306;
    $dbname = $env['DB_NAME'];
    $user = $env['DB_USER'];
    $pass = $env['DB_PASS'] ?? '';

    try {
        $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
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

    // Self-healing: ensure composite index on receipts(academic_year, student_id) for multi-year scaling
    try {
        $idxCheck = $pdo->query("SHOW INDEX FROM `receipts` WHERE Key_name = 'idx_receipts_year_student'");
        if ($idxCheck->rowCount() === 0) {
            $pdo->exec("CREATE INDEX `idx_receipts_year_student` ON `receipts` (`academic_year`, `student_id`)");
        }
    } catch (Exception $idxEx) {
        // Suppress if already exists or table empty
    }

    // Self-healing: auto-import Report Card tables if they don't exist
    try {
        $rcCheck = $pdo->query("SHOW TABLES LIKE 'rc_subjects'");
        if ($rcCheck->rowCount() === 0) {
            $rcMigrationPath = __DIR__ . '/../database/migration_report_cards.sql';
            if (file_exists($rcMigrationPath)) {
                $rcSql = file_get_contents($rcMigrationPath);
                $pdo->exec($rcSql);
            }
        }
    } catch (Exception $rcEx) {
        if (function_exists('write_log')) {
            write_log('warning', 'Failed to auto-import report card tables', ['error' => $rcEx->getMessage()]);
        }
    }

    // Self-healing: create old_students table + migrate soft-deleted students + drop deleted_at
    try {
        $osCheck = $pdo->query("SHOW TABLES LIKE 'old_students'");
        if ($osCheck->rowCount() === 0) {
            $osMigrationPath = __DIR__ . '/../database/migration_old_students.sql';
            if (file_exists($osMigrationPath)) {
                $osSql = file_get_contents($osMigrationPath);
                $pdo->exec($osSql);
            }
        }

        // Migrate any existing soft-deleted students to old_students, then hard-delete them
        $delAtCheck = $pdo->query("SHOW COLUMNS FROM `students` LIKE 'deleted_at'");
        if ($delAtCheck->rowCount() > 0) {
            // Move soft-deleted students to old_students
            $softDeleted = $pdo->query("SELECT * FROM `students` WHERE `deleted_at` IS NOT NULL");
            $softDeletedRows = $softDeleted->fetchAll();
            if (!empty($softDeletedRows)) {
                $archiveStmt = $pdo->prepare('INSERT INTO `old_students` (`original_id`, `name`, `category`, `last_group_id`, `last_class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `archived_date`, `archived_reason`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                foreach ($softDeletedRows as $row) {
                    // Extract original ID from DEL-prefixed ID if possible
                    $originalId = $row['id'];
                    if (strpos($originalId, 'DEL') === 0) {
                        $originalId = 'DEL'; // Mark as unknown original
                    }
                    $archiveStmt->execute([
                        $originalId,
                        $row['name'],
                        $row['category'],
                        $row['group_id'],
                        $row['class'],
                        $row['school'],
                        $row['contact_no'],
                        $row['father_no'],
                        $row['mother_no'],
                        $row['adm_date'],
                        $row['dob'] ?? null,
                        $row['fee_per_month'],
                        $row['notes'],
                        date('Y-m-d', strtotime($row['deleted_at'])),
                        'Migrated from soft-delete'
                    ]);
                }
                // Hard-delete the migrated soft-deleted records
                $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
                $pdo->exec("DELETE FROM `students` WHERE `deleted_at` IS NOT NULL");
                $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
            }
            // Drop deleted_at column and index
            try {
                $pdo->exec("ALTER TABLE `students` DROP INDEX `idx_students_deleted`");
            } catch (Exception $idxEx) {
                // Index may not exist
            }
            $pdo->exec("ALTER TABLE `students` DROP COLUMN `deleted_at`");
        }
    } catch (Exception $osEx) {
        if (function_exists('write_log')) {
            write_log('warning', 'Failed to run old_students migration', ['error' => $osEx->getMessage()]);
        }
    }

    // Self-healing: drop rc_default_max_marks table if it exists (no longer needed)
    try {
        $dmmCheck = $pdo->query("SHOW TABLES LIKE 'rc_default_max_marks'");
        if ($dmmCheck->rowCount() > 0) {
            $pdo->exec("DROP TABLE `rc_default_max_marks`");
        }
    } catch (Exception $dmmEx) {
        if (function_exists('write_log')) {
            write_log('warning', 'Failed to drop rc_default_max_marks table', ['error' => $dmmEx->getMessage()]);
        }
    }

    // Self-healing: change rc_student_results FK from CASCADE to SET NULL on delete
    // This preserves result history when a student is archived and deleted
    try {
        $rcSrCheck = $pdo->query("SHOW TABLES LIKE 'rc_student_results'");
        if ($rcSrCheck->rowCount() > 0) {
            // Check current FK delete rule
            $fkInfo = $pdo->query("
                SELECT DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS
                WHERE CONSTRAINT_SCHEMA = DATABASE()
                AND CONSTRAINT_NAME = 'fk_sr_student'
                AND TABLE_NAME = 'rc_student_results'
            ");
            $fkRow = $fkInfo->fetch();
            if ($fkRow && $fkRow['DELETE_RULE'] === 'CASCADE') {
                // Allow student_id to be NULL
                $pdo->exec("ALTER TABLE `rc_student_results` MODIFY COLUMN `student_id` VARCHAR(10) DEFAULT NULL");
                // Drop and recreate FK with SET NULL
                $pdo->exec("ALTER TABLE `rc_student_results` DROP FOREIGN KEY `fk_sr_student`");
                $pdo->exec("ALTER TABLE `rc_student_results` ADD CONSTRAINT `fk_sr_student` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE SET NULL ON UPDATE CASCADE");
            }
        }
    } catch (Exception $fkEx) {
        if (function_exists('write_log')) {
            write_log('warning', 'Failed to update rc_student_results FK', ['error' => $fkEx->getMessage()]);
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
