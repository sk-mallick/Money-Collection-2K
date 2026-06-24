-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: mcms_db
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admins`
--

DROP TABLE IF EXISTS `admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admins` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `name` varchar(100) NOT NULL DEFAULT 'Admin',
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admins`
--

/*!40000 ALTER TABLE `admins` DISABLE KEYS */;
INSERT INTO `admins` VALUES (1,'18102024','$2y$10$xinMjTkvwA551wxEzJhOHufqTAdcsfVKHAcWatOm80q44LNVFr/3m','Chirinjibi Sir','2026-06-06 11:04:59'),(2,'subham','$2y$10$jwtDmmF2kLlfXQHVwEUlD.pBdgee8IvIyV8K7u4DF9IfJQUM37f2e','Subham Sir','2026-06-06 11:05:00');
/*!40000 ALTER TABLE `admins` ENABLE KEYS */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `admin_id` int(11) DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `target_entity` varchar(50) NOT NULL,
  `target_id` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_audit_admin` (`admin_id`),
  KEY `idx_audit_time` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs` cleared

--
-- Table structure for table `groups`
--

DROP TABLE IF EXISTS `groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `groups` (
  `id` varchar(10) NOT NULL,
  `class` varchar(100) NOT NULL,
  `timing` varchar(100) DEFAULT '',
  `category` enum('Junior','Senior') NOT NULL DEFAULT 'Junior',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `groups`
--

/*!40000 ALTER TABLE `groups` DISABLE KEYS */;
INSERT INTO `groups` VALUES ('A','6th & 7th','Mon, Wed','Senior'),('B','10th','Tue, Thu','Senior'),('C','5th','Mon, Wed','Junior'),('D','9th','Tue, Thu','Senior'),('E','7th & 8th','Mon, Wed','Senior'),('F','3rd & 4th','Tue, Thu','Junior'),('G','10th','Mon, Wed','Senior'),('H','9th','Tue, Thu','Senior'),('I','8th','Mon, Wed','Senior'),('J','7th','Tue, Thu','Senior'),('K','2nd & 3rd','Mon, Wed','Junior');
/*!40000 ALTER TABLE `groups` ENABLE KEYS */;

--
-- Table structure for table `login_attempts`
--

DROP TABLE IF EXISTS `login_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `login_attempts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ip_address` varchar(45) NOT NULL,
  `username` varchar(50) NOT NULL,
  `attempted_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_ip_time` (`ip_address`,`attempted_at`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `login_attempts` cleared

--
-- Table structure for table `receipts`
--

DROP TABLE IF EXISTS `receipts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `receipts` (
  `id` varchar(20) NOT NULL,
  `student_id` varchar(10) DEFAULT NULL,
  `student_name` varchar(100) NOT NULL,
  `category` enum('Junior','Senior') NOT NULL,
  `class` varchar(50) DEFAULT '',
  `school` varchar(100) DEFAULT '',
  `fee_per_month` int(11) NOT NULL,
  `period` varchar(50) NOT NULL,
  `months` text NOT NULL COMMENT 'JSON array of month codes',
  `amt_paid` int(11) NOT NULL DEFAULT 0,
  `prev_due` int(11) NOT NULL DEFAULT 0,
  `total_recv` int(11) NOT NULL DEFAULT 0,
  `remaining_amount` int(11) NOT NULL DEFAULT 0,
  `remaining_months` varchar(100) DEFAULT NULL,
  `next_due` varchar(100) DEFAULT '',
  `notes` text DEFAULT '',
  `generated_on` datetime DEFAULT current_timestamp(),
  `generated_by` varchar(50) DEFAULT 'Admin',
  `academic_year` varchar(10) NOT NULL DEFAULT '2026-27',
  PRIMARY KEY (`id`),
  KEY `idx_receipts_student` (`student_id`),
  KEY `idx_receipts_generated` (`generated_on`),
  CONSTRAINT `fk_receipt_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `receipts` cleared

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `settings` (
  `setting_key` varchar(50) NOT NULL,
  `setting_value` text NOT NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES ('academicYear','2026-27'),('activeMonths','MAR,APR,MAY,JUN,JUL,AUG,SEP,OCT,NOV,DEC,JAN,FEB'),('address','Duplex-37, In front of DAV School, Sailashree Vihar, Bhubaneswar'),('adminName','Chirinjibi Sir'),('feeJunior','1000'),('feeSenior','1000'),('instagram','@englishwithchiranjibisir'),('instituteName','EnglishJibi Classes'),('phone1','+91 8328922917'),('phone2','+91 7735812335'),('teacherName','Chirinjibi Sir');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;

--
-- Table structure for table `students`
--

DROP TABLE IF EXISTS `students`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `students` (
  `id` varchar(10) NOT NULL,
  `name` varchar(100) NOT NULL,
  `category` enum('Junior','Senior') NOT NULL,
  `group_id` varchar(10) DEFAULT NULL,
  `class` varchar(50) DEFAULT '',
  `school` varchar(100) DEFAULT '',
  `contact_no` varchar(15) DEFAULT '',
  `father_no` varchar(15) DEFAULT '',
  `mother_no` varchar(15) DEFAULT '',
  `adm_date` date NOT NULL,
  `dob` date DEFAULT NULL,
  `fee_per_month` int(11) NOT NULL DEFAULT 700,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_student_group` (`group_id`),
  KEY `idx_students_deleted` (`deleted_at`),
  CONSTRAINT `fk_student_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `students` cleared
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-23 14:23:52
