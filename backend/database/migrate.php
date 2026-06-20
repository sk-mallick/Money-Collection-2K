<?php
/**
 * Database Migration Script
 * Adds academic_year to payments table and updates unique constraints.
 */

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => 'Access Denied: This script can only be run via CLI.']);
    exit;
}

require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = get_db();
    echo "Connected to database successfully.\n";

    // Check if payments table exists
    $paymentsTableExists = false;
    $stmt = $pdo->query("SHOW TABLES LIKE 'payments'");
    if ($stmt->fetch()) {
        $paymentsTableExists = true;
    }

    if ($paymentsTableExists) {
        // 1. Check if column exists
        $stmt = $pdo->query("SHOW COLUMNS FROM `payments` LIKE 'academic_year'");
        $column = $stmt->fetch();

        if (!$column) {
            echo "Adding 'academic_year' column to 'payments' table...\n";
            $pdo->exec("ALTER TABLE `payments` ADD COLUMN `academic_year` VARCHAR(10) NOT NULL DEFAULT '2026-27' AFTER `date`");
            echo "Column added successfully.\n";
        } else {
            echo "'academic_year' column already exists.\n";
        }

        // 2. Check and drop old unique key 'uk_student_month', and add new key 'uk_student_month_year'
        $stmt = $pdo->query("SHOW INDEX FROM `payments` WHERE Key_name = 'uk_student_month'");
        $index = $stmt->fetch();

        if ($index) {
            echo "Dropping old index 'uk_student_month'...\n";
            $pdo->exec("ALTER TABLE `payments` DROP INDEX `uk_student_month`");
            echo "Old index dropped successfully.\n";
        }

        $stmt = $pdo->query("SHOW INDEX FROM `payments` WHERE Key_name = 'uk_student_month_year'");
        $indexYear = $stmt->fetch();

        if (!$indexYear) {
            echo "Creating new compound unique index 'uk_student_month_year'...\n";
            $pdo->exec("ALTER TABLE `payments` ADD UNIQUE KEY `uk_student_month_year` (`student_id`, `month`, `academic_year`)");
            echo "Compound index created successfully.\n";
        } else {
            echo "Compound unique index 'uk_student_month_year' already exists.\n";
        }
    } else {
        echo "'payments' table does not exist. Skipping payments column and index migrations.\n";
    }

    // 3. Check and add academic_year to receipts table
    $stmt = $pdo->query("SHOW COLUMNS FROM `receipts` LIKE 'academic_year'");
    $columnReceipt = $stmt->fetch();

    if (!$columnReceipt) {
        echo "Adding 'academic_year' column to 'receipts' table...\n";
        $pdo->exec("ALTER TABLE `receipts` ADD COLUMN `academic_year` VARCHAR(10) NOT NULL DEFAULT '2026-27' AFTER `generated_by`");
        echo "Receipts column added successfully.\n";
    } else {
        echo "'academic_year' column in receipts already exists.\n";
    }

    // 4. Create groups table
    echo "Creating 'groups' table if not exists...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `groups` (
          `id` VARCHAR(10) NOT NULL PRIMARY KEY,
          `class` VARCHAR(100) NOT NULL,
          `timing` VARCHAR(100) DEFAULT '',
          `category` ENUM('Junior','Senior') NOT NULL DEFAULT 'Junior'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
    echo "'groups' table checked/created successfully.\n";

    // 5. Add group_id column to students table
    $stmt = $pdo->query("SHOW COLUMNS FROM `students` LIKE 'group_id'");
    $columnGroup = $stmt->fetch();

    if (!$columnGroup) {
        echo "Adding 'group_id' column to 'students' table...\n";
        $pdo->exec("ALTER TABLE `students` ADD COLUMN `group_id` VARCHAR(10) DEFAULT NULL AFTER `category`");
        // Add foreign key constraint
        $pdo->exec("ALTER TABLE `students` ADD CONSTRAINT `fk_student_group` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE");
        echo "Column and foreign key constraint added successfully.\n";
    } else {
        echo "'group_id' column already exists on 'students'.\n";
    }

    // 6. Check and add remaining_amount to receipts table
    $stmt = $pdo->query("SHOW COLUMNS FROM `receipts` LIKE 'remaining_amount'");
    $columnRemaining = $stmt->fetch();

    if (!$columnRemaining) {
        echo "Adding 'remaining_amount' column to 'receipts' table...\n";
        $pdo->exec("ALTER TABLE `receipts` ADD COLUMN `remaining_amount` INT NOT NULL DEFAULT 0 AFTER `total_recv`");
        echo "Receipts remaining_amount column added successfully.\n";
    } else {
        echo "'remaining_amount' column in receipts already exists.\n";
    }

    // 6.5 Create login_attempts table
    echo "Creating 'login_attempts' table if not exists...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `login_attempts` (
          `id` INT AUTO_INCREMENT PRIMARY KEY,
          `ip_address` VARCHAR(45) NOT NULL,
          `username` VARCHAR(50) NOT NULL,
          `attempted_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX `idx_ip_time` (`ip_address`, `attempted_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
    echo "'login_attempts' table checked/created successfully.\n";

    echo "Migration completed successfully!\n";

    // 7. Seed default settings if not present
    echo "Checking default settings...\n";
    $feeStmt = $pdo->prepare('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_key = setting_key');
    $feeStmt->execute(['feeJunior', '1000']);
    $feeStmt->execute(['feeSenior', '1000']);
    
    // Seed adminName and teacherName if not present
    $nameStmt = $pdo->prepare('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)');
    $nameStmt->execute(['adminName', 'Chirinjibi Sir']);
    $nameStmt->execute(['teacherName', 'Chirinjibi Sir']);
    echo "Default settings verified.\n";

    // 8. Add deleted_at column to students table if not exists
    $stmt = $pdo->query("SHOW COLUMNS FROM `students` LIKE 'deleted_at'");
    $columnDeletedAt = $stmt->fetch();
    if (!$columnDeletedAt) {
        echo "Adding 'deleted_at' column to 'students' table...\n";
        $pdo->exec("ALTER TABLE `students` ADD COLUMN `deleted_at` DATETIME DEFAULT NULL AFTER `updated_at`");
        echo "Column 'deleted_at' added successfully.\n";
    } else {
        echo "'deleted_at' column already exists in 'students'.\n";
    }

    // 9. Create audit_logs table if not exists
    echo "Creating 'audit_logs' table if not exists...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `audit_logs` (
          `id` INT AUTO_INCREMENT PRIMARY KEY,
          `admin_id` INT DEFAULT NULL,
          `action` VARCHAR(50) NOT NULL,
          `target_entity` VARCHAR(50) NOT NULL,
          `target_id` VARCHAR(50) NOT NULL,
          `description` TEXT,
          `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX `idx_audit_admin` (`admin_id`),
          INDEX `idx_audit_time` (`created_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
    echo "'audit_logs' table checked/created successfully.\n";

    // 10. Update fk_payment_student constraint on payments table to ON DELETE RESTRICT
    if ($paymentsTableExists) {
        // Get current foreign key constraint details
        try {
            echo "Updating payments table foreign key constraint to ON DELETE RESTRICT...\n";
            // Drop the old constraint if it exists (might fail if already dropped or matches RESTRICT)
            // In MySQL, we need to drop the FK by name, then add it again.
            $pdo->exec("ALTER TABLE `payments` DROP FOREIGN KEY `fk_payment_student`");
        } catch (Exception $e) {
            echo "Note: Removing existing constraint 'fk_payment_student' failed or did not exist. Proceeding...\n";
        }
        try {
            $pdo->exec("ALTER TABLE `payments` ADD CONSTRAINT `fk_payment_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE");
            echo "Foreign key constraint updated to RESTRICT successfully.\n";
        } catch (Exception $e) {
            echo "Note: Re-adding constraint failed (already exists or mismatch): " . $e->getMessage() . "\n";
        }
    }

    echo "All migrations completed successfully!\n";

    // 11. Remove ON UPDATE CURRENT_TIMESTAMP from students.updated_at
    try {
        echo "Removing ON UPDATE CURRENT_TIMESTAMP from students.updated_at...\n";
        $pdo->exec("ALTER TABLE `students` MODIFY COLUMN `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP");
        echo "Trigger removed successfully.\n";
    } catch (Exception $e) {
        echo "Failed to alter updated_at column: " . $e->getMessage() . "\n";
    }

    // 12. Add indexing for query optimizations
    if ($paymentsTableExists) {
        try {
            echo "Adding index idx_payments_year_paid to payments...\n";
            $pdo->exec("CREATE INDEX `idx_payments_year_paid` ON `payments` (`academic_year`, `paid`)");
            echo "Index idx_payments_year_paid added successfully.\n";
        } catch (Exception $e) {
            echo "Note: idx_payments_year_paid might already exist: " . $e->getMessage() . "\n";
        }
    }
    try {
        echo "Adding index idx_students_deleted to students...\n";
        $pdo->exec("CREATE INDEX `idx_students_deleted` ON `students` (`deleted_at`)");
        echo "Index idx_students_deleted added successfully.\n";
    } catch (Exception $e) {
        echo "Note: idx_students_deleted might already exist: " . $e->getMessage() . "\n";
    }

} catch (PDOException $e) {
    echo "ERROR during migration: " . $e->getMessage() . "\n";
    exit(1);
}
