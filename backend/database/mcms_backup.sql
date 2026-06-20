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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admins`
--

LOCK TABLES `admins` WRITE;
/*!40000 ALTER TABLE `admins` DISABLE KEYS */;
INSERT INTO `admins` VALUES (1,'admin','$2y$10$k/k6dQczSlxjo94alvBIrOZ3mUBZxMRuerrR10lsmiCelhFl7DDry','Chirinjibi Sir','2026-06-06 11:04:59'),(2,'subham','$2y$10$jwtDmmF2kLlfXQHVwEUlD.pBdgee8IvIyV8K7u4DF9IfJQUM37f2e','Subham Sir','2026-06-06 11:05:00');
/*!40000 ALTER TABLE `admins` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

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

LOCK TABLES `groups` WRITE;
/*!40000 ALTER TABLE `groups` DISABLE KEYS */;
INSERT INTO `groups` VALUES ('A','6th & 7th','Mon, Wed','Senior'),('B','10th','Tue, Thu','Senior'),('C','5th','Mon, Wed','Junior'),('D','9th','Tue, Thu','Senior'),('E','8th','Mon, Wed','Senior'),('F','4th','Tue, Thu','Junior'),('G','10th','Mon, Wed','Senior'),('H','9th','Tue, Thu','Senior'),('I','8th','Mon, Wed','Senior'),('J','7th','Tue, Thu','Senior'),('K','3rd','Mon, Wed','Junior');
/*!40000 ALTER TABLE `groups` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `login_attempts`
--

LOCK TABLES `login_attempts` WRITE;
/*!40000 ALTER TABLE `login_attempts` DISABLE KEYS */;
/*!40000 ALTER TABLE `login_attempts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` varchar(10) NOT NULL,
  `month` varchar(10) NOT NULL,
  `paid` tinyint(1) NOT NULL DEFAULT 0,
  `amount` int(11) NOT NULL DEFAULT 0,
  `date` date DEFAULT NULL,
  `academic_year` varchar(10) NOT NULL DEFAULT '2026-27',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_student_month_year` (`student_id`,`month`,`academic_year`),
  KEY `idx_payments_student` (`student_id`),
  KEY `idx_payments_month` (`month`),
  CONSTRAINT `fk_payment_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES (1,'C01','MAY',1,700,'2026-05-23','2026-27'),(2,'C02','APR',1,700,'2026-05-23','2026-27'),(3,'C02','AUG',1,700,'2026-05-23','2026-27'),(4,'C02','JUL',1,700,'2026-05-23','2026-27'),(5,'C02','JUN',1,700,'2026-05-23','2026-27'),(6,'C02','MAY',1,700,'2026-05-23','2026-27'),(7,'C03','MAY',1,700,'2026-05-23','2026-27'),(8,'J11','APR',0,0,'2026-05-23','2026-27'),(9,'J11','JUN',1,1000,'2026-05-23','2026-27');
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `receipts`
--

LOCK TABLES `receipts` WRITE;
/*!40000 ALTER TABLE `receipts` DISABLE KEYS */;
/*!40000 ALTER TABLE `receipts` ENABLE KEYS */;
UNLOCK TABLES;

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

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES ('academicYear','2026-27'),('activeMonths','MAR,APR,MAY,JUN,JUL,AUG,SEP,OCT,NOV,DEC,JAN,FEB'),('address','Duplex-37, In front of DAV School, Sailashree Vihar, Bhubaneswar'),('instagram','@englishwithchiranjibisir'),('instituteName','EnglishJibi Classes'),('feeJunior','1000'),('paymentGatewayEnabled','0'),('phone1','+91 83289 22917'),('phone2','+91 7735812335'),('razorpayKeyId',''),('feeSenior','1000'),('teacherName','Chirinjibi Sir'),('adminName','Chirinjibi Sir'),('upiId','');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

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
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_student_group` (`group_id`),
  CONSTRAINT `fk_student_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `students`
--

LOCK TABLES `students` WRITE;
/*!40000 ALTER TABLE `students` DISABLE KEYS */;
INSERT INTO `students` VALUES ('A01','Lipsita Mohanty','Senior','A','7th','KPS','7205958919','9938777003','7978442545','2026-03-01','2013-09-28',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('A02','Ipsita Mohanty','Senior','A','7th','KPS','7205958919','9938777003','7978442545','2026-03-01','2013-09-28',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('A03','Shreyash Nayak','Senior','A','7th','SAI','NIL','9439003300','7735994388','2026-03-01','2014-01-18',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('A04','Subhasmita Mallik','Senior','A','7th','ODM','7978433794','9438306170','6372081330','2026-03-01','2013-09-12',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('A05','Adarsh Muduli','Senior','A','7th','ODM','NIL','7328073270','8249048756','2026-03-01','2014-05-18',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('A06','Omsai Krishna Pradhan','Senior','A','6th','ODM','NIL','NIL','6281828164','2026-03-01','2015-08-19',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('A07','Sai Satwak Sahoo','Senior','A','6th','LOYOLA','NIL','7873394996','8249016138','2026-03-01','2015-04-08',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('A08','Pratyush Kumar Khuntia','Senior','A','6th','KV-4','NIL','9438118904','8458082230','2026-03-01','2015-10-02',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('A09','Sibansi Behera','Senior','A','6th','ODM','NIL','7749013157','8984101690','2026-03-01','2015-08-24',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('A10','Soumya Priyadarshi Beura','Senior','A','6th','DAV','NIL','9337876275','8908615519','2026-03-01','2014-06-14',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('A11','Pranjal Ram','Senior','A','6th','ODM','NIL','8108700422','9167165081','2026-03-01','2014-08-29',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('A12','Arman Ray','Senior','A','7th','ODM','9853000234','9853000234','7873555104','2026-04-01','2014-03-16',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('A13','Krutartha Mishra','Senior','A','6th','ODM','9658553353','9692144071','9658553353','2026-04-01','2014-08-21',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('A14','Arnav Satpathy','Senior','A','6th','Mount Litera','9348645239','8692883386','9348645239','2026-04-01','2014-01-04',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('B01','Anshuman Rath','Senior','B','10th','ODM','NIL','1501894329','7978131667','2026-04-01','2010-10-24',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('B02','Bibhukrupa Biswal','Senior','B','10th','ODM','NIL','9692036236','9348089248','2026-04-01','2010-11-15',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('B03','Sai Akshyat Boitai','Senior','B','10th','ODM','NIL','9986872531','7204553015','2026-04-01','2011-05-06',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('B04','Snehal Kumar Sahoo','Senior','B','10th','FBS','NIL','9937179958','9937849333','2026-04-01','2012-01-01',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('B05','Swastik Dhal','Senior','B','10th','KV','NIL','7008257051','9438675123','2026-04-01',NULL,1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('B06','Satyabrata Pradhan','Senior','B','10th','KV','NIL','9439047907','9437347525','2026-04-01',NULL,1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('B07','Ipshita Mohalik','Senior','B','10th','KV','NIL','9776432655','9937884275','2026-01-04','2011-11-20',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('B08','Satyabrata Pradhan 2','Senior','B','10th','KV','NIL','9439047907','9437347525','2026-05-04','2011-07-01',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('C01','Sanchit Narayan Sahoo','Junior','C','5th','VEMS','NIL','7702868710','7036070707','2026-03-02','2011-05-19',1000,'','2026-05-23 12:08:13','2026-05-23 12:08:13',NULL),('C02','Aditi Das','Junior','C','5th','KV-4','NIL','8939707723','9437306867','2026-03-01','2016-01-18',1000,'','2026-05-23 12:21:23','2026-05-23 12:21:23',NULL),('C03','Laxmi Priya Pradhan','Junior','C','5th','KV-4','NIL','8895759241','8249851395','2026-03-01','2015-09-09',1000,'','2026-05-23 12:36:42','2026-05-23 12:36:42',NULL),('C04','Ashrita Swain','Junior','C','5th','VEMS','NIL','9338620588','9937963213','2026-03-01','2016-04-29',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('C05','Arshita Mohanty','Junior','C','5th','VEMS','NIL','9938637933','9938984001','2026-03-01','2015-07-15',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('C06','Shriyanshi Priyadarsini','Junior','C','5th','DAV','NIL','7609930620','8455885886','2026-03-01','2015-05-27',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('C07','Shubham Kumar Yadav','Junior','C','6th','KPS','NIL','9007019906','8100231780','2026-03-01','2015-05-09',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('C08','Shreyansh Kumar Yadav','Junior','C','4th','KPS','NIL','9007019906','8100231780','2026-03-01','2017-04-07',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('C09','Subham Kumar Dalai','Junior','C','5th','DAV','NIL','NIL','9861823829','2026-03-01','2015-04-27',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('C10','Sahil Kumar Sahoo','Junior','C','5th','FBS','NIL','9937179958','9337194958','2026-03-01','2015-08-15',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('C11','Aaditri Sharma','Junior','C','4th','SAI','NIL','9853757076','8910652843','2026-03-01','2017-01-05',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('C12','Aayansh Bal','Junior','C','4th','ODM','8327708564','9439776338','8327708564','2026-03-01','2016-07-14',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('D01','Saishree Pattnaik','Senior','D','9th','DAV','NIL','8457845075','9439975032','2026-03-01','2012-02-05',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('D02','Samyak Sahoo','Senior','D','9th','ODM','NIL','9921486430','9834293272','2026-03-01','2012-01-06',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('D03','Jeebtesh Sahoo','Senior','D','9th','DAV','9777527298','9861451809','9861687046','2026-03-01','2012-01-03',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('D04','Shreeja Rout','Senior','D','9th','SAI','NIL','7978030575','7978862173','2026-03-01','2012-03-20',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('D05','Sohan Sudeep Hansda','Senior','D','9th','DAV','9827418190','9438174526','9438301751','2026-03-01','2012-09-23',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('D06','Sonakshi Das','Senior','D','9th','SAI','NIL','9437058486','9937188889','2026-03-01','2011-12-26',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('E01','Aradhya Sahoo','Senior','E','8th','FBS','NIL','9930119687','9930119667','2026-04-01','2012-12-30',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('E02','Dibyansha Nayak','Senior','E','8th','FBS','NIL','9438037873','9853486966','2026-04-01','2013-12-18',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('E03','Jashith Bhuyan','Senior','E','7th','FBS','NIL','7008796059','9438559843','2026-04-01','2014-05-20',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('E04','Sai Subhalaxmi Behera','Senior','E','8th','FBS','NIL','9337074763','9937387073','2026-04-01','2014-06-27',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('E05','Bhagyalaxmi Prusty','Senior','E','8th','NETS','NIL','9040000520','6289374665','2026-01-04','2013-03-16',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('E06','Ishita Manna','Senior','E','7th','FBS','NIL','7735722963','8260781631','2026-01-04','2013-11-19',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('F01','Aditya Soren','Junior','F','4th','KV-3','NIL','8074779654','6302889948','2026-03-01','2016-05-06',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('F02','Divya Debasish Sethy','Junior','F','4th','KV-3','NIL','8455969561','9777750366','2026-03-01','2016-10-15',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('F03','Avilipsa Sahoo','Junior','F','4th','KV-4','NIL','9861285739','7978231482','2026-03-01','2016-07-01',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('F04','Anwesha Sahoo','Junior','F','4th','KPS','NIL','9930119687','9930119667','2026-03-01',NULL,1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('F05','Tapas Pahadsing','Junior','F','4th','DAV','NIL','9938598493','7609898287','2026-03-01','2016-08-24',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('F06','Karan Sahu','Junior','F','4th','KV-4','NIL','9861104669','8338043444','2026-03-01','2016-09-23',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('F07','Riyan Sahoo','Junior','F','4th','KIIT','7735339695','7325917387','9438731110','2026-03-01','2016-07-03',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('F08','Sushree Sanaya Rout','Junior','F','4th','ODM','NIL','9437492696','6372666450','2026-03-01','2017-03-01',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('F09','Adyasha Pradhan','Junior','F','4th','KV-3','NIL','7217832162','9337786670','2026-03-01','2016-08-29',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('F10','Birabhadra Das','Junior','F','4th','KV-3','NIL','9778621079','6371507919','2026-03-01','2016-06-24',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('F11','Saiansh Biswal','Junior','F','3rd','DAV','NIL','9658740246','7978448133','2026-03-01','2017-06-01',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('F12','Priyanshi Das','Junior','F','3rd','St.Xaviar','NIL','9658101514','8908138248','2026-03-01','2018-04-14',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('F13','Reyansh Nayak','Junior','F','4th','KV-4','NIL','7894025098','8895721165','2026-03-01','2017-01-12',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('F14','Sanvi Priyanshi','Junior','F','4th','SAI','8260302191','8260302191','8260302191','2026-04-01','2017-07-26',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('F15','Adhira Anaika','Junior','F','4th','SAI','7008646560','NIL','7008646560','2026-04-01','2017-09-15',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('F16','Nirmalya Panda','Junior','F','4th','FBS','8328913434','7656876267','8328913434','2026-04-01','2016-12-21',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('F17','Reeyansh Roshan','Junior','F','4th','Narayana','7978359408','NIL','9040525596','2026-04-01','2017-02-12',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('F18','Saswat Das','Junior','F','4th','FBS','NIL','9658245434','7377147015','2026-04-01','2017-07-11',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('G01','Sonakshi Ojha','Senior','G','10th','DAV','NIL','NIL','8018618170','2026-04-01','2010-10-29',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('G02','Samiksha Swain','Senior','G','10th','DAV','NIL','7327094010','9777588798','2026-04-01','2011-11-13',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('G03','Adyasha Mohanty','Senior','G','10th','DAV','7008831525','9861404370','9778109819','2026-04-01','2011-03-06',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('G04','Swadhin Sekhar Dalai','Senior','G','10th','DAV','7008003019','9438441662','9437115621','2026-04-01','2010-08-15',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('G05','Dibyanshi Mishra','Senior','G','10th','DAV','7853942686','9437286846','7008506526','2026-04-01','2011-07-10',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('G06','Swastik Dhal G','Senior','G','10th','KV-4','NIL','7008257051','9438675123','2026-04-01','2012-03-17',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('G07','Krishendu Panda','Senior','G','10th','DAV','8260631940','9337319359','8327729799','2026-04-01','2011-09-24',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('H01','Ayush Majumdar','Senior','H','9th','NARAYANA','NIL','9937952963','8328815559','2026-04-01','2013-02-22',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('H02','Sanaya Acharya','Senior','H','9th','NARAYANA','8209240518','9320061455','7674835169','2026-04-01','2012-07-19',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('H03','Baranbhavaya','Senior','H','9th','St.Xavier','NIL','9861280410','7978035002','2026-04-01','2012-11-02',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('H04','Bapun Das','Senior','H','9th','ODM','6371514311','NIL','7008676171','2026-04-01','2012-06-20',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('H05','Jyoti Prakash Nayak','Senior','H','9th','ODM','6290893638','8282807161','6291610033','2026-04-01','2012-09-04',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('H06','Pratiksha Pattnaik','Senior','H','9th','FBS','9937811409','NIL','9937811409','2026-04-01',NULL,1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('H07','Dibyanshu Saidarshan','Senior','H','9th','DAV','7978899858','7978899860','7978899858','2026-04-01','2012-09-12',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('I01','Animesh Mishra','Senior','I','8th','ODM','NIL','7978661689','9438555452','2026-04-01','2013-07-15',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('I02','Benoy Bhabjeet','Senior','I','8th','PEMS','NIL','9437506467','9692683037','2026-04-01','2013-02-18',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('I03','Pritam Prakash Jena','Senior','I','8th','DAV','NIL','8763839239','8763981329','2026-04-01','2013-08-03',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('I04','Biswajit Behera','Senior','I','8th','DAV','NIL','8763325867','7848948408','2026-03-01','2012-10-03',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('I05','Jeet Mallick','Senior','I','8th','DAV','NIL','9938644042','8546887844','2026-03-01','2013-05-15',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('I06','Adyasha Gouda','Senior','I','8th','ODM','NIL','8894041327','7978901912','2026-03-01','2012-10-31',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('J01','Bidisha Priyadarshni','Senior','J','7th','KV-4','NIL','9678447260','9678447260','2026-03-01','2014-10-25',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('J02','Biswaswarup Patra','Senior','J','7th','VEMS','NIL','9348323490','8908792749','2026-03-01','2014-01-29',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('J03','Sai Subham Bhola','Senior','J','7th','VEMS','NIL','7008093280','8249106988','2026-03-01','2014-04-17',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('J04','Tanmay Jain','Senior','J','7th','DAV','NIL','7438804746','9337401170','2026-03-01','2014-05-22',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('J05','Pulak Sudam Murmu','Senior','J','7th','DAV','NIL','9438559328','8280000165','2026-03-01','2014-01-13',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('J06','Aravya Ayushman','Senior','J','7th','DAV','9827821112','7906301403','9437391951','2026-03-01','2013-10-04',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('J07','Shiksha Suravi Behera','Senior','J','7th','KV-3','8249261736','9583694889','8249261736','2026-04-01','2014-07-22',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('J08','Sai Sourjit Lenka','Senior','J','7th','KV-4','8917272914','8249704396','8917272914','2026-04-01','2014-05-22',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('J09','Swastic Ranjan Mallick','Senior','J','7th','KV-4','7894235334','6372677323','7894235334','2026-04-01','2014-04-03',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('J10','Shreyansh Mishra','Senior','J','7th','FBS','NIL','9338225075','9338585048','2026-04-01','2013-12-16',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('J11','Brajesh Sahoo','Senior','J','7th','KV-4','9937474504','9668704504','9937474504','2026-04-01','2013-10-12',1000,'','2026-05-23 12:02:57','2026-05-23 12:02:57',NULL),('K01','Subhangi Samal','Junior','K','3rd','DAV','NIL','9090871840','6371081262','2026-04-01','2017-04-28',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('K02','Adyant Singh','Junior','K','3rd','DAV','NIL','9437922084','8895646083','2026-04-01','2017-12-14',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('K03','Sai Nishant Nayak','Junior','K','3rd','DAV','NIL','9861317634','9778163640','2026-04-01','2018-02-07',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('K04','Dibyansh Sahoo','Junior','K','2nd','ODM','7008986566','8249761028','7008986566','2026-04-01','2018-12-17',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('K05','Tanwesha Moharana','Junior','K','3rd','DAV','7008955925','9337217151','7008955925','2026-04-01','2017-08-11',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('K06','Lokesh Mahakud','Junior','K','3rd','KV-3','8349438235','8718915588','8349438235','2026-04-01','2017-05-24',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('K07','Anvit Rout','Junior','K','3rd','DAV','NIL','9916271593','8884521230','2026-08-04','2017-08-05',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('K08','Aarnav Parida','Junior','K','3rd','DAV','NIL','9937116027','7682966214','2026-06-04','2017-06-25',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL),('K09','Baibhabi Priyadarshini Behera','Junior','K','3rd','SAI','NIL','9861078525','7008264179','2026-08-04','2018-02-22',1000,'','2026-06-06 16:35:26','2026-06-06 16:35:26',NULL);
/*!40000 ALTER TABLE `students` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-06 20:05:38
