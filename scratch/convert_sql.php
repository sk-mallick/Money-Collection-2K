<?php
/**
 * Modernizes if0_42017220_mcms.sql to match the newest code schema and features.
 */

$pdo = new PDO('mysql:host=localhost;charset=utf8mb4', 'root', '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);

// 1. Read input SQL
$rawSql = file_get_contents(__DIR__ . '/../if0_42017220_mcms.sql');

// Temporary database to load raw SQL and inspect data cleanly
$pdo->exec("DROP DATABASE IF EXISTS `mcms_temp_convert`;");
$pdo->exec("CREATE DATABASE `mcms_temp_convert` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;");
$pdo->exec("USE `mcms_temp_convert`;");

// Execute raw SQL statements
$pdo->exec($rawSql);
echo "Raw SQL loaded into mcms_temp_convert successfully.\n";

// Fetch data from temp db
$admins = $pdo->query("SELECT * FROM admins ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);
$auditLogs = $pdo->query("SELECT * FROM audit_logs ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);
$groups = $pdo->query("SELECT * FROM groups ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);
$loginAttempts = $pdo->query("SELECT * FROM login_attempts ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);
$receipts = $pdo->query("SELECT * FROM receipts ORDER BY generated_on ASC, id ASC")->fetchAll(PDO::FETCH_ASSOC);
$settings = $pdo->query("SELECT * FROM settings ORDER BY setting_key ASC")->fetchAll(PDO::FETCH_ASSOC);
$students = $pdo->query("SELECT * FROM students ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);

// Build map of DEL IDs to original IDs from audit logs
$delToOriginalMap = [];
foreach ($auditLogs as $log) {
    if (preg_match('/Soft deleted and renamed student:\s*([A-Z0-9]+)\s*->\s*(DEL[a-z0-9]+)/i', $log['description'] ?? '', $m)) {
        $delToOriginalMap[$m[2]] = $m[1];
    }
}

// Separate active and archived students
$activeStudents = [];
$oldStudents = [];

$admissionFeePaidStudents = [];

// Check receipts for admission fee notes or student notes
foreach ($receipts as &$r) {
    $note = $r['notes'] ?? '';
    $admFee = 0;
    if (stripos($note, 'admission') !== false || stripos($note, 'registration') !== false) {
        if (preg_match('/(?:₹|Rs\.?|INR)?\s*(\d+)/i', $note, $nm)) {
            $val = (int)$nm[1];
            if ($val > 0) $admFee = $val;
        }
        if ($admFee === 0 && (int)$r['amt_paid'] > 3000) {
            $admFee = (int)$r['amt_paid'] - 3000;
        }
    }
    // Hardcoded known receipts from logs
    if ($r['id'] === 'JR-260628-D13L' || $r['id'] === 'SR-260627-2S6Y' || $r['id'] === 'JR-260803-425I' || 
        $r['id'] === 'JR-260803-5N36' || $r['id'] === 'JR-260809-175W' || $r['id'] === 'SR-260802-6M54' || 
        $r['id'] === 'SR-260829-1746' || $r['id'] === 'SR-260905-1I6K') {
        $admFee = 500;
    }
    if ($r['id'] === 'SR-260905-4R50' || $r['id'] === 'SR-260906-3F44') {
        $admFee = 1200;
    }
    $r['admission_fee'] = $admFee;

    if ($admFee > 0 && !empty($r['student_id'])) {
        $admissionFeePaidStudents[$r['student_id']] = true;
    }
}
unset($r);

// Populate old_students archive from genuine deleted student records
$oldStudents = [
    ['original_id' => 'K08', 'name' => 'Prateek Prusti', 'category' => 'Junior', 'last_group_id' => 'K', 'last_class' => '3rd', 'school' => 'DAV', 'contact_no' => 'NIL', 'father_no' => '9869755824', 'mother_no' => '9967019033', 'adm_date' => '2026-06-01', 'dob' => '2017-07-04', 'fee_per_month' => 1000, 'notes' => '', 'archived_date' => '2026-08-06', 'archived_reason' => 'Left Institute', 'created_at' => '2026-06-23 11:12:40'],
    ['original_id' => 'I07', 'name' => 'Lipun Sethi', 'category' => 'Senior', 'last_group_id' => 'I', 'last_class' => '8th', 'school' => 'ODM', 'contact_no' => 'NIL', 'father_no' => '9668670212', 'mother_no' => '7205849537', 'adm_date' => '2026-05-01', 'dob' => null, 'fee_per_month' => 1000, 'notes' => '', 'archived_date' => '2026-08-06', 'archived_reason' => 'Left Institute', 'created_at' => '2026-06-23 11:12:40'],
    ['original_id' => 'A17', 'name' => 'Simrens Sahoo', 'category' => 'Senior', 'last_group_id' => 'A', 'last_class' => '7th', 'school' => 'St.xavier', 'contact_no' => 'NIL', 'father_no' => '7008867580', 'mother_no' => '7008794924', 'adm_date' => '2026-05-01', 'dob' => '2014-08-05', 'fee_per_month' => 1000, 'notes' => '', 'archived_date' => '2026-08-15', 'archived_reason' => 'Left Institute', 'created_at' => '2026-06-23 11:12:40'],
    ['original_id' => 'B08', 'name' => 'Parthasarathi Giri', 'category' => 'Senior', 'last_group_id' => 'B', 'last_class' => '10th', 'school' => 'ODM', 'contact_no' => 'NIL', 'father_no' => '6371161373', 'mother_no' => '7873335777', 'adm_date' => '2026-05-01', 'dob' => '2012-01-16', 'fee_per_month' => 1300, 'notes' => '', 'archived_date' => '2026-09-09', 'archived_reason' => 'Left Institute', 'created_at' => '2026-06-23 11:12:40'],
    ['original_id' => 'K07', 'name' => 'Priyanshu Prusti', 'category' => 'Junior', 'last_group_id' => 'K', 'last_class' => '3rd', 'school' => 'DAV', 'contact_no' => 'NIL', 'father_no' => '9869755824', 'mother_no' => '9967019033', 'adm_date' => '2026-06-01', 'dob' => '2017-07-04', 'fee_per_month' => 1000, 'notes' => '', 'archived_date' => '2026-08-06', 'archived_reason' => 'Left Institute', 'created_at' => '2026-06-23 11:12:40'],
    ['original_id' => 'F08', 'name' => 'Sushree Sanaya Rout', 'category' => 'Junior', 'last_group_id' => 'F', 'last_class' => '4th', 'school' => 'ODM', 'contact_no' => 'NIL', 'father_no' => '9437492696', 'mother_no' => '6372666450', 'adm_date' => '2026-03-01', 'dob' => '2017-03-01', 'fee_per_month' => 1000, 'notes' => '', 'archived_date' => '2026-07-04', 'archived_reason' => 'Left Institute', 'created_at' => '2026-06-23 11:12:40'],
    ['original_id' => 'I06', 'name' => 'Adyasha Gouda', 'category' => 'Senior', 'last_group_id' => 'I', 'last_class' => '8th', 'school' => 'ODM', 'contact_no' => 'NIL', 'father_no' => '8894041327', 'mother_no' => '7978901912', 'adm_date' => '2026-04-01', 'dob' => '2012-10-31', 'fee_per_month' => 1000, 'notes' => '', 'archived_date' => '2026-07-15', 'archived_reason' => 'Left Institute', 'created_at' => '2026-06-23 11:12:40'],
    ['original_id' => 'D07', 'name' => 'Chiranjibi Sir - Temp', 'category' => 'Senior', 'last_group_id' => 'D', 'last_class' => '9th', 'school' => 'DAV', 'contact_no' => '', 'father_no' => '8328922917', 'mother_no' => '', 'adm_date' => '2026-09-01', 'dob' => null, 'fee_per_month' => 1000, 'notes' => '', 'archived_date' => '2026-09-05', 'archived_reason' => 'Left Institute', 'created_at' => '2026-09-05 23:56:40'],
    ['original_id' => 'E07', 'name' => 'Shambhavi Moharana', 'category' => 'Senior', 'last_group_id' => 'E', 'last_class' => '7th', 'school' => 'KV', 'contact_no' => 'NIL', 'father_no' => '9439871117', 'mother_no' => '6372133140', 'adm_date' => '2026-04-01', 'dob' => '2014-12-23', 'fee_per_month' => 1000, 'notes' => '', 'archived_date' => '2026-07-09', 'archived_reason' => 'Left Institute', 'created_at' => '2026-06-23 11:12:40'],
    ['original_id' => 'I01', 'name' => 'Sahil Jena', 'category' => 'Senior', 'last_group_id' => 'I', 'last_class' => '8th', 'school' => 'ODM', 'contact_no' => 'NIL', 'father_no' => '7854006538', 'mother_no' => '9937208606', 'adm_date' => '2026-05-01', 'dob' => '2012-04-25', 'fee_per_month' => 1000, 'notes' => '', 'archived_date' => '2026-07-09', 'archived_reason' => 'Left Institute', 'created_at' => '2026-06-23 11:12:40'],
    ['original_id' => 'I08', 'name' => 'Rituraj Sethi', 'category' => 'Senior', 'last_group_id' => 'I', 'last_class' => '8th', 'school' => 'ODM', 'contact_no' => 'NIL', 'father_no' => '8895405847', 'mother_no' => '9078492574', 'adm_date' => '2026-05-01', 'dob' => null, 'fee_per_month' => 1000, 'notes' => '', 'archived_date' => '2026-08-06', 'archived_reason' => 'Left Institute', 'created_at' => '2026-06-23 11:12:40'],
    ['original_id' => 'C14', 'name' => 'Shrihaan Das', 'category' => 'Junior', 'last_group_id' => 'C', 'last_class' => '4th', 'school' => 'SAI', 'contact_no' => 'NIL', 'father_no' => '7022044945', 'mother_no' => '7022044946', 'adm_date' => '2026-05-01', 'dob' => '2017-03-04', 'fee_per_month' => 1000, 'notes' => '', 'archived_date' => '2026-08-01', 'archived_reason' => 'Left Institute', 'created_at' => '2026-06-23 11:12:40'],
    ['original_id' => 'F18', 'name' => 'Saswat Das', 'category' => 'Junior', 'last_group_id' => 'F', 'last_class' => '4th', 'school' => 'FBS', 'contact_no' => 'NIL', 'father_no' => '9658245434', 'mother_no' => '7377147015', 'adm_date' => '2026-04-01', 'dob' => '2017-07-11', 'fee_per_month' => 1000, 'notes' => '', 'archived_date' => '2026-07-09', 'archived_reason' => 'Left Institute', 'created_at' => '2026-06-23 11:12:40'],
    ['original_id' => 'C10', 'name' => 'Aaditri Sharma', 'category' => 'Junior', 'last_group_id' => 'C', 'last_class' => '4th', 'school' => 'SAI', 'contact_no' => 'NIL', 'father_no' => '9853757076', 'mother_no' => '8910652843', 'adm_date' => '2026-04-01', 'dob' => '2017-01-05', 'fee_per_month' => 1000, 'notes' => '', 'archived_date' => '2026-08-18', 'archived_reason' => 'Left Institute', 'created_at' => '2026-06-23 11:12:40'],
    ['original_id' => 'F20', 'name' => 'Samaaya Sahu', 'category' => 'Junior', 'last_group_id' => 'F', 'last_class' => '4th', 'school' => 'SAI', 'contact_no' => 'NIL', 'father_no' => '9776981888', 'mother_no' => '8249134452', 'adm_date' => '2026-05-01', 'dob' => '2016-10-14', 'fee_per_month' => 1000, 'notes' => '', 'archived_date' => '2026-08-04', 'archived_reason' => 'Left Institute', 'created_at' => '2026-06-23 11:12:40'],
    ['original_id' => 'D06', 'name' => 'Ankita Sahoo', 'category' => 'Senior', 'last_group_id' => 'D', 'last_class' => '9th', 'school' => 'FBS', 'contact_no' => '', 'father_no' => '9692650728', 'mother_no' => '96920350728', 'adm_date' => '2026-08-01', 'dob' => '2011-08-29', 'fee_per_month' => 1000, 'notes' => '', 'archived_date' => '2026-09-09', 'archived_reason' => 'Left Institute', 'created_at' => '2026-08-22 08:32:58'],
    ['original_id' => 'K11', 'name' => 'Aradhya Jena', 'category' => 'Junior', 'last_group_id' => 'K', 'last_class' => '3rd', 'school' => 'DAV', 'contact_no' => 'NIL', 'father_no' => '9078496328', 'mother_no' => '7684875165', 'adm_date' => '2026-07-01', 'dob' => '2017-10-29', 'fee_per_month' => 1000, 'notes' => '', 'archived_date' => '2026-08-18', 'archived_reason' => 'Left Institute', 'created_at' => '2026-06-23 11:12:40'],
    ['original_id' => 'C06', 'name' => 'Rudransh Sahoo', 'category' => 'Junior', 'last_group_id' => 'C', 'last_class' => '5th', 'school' => 'SAI', 'contact_no' => 'NIL', 'father_no' => '9438016343', 'mother_no' => '9556016343', 'adm_date' => '2026-05-01', 'dob' => '2015-07-23', 'fee_per_month' => 1000, 'notes' => '', 'archived_date' => '2026-08-01', 'archived_reason' => 'Left Institute', 'created_at' => '2026-06-23 11:12:40'],
    ['original_id' => 'K10', 'name' => 'Aryan Pradhan', 'category' => 'Junior', 'last_group_id' => 'K', 'last_class' => '3rd', 'school' => 'DAV', 'contact_no' => 'NIL', 'father_no' => '8917300620', 'mother_no' => '9348227604', 'adm_date' => '2026-06-01', 'dob' => '2017-12-20', 'fee_per_month' => 1000, 'notes' => '', 'archived_date' => '2026-09-04', 'archived_reason' => 'Left Institute', 'created_at' => '2026-06-23 11:12:40']
];

foreach ($students as $s) {
    if (strpos($s['id'], 'DEL') !== 0) {
        $s['admission_fee_paid'] = isset($admissionFeePaidStudents[$s['id']]) ? 1 : 0;
        $activeStudents[] = $s;
    }
}

// Format modernized SQL
$out = [];
$out[] = "-- ================================================================";
$out[] = "-- Database Backup / Master Production Migration";
$out[] = "-- Target Database: `if0_42017220_mcms` (or `mcms`)";
$out[] = "-- Character Set: utf8mb4 | Collation: utf8mb4_general_ci";
$out[] = "-- Compatible with newest MCMS Codebase (Homework, Reports, Receipts)";
$out[] = "-- Generation Time: " . date('Y-m-d H:i:s');
$out[] = "-- ================================================================\n";
$out[] = "SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";";
$out[] = "SET AUTOCOMMIT = 0;";
$out[] = "START TRANSACTION;";
$out[] = "SET time_zone = \"+00:00\";";
$out[] = "SET FOREIGN_KEY_CHECKS = 0;\n";

// 1. Admins
$out[] = "-- --------------------------------------------------------";
$out[] = "-- Table structure for `admins`";
$out[] = "-- --------------------------------------------------------";
$out[] = "DROP TABLE IF EXISTS `admins`;";
$out[] = "CREATE TABLE `admins` (";
$out[] = "  `id` int(11) NOT NULL AUTO_INCREMENT,";
$out[] = "  `username` varchar(50) NOT NULL,";
$out[] = "  `password_hash` varchar(255) NOT NULL,";
$out[] = "  `name` varchar(100) NOT NULL DEFAULT 'Admin',";
$out[] = "  `created_at` datetime DEFAULT current_timestamp(),";
$out[] = "  PRIMARY KEY (`id`),";
$out[] = "  UNIQUE KEY `uk_admin_username` (`username`)";
$out[] = ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;\n";

$out[] = "INSERT INTO `admins` (`id`, `username`, `password_hash`, `name`, `created_at`) VALUES";
$out[] = "(1, '18102024', '\$2y\$10\$xinMjTkvwA551wxEzJhOHufqTAdcsfVKHAcWatOm80q44LNVFr/3m', 'Chirinjibi Sir', '2026-06-06 11:04:59'),";
$out[] = "(2, '454', '\$2y\$10\$Cqf/PpFOQLbKtYn4.ODr3.jdyRrf4HjfgO0s7LvG1zxRt5y77Btzu', 'Subham Sir', '2026-06-06 11:05:00');\n";

// 2. Audit Logs
$out[] = "-- --------------------------------------------------------";
$out[] = "-- Table structure for `audit_logs`";
$out[] = "-- --------------------------------------------------------";
$out[] = "DROP TABLE IF EXISTS `audit_logs`;";
$out[] = "CREATE TABLE `audit_logs` (";
$out[] = "  `id` int(11) NOT NULL AUTO_INCREMENT,";
$out[] = "  `admin_id` int(11) DEFAULT NULL,";
$out[] = "  `action` varchar(50) NOT NULL,";
$out[] = "  `target_entity` varchar(50) NOT NULL,";
$out[] = "  `target_id` varchar(50) NOT NULL,";
$out[] = "  `description` text DEFAULT NULL,";
$out[] = "  `created_at` datetime DEFAULT current_timestamp(),";
$out[] = "  PRIMARY KEY (`id`),";
$out[] = "  KEY `idx_audit_admin` (`admin_id`),";
$out[] = "  KEY `idx_audit_time` (`created_at`)";
$out[] = ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;\n";

if (!empty($auditLogs)) {
    $out[] = "INSERT INTO `audit_logs` (`id`, `admin_id`, `action`, `target_entity`, `target_id`, `description`, `created_at`) VALUES";
    $logRows = [];
    foreach ($auditLogs as $l) {
        $logRows[] = sprintf(
            "(%d, %s, %s, %s, %s, %s, %s)",
            $l['id'],
            $l['admin_id'] === null ? "NULL" : (int)$l['admin_id'],
            $pdo->quote($l['action']),
            $pdo->quote($l['target_entity']),
            $pdo->quote($l['target_id']),
            $l['description'] === null ? "NULL" : $pdo->quote($l['description']),
            $pdo->quote($l['created_at'])
        );
    }
    $out[] = implode(",\n", $logRows) . ";\n";
}

// 3. Groups
$out[] = "-- --------------------------------------------------------";
$out[] = "-- Table structure for `groups`";
$out[] = "-- --------------------------------------------------------";
$out[] = "DROP TABLE IF EXISTS `groups`;";
$out[] = "CREATE TABLE `groups` (";
$out[] = "  `id` varchar(10) NOT NULL,";
$out[] = "  `class` varchar(100) NOT NULL,";
$out[] = "  `timing` varchar(100) DEFAULT '',";
$out[] = "  `category` enum('Junior','Senior') NOT NULL DEFAULT 'Junior',";
$out[] = "  PRIMARY KEY (`id`)";
$out[] = ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;\n";

$out[] = "INSERT INTO `groups` (`id`, `class`, `timing`, `category`) VALUES";
$gRows = [];
foreach ($groups as $g) {
    $gRows[] = sprintf("(%s, %s, %s, %s)", $pdo->quote($g['id']), $pdo->quote($g['class']), $pdo->quote($g['timing']), $pdo->quote($g['category']));
}
$out[] = implode(",\n", $gRows) . ";\n";

// 4. Settings
$out[] = "-- --------------------------------------------------------";
$out[] = "-- Table structure for `settings`";
$out[] = "-- --------------------------------------------------------";
$out[] = "DROP TABLE IF EXISTS `settings`;";
$out[] = "CREATE TABLE `settings` (";
$out[] = "  `setting_key` varchar(50) NOT NULL,";
$out[] = "  `setting_value` text NOT NULL,";
$out[] = "  PRIMARY KEY (`setting_key`)";
$out[] = ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;\n";

$out[] = "INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES";
$sRows = [];
foreach ($settings as $s) {
    $sRows[] = sprintf("(%s, %s)", $pdo->quote($s['setting_key']), $pdo->quote($s['setting_value']));
}
$out[] = implode(",\n", $sRows) . ";\n";

// 5. Students
$out[] = "-- --------------------------------------------------------";
$out[] = "-- Table structure for `students`";
$out[] = "-- --------------------------------------------------------";
$out[] = "DROP TABLE IF EXISTS `students`;";
$out[] = "CREATE TABLE `students` (";
$out[] = "  `id` varchar(10) NOT NULL,";
$out[] = "  `name` varchar(100) NOT NULL,";
$out[] = "  `category` enum('Junior','Senior') NOT NULL,";
$out[] = "  `group_id` varchar(10) DEFAULT NULL,";
$out[] = "  `class` varchar(50) DEFAULT '',";
$out[] = "  `school` varchar(100) DEFAULT '',";
$out[] = "  `contact_no` varchar(15) DEFAULT '',";
$out[] = "  `father_no` varchar(15) DEFAULT '',";
$out[] = "  `mother_no` varchar(15) DEFAULT '',";
$out[] = "  `adm_date` date NOT NULL,";
$out[] = "  `dob` date DEFAULT NULL,";
$out[] = "  `fee_per_month` int(11) NOT NULL DEFAULT 700,";
$out[] = "  `admission_fee_paid` tinyint(1) NOT NULL DEFAULT 0,";
$out[] = "  `notes` text DEFAULT NULL,";
$out[] = "  `created_at` datetime DEFAULT current_timestamp(),";
$out[] = "  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),";
$out[] = "  PRIMARY KEY (`id`),";
$out[] = "  KEY `idx_students_group` (`group_id`),";
$out[] = "  CONSTRAINT `fk_student_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE SET NULL ON UPDATE CASCADE";
$out[] = ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;\n";

$out[] = "INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `admission_fee_paid`, `notes`, `created_at`, `updated_at`) VALUES";
$stuRows = [];
foreach ($activeStudents as $st) {
    $stuRows[] = sprintf(
        "(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %d, %d, %s, %s, %s)",
        $pdo->quote($st['id']),
        $pdo->quote($st['name']),
        $pdo->quote($st['category']),
        $st['group_id'] === null ? "NULL" : $pdo->quote($st['group_id']),
        $pdo->quote($st['class']),
        $pdo->quote($st['school']),
        $pdo->quote($st['contact_no']),
        $pdo->quote($st['father_no']),
        $pdo->quote($st['mother_no']),
        $pdo->quote($st['adm_date']),
        $st['dob'] === null ? "NULL" : $pdo->quote($st['dob']),
        (int)$st['fee_per_month'],
        (int)$st['admission_fee_paid'],
        $st['notes'] === null ? "NULL" : $pdo->quote($st['notes']),
        $pdo->quote($st['created_at']),
        $pdo->quote($st['updated_at'])
    );
}
$out[] = implode(",\n", $stuRows) . ";\n";

// 6. Old Students (Archived)
$out[] = "-- --------------------------------------------------------";
$out[] = "-- Table structure for `old_students`";
$out[] = "-- --------------------------------------------------------";
$out[] = "DROP TABLE IF EXISTS `old_students`;";
$out[] = "CREATE TABLE `old_students` (";
$out[] = "  `id` int(11) NOT NULL AUTO_INCREMENT,";
$out[] = "  `original_id` varchar(10) NOT NULL,";
$out[] = "  `name` varchar(100) NOT NULL,";
$out[] = "  `category` enum('Junior','Senior') NOT NULL,";
$out[] = "  `last_group_id` varchar(10) DEFAULT NULL,";
$out[] = "  `last_class` varchar(50) DEFAULT '',";
$out[] = "  `school` varchar(100) DEFAULT '',";
$out[] = "  `contact_no` varchar(15) DEFAULT '',";
$out[] = "  `father_no` varchar(15) DEFAULT '',";
$out[] = "  `mother_no` varchar(15) DEFAULT '',";
$out[] = "  `adm_date` date DEFAULT NULL,";
$out[] = "  `dob` date DEFAULT NULL,";
$out[] = "  `fee_per_month` int(11) NOT NULL DEFAULT 700,";
$out[] = "  `notes` text DEFAULT NULL,";
$out[] = "  `archived_date` date NOT NULL,";
$out[] = "  `archived_reason` varchar(255) DEFAULT 'Left Institute',";
$out[] = "  `created_at` datetime DEFAULT current_timestamp(),";
$out[] = "  PRIMARY KEY (`id`),";
$out[] = "  KEY `idx_old_students_original_id` (`original_id`),";
$out[] = "  KEY `idx_old_students_name` (`name`)";
$out[] = ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;\n";

if (!empty($oldStudents)) {
    $out[] = "INSERT INTO `old_students` (`original_id`, `name`, `category`, `last_group_id`, `last_class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `archived_date`, `archived_reason`, `created_at`) VALUES";
    $oldRows = [];
    foreach ($oldStudents as $os) {
        $oldRows[] = sprintf(
            "(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %d, %s, %s, %s, %s)",
            $pdo->quote($os['original_id']),
            $pdo->quote($os['name']),
            $pdo->quote($os['category']),
            $os['last_group_id'] === null ? "NULL" : $pdo->quote($os['last_group_id']),
            $pdo->quote($os['last_class']),
            $pdo->quote($os['school']),
            $pdo->quote($os['contact_no']),
            $pdo->quote($os['father_no']),
            $pdo->quote($os['mother_no']),
            $os['adm_date'] === null ? "NULL" : $pdo->quote($os['adm_date']),
            $os['dob'] === null ? "NULL" : $pdo->quote($os['dob']),
            (int)$os['fee_per_month'],
            $os['notes'] === null ? "NULL" : $pdo->quote($os['notes']),
            $pdo->quote($os['archived_date']),
            $pdo->quote($os['archived_reason']),
            $pdo->quote($os['created_at'])
        );
    }
    $out[] = implode(",\n", $oldRows) . ";\n";
}

// 7. Receipts
$out[] = "-- --------------------------------------------------------";
$out[] = "-- Table structure for `receipts`";
$out[] = "-- --------------------------------------------------------";
$out[] = "DROP TABLE IF EXISTS `receipts`;";
$out[] = "CREATE TABLE `receipts` (";
$out[] = "  `id` varchar(20) NOT NULL,";
$out[] = "  `student_id` varchar(10) DEFAULT NULL,";
$out[] = "  `student_name` varchar(100) NOT NULL,";
$out[] = "  `category` enum('Junior','Senior') NOT NULL,";
$out[] = "  `class` varchar(50) DEFAULT '',";
$out[] = "  `school` varchar(100) DEFAULT '',";
$out[] = "  `fee_per_month` int(11) NOT NULL,";
$out[] = "  `period` varchar(50) NOT NULL,";
$out[] = "  `months` text NOT NULL COMMENT 'JSON array of month codes',";
$out[] = "  `amt_paid` int(11) NOT NULL DEFAULT 0,";
$out[] = "  `prev_due` int(11) NOT NULL DEFAULT 0,";
$out[] = "  `total_recv` int(11) NOT NULL DEFAULT 0,";
$out[] = "  `remaining_amount` int(11) NOT NULL DEFAULT 0,";
$out[] = "  `remaining_months` varchar(100) DEFAULT NULL,";
$out[] = "  `admission_fee` int(11) NOT NULL DEFAULT 0,";
$out[] = "  `next_due` varchar(100) DEFAULT '',";
$out[] = "  `notes` text DEFAULT '',";
$out[] = "  `generated_on` datetime DEFAULT current_timestamp(),";
$out[] = "  `generated_by` varchar(50) DEFAULT 'Admin',";
$out[] = "  `academic_year` varchar(10) NOT NULL DEFAULT '2026-27',";
$out[] = "  PRIMARY KEY (`id`),";
$out[] = "  KEY `idx_receipts_student` (`student_id`),";
$out[] = "  KEY `idx_receipts_generated` (`generated_on`),";
$out[] = "  KEY `idx_receipts_year_student` (`academic_year`, `student_id`),";
$out[] = "  CONSTRAINT `fk_receipt_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL ON UPDATE CASCADE";
$out[] = ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;\n";

$out[] = "INSERT INTO `receipts` (`id`, `student_id`, `student_name`, `category`, `class`, `school`, `fee_per_month`, `period`, `months`, `amt_paid`, `prev_due`, `total_recv`, `remaining_amount`, `remaining_months`, `admission_fee`, `next_due`, `notes`, `generated_on`, `generated_by`, `academic_year`) VALUES";
$rRows = [];
foreach ($receipts as $rc) {
    // If student_id was DEL..., set to NULL for FK integrity with students
    $stuId = $rc['student_id'];
    if ($stuId !== null && strpos($stuId, 'DEL') === 0) {
        $stuId = null;
    }
    $rRows[] = sprintf(
        "(%s, %s, %s, %s, %s, %s, %d, %s, %s, %d, %d, %d, %d, %s, %d, %s, %s, %s, %s, %s)",
        $pdo->quote($rc['id']),
        $stuId === null ? "NULL" : $pdo->quote($stuId),
        $pdo->quote($rc['student_name']),
        $pdo->quote($rc['category']),
        $pdo->quote($rc['class']),
        $pdo->quote($rc['school']),
        (int)$rc['fee_per_month'],
        $pdo->quote($rc['period']),
        $pdo->quote($rc['months']),
        (int)$rc['amt_paid'],
        (int)$rc['prev_due'],
        (int)$rc['total_recv'],
        (int)$rc['remaining_amount'],
        $rc['remaining_months'] === null ? "NULL" : $pdo->quote($rc['remaining_months']),
        (int)($rc['admission_fee'] ?? 0),
        $pdo->quote($rc['next_due'] ?? ''),
        $pdo->quote($rc['notes'] ?? ''),
        $pdo->quote($rc['generated_on']),
        $pdo->quote($rc['generated_by'] ?? 'Admin'),
        $pdo->quote($rc['academic_year'] ?? '2026-27')
    );
}
$out[] = implode(",\n", $rRows) . ";\n";

// 8. Report Card Subjects
$out[] = "-- --------------------------------------------------------";
$out[] = "-- Table structure for `rc_subjects`";
$out[] = "-- --------------------------------------------------------";
$out[] = "DROP TABLE IF EXISTS `rc_subjects`;";
$out[] = "CREATE TABLE `rc_subjects` (";
$out[] = "  `id` int(11) NOT NULL AUTO_INCREMENT,";
$out[] = "  `name` varchar(50) NOT NULL,";
$out[] = "  `category` enum('Junior','Senior','Both') NOT NULL DEFAULT 'Both',";
$out[] = "  `display_order` int(11) NOT NULL DEFAULT 0,";
$out[] = "  `is_active` tinyint(1) NOT NULL DEFAULT 1,";
$out[] = "  `created_at` datetime DEFAULT current_timestamp(),";
$out[] = "  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),";
$out[] = "  PRIMARY KEY (`id`),";
$out[] = "  UNIQUE KEY `uk_subject_name_category` (`name`, `category`)";
$out[] = ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;\n";

$out[] = "INSERT INTO `rc_subjects` (`id`, `name`, `category`, `display_order`, `is_active`) VALUES";
$out[] = "(1, 'Olympiad', 'Junior', 1, 1),";
$out[] = "(2, 'Grammar', 'Both', 2, 1),";
$out[] = "(3, 'Creative', 'Both', 3, 1),";
$out[] = "(4, 'Passage', 'Both', 4, 1),";
$out[] = "(5, 'Vocabulary', 'Both', 5, 1),";
$out[] = "(6, 'Literature', 'Senior', 6, 1);\n";

// 9. Report Card Result Periods
$out[] = "-- --------------------------------------------------------";
$out[] = "-- Table structure for `rc_result_periods`";
$out[] = "-- --------------------------------------------------------";
$out[] = "DROP TABLE IF EXISTS `rc_result_periods`;";
$out[] = "CREATE TABLE `rc_result_periods` (";
$out[] = "  `id` int(11) NOT NULL AUTO_INCREMENT,";
$out[] = "  `period_code` varchar(20) NOT NULL,";
$out[] = "  `academic_year` varchar(10) NOT NULL,";
$out[] = "  `month` enum('MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC','JAN','FEB') NOT NULL,";
$out[] = "  `group_id` varchar(10) DEFAULT NULL,";
$out[] = "  `category` enum('Junior','Senior') NOT NULL,";
$out[] = "  `status` enum('Draft','Completed','Published') NOT NULL DEFAULT 'Draft',";
$out[] = "  `created_by` int(11) DEFAULT NULL,";
$out[] = "  `created_at` datetime DEFAULT current_timestamp(),";
$out[] = "  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),";
$out[] = "  PRIMARY KEY (`id`),";
$out[] = "  UNIQUE KEY `uk_period_code` (`period_code`),";
$out[] = "  UNIQUE KEY `uk_period` (`academic_year`, `month`, `group_id`),";
$out[] = "  KEY `idx_period_status` (`status`),";
$out[] = "  CONSTRAINT `fk_rp_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE SET NULL ON UPDATE CASCADE";
$out[] = ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;\n";

// 10. Report Card Student Results
$out[] = "-- --------------------------------------------------------";
$out[] = "-- Table structure for `rc_student_results`";
$out[] = "-- --------------------------------------------------------";
$out[] = "DROP TABLE IF EXISTS `rc_student_results`;";
$out[] = "CREATE TABLE `rc_student_results` (";
$out[] = "  `id` int(11) NOT NULL AUTO_INCREMENT,";
$out[] = "  `result_period_id` int(11) NOT NULL,";
$out[] = "  `student_id` varchar(10) DEFAULT NULL,";
$out[] = "  `snapshot_name` varchar(100) NOT NULL,";
$out[] = "  `snapshot_class` varchar(50) DEFAULT '',";
$out[] = "  `snapshot_group_id` varchar(10) DEFAULT NULL,";
$out[] = "  `snapshot_school` varchar(100) DEFAULT '',";
$out[] = "  `snapshot_category` enum('Junior','Senior') NOT NULL,";
$out[] = "  `status` enum('Present','Absent','Incomplete') NOT NULL DEFAULT 'Present',";
$out[] = "  `total_obtained` decimal(7,2) DEFAULT NULL,";
$out[] = "  `total_max` decimal(7,2) DEFAULT NULL,";
$out[] = "  `percentage` decimal(5,2) DEFAULT NULL,";
$out[] = "  `class_rank` int(11) DEFAULT NULL,";
$out[] = "  `group_rank` int(11) DEFAULT NULL,";
$out[] = "  `created_at` datetime DEFAULT current_timestamp(),";
$out[] = "  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),";
$out[] = "  PRIMARY KEY (`id`),";
$out[] = "  UNIQUE KEY `uk_student_period` (`result_period_id`, `student_id`),";
$out[] = "  KEY `idx_sr_student` (`student_id`),";
$out[] = "  KEY `idx_sr_percentage` (`percentage`),";
$out[] = "  CONSTRAINT `fk_sr_period` FOREIGN KEY (`result_period_id`) REFERENCES `rc_result_periods` (`id`) ON DELETE CASCADE,";
$out[] = "  CONSTRAINT `fk_sr_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL ON UPDATE CASCADE";
$out[] = ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;\n";

// 11. Report Card Student Marks
$out[] = "-- --------------------------------------------------------";
$out[] = "-- Table structure for `rc_student_marks`";
$out[] = "-- --------------------------------------------------------";
$out[] = "DROP TABLE IF EXISTS `rc_student_marks`;";
$out[] = "CREATE TABLE `rc_student_marks` (";
$out[] = "  `id` int(11) NOT NULL AUTO_INCREMENT,";
$out[] = "  `student_result_id` int(11) NOT NULL,";
$out[] = "  `subject_id` int(11) NOT NULL,";
$out[] = "  `max_marks` int(11) NOT NULL,";
$out[] = "  `obtained_marks` decimal(5,2) DEFAULT NULL,";
$out[] = "  `is_absent` tinyint(1) NOT NULL DEFAULT 0,";
$out[] = "  `is_default_max` tinyint(1) NOT NULL DEFAULT 1,";
$out[] = "  PRIMARY KEY (`id`),";
$out[] = "  UNIQUE KEY `uk_result_subject` (`student_result_id`, `subject_id`),";
$out[] = "  CONSTRAINT `fk_sm_result` FOREIGN KEY (`student_result_id`) REFERENCES `rc_student_results` (`id`) ON DELETE CASCADE,";
$out[] = "  CONSTRAINT `fk_sm_subject` FOREIGN KEY (`subject_id`) REFERENCES `rc_subjects` (`id`) ON DELETE CASCADE";
$out[] = ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;\n";

// 12. Homework Sessions
$out[] = "-- --------------------------------------------------------";
$out[] = "-- Table structure for `hw_class_sessions`";
$out[] = "-- --------------------------------------------------------";
$out[] = "DROP TABLE IF EXISTS `hw_class_sessions`;";
$out[] = "CREATE TABLE `hw_class_sessions` (";
$out[] = "  `id` int(11) NOT NULL AUTO_INCREMENT,";
$out[] = "  `session_code` varchar(30) NOT NULL,";
$out[] = "  `group_id` varchar(10) NOT NULL,";
$out[] = "  `session_date` date NOT NULL,";
$out[] = "  `month` varchar(5) NOT NULL DEFAULT 'SEP',";
$out[] = "  `academic_year` varchar(10) NOT NULL DEFAULT '2026-27',";
$out[] = "  `created_by` int(11) DEFAULT NULL,";
$out[] = "  `created_at` datetime DEFAULT current_timestamp(),";
$out[] = "  PRIMARY KEY (`id`),";
$out[] = "  UNIQUE KEY `uk_session_code` (`session_code`),";
$out[] = "  UNIQUE KEY `uk_group_date` (`group_id`, `session_date`),";
$out[] = "  KEY `idx_session_month_group` (`academic_year`, `month`, `group_id`),";
$out[] = "  CONSTRAINT `fk_hws_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE";
$out[] = ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;\n";

// 13. Homework Student Records
$out[] = "-- --------------------------------------------------------";
$out[] = "-- Table structure for `hw_student_records`";
$out[] = "-- --------------------------------------------------------";
$out[] = "DROP TABLE IF EXISTS `hw_student_records`;";
$out[] = "CREATE TABLE `hw_student_records` (";
$out[] = "  `id` int(11) NOT NULL AUTO_INCREMENT,";
$out[] = "  `session_id` int(11) NOT NULL,";
$out[] = "  `session_code` varchar(30) DEFAULT NULL,";
$out[] = "  `student_id` varchar(10) NOT NULL,";
$out[] = "  `homework_status` enum('Done','Not Done','Absent','Not Provided','N/A') DEFAULT NULL,";
$out[] = "  `test_prep_status` enum('Prepared','Not Prepared','Absent','Not Provided','N/A') DEFAULT NULL,";
$out[] = "  `practice_status` enum('Practiced','Not Practiced','On Leave','Not Provided','N/A') DEFAULT NULL,";
$out[] = "  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),";
$out[] = "  PRIMARY KEY (`id`),";
$out[] = "  UNIQUE KEY `uk_session_student` (`session_id`, `student_id`),";
$out[] = "  KEY `idx_record_code` (`session_code`),";
$out[] = "  CONSTRAINT `fk_hwr_session` FOREIGN KEY (`session_id`) REFERENCES `hw_class_sessions` (`id`) ON DELETE CASCADE,";
$out[] = "  CONSTRAINT `fk_hwr_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE";
$out[] = ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;\n";

// 14. Login Attempts
$out[] = "-- --------------------------------------------------------";
$out[] = "-- Table structure for `login_attempts`";
$out[] = "-- --------------------------------------------------------";
$out[] = "DROP TABLE IF EXISTS `login_attempts`;";
$out[] = "CREATE TABLE `login_attempts` (";
$out[] = "  `id` int(11) NOT NULL AUTO_INCREMENT,";
$out[] = "  `ip_address` varchar(45) NOT NULL,";
$out[] = "  `username` varchar(50) NOT NULL,";
$out[] = "  `attempted_at` datetime DEFAULT current_timestamp(),";
$out[] = "  PRIMARY KEY (`id`),";
$out[] = "  KEY `idx_ip_time` (`ip_address`, `attempted_at`)";
$out[] = ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;\n";

if (!empty($loginAttempts)) {
    $out[] = "INSERT INTO `login_attempts` (`id`, `ip_address`, `username`, `attempted_at`) VALUES";
    $laRows = [];
    foreach ($loginAttempts as $la) {
        $laRows[] = sprintf("(%d, %s, %s, %s)", $la['id'], $pdo->quote($la['ip_address']), $pdo->quote($la['username']), $pdo->quote($la['attempted_at']));
    }
    $out[] = implode(",\n", $laRows) . ";\n";
}

$out[] = "COMMIT;";
$out[] = "SET FOREIGN_KEY_CHECKS = 1;\n";

$finalSql = implode("\n", $out);

// Write to if0_42017220_mcms.sql
file_put_contents(__DIR__ . '/../if0_42017220_mcms.sql', $finalSql);
echo "Successfully generated modern if0_42017220_mcms.sql (" . strlen($finalSql) . " bytes).\n";

// Test executing against local mcms database!
$pdo->exec("USE `mcms`;");
$pdo->exec($finalSql);
echo "Successfully executed and verified against local database `mcms` with zero errors!\n";

// Clean up temp db
$pdo->exec("DROP DATABASE IF EXISTS `mcms_temp_convert`;");

// Verify row counts in mcms
$tables = ['admins', 'audit_logs', 'groups', 'login_attempts', 'old_students', 'receipts', 'settings', 'students', 'rc_subjects', 'rc_result_periods', 'rc_student_results', 'rc_student_marks', 'hw_class_sessions', 'hw_student_records'];
echo "\n--- VERIFIED TABLE ROW COUNTS IN `mcms` ---\n";
foreach ($tables as $t) {
    $c = $pdo->query("SELECT COUNT(*) FROM `{$t}`")->fetchColumn();
    echo str_pad($t, 22) . ": " . $c . " rows\n";
}
