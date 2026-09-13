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

-- --------------------------------------------------------
-- Default Active Students (114 Student Profiles A through K)
-- --------------------------------------------------------
INSERT INTO `students` (`id`, `name`, `category`, `group_id`, `class`, `school`, `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, `fee_per_month`, `notes`) VALUES
('A01', 'Pratha Mohapatra', 'Senior', 'A', '6th', 'LOYOLA', 'NIL', '9439726343', '8455885842', '2026-05-01', '2014-09-01', 1000, NULL),
('A02', 'Soumyaashree Sahu', 'Senior', 'A', '6th', 'KV-1', 'NIL', '9853383848', 'NIL', '2026-05-01', '2015-05-12', 1000, NULL),
('A03', 'Shreyash Nayak', 'Senior', 'A', '7th', 'SAI', 'NIL', '9439003300', '7735994388', '2026-03-01', '2014-01-18', 1000, NULL),
('A04', 'Subhasmita Mallik', 'Senior', 'A', '7th', 'ODM', '7978433794', '9438306170', '6372081330', '2026-03-01', '2013-09-12', 1000, NULL),
('A06', 'Omsai Krishna Pradhan', 'Senior', 'A', '6th', 'ODM', 'NIL', 'NIL', '6281828164', '2026-03-01', '2015-08-19', 1000, NULL),
('A07', 'Sai Satwak Sahoo', 'Senior', 'A', '6th', 'LOYOLA', 'NIL', '7873394996', '8249016138', '2026-03-01', '2015-04-08', 1000, NULL),
('A08', 'Pratyush Kumar Khuntia', 'Senior', 'A', '6th', 'KV-4', 'NIL', '9438118904', '8458082230', '2026-03-01', '2015-10-02', 1000, NULL),
('A09', 'Subham Kumar Mallick', 'Senior', 'A', '7th', '', '', '', '', '2026-07-04', NULL, 1000, NULL),
('A10', 'Soumya Priyadarshi Beura', 'Senior', 'A', '6th', 'DAV', 'NIL', '9337876275', '8908615519', '2026-03-01', '2014-06-14', 1000, NULL),
('A11', 'Pranjal Ram', 'Senior', 'A', '6th', 'ODM', 'NIL', '8108700422', '9167165081', '2026-03-01', '2014-08-29', 1000, NULL),
('A12', 'Arman Ray', 'Senior', 'A', '7th', 'ODM', '9853000234', '9853000234', '7873555104', '2026-04-01', '2014-03-16', 1000, NULL),
('A13', 'Samiksha Behera', 'Senior', 'A', '7th', 'ODM', '9438732879', '9438066366', '9438732879', '2026-06-01', '2013-12-17', 1000, NULL),
('A14', 'Arnav Satpathy', 'Senior', 'A', '6th', 'Mount Litera', '9348645239', '8692883386', '9348645239', '2026-04-01', '2014-01-04', 1000, NULL),
('A15', 'Tanmay Samal', 'Senior', 'A', '6th', 'ODM', 'NIL', '993866119', '7077082759', '2026-05-01', '2015-07-15', 1000, NULL),
('A16', 'Ananya Das', 'Senior', 'A', '7th', 'ODM', 'NIL', 'NIL', '8249836183', '2026-07-01', '2014-05-04', 1000, NULL),
('A17', 'Simrens Sahoo', 'Senior', 'A', '7th', 'St.xavier', 'NIL', '7008867580', '7008794924', '2026-05-01', '2014-08-05', 1000, NULL),
('A18', 'Saanvi Mohanty', 'Senior', 'A', '6th', 'ODM', 'NIL', '7718832275', '9886576155', '2026-06-01', '2015-01-01', 1000, NULL),
('A20', 'ENGLISHJIBI CLASSES', 'Senior', 'A', '6th', 'KPS', '8114963709', '6371161373', '8100231780', '2026-09-01', '2005-09-09', 1000, NULL),
('B01', 'Anshuman Rath', 'Senior', 'B', '10th', 'ODM', 'NIL', '1501894329', '7978131667', '2026-04-01', '2010-10-24', 1300, NULL),
('B02', 'Bibhukrupa Biswal', 'Senior', 'B', '10th', 'ODM', 'NIL', '9692036236', '9348089248', '2026-04-01', '2010-11-15', 1300, NULL),
('B03', 'Sai Akshyat Boitai', 'Senior', 'B', '10th', 'ODM', 'NIL', '9986872531', '7204553015', '2026-04-01', '2011-05-06', 1300, NULL),
('B04', 'Snehal Kumar Sahoo', 'Senior', 'B', '10th', 'FBS', 'NIL', '9937179958', '9937849333', '2026-04-01', '2012-01-01', 1300, NULL),
('B05', 'Swastik Dhal', 'Senior', 'B', '10th', 'KV', 'NIL', '7008257051', '9438675123', '2026-04-01', '2012-03-13', 1300, NULL),
('B06', 'Satyabrata Pradhan', 'Senior', 'B', '10th', 'KV', 'NIL', '9439047907', '9437347525', '2026-04-01', '2011-07-01', 1300, NULL),
('B07', 'Ipshita Mohalik', 'Senior', 'B', '10th', 'KV', 'NIL', '9776432655', '9937884275', '2026-04-01', '2011-11-20', 1300, NULL),
('B08', 'Ayush Samantaray', 'Senior', 'B', '10th', 'ODM', 'NIL', '9437178082', '8260114098', '2026-04-01', '2011-09-02', 1300, NULL),
('B09', 'Lopamudra Nayak', 'Senior', 'B', '10th', 'DAV', 'NIL', '9437021670', '9438171092', '2026-04-01', '2011-04-12', 1300, NULL),
('B10', 'Subham Satpathy', 'Senior', 'B', '10th', 'VEMS', 'NIL', '9777088924', '7978250269', '2026-04-01', '2011-04-01', 1300, NULL),
('B11', 'Aditya Singh', 'Senior', 'B', '10th', 'DAV', 'NIL', '9937070107', '9437303038', '2026-04-01', '2010-12-07', 1300, NULL),
('B12', 'Arpita Nayak', 'Senior', 'B', '10th', 'ODM', 'NIL', '9439003300', '7735994388', '2026-06-01', '2011-05-18', 1300, NULL),
('C01', 'Bikash Kumar Sahoo', 'Senior', 'C', '8th', 'LOYOLA', 'NIL', '9437278235', '9439246194', '2026-04-01', '2013-05-11', 1000, NULL),
('C02', 'Samarjit Mohanty', 'Senior', 'C', '8th', 'LOYOLA', 'NIL', '9078772091', '9437308722', '2026-04-01', '2013-02-18', 1000, NULL),
('C03', 'Rohan Nayak', 'Senior', 'C', '8th', 'KV-1', 'NIL', '9337090885', '7381270885', '2026-04-01', '2013-04-18', 1000, NULL),
('C04', 'Sai Swayam Sahoo', 'Senior', 'C', '8th', 'KV-1', 'NIL', '7873394996', '8249016138', '2026-04-01', '2013-08-01', 1000, NULL),
('C05', 'Spandan Panda', 'Senior', 'C', '8th', 'DAV', 'NIL', '7008107936', '7008742875', '2026-04-01', '2013-09-02', 1000, NULL),
('C06', 'Divesh Samal', 'Senior', 'C', '8th', 'DAV', 'NIL', '933866119', '7077082759', '2026-04-01', '2013-06-19', 1000, NULL),
('C07', 'Abhijeet Jena', 'Senior', 'C', '8th', 'DAV', 'NIL', '9078496328', '7684875165', '2026-04-01', '2013-02-09', 1000, NULL),
('C08', 'Harshita Panda', 'Senior', 'C', '8th', 'DAV', 'NIL', '9337851216', '7978939227', '2026-04-01', '2013-08-25', 1000, NULL),
('C09', 'Abhijeet Mohanty', 'Senior', 'C', '8th', 'DAV', 'NIL', '9437340051', '9438062592', '2026-04-01', '2013-02-19', 1000, NULL),
('C10', 'Aadyasha Sahoo', 'Senior', 'C', '8th', 'DAV', 'NIL', '9437633215', '9861219213', '2026-04-01', '2013-08-16', 1000, NULL),
('C11', 'Priyanshu Ray', 'Senior', 'C', '8th', 'ODM', 'NIL', '9853000234', '7873555104', '2026-04-01', '2013-02-13', 1000, NULL),
('D01', 'Shreetam Rout', 'Junior', 'D', '4th', 'DAV', 'NIL', '9437330756', '9439247657', '2026-04-01', '2017-02-08', 1000, NULL),
('D02', 'Kshyanaprava Samal', 'Junior', 'D', '4th', 'DAV', 'NIL', '9437299047', '7377508316', '2026-04-01', '2016-08-01', 1000, NULL),
('D03', 'Prachi Smaraki Prusty', 'Junior', 'D', '4th', 'DAV', 'NIL', '9439401765', '9439970967', '2026-04-01', '2016-04-05', 1000, NULL),
('D04', 'Sai Soumya Dash', 'Junior', 'D', '4th', 'DAV', 'NIL', '7735624794', '9437324794', '2026-04-01', '2016-07-28', 1000, NULL),
('D05', 'Ashirbad Tripathy', 'Junior', 'D', '4th', 'KV-4', 'NIL', '9438495513', '9438495513', '2026-07-01', '2016-07-20', 1000, NULL),
('E01', 'Dristi Panda', 'Junior', 'E', '5th', 'DAV', 'NIL', '9439970967', '9439401765', '2026-04-01', '2015-09-02', 1000, NULL),
('E02', 'Adyasha Dash', 'Junior', 'E', '5th', 'DAV', 'NIL', '9437324794', '7735624794', '2026-04-01', '2015-09-04', 1000, NULL),
('E03', 'Dibyanshu Pradhan', 'Junior', 'E', '5th', 'DAV', 'NIL', '8917300620', '9348227604', '2026-04-01', '2015-11-23', 1000, NULL),
('E04', 'Sashwat Parida', 'Junior', 'E', '5th', 'DAV', 'NIL', '9937116027', '7682966214', '2026-04-01', '2015-09-09', 1000, NULL),
('E05', 'Samikshya Mishra', 'Junior', 'E', '5th', 'DAV', 'NIL', '9937399896', '9439932130', '2026-04-01', '2015-08-18', 1000, NULL),
('E06', 'Dipti Ranjan Swain', 'Junior', 'E', '5th', 'DAV', 'NIL', '9438515024', '7894562095', '2026-04-01', '2015-04-02', 1000, NULL),
('E07', 'M. Goutam', 'Junior', 'E', '5th', 'DAV', 'NIL', '9861138244', '9437482433', '2026-06-01', '2015-12-16', 1000, NULL),
('E08', 'Bignaraj Behera', 'Junior', 'E', '5th', 'DAV', 'NIL', '9438411933', '7735879796', '2026-07-01', '2015-04-18', 1000, NULL),
('F01', 'Debasish Swain', 'Senior', 'F', '9th', 'DAV', 'NIL', '9438515024', '7894562095', '2026-04-01', '2012-07-28', 1200, NULL),
('F02', 'Chirag Panda', 'Senior', 'F', '9th', 'KV', 'NIL', '9438495513', '9438495513', '2026-04-01', '2011-09-24', 1200, NULL),
('F03', 'Shradha Suman Sahoo', 'Senior', 'F', '9th', 'KV', 'NIL', '9861642878', '9437979878', '2026-04-01', '2012-06-18', 1200, NULL),
('F04', 'Sai Sneha Samal', 'Senior', 'F', '9th', 'KV', 'NIL', '9437299047', '7377508316', '2026-04-01', '2012-11-20', 1200, NULL),
('F05', 'Samikshya Rout', 'Senior', 'F', '9th', 'KV', 'NIL', '9437330756', '9439247657', '2026-04-01', '2012-04-20', 1200, NULL),
('F06', 'Dipti Mayee Nayak', 'Senior', 'F', '9th', 'KV', 'NIL', '9938096355', '9853248887', '2026-04-01', '2012-07-07', 1200, NULL),
('F07', 'Akshita Behera', 'Senior', 'F', '9th', 'KV', 'NIL', '8917300620', '9348227604', '2026-04-01', '2012-10-18', 1200, NULL),
('F08', 'Aditya Mohanty', 'Senior', 'F', '9th', 'KV', 'NIL', '9437022204', '9437308722', '2026-04-01', '2012-05-18', 1200, NULL),
('F09', 'Abhijeet Panda', 'Senior', 'F', '9th', 'KV', 'NIL', '9437630739', '7008742875', '2026-04-01', '2012-08-20', 1200, NULL),
('F10', 'Sai Priyanshu Mohanty', 'Senior', 'F', '9th', 'KV', 'NIL', '9438062592', '9437340051', '2026-04-01', '2012-05-18', 1200, NULL),
('F11', 'Ayush Biswal', 'Senior', 'F', '9th', 'KV', 'NIL', '8260105021', '8018151525', '2026-04-01', '2012-10-09', 1200, NULL),
('F12', 'Ashutosh Prusty', 'Senior', 'F', '9th', 'KV', 'NIL', '9437482433', '9861138244', '2026-04-01', '2012-09-02', 1200, NULL),
('F13', 'G.V.G Sriman', 'Senior', 'F', '9th', 'KV', 'NIL', '8074900762', '8074900762', '2026-04-01', '2012-10-12', 1200, NULL),
('F14', 'Rohan Behera', 'Senior', 'F', '9th', 'KV', 'NIL', '9438411933', '7735879796', '2026-04-01', '2012-07-28', 1200, NULL),
('F15', 'Subham Singh', 'Senior', 'F', '9th', 'KV', 'NIL', '9437303038', '9937070107', '2026-04-01', '2012-05-23', 1200, NULL),
('F16', 'B.Goutham Patra', 'Senior', 'F', '9th', 'KV', 'NIL', '9438675123', '7008257051', '2026-04-01', '2012-03-13', 1200, NULL),
('F17', 'Shreeyansh Mishra', 'Senior', 'F', '9th', 'KV', 'NIL', '9937399896', '9439932130', '2026-04-01', '2012-08-01', 1200, NULL),
('F18', 'Subhashree Samal', 'Senior', 'F', '9th', 'KV', 'NIL', '9090871840', '6371081262', '2026-04-01', '2012-04-02', 1200, NULL),
('G01', 'Smruti Rekha Nayak', 'Senior', 'G', '9th', 'ODM', 'NIL', '9778163640', '9861317634', '2026-04-01', '2012-03-24', 1200, NULL),
('G02', 'Swayam Snehashis Sahoo', 'Senior', 'G', '9th', 'ODM', 'NIL', '9437278235', '9439246194', '2026-04-01', '2012-05-18', 1200, NULL),
('G03', 'Swadhin Kumar Barik', 'Senior', 'G', '9th', 'ODM', 'NIL', '9938096355', '9853248887', '2026-04-01', '2012-09-24', 1200, NULL),
('G04', 'Sai Sambit Jena', 'Senior', 'G', '9th', 'ODM', 'NIL', '9437340051', '9438062592', '2026-04-01', '2012-06-21', 1200, NULL),
('G05', 'Soumya Ranjan Dash', 'Senior', 'G', '9th', 'ODM', 'NIL', '9437022204', '9437308722', '2026-04-01', '2012-04-08', 1200, NULL),
('G06', 'Aditya Narayan Pradhan', 'Senior', 'G', '9th', 'ODM', 'NIL', '9437178082', '8260114098', '2026-04-01', '2012-09-02', 1200, NULL),
('H01', 'Auroshree Nayak', 'Junior', 'H', '3rd', 'SAI', 'NIL', '9861317634', '9778163640', '2026-04-01', '2018-02-07', 1000, NULL),
('H02', 'Subhashree Barik', 'Junior', 'H', '3rd', 'DAV', 'NIL', '9938096355', '9853248887', '2026-04-01', '2018-05-24', 1000, NULL),
('H03', 'Sai Swastik Dash', 'Junior', 'H', '3rd', 'DAV', 'NIL', '7735624794', '9437324794', '2026-04-01', '2017-09-18', 1000, NULL),
('H04', 'Adwitiya Mohapatra', 'Junior', 'H', '3rd', 'DAV', 'NIL', '9439726343', '8455885842', '2026-04-01', '2018-01-09', 1000, NULL),
('I01', 'Sambit Kumar Sahoo', 'Junior', 'I', '2nd', 'DAV', 'NIL', '9437278235', '9439246194', '2026-04-01', '2019-03-24', 1000, NULL),
('I02', 'Smruti Ranjan Pradhan', 'Junior', 'I', '2nd', 'DAV', 'NIL', '8917300620', '9348227604', '2026-04-01', '2019-01-18', 1000, NULL),
('I03', 'Siddhant Mohanty', 'Junior', 'I', '2nd', 'DAV', 'NIL', '9437340051', '9438062592', '2026-04-01', '2019-02-19', 1000, NULL),
('I04', 'Pratyush Nayak', 'Junior', 'I', '2nd', 'DAV', 'NIL', '9337090885', '7381270885', '2026-04-01', '2019-04-18', 1000, NULL),
('I05', 'Omkar Dash', 'Junior', 'I', '2nd', 'DAV', 'NIL', '9437324794', '7735624794', '2026-04-01', '2019-05-12', 1000, NULL),
('I06', 'Sai Sambit Mohalik', 'Junior', 'I', '2nd', 'DAV', 'NIL', '9776432655', '9937884275', '2026-04-01', '2018-12-07', 1000, NULL),
('I07', 'Ayushree Samantaray', 'Junior', 'I', '2nd', 'DAV', 'NIL', '9437178082', '8260114098', '2026-04-01', '2019-08-11', 1000, NULL),
('J01', 'Aashman Mohanty', 'Senior', 'J', '7th', 'DAV', 'NIL', '9437340051', '9438062592', '2026-04-01', '2014-06-12', 1000, NULL),
('J02', 'Bhabani Shankar Rout', 'Senior', 'J', '7th', 'DAV', 'NIL', '9437330756', '9439247657', '2026-04-01', '2014-03-24', 1000, NULL),
('J03', 'Debashish Nayak', 'Senior', 'J', '7th', 'DAV', 'NIL', '9938096355', '9853248887', '2026-04-01', '2014-05-18', 1000, NULL),
('J04', 'Sai Swaroop Sahoo', 'Senior', 'J', '7th', 'DAV', 'NIL', '9861642878', '9437979878', '2026-04-01', '2014-07-21', 1000, NULL),
('J05', 'Pulak Sudam Murmu', 'Senior', 'J', '7th', 'DAV', 'NIL', '9438559328', '8280000165', '2026-03-01', '2014-01-13', 1000, NULL),
('J06', 'Aravya Ayushman', 'Senior', 'J', '7th', 'DAV', '9827821112', '7906301403', '9437391951', '2026-03-01', '2013-10-04', 1000, NULL),
('J08', 'Sai Sourjit Lenka', 'Senior', 'J', '7th', 'KV - 4', '8917272914', '8249704396', '8917373914', '2026-04-01', '2014-05-22', 1000, NULL),
('J09', 'Swastic Ranjan Mallick', 'Senior', 'J', '7th', 'KV - 4', '7894235334', '6372677323', '7894235334', '2026-04-01', '2014-04-03', 1000, NULL),
('J10', 'Shreyansh Mishra', 'Senior', 'J', '7th', 'FBS', 'NIL', '9338225075', '9338585048', '2026-04-01', '2013-12-16', 1000, NULL),
('J11', 'Brojesh Sahoo', 'Senior', 'J', '7th', 'KV - 4', '9937474504', '9668704504', '9937474504', '2026-04-01', '2013-10-12', 1000, NULL),
('J12', 'Bidwan Raj Pothal', 'Senior', 'J', '7th', 'VEMS', '9937967738', '8112030300', '9937967738', '2026-04-01', '2013-09-02', 1000, NULL),
('J14', 'Subhransu Subham', 'Senior', 'J', '7th', 'VEMS', 'NIL', '9861528289', '6370835255', '2026-04-01', '2013-12-31', 1000, NULL),
('J15', 'Nirjhara Sahoo', 'Senior', 'J', '7th', 'DAV', 'NIL', '8917249950', '9337890260', '2026-05-01', '2013-12-02', 1000, NULL),
('K01', 'Subhangi Samal', 'Junior', 'K', '3rd', 'DAV', 'NIL', '9090871840', '6371081262', '2026-04-01', '2017-04-28', 1000, NULL),
('K02', 'Adyant Singh', 'Junior', 'K', '3rd', 'DAV', 'NIL', '9437922084', '8895646083', '2026-04-01', '2017-12-14', 1000, NULL),
('K03', 'Sai Nishant Nayak', 'Junior', 'K', '3rd', 'DAV', 'NIL', '9861317634', '9778163640', '2026-04-01', '2018-02-07', 1000, NULL),
('K04', 'Dibyansh Sahoo', 'Junior', 'K', '2nd', 'ODM', '7008986566', '8249761028', '7008986566', '2026-04-01', '2018-12-17', 1000, NULL),
('K05', 'Tanwesha Moharana', 'Junior', 'K', '3rd', 'DAV', '7008955925', '9337217151', '7008955925', '2026-04-01', '2017-08-11', 1000, NULL),
('K06', 'Lokesh Mahakud', 'Junior', 'K', '3rd', 'KV-3', '8349438235', '8718915588', '8349438235', '2026-04-01', '2017-05-24', 1000, NULL),
('K07', 'Priyanshu Prusti', 'Junior', 'K', '3rd', 'DAV', 'NIL', '9869755824', '9967019033', '2026-06-01', '2017-07-04', 1000, NULL),
('K08', 'Prateek Prusti', 'Junior', 'K', '3rd', 'DAV', 'NIL', '9869755824', '9967019033', '2026-06-01', '2017-07-04', 1000, NULL),
('K09', 'Baibhabi Priyadarshini Behera', 'Junior', 'K', '3rd', 'SAI', 'NIL', '9861078525', '7008264179', '2026-04-01', '2018-02-22', 1000, NULL),
('K10', 'Aryan Pradhan', 'Junior', 'K', '3rd', 'DAV', 'NIL', '8917300620', '9348227604', '2026-06-01', '2017-12-20', 1000, NULL),
('K11', 'Aradhya Jena', 'Junior', 'K', '3rd', 'DAV', 'NIL', '9078496328', '7684875165', '2026-07-01', '2017-10-29', 1000, NULL)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `group_id` = VALUES(`group_id`),
  `class` = VALUES(`class`),
  `school` = VALUES(`school`),
  `fee_per_month` = VALUES(`fee_per_month`);

SET FOREIGN_KEY_CHECKS = 1;
