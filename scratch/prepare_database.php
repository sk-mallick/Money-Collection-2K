<?php
// Scratch script to modernize if0_42017220_mcms.sql

$inputFile = __DIR__ . '/../if0_42017220_mcms.sql';
$outputFile = __DIR__ . '/../if0_42017220_mcms.sql';

// Let's connect to local MySQL to test import and verify structure
$pdo = new PDO('mysql:host=localhost;charset=utf8mb4', 'root', '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);
$pdo->exec("CREATE DATABASE IF NOT EXISTS `mcms` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;");
$pdo->exec("USE `mcms`;");

echo "Connected to MySQL mcms successfully.\n";
