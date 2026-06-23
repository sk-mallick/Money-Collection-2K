-- ============================================================
-- MCMS v2.0 Complete Schema & Data Dump
-- Generated dynamically from JSON data files
-- Deploy on phpMyAdmin / InfinityFree MySQL panel
-- ============================================================

-- NOTE: If your hosting provider pre-created your database (e.g. InfinityFree),
-- comment out or remove the CREATE DATABASE line and make sure to select your db in phpMyAdmin.
CREATE DATABASE IF NOT EXISTS `mcms_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `mcms_db`;

-- ─── SETTINGS TABLE ─────────────────────────────────
DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
  `setting_key`   VARCHAR(50) NOT NULL PRIMARY KEY,
  `setting_value` TEXT DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── ADMINS TABLE ───────────────────────────────────
DROP TABLE IF EXISTS `admins`;
CREATE TABLE `admins` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `username`      VARCHAR(50) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `name`          VARCHAR(100) NOT NULL DEFAULT 'Admin',
  `created_at`    DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── GROUPS TABLE ───────────────────────────────────
DROP TABLE IF EXISTS `groups`;
CREATE TABLE `groups` (
  `id`            VARCHAR(10) NOT NULL PRIMARY KEY,
  `class`         VARCHAR(100) NOT NULL,
  `timing`        VARCHAR(100) DEFAULT '',
  `category`      ENUM('Junior','Senior') NOT NULL DEFAULT 'Junior'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── STUDENTS TABLE ─────────────────────────────────
DROP TABLE IF EXISTS `students`;
CREATE TABLE `students` (
  `id`            VARCHAR(10) NOT NULL PRIMARY KEY,
  `name`          VARCHAR(100) NOT NULL,
  `category`      ENUM('Junior','Senior') NOT NULL,
  `group_id`      VARCHAR(10) DEFAULT NULL,
  `class`         VARCHAR(50) DEFAULT '',
  `school`        VARCHAR(100) DEFAULT '',
  `contact_no`    VARCHAR(15) DEFAULT '',
  `father_no`     VARCHAR(15) DEFAULT '',
  `mother_no`     VARCHAR(15) DEFAULT '',
  `adm_date`      DATE NOT NULL,
  `dob`           DATE DEFAULT NULL,
  `fee_per_month` INT NOT NULL DEFAULT 700,
  `notes`         TEXT,
  `created_at`    DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`    DATETIME DEFAULT NULL,
  CONSTRAINT `fk_student_group` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ─── PAYMENTS TABLE ─────────────────────────────────
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `student_id`    VARCHAR(10) NOT NULL,
  `month`         VARCHAR(10) NOT NULL,
  `paid`          TINYINT(1) NOT NULL DEFAULT 0,
  `amount`        INT NOT NULL DEFAULT 0,
  `date`          DATE DEFAULT NULL,
  `academic_year` VARCHAR(10) NOT NULL DEFAULT '2026-27',
  UNIQUE KEY `uk_student_month_year` (`student_id`, `month`, `academic_year`),
  KEY `idx_payments_student` (`student_id`),
  KEY `idx_payments_month` (`month`),
  CONSTRAINT `fk_payment_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ─── RECEIPTS TABLE ─────────────────────────────────
DROP TABLE IF EXISTS `receipts`;
CREATE TABLE `receipts` (
  `id`            VARCHAR(20) NOT NULL PRIMARY KEY,
  `student_id`    VARCHAR(10) DEFAULT NULL,
  `student_name`  VARCHAR(100) NOT NULL,
  `category`      ENUM('Junior','Senior') NOT NULL,
  `class`         VARCHAR(50) DEFAULT '',
  `school`        VARCHAR(100) DEFAULT '',
  `fee_per_month` INT NOT NULL,
  `period`        VARCHAR(50) NOT NULL,
  `months`        TEXT NOT NULL COMMENT 'JSON array of month codes',
  `amt_paid`      INT NOT NULL DEFAULT 0,
  `prev_due`      INT NOT NULL DEFAULT 0,
  `total_recv`    INT NOT NULL DEFAULT 0,
  `remaining_amount` INT NOT NULL DEFAULT 0,
  `remaining_months` VARCHAR(100) DEFAULT NULL,
  `next_due`      VARCHAR(100) DEFAULT '',
  `notes`         TEXT DEFAULT '',
  `generated_on`  DATETIME DEFAULT CURRENT_TIMESTAMP,
  `generated_by`  VARCHAR(50) DEFAULT 'Admin',
  `academic_year` VARCHAR(10) NOT NULL DEFAULT '2026-27',
  CONSTRAINT `fk_receipt_student` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── RATE LIMITING TABLE ─────────────────────────────
DROP TABLE IF EXISTS `login_attempts`;
CREATE TABLE `login_attempts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ip_address` VARCHAR(45) NOT NULL,
  `username` VARCHAR(50) NOT NULL,
  `attempted_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_ip_time` (`ip_address`, `attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── AUDIT LOGS TABLE ────────────────────────────────
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `admin_id`      INT DEFAULT NULL,
  `action`        VARCHAR(50) NOT NULL,
  `target_entity` VARCHAR(50) NOT NULL,
  `target_id`     VARCHAR(50) NOT NULL,
  `description`   TEXT,
  `created_at`    DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_admin` (`admin_id`),
  INDEX `idx_audit_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── INDEXES ────────────────────────────────────────
