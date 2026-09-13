<?php
/**
 * MCMS — PDO MySQL Connection
 * Reads credentials from .env file
 */

// Load .env file with intelligent auto-creation and zero-crash fallbacks
function load_env(bool $required = true): array {
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }

    $rootDir = dirname(__DIR__, 2);
    $envFile = $rootDir . '/.env';
    $prodFile = $rootDir . '/.env.production';
    $exampleFile = $rootDir . '/.env.example';

    // 1. Auto-create .env if missing from .env.production or .env.example
    if (!file_exists($envFile)) {
        if (file_exists($prodFile)) {
            @copy($prodFile, $envFile);
        } elseif (file_exists($exampleFile)) {
            @copy($exampleFile, $envFile);
        } else {
            // Auto-generate fresh default .env
            $defaultSecret = bin2hex(random_bytes(32));
            $defaultContent = "# Auto-Generated Environment Configuration\n"
                            . "APP_ENV=production\n"
                            . "DB_HOST=localhost\n"
                            . "DB_PORT=3306\n"
                            . "DB_NAME=mcms\n"
                            . "DB_USER=root\n"
                            . "DB_PASS=\n"
                            . "JWT_SECRET={$defaultSecret}\n"
                            . "CORS_ORIGIN=*\n";
            @file_put_contents($envFile, $defaultContent);
        }
    }

    $env = [];

    // Parse .env if file is readable
    $targetFile = file_exists($envFile) ? $envFile : (file_exists($prodFile) ? $prodFile : null);

    if ($targetFile && file_exists($targetFile)) {
        $lines = @file($targetFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines !== false) {
            foreach ($lines as $line) {
                if (strpos(trim($line), '#') === 0) continue;
                if (strpos($line, '=') === false) continue;
                list($key, $value) = array_map('trim', explode('=', $line, 2));
                $env[$key] = $value;
            }
        }
    }

    // 2. Guarantee robust defaults so the system NEVER crashes on missing variables
    $env['APP_ENV']     = $env['APP_ENV'] ?? 'production';
    $env['DB_HOST']     = $env['DB_HOST'] ?? 'localhost';
    $env['DB_PORT']     = $env['DB_PORT'] ?? '3306';
    $env['DB_NAME']     = $env['DB_NAME'] ?? 'mcms';
    $env['DB_USER']     = $env['DB_USER'] ?? 'root';
    $env['DB_PASS']     = $env['DB_PASS'] ?? '';
    $env['CORS_ORIGIN'] = $env['CORS_ORIGIN'] ?? '*';

    // 3. Ensure a strong 64-char JWT_SECRET always exists
    if (empty($env['JWT_SECRET']) || strlen($env['JWT_SECRET']) < 32 || stripos($env['JWT_SECRET'], 'CHANGE_ME') !== false) {
        $generatedSecret = bin2hex(random_bytes(32));
        $env['JWT_SECRET'] = $generatedSecret;
        if (file_exists($envFile) && is_writable($envFile)) {
            @file_put_contents($envFile, "\n# Auto-generated secure JWT secret\nJWT_SECRET={$generatedSecret}\n", FILE_APPEND);
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
            
            $isApi = (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/api/') !== false)
                  || (isset($_SERVER['HTTP_ACCEPT']) && stripos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false);

            if (!$isApi && file_exists(dirname(__DIR__, 2) . '/setup.php')) {
                header('Location: setup.php');
                exit;
            }

            http_response_code(503);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'success' => false,
                'error' => 'Database connection failed. Please verify credentials in setup.php.',
                'details' => $e->getMessage()
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            exit;
        }
    }

    // Check if tables exist. If empty database, automatically import migrate.sql
    try {
        $stmt = $pdo->query("SHOW TABLES LIKE 'settings'");
        $settingsExists = $stmt->rowCount() > 0;
        
        if (!$settingsExists) {
            $schemaPath = __DIR__ . '/../database/migrate.sql';
            if (file_exists($schemaPath)) {
                $sql = file_get_contents($schemaPath);
                
                // Strip CREATE DATABASE / USE statements if present to run within currently selected database context safely
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

    // Self-healing: ensure remaining_months column and composite index exist in receipts table
    try {
        $tblCheck = $pdo->query("SHOW TABLES LIKE 'receipts'");
        if ($tblCheck->rowCount() > 0) {
            $stmtCol = $pdo->query("SHOW COLUMNS FROM `receipts` LIKE 'remaining_months'");
            if ($stmtCol->rowCount() === 0) {
                $pdo->exec("ALTER TABLE `receipts` ADD COLUMN `remaining_months` VARCHAR(100) DEFAULT NULL AFTER `remaining_amount`");
            }
            $idxCheck = $pdo->query("SHOW INDEX FROM `receipts` WHERE Key_name = 'idx_receipts_year_student'");
            if ($idxCheck->rowCount() === 0) {
                $pdo->exec("CREATE INDEX `idx_receipts_year_student` ON `receipts` (`academic_year`, `student_id`)");
            }
        }
    } catch (Throwable $colEx) {
        // Suppress if table not initialized yet
    }

    // Self-healing: clean legacy deleted_at from students table if still present
    try {
        $stCheck = $pdo->query("SHOW TABLES LIKE 'students'");
        if ($stCheck->rowCount() > 0) {
            $delAtCheck = $pdo->query("SHOW COLUMNS FROM `students` LIKE 'deleted_at'");
            if ($delAtCheck->rowCount() > 0) {
                try {
                    $pdo->exec("ALTER TABLE `students` DROP INDEX `idx_students_deleted`");
                } catch (Throwable $idxEx) {}
                $pdo->exec("ALTER TABLE `students` DROP COLUMN `deleted_at`");
            }
        }
    } catch (Throwable $osEx) {
        // Suppress if table not initialized yet
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
    // Self-healing: ensure admission_fee_paid column has DEFAULT 0 for new students
    try {
        $stCheck = $pdo->query("SHOW TABLES LIKE 'students'");
        if ($stCheck->rowCount() > 0) {
            $pdo->exec("ALTER TABLE `students` ALTER COLUMN `admission_fee_paid` SET DEFAULT 0");
        }
    } catch (Throwable $afEx) {
        // Suppress if table not initialized yet
    }

    // Self-healing: ensure admission_fee column exists in receipts
    try {
        $rcCheck = $pdo->query("SHOW TABLES LIKE 'receipts'");
        if ($rcCheck->rowCount() > 0) {
            $colCheck = $pdo->query("SHOW COLUMNS FROM `receipts` LIKE 'admission_fee'");
            if ($colCheck->rowCount() === 0) {
                $pdo->exec("ALTER TABLE `receipts` ADD COLUMN `admission_fee` INT(11) NOT NULL DEFAULT 0 AFTER `remaining_months`");
            }
        }
    } catch (Throwable $rcEx) {
        // Suppress
    }

    // Self-healing: mark admission_fee_paid = 1 for students with existing payments/receipts
    try {
        $stCheck = $pdo->query("SHOW TABLES LIKE 'students'");
        $rcCheck = $pdo->query("SHOW TABLES LIKE 'receipts'");
        if ($stCheck->rowCount() > 0 && $rcCheck->rowCount() > 0) {
            $pdo->exec("UPDATE students SET admission_fee_paid = 1 WHERE admission_fee_paid = 0 AND id IN (SELECT DISTINCT student_id FROM receipts WHERE student_id IS NOT NULL)");
        }
    } catch (Throwable $afEx) {
        // Suppress
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
