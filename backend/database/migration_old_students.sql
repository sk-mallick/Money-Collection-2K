-- Migration: Add old_students archive table + Remove soft-delete pattern
-- Run this on the mcms database

-- 1. Create old_students archive table
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

-- 2. Migrate existing soft-deleted students to old_students (if any exist)
-- This is handled programmatically in db.php self-healing logic