CREATE INDEX `idx_receipts_student` ON `receipts`(`student_id`);
CREATE INDEX `idx_receipts_generated` ON `receipts`(`generated_on`);
CREATE INDEX `idx_students_deleted` ON `students`(`deleted_at`);
CREATE INDEX `idx_payments_year_paid` ON `payments`(`academic_year`, `paid`);

-- ============================================================
-- DATA SEEDING
-- ============================================================

-- ─── SEED SETTINGS ──────────────────────────────────
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES ('feeJunior', '1000') ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES ('feeSenior', '1000') ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES ('academicYear', '2026-27') ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES ('instituteName', 'EnglishJibi Classes') ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES ('address', 'Duplex-37, In front of DAV School, Sailashree Vihar, Bhubaneswar') ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES ('phone1', '+91 8328922917') ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES ('phone2', '+91 7735812335') ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES ('instagram', '@englishwithchiranjibisir') ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES ('teacherName', 'Chirinjibi Sir') ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES ('adminName', 'Chirinjibi Sir') ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES ('paymentGatewayEnabled', '0') ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES ('razorpayKeyId', NULL) ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES ('upiId', NULL) ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES ('activeMonths', 'MAR,APR,MAY,JUN,JUL,AUG,SEP,OCT,NOV,DEC,JAN,FEB') ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- ─── SEED ADMINS ────────────────────────────────────
INSERT INTO `admins` (`id`, `username`, `password_hash`, `name`) VALUES (1, '18102024', '$2y$10$xinMjTkvwA551wxEzJhOHufqTAdcsfVKHAcWatOm80q44LNVFr/3m', 'Chirinjibi Sir') ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
INSERT INTO `admins` (`username`, `password_hash`, `name`) VALUES ('subham', '$2y$10$jwtDmmF2kLlfXQHVwEUlD.pBdgee8IvIyV8K7u4DF9IfJQUM37f2e', 'Subham Sir') ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ─── SEED GROUPS ────────────────────────────────────
INSERT INTO `groups` (`id`, `class`, `timing`, `category`) VALUES ('A', '6th & 7th', 'Mon, Wed', 'Senior');
INSERT INTO `groups` (`id`, `class`, `timing`, `category`) VALUES ('B', '10th', 'Tue, Thu', 'Senior');
INSERT INTO `groups` (`id`, `class`, `timing`, `category`) VALUES ('C', '5th', 'Mon, Wed', 'Junior');
INSERT INTO `groups` (`id`, `class`, `timing`, `category`) VALUES ('D', '9th', 'Tue, Thu', 'Senior');
INSERT INTO `groups` (`id`, `class`, `timing`, `category`) VALUES ('E', '8th', 'Mon, Wed', 'Senior');
INSERT INTO `groups` (`id`, `class`, `timing`, `category`) VALUES ('F', '4th', 'Tue, Thu', 'Junior');
INSERT INTO `groups` (`id`, `class`, `timing`, `category`) VALUES ('G', '10th', 'Mon, Wed', 'Senior');
INSERT INTO `groups` (`id`, `class`, `timing`, `category`) VALUES ('H', '9th', 'Tue, Thu', 'Senior');
INSERT INTO `groups` (`id`, `class`, `timing`, `category`) VALUES ('I', '8th', 'Mon, Wed', 'Senior');
INSERT INTO `groups` (`id`, `class`, `timing`, `category`) VALUES ('J', '7th', 'Tue, Thu', 'Senior');
INSERT INTO `groups` (`id`, `class`, `timing`, `category`) VALUES ('K', '3rd', 'Mon, Wed', 'Junior');

