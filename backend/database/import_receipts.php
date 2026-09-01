<?php
/**
 * MCMS Import Receipts CLI Command
 * Usage: php backend/database/import_receipts.php
 */

if (php_sapi_name() !== 'cli') {
    die("Access Denied: This script can only be run via CLI.\n");
}

require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = get_db();
    echo "Connected to database successfully.\n";

    $receiptsData = null;
    if ($argc > 1) {
        $jsonStr = trim(implode(' ', array_slice($argv, 1)));
        $receiptsData = json_decode($jsonStr, true);
        if ($receiptsData === null) {
            // Attempt to decode with stripslashes (useful for Windows Command Prompt escape handling)
            $receiptsData = json_decode(stripslashes($jsonStr), true);
        }
        if (!is_array($receiptsData)) {
            throw new Exception("Invalid JSON provided in command-line argument. Must be a JSON array or object. Got: " . $jsonStr);
        }
        echo "Loaded receipts data from command-line argument.\n";
    } else {
        // Non-blocking read from STDIN to check for piped input
        stream_set_blocking(STDIN, false);
        $stdinData = stream_get_contents(STDIN);
        if (!empty(trim($stdinData))) {
            $receiptsData = json_decode(trim($stdinData), true);
            if ($receiptsData === null) {
                $receiptsData = json_decode(stripslashes(trim($stdinData)), true);
            }
            if (!is_array($receiptsData)) {
                throw new Exception("Invalid JSON provided via standard input (piped).");
            }
            echo "Loaded receipts data from standard input (piped).\n";
        } else {
            $receiptsPath = __DIR__ . '/../data/receipts.json';
            if (!file_exists($receiptsPath)) {
                throw new Exception("receipts.json not found at: $receiptsPath");
            }
            $receiptsData = json_decode(file_get_contents($receiptsPath), true);
            if (!is_array($receiptsData)) {
                throw new Exception("Failed to parse receipts.json (invalid JSON format).");
            }
            echo "Loaded " . count($receiptsData) . " receipts from receipts.json.\n";
        }
    }

    // Wrap single receipt object into an array if it's not a list
    if (is_array($receiptsData) && !isset($receiptsData[0]) && !empty($receiptsData)) {
        $receiptsData = [$receiptsData];
    }


    // Load active settings to get default academic year if needed
    $settingsStmt = $pdo->query('SELECT setting_key, setting_value FROM settings');
    $settings = [];
    while ($row = $settingsStmt->fetch()) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    $academicYear = $settings['academicYear'] ?? '2026-27';

    $stmtReceiptImport = $pdo->prepare('
        INSERT INTO `receipts` (
            `id`, `student_id`, `student_name`, `category`, `class`, `school`, `fee_per_month`, 
            `period`, `months`, `amt_paid`, `prev_due`, `total_recv`, `remaining_amount`, `remaining_months`, `next_due`, `notes`, `generated_on`, `generated_by`, `academic_year`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            `student_name` = VALUES(`student_name`),
            `category` = VALUES(`category`),
            `class` = VALUES(`class`),
            `school` = VALUES(`school`),
            `fee_per_month` = VALUES(`fee_per_month`),
            `period` = VALUES(`period`),
            `months` = VALUES(`months`),
            `amt_paid` = VALUES(`amt_paid`),
            `total_recv` = VALUES(`total_recv`),
            `generated_on` = VALUES(`generated_on`)
    ');

    $pdo->beginTransaction();

    $importedCount = 0;
    foreach ($receiptsData as $r) {
        $stmtReceiptImport->execute([
            $r['id'],
            $r['student_id'],
            $r['student_name'],
            $r['category'],
            $r['class'] ?? '',
            $r['school'] ?? '',
            $r['fee_per_month'],
            $r['period'],
            json_encode($r['months']),
            $r['amt_paid'],
            $r['prev_due'] ?? 0,
            $r['total_recv'] ?? $r['amt_paid'],
            $r['remaining_amount'] ?? 0,
            $r['remaining_months'] ?? null,
            $r['next_due'] ?? '',
            $r['notes'] ?? '',
            $r['generated_on'],
            $r['generated_by'] ?? 'Admin',
            $r['academic_year'] ?? $academicYear
        ]);
        echo "Imported/Updated receipt {$r['id']} for {$r['student_name']} ({$r['student_id']}) - Paid: {$r['amt_paid']}\n";
        $importedCount++;
    }

    $pdo->commit();

    echo "\nSummary:\n";
    echo "- Successfully imported $importedCount receipts directly from receipts.json.\n";
    echo "SUCCESS: Receipts import complete.\n";

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "ERROR during receipts import: " . $e->getMessage() . "\n";
    exit(1);
}
