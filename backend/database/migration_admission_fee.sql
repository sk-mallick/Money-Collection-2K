-- Migration: Add admission fee support
-- Run this on the mcms_db database

-- 1. Add admission_fee_paid column to students table
ALTER TABLE `students` ADD COLUMN `admission_fee_paid` TINYINT(1) NOT NULL DEFAULT 0 AFTER `fee_per_month`;

-- 2. Add admission_fee column to receipts table
ALTER TABLE `receipts` ADD COLUMN `admission_fee` INT(11) NOT NULL DEFAULT 0 AFTER `remaining_months`;

-- 3. Add admissionFee setting (default ₹500)
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES ('admissionFee', '500')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- 4. Mark all existing students as admission fee already paid
-- (since they are already admitted and this is a new feature)
UPDATE `students` SET `admission_fee_paid` = 1 WHERE `deleted_at` IS NULL;
