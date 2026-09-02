-- Migration: Student Report Card & Result Management Module
-- Run this on the mcms database

-- 1. Subject definitions (configurable, not hardcoded)
CREATE TABLE IF NOT EXISTS `rc_subjects` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `category` ENUM('Junior','Senior','Both') NOT NULL DEFAULT 'Both',
  `display_order` INT(11) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_subject_name_cat` (`name`, `category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Seed default subjects
INSERT IGNORE INTO `rc_subjects` (`name`, `category`, `display_order`) VALUES
('Olympiad', 'Junior', 1),
('Grammar', 'Both', 2),
('Creative', 'Both', 3),
('Passage', 'Both', 4),
('Vocabulary', 'Both', 5),
('Literature', 'Senior', 6);

-- 3. Result periods (one per academic_year + month + group combination)
CREATE TABLE IF NOT EXISTS `rc_result_periods` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `academic_year` VARCHAR(10) NOT NULL,
  `month` VARCHAR(3) NOT NULL,
  `group_id` VARCHAR(10) DEFAULT NULL,
  `category` ENUM('Junior','Senior') NOT NULL,
  `status` ENUM('Draft','Completed','Published') NOT NULL DEFAULT 'Draft',
  `created_by` INT(11) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_period` (`academic_year`, `month`, `group_id`),
  KEY `idx_period_status` (`status`),
  CONSTRAINT `fk_rp_group` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. Default max marks per result period per subject
CREATE TABLE IF NOT EXISTS `rc_default_max_marks` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `result_period_id` INT(11) NOT NULL,
  `subject_id` INT(11) NOT NULL,
  `max_marks` INT(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_period_subject` (`result_period_id`, `subject_id`),
  CONSTRAINT `fk_dmm_period` FOREIGN KEY (`result_period_id`) REFERENCES `rc_result_periods`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dmm_subject` FOREIGN KEY (`subject_id`) REFERENCES `rc_subjects`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 5. Student results (one row per student per result period)
CREATE TABLE IF NOT EXISTS `rc_student_results` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `result_period_id` INT(11) NOT NULL,
  `student_id` VARCHAR(10) NOT NULL,
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
  CONSTRAINT `fk_sr_period` FOREIGN KEY (`result_period_id`) REFERENCES `rc_result_periods`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sr_student` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 6. Individual marks (one row per student per subject per result period)
CREATE TABLE IF NOT EXISTS `rc_student_marks` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `student_result_id` INT(11) NOT NULL,
  `subject_id` INT(11) NOT NULL,
  `max_marks` INT(11) NOT NULL,
  `obtained_marks` DECIMAL(5,2) DEFAULT NULL,
  `is_default_max` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_result_subject` (`student_result_id`, `subject_id`),
  CONSTRAINT `fk_sm_result` FOREIGN KEY (`student_result_id`) REFERENCES `rc_student_results`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sm_subject` FOREIGN KEY (`subject_id`) REFERENCES `rc_subjects`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
