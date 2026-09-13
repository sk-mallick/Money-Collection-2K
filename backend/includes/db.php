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
