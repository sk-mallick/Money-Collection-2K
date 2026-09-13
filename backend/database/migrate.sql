-- ================================================================
-- Money Collection & Report Card Management System (MCMS)
-- Master Production Database Migration & Default Seeds
-- Character Set: utf8mb4 | Collation: utf8mb4_general_ci
-- ================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- 1. Table structure for `admins`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) NOT NULL DEFAULT 'Admin',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_admin_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 2. Table structure for `groups`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `groups` (
  `id` VARCHAR(10) NOT NULL,
  `class` VARCHAR(100) NOT NULL,
  `timing` VARCHAR(100) DEFAULT '',
  `category` ENUM('Junior','Senior') NOT NULL DEFAULT 'Junior',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 3. Table structure for `settings`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `setting_key` VARCHAR(50) NOT NULL,
  `setting_value` TEXT NOT NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 4. Table structure for `students`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `students` (
  `id` VARCHAR(10) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `category` ENUM('Junior','Senior') NOT NULL,
  `group_id` VARCHAR(10) DEFAULT NULL,
  `class` VARCHAR(50) DEFAULT '',
  `school` VARCHAR(100) DEFAULT '',
  `contact_no` VARCHAR(15) DEFAULT '',
  `father_no` VARCHAR(15) DEFAULT '',
  `mother_no` VARCHAR(15) DEFAULT '',
  `adm_date` DATE NOT NULL,
  `dob` DATE DEFAULT NULL,
  `fee_per_month` INT(11) NOT NULL DEFAULT 700,
  `admission_fee_paid` TINYINT(1) NOT NULL DEFAULT 1,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_students_group` (`group_id`),
  CONSTRAINT `fk_student_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 5. Table structure for `old_students` (Archived Students)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `old_students` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `original_id` VARCHAR(10) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `category` ENUM('Junior','Senior') NOT NULL,
  `last_group_id` VARCHAR(10) DEFAULT NULL,
  `last_class` VARCHAR(50) DEFAULT '',
  `school` VARCHAR(100) DEFAULT '',
  `contact_no` VARCHAR(15) DEFAULT '',
  `father_no` VARCHAR(15) DEFAULT '',
  `mother_no` VARCHAR(15) DEFAULT '',
  `adm_date` DATE DEFAULT NULL,
  `dob` DATE DEFAULT NULL,
  `fee_per_month` INT(11) NOT NULL DEFAULT 700,
  `notes` TEXT DEFAULT NULL,
  `archived_date` DATE NOT NULL,
  `archived_reason` VARCHAR(255) DEFAULT 'Left Institute',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_old_students_original_id` (`original_id`),
  KEY `idx_old_students_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 6. Table structure for `receipts`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `receipts` (
  `id` VARCHAR(20) NOT NULL,
  `student_id` VARCHAR(10) DEFAULT NULL,
  `student_name` VARCHAR(100) NOT NULL,
  `category` ENUM('Junior','Senior') NOT NULL,
  `class` VARCHAR(50) DEFAULT '',
  `school` VARCHAR(100) DEFAULT '',
  `fee_per_month` INT(11) NOT NULL,
  `period` VARCHAR(50) NOT NULL,
  `months` TEXT NOT NULL COMMENT 'JSON array of month codes',
  `amt_paid` INT(11) NOT NULL DEFAULT 0,
  `prev_due` INT(11) NOT NULL DEFAULT 0,
  `total_recv` INT(11) NOT NULL DEFAULT 0,
  `remaining_amount` INT(11) NOT NULL DEFAULT 0,
  `remaining_months` VARCHAR(100) DEFAULT NULL,
  `next_due` VARCHAR(100) DEFAULT '',
  `notes` TEXT DEFAULT '',
  `generated_on` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `generated_by` VARCHAR(50) DEFAULT 'Admin',
  `academic_year` VARCHAR(10) NOT NULL DEFAULT '2026-27',
  PRIMARY KEY (`id`),
  KEY `idx_receipts_student` (`student_id`),
  KEY `idx_receipts_generated` (`generated_on`),
  KEY `idx_receipts_year_student` (`academic_year`, `student_id`),
  CONSTRAINT `fk_receipt_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 7. Table structure for `rc_subjects`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rc_subjects` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `category` ENUM('Junior','Senior','Both') NOT NULL DEFAULT 'Both',
  `display_order` INT(11) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_subject_name_category` (`name`, `category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 8. Table structure for `rc_result_periods`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rc_result_periods` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `period_code` VARCHAR(20) NOT NULL,
  `academic_year` VARCHAR(10) NOT NULL,
  `month` ENUM('MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC','JAN','FEB') NOT NULL,
  `group_id` VARCHAR(10) DEFAULT NULL,
  `category` ENUM('Junior','Senior') NOT NULL,
  `status` ENUM('Draft','Completed','Published') NOT NULL DEFAULT 'Draft',
  `created_by` INT(11) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_period_code` (`period_code`),
  UNIQUE KEY `uk_period` (`academic_year`, `month`, `group_id`),
  KEY `idx_period_status` (`status`),
  CONSTRAINT `fk_rp_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 9. Table structure for `rc_student_results`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rc_student_results` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `result_period_id` INT(11) NOT NULL,
  `student_id` VARCHAR(10) DEFAULT NULL,
  `snapshot_name` VARCHAR(100) NOT NULL,
  `snapshot_class` VARCHAR(50) DEFAULT '',
  `snapshot_group_id` VARCHAR(10) DEFAULT NULL,
  `snapshot_school` VARCHAR(100) DEFAULT '',
  `snapshot_category` ENUM('Junior','Senior') NOT NULL,
  `status` ENUM('Present','Absent','Incomplete') NOT NULL DEFAULT 'Present',
  `total_obtained` DECIMAL(7,2) DEFAULT NULL,
  `total_max` DECIMAL(7,2) DEFAULT NULL,
  `percentage` DECIMAL(5,2) DEFAULT NULL,
  `class_rank` INT(11) DEFAULT NULL,
  `group_rank` INT(11) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_student_period` (`result_period_id`, `student_id`),
  KEY `idx_sr_student` (`student_id`),
  KEY `idx_sr_percentage` (`percentage`),
  CONSTRAINT `fk_sr_period` FOREIGN KEY (`result_period_id`) REFERENCES `rc_result_periods` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sr_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 10. Table structure for `rc_student_marks`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rc_student_marks` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `student_result_id` INT(11) NOT NULL,
  `subject_id` INT(11) NOT NULL,
  `max_marks` INT(11) NOT NULL,
  `obtained_marks` DECIMAL(5,2) DEFAULT NULL,
  `is_absent` TINYINT(1) NOT NULL DEFAULT 0,
  `is_default_max` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_result_subject` (`student_result_id`, `subject_id`),
  CONSTRAINT `fk_sm_result` FOREIGN KEY (`student_result_id`) REFERENCES `rc_student_results` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sm_subject` FOREIGN KEY (`subject_id`) REFERENCES `rc_subjects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 11. Table structure for `audit_logs`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `admin_id` INT(11) DEFAULT NULL,
  `action` VARCHAR(50) NOT NULL,
  `target_entity` VARCHAR(50) NOT NULL,
  `target_id` VARCHAR(50) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_admin` (`admin_id`),
  KEY `idx_audit_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 12. Table structure for `login_attempts`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `login_attempts` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `ip_address` VARCHAR(45) NOT NULL,
  `username` VARCHAR(50) NOT NULL,
  `attempted_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ip_time` (`ip_address`, `attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ================================================================
-- DEFAULT SEEDS & SYSTEM INITIALIZATION
-- Safe Inserts: Will not overwrite or corrupt existing active data
-- ================================================================

-- Default Groups (A through K)
INSERT INTO `groups` (`id`, `class`, `timing`, `category`) VALUES
  ('A', '6th & 7th', 'Mon, Wed', 'Senior'),
  ('B', '10th', 'Tue, Thu', 'Senior'),
  ('C', '5th', 'Mon, Wed', 'Junior'),
  ('D', '9th', 'Tue, Thu', 'Senior'),
  ('E', '7th & 8th', 'Mon, Wed', 'Senior'),
  ('F', '3rd & 4th', 'Tue, Thu', 'Junior'),
  ('G', '10th', 'Mon, Wed', 'Senior'),
  ('H', '9th', 'Tue, Thu', 'Senior'),
  ('I', '8th', 'Mon, Wed', 'Senior'),
  ('J', '7th', 'Tue, Thu', 'Senior'),
  ('K', '2nd & 3rd', 'Mon, Wed', 'Junior')
ON DUPLICATE KEY UPDATE
  `class` = VALUES(`class`),
  `timing` = VALUES(`timing`),
  `category` = VALUES(`category`);

-- Default Settings
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES
  ('academicYear', '2026-27'),
  ('activeMonths', 'MAR,APR,MAY,JUN,JUL,AUG,SEP,OCT,NOV,DEC,JAN,FEB'),
  ('address', 'Duplex-37, In front of DAV School, Sailashree Vihar, Bhubaneswar'),
  ('adminName', 'Chirinjibi Sir'),
  ('feeJunior', '1000'),
  ('feeSenior', '1000'),
  ('instagram', '@englishwithchiranjibisir'),
  ('instituteName', 'EnglishJibi Classes'),
  ('phone1', '+91 8328922917'),
  ('phone2', '+91 7735812335'),
  ('teacherName', 'Chirinjibi Sir')
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`);

-- Default Subjects
INSERT INTO `rc_subjects` (`name`, `category`, `display_order`, `is_active`) VALUES
  ('Olympiad', 'Junior', 1, 1),
  ('Grammar', 'Both', 2, 1),
  ('Creative', 'Both', 3, 1),
  ('Passage', 'Both', 4, 1),
  ('Vocabulary', 'Both', 5, 1),
  ('Literature', 'Senior', 6, 1)
ON DUPLICATE KEY UPDATE
  `display_order` = VALUES(`display_order`),
  `is_active` = VALUES(`is_active`);

-- Default Admin Accounts (Subham Sir and Chirinjibi Sir)
INSERT INTO `admins` (`username`, `password_hash`, `name`) VALUES
  ('18102024', '$2y$10$xinMjTkvwA551wxEzJhOHufqTAdcsfVKHAcWatOm80q44LNVFr/3m', 'Chirinjibi Sir'),
  ('454', '$2y$10$jwtDmmF2kLlfXQHVwEUlD.pBdgee8IvIyV8K7u4DF9IfJQUM37f2e', 'Subham Sir')
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`);

SET FOREIGN_KEY_CHECKS = 1;