-- ─── SEED STUDENTS ──────────────────────────────────
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('C01', 'Sanchit Narayan Sahoo', 'Junior', 'C', '5th', 'VEMS', NULL, '7702868710', '7036070707', '2026-03-02', '2011-05-19', 1000, NULL, '2026-05-23 12:08:13', '2026-05-23 12:08:13');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('C02', 'Aditi Das', 'Junior', 'C', '5th', 'KV-4', NULL, '8939707723', '9437306867', '2026-03-01', '2016-01-18', 1000, NULL, '2026-05-23 12:21:23', '2026-05-23 12:21:23');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('C03', 'Laxmi Priya Pradhan', 'Junior', 'C', '5th', 'KV-4', NULL, '8895759241', '8249851395', '2026-03-01', '2015-09-09', 1000, NULL, '2026-05-23 12:36:42', '2026-05-23 12:36:42');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('C04', 'Ashrita Swain', 'Junior', 'C', '5th', 'VEMS', NULL, '9338620588', '9937963213', '2026-03-01', '2016-04-29', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('C05', 'Arshita Mohanty', 'Junior', 'C', '5th', 'VEMS', NULL, '9938637933', '9938984001', '2026-03-01', '2015-07-15', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('C06', 'Shriyanshi Priyadarsini', 'Junior', 'C', '5th', 'DAV', NULL, '7609930620', '8455885886', '2026-03-01', '2015-05-27', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('C07', 'Shubham Kumar Yadav', 'Junior', 'C', '6th', 'KPS', NULL, '9007019906', '8100231780', '2026-03-01', '2015-05-09', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('C08', 'Shreyansh Kumar Yadav', 'Junior', 'C', '4th', 'KPS', NULL, '9007019906', '8100231780', '2026-03-01', '2017-04-07', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('C09', 'Subham Kumar Dalai', 'Junior', 'C', '5th', 'DAV', NULL, NULL, '9861823829', '2026-03-01', '2015-04-27', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('C10', 'Sahil Kumar Sahoo', 'Junior', 'C', '5th', 'FBS', NULL, '9937179958', '9337194958', '2026-03-01', '2015-08-15', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('C11', 'Aaditri Sharma', 'Junior', 'C', '4th', 'SAI', NULL, '9853757076', '8910652843', '2026-03-01', '2017-01-05', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('C12', 'Aayansh Bal', 'Junior', 'C', '4th', 'ODM', '8327708564', '9439776338', '8327708564', '2026-03-01', '2016-07-14', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('F01', 'Aditya Soren', 'Junior', 'F', '4th', 'KV-3', NULL, '8074779654', '6302889948', '2026-03-01', '2016-05-06', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('F02', 'Divya Debasish Sethy', 'Junior', 'F', '4th', 'KV-3', NULL, '8455969561', '9777750366', '2026-03-01', '2016-10-15', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('F03', 'Avilipsa Sahoo', 'Junior', 'F', '4th', 'KV-4', NULL, '9861285739', '7978231482', '2026-03-01', '2016-07-01', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('F04', 'Anwesha Sahoo', 'Junior', 'F', '4th', 'KPS', NULL, '9930119687', '9930119667', '2026-03-01', NULL, 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('F05', 'Tapas Pahadsing', 'Junior', 'F', '4th', 'DAV', NULL, '9938598493', '7609898287', '2026-03-01', '2016-08-24', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('F06', 'Karan Sahu', 'Junior', 'F', '4th', 'KV-4', NULL, '9861104669', '8338043444', '2026-03-01', '2016-09-23', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('F07', 'Riyan Sahoo', 'Junior', 'F', '4th', 'KIIT', '7735339695', '7325917387', '9438731110', '2026-03-01', '2016-07-03', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('F08', 'Sushree Sanaya Rout', 'Junior', 'F', '4th', 'ODM', NULL, '9437492696', '6372666450', '2026-03-01', '2017-03-01', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('F09', 'Adyasha Pradhan', 'Junior', 'F', '4th', 'KV-3', NULL, '7217832162', '9337786670', '2026-03-01', '2016-08-29', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('F10', 'Birabhadra Das', 'Junior', 'F', '4th', 'KV-3', NULL, '9778621079', '6371507919', '2026-03-01', '2016-06-24', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('F11', 'Saiansh Biswal', 'Junior', 'F', '3rd', 'DAV', NULL, '9658740246', '7978448133', '2026-03-01', '2017-06-01', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('F12', 'Priyanshi Das', 'Junior', 'F', '3rd', 'St.Xaviar', NULL, '9658101514', '8908138248', '2026-03-01', '2018-04-14', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('F13', 'Reyansh Nayak', 'Junior', 'F', '4th', 'KV-4', NULL, '7894025098', '8895721165', '2026-03-01', '2017-01-12', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('F14', 'Sanvi Priyanshi', 'Junior', 'F', '4th', 'SAI', '8260302191', '8260302191', '8260302191', '2026-04-01', '2017-07-26', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('F15', 'Adhira Anaika', 'Junior', 'F', '4th', 'SAI', '7008646560', NULL, '7008646560', '2026-04-01', '2017-09-15', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('F16', 'Nirmalya Panda', 'Junior', 'F', '4th', 'FBS', '8328913434', '7656876267', '8328913434', '2026-04-01', '2016-12-21', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('F17', 'Reeyansh Roshan', 'Junior', 'F', '4th', 'Narayana', '7978359408', NULL, '9040525596', '2026-04-01', '2017-02-12', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('F18', 'Saswat Das', 'Junior', 'F', '4th', 'FBS', NULL, '9658245434', '7377147015', '2026-04-01', '2017-07-11', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('K01', 'Subhangi Samal', 'Junior', 'K', '3rd', 'DAV', NULL, '9090871840', '6371081262', '2026-04-01', '2017-04-28', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('K02', 'Adyant Singh', 'Junior', 'K', '3rd', 'DAV', NULL, '9437922084', '8895646083', '2026-04-01', '2017-12-14', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('K03', 'Sai Nishant Nayak', 'Junior', 'K', '3rd', 'DAV', NULL, '9861317634', '9778163640', '2026-04-01', '2018-02-07', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('K04', 'Dibyansh Sahoo', 'Junior', 'K', '2nd', 'ODM', '7008986566', '8249761028', '7008986566', '2026-04-01', '2018-12-17', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('K05', 'Tanwesha Moharana', 'Junior', 'K', '3rd', 'DAV', '7008955925', '9337217151', '7008955925', '2026-04-01', '2017-08-11', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('K06', 'Lokesh Mahakud', 'Junior', 'K', '3rd', 'KV-3', '8349438235', '8718915588', '8349438235', '2026-04-01', '2017-05-24', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('K07', 'Anvit Rout', 'Junior', 'K', '3rd', 'DAV', NULL, '9916271593', '8884521230', '2026-08-04', '2017-08-05', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('K08', 'Aarnav Parida', 'Junior', 'K', '3rd', 'DAV', NULL, '9937116027', '7682966214', '2026-06-04', '2017-06-25', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('K09', 'Baibhabi Priyadarshini Behera', 'Junior', 'K', '3rd', 'SAI', NULL, '9861078525', '7008264179', '2026-08-04', '2018-02-22', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('A01', 'Lipsita Mohanty', 'Senior', 'A', '7th', 'KPS', '7205958919', '9938777003', '7978442545', '2026-03-01', '2013-09-28', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('A02', 'Ipsita Mohanty', 'Senior', 'A', '7th', 'KPS', '7205958919', '9938777003', '7978442545', '2026-03-01', '2013-09-28', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('A03', 'Shreyash Nayak', 'Senior', 'A', '7th', 'SAI', NULL, '9439003300', '7735994388', '2026-03-01', '2014-01-18', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('A04', 'Subhasmita Mallik', 'Senior', 'A', '7th', 'ODM', '7978433794', '9438306170', '6372081330', '2026-03-01', '2013-09-12', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('A05', 'Adarsh Muduli', 'Senior', 'A', '7th', 'ODM', NULL, '7328073270', '8249048756', '2026-03-01', '2014-05-18', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('A06', 'Omsai Krishna Pradhan', 'Senior', 'A', '6th', 'ODM', NULL, NULL, '6281828164', '2026-03-01', '2015-08-19', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('A07', 'Sai Satwak Sahoo', 'Senior', 'A', '6th', 'LOYOLA', NULL, '7873394996', '8249016138', '2026-03-01', '2015-04-08', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('A08', 'Pratyush Kumar Khuntia', 'Senior', 'A', '6th', 'KV-4', NULL, '9438118904', '8458082230', '2026-03-01', '2015-10-02', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('A09', 'Sibansi Behera', 'Senior', 'A', '6th', 'ODM', NULL, '7749013157', '8984101690', '2026-03-01', '2015-08-24', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('A10', 'Soumya Priyadarshi Beura', 'Senior', 'A', '6th', 'DAV', NULL, '9337876275', '8908615519', '2026-03-01', '2014-06-14', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('A11', 'Pranjal Ram', 'Senior', 'A', '6th', 'ODM', NULL, '8108700422', '9167165081', '2026-03-01', '2014-08-29', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('A12', 'Arman Ray', 'Senior', 'A', '7th', 'ODM', '9853000234', '9853000234', '7873555104', '2026-04-01', '2014-03-16', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('A13', 'Krutartha Mishra', 'Senior', 'A', '6th', 'ODM', '9658553353', '9692144071', '9658553353', '2026-04-01', '2014-08-21', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('A14', 'Arnav Satpathy', 'Senior', 'A', '6th', 'Mount Litera', '9348645239', '8692883386', '9348645239', '2026-04-01', '2014-01-04', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('B01', 'Anshuman Rath', 'Senior', 'B', '10th', 'ODM', NULL, '1501894329', '7978131667', '2026-04-01', '2010-10-24', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('B02', 'Bibhukrupa Biswal', 'Senior', 'B', '10th', 'ODM', NULL, '9692036236', '9348089248', '2026-04-01', '2010-11-15', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('B03', 'Sai Akshyat Boitai', 'Senior', 'B', '10th', 'ODM', NULL, '9986872531', '7204553015', '2026-04-01', '2011-05-06', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('B04', 'Snehal Kumar Sahoo', 'Senior', 'B', '10th', 'FBS', NULL, '9937179958', '9937849333', '2026-04-01', '2012-01-01', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('B05', 'Swastik Dhal', 'Senior', 'B', '10th', 'KV', NULL, '7008257051', '9438675123', '2026-04-01', NULL, 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('B06', 'Satyabrata Pradhan', 'Senior', 'B', '10th', 'KV', NULL, '9439047907', '9437347525', '2026-04-01', NULL, 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('B07', 'Ipshita Mohalik', 'Senior', 'B', '10th', 'KV', NULL, '9776432655', '9937884275', '2026-01-04', '2011-11-20', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('B08', 'Satyabrata Pradhan 2', 'Senior', 'B', '10th', 'KV', NULL, '9439047907', '9437347525', '2026-05-04', '2011-07-01', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('D01', 'Saishree Pattnaik', 'Senior', 'D', '9th', 'DAV', NULL, '8457845075', '9439975032', '2026-03-01', '2012-02-05', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('D02', 'Samyak Sahoo', 'Senior', 'D', '9th', 'ODM', NULL, '9921486430', '9834293272', '2026-03-01', '2012-01-06', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('D03', 'Jeebtesh Sahoo', 'Senior', 'D', '9th', 'DAV', '9777527298', '9861451809', '9861687046', '2026-03-01', '2012-01-03', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('D04', 'Shreeja Rout', 'Senior', 'D', '9th', 'SAI', NULL, '7978030575', '7978862173', '2026-03-01', '2012-03-20', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('D05', 'Sohan Sudeep Hansda', 'Senior', 'D', '9th', 'DAV', '9827418190', '9438174526', '9438301751', '2026-03-01', '2012-09-23', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('D06', 'Sonakshi Das', 'Senior', 'D', '9th', 'SAI', NULL, '9437058486', '9937188889', '2026-03-01', '2011-12-26', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('E01', 'Aradhya Sahoo', 'Senior', 'E', '8th', 'FBS', NULL, '9930119687', '9930119667', '2026-04-01', '2012-12-30', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('E02', 'Dibyansha Nayak', 'Senior', 'E', '8th', 'FBS', NULL, '9438037873', '9853486966', '2026-04-01', '2013-12-18', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('E03', 'Jashith Bhuyan', 'Senior', 'E', '7th', 'FBS', NULL, '7008796059', '9438559843', '2026-04-01', '2014-05-20', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('E04', 'Sai Subhalaxmi Behera', 'Senior', 'E', '8th', 'FBS', NULL, '9337074763', '9937387073', '2026-04-01', '2014-06-27', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('E05', 'Bhagyalaxmi Prusty', 'Senior', 'E', '8th', 'NETS', NULL, '9040000520', '6289374665', '2026-01-04', '2013-03-16', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('E06', 'Ishita Manna', 'Senior', 'E', '7th', 'FBS', NULL, '7735722963', '8260781631', '2026-01-04', '2013-11-19', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('G01', 'Sonakshi Ojha', 'Senior', 'G', '10th', 'DAV', NULL, NULL, '8018618170', '2026-04-01', '2010-10-29', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('G02', 'Samiksha Swain', 'Senior', 'G', '10th', 'DAV', NULL, '7327094010', '9777588798', '2026-04-01', '2011-11-13', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('G03', 'Adyasha Mohanty', 'Senior', 'G', '10th', 'DAV', '7008831525', '9861404370', '9778109819', '2026-04-01', '2011-03-06', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('G04', 'Swadhin Sekhar Dalai', 'Senior', 'G', '10th', 'DAV', '7008003019', '9438441662', '9437115621', '2026-04-01', '2010-08-15', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('G05', 'Dibyanshi Mishra', 'Senior', 'G', '10th', 'DAV', '7853942686', '9437286846', '7008506526', '2026-04-01', '2011-07-10', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('G06', 'Swastik Dhal G', 'Senior', 'G', '10th', 'KV-4', NULL, '7008257051', '9438675123', '2026-04-01', '2012-03-17', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('G07', 'Krishendu Panda', 'Senior', 'G', '10th', 'DAV', '8260631940', '9337319359', '8327729799', '2026-04-01', '2011-09-24', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('H01', 'Ayush Majumdar', 'Senior', 'H', '9th', 'NARAYANA', NULL, '9937952963', '8328815559', '2026-04-01', '2013-02-22', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('H02', 'Sanaya Acharya', 'Senior', 'H', '9th', 'NARAYANA', '8209240518', '9320061455', '7674835169', '2026-04-01', '2012-07-19', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('H03', 'Baranbhavaya', 'Senior', 'H', '9th', 'St.Xavier', NULL, '9861280410', '7978035002', '2026-04-01', '2012-11-02', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('H04', 'Bapun Das', 'Senior', 'H', '9th', 'ODM', '6371514311', NULL, '7008676171', '2026-04-01', '2012-06-20', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('H05', 'Jyoti Prakash Nayak', 'Senior', 'H', '9th', 'ODM', '6290893638', '8282807161', '6291610033', '2026-04-01', '2012-09-04', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('H06', 'Pratiksha Pattnaik', 'Senior', 'H', '9th', 'FBS', '9937811409', NULL, '9937811409', '2026-04-01', NULL, 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('H07', 'Dibyanshu Saidarshan', 'Senior', 'H', '9th', 'DAV', '7978899858', '7978899860', '7978899858', '2026-04-01', '2012-09-12', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('I01', 'Animesh Mishra', 'Senior', 'I', '8th', 'ODM', NULL, '7978661689', '9438555452', '2026-04-01', '2013-07-15', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('I02', 'Benoy Bhabjeet', 'Senior', 'I', '8th', 'PEMS', NULL, '9437506467', '9692683037', '2026-04-01', '2013-02-18', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('I03', 'Pritam Prakash Jena', 'Senior', 'I', '8th', 'DAV', NULL, '8763839239', '8763981329', '2026-04-01', '2013-08-03', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('I04', 'Biswajit Behera', 'Senior', 'I', '8th', 'DAV', NULL, '8763325867', '7848948408', '2026-03-01', '2012-10-03', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('I05', 'Jeet Mallick', 'Senior', 'I', '8th', 'DAV', NULL, '9938644042', '8546887844', '2026-03-01', '2013-05-15', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('I06', 'Adyasha Gouda', 'Senior', 'I', '8th', 'ODM', NULL, '8894041327', '7978901912', '2026-03-01', '2012-10-31', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('J01', 'Bidisha Priyadarshni', 'Senior', 'J', '7th', 'KV-4', NULL, '9678447260', '9678447260', '2026-03-01', '2014-10-25', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('J02', 'Biswaswarup Patra', 'Senior', 'J', '7th', 'VEMS', NULL, '9348323490', '8908792749', '2026-03-01', '2014-01-29', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('J03', 'Sai Subham Bhola', 'Senior', 'J', '7th', 'VEMS', NULL, '7008093280', '8249106988', '2026-03-01', '2014-04-17', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('J04', 'Tanmay Jain', 'Senior', 'J', '7th', 'DAV', NULL, '7438804746', '9337401170', '2026-03-01', '2014-05-22', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('J05', 'Pulak Sudam Murmu', 'Senior', 'J', '7th', 'DAV', NULL, '9438559328', '8280000165', '2026-03-01', '2014-01-13', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('J06', 'Aravya Ayushman', 'Senior', 'J', '7th', 'DAV', '9827821112', '7906301403', '9437391951', '2026-03-01', '2013-10-04', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('J07', 'Shiksha Suravi Behera', 'Senior', 'J', '7th', 'KV-3', '8249261736', '9583694889', '8249261736', '2026-04-01', '2014-07-22', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('J08', 'Sai Sourjit Lenka', 'Senior', 'J', '7th', 'KV-4', '8917272914', '8249704396', '8917272914', '2026-04-01', '2014-05-22', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('J09', 'Swastic Ranjan Mallick', 'Senior', 'J', '7th', 'KV-4', '7894235334', '6372677323', '7894235334', '2026-04-01', '2014-04-03', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('J10', 'Shreyansh Mishra', 'Senior', 'J', '7th', 'FBS', NULL, '9338225075', '9338585048', '2026-04-01', '2013-12-16', 1000, NULL, '2026-06-06 18:09:49', '2026-06-06 18:09:49');
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`, `created_at`, `updated_at`) VALUES ('J11', 'Brajesh Sahoo', 'Senior', 'J', '7th', 'KV-4', '9937474504', '9668704504', '9937474504', '2026-04-01', '2013-10-12', 1000, NULL, '2026-05-23 12:02:57', '2026-05-23 12:02:57');

-- ─── SEED PAYMENTS ──────────────────────────────────
INSERT INTO `payments` (`student_id`, `month`, `paid`, `amount`, `date`, `academic_year`) VALUES ('J11', 'JUN', 1, 1000, '2026-05-23', '2026-27');

