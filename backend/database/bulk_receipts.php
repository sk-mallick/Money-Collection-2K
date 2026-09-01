<?php
/**
 * MCMS Bulk Receipts Generator CLI Command
 * Usage: php backend/database/bulk_receipts.php
 */

if (php_sapi_name() !== 'cli') {
    die("Access Denied: This script can only be run via CLI.\n");
}

require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = get_db();
    echo "Connected to database successfully.\n";

    $txtPath = __DIR__ . '/../data/updated-data.txt';
    $receiptsJsonPath = __DIR__ . '/../data/receipts.json';

    if (!file_exists($txtPath)) {
        throw new Exception("updated-data.txt not found at: $txtPath");
    }

    // Load active settings
    $settingsStmt = $pdo->query('SELECT setting_key, setting_value FROM settings');
    $settings = [];
    while ($row = $settingsStmt->fetch()) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    $academicYear = $settings['academicYear'] ?? '2026-27';
    $feeJunior = (int)($settings['feeJunior'] ?? 1000);
    $feeSenior = (int)($settings['feeSenior'] ?? 1000);

    // Load groups to determine categories
    $groupsStmt = $pdo->query('SELECT id, category FROM groups');
    $groupCategories = [];
    while ($row = $groupsStmt->fetch()) {
        $groupCategories[$row['id']] = $row['category'];
    }

    $lines = file($txtPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $headers = explode("\t", $lines[0]);

    // Fetch existing students from database to get their actual fee_per_month if they exist
    $studentsStmt = $pdo->query('SELECT id, name, category, class, school, fee_per_month, adm_date FROM students');
    $dbStudents = [];
    while ($row = $studentsStmt->fetch()) {
        $dbStudents[$row['id']] = $row;
    }

    // Prepared statements to update/insert students in DB
    $stmtUpdateStudent = $pdo->prepare('
        UPDATE students 
        SET name = ?, father_no = ?, mother_no = ?, contact_no = ?, adm_date = ?, dob = ?, group_id = ?, class = ?, school = ?, category = ?, fee_per_month = ?, updated_at = NOW()
        WHERE id = ?
    ');

    $stmtInsertStudent = $pdo->prepare('
        INSERT INTO students (id, name, father_no, mother_no, contact_no, adm_date, dob, group_id, class, school, category, fee_per_month, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ');

    // Date parser helper
    $parseDate = function($dateStr) {
        if (empty($dateStr) || strtoupper($dateStr) === 'NIL' || strtoupper($dateStr) === 'NA') {
            return null;
        }
        $time = strtotime($dateStr);
        return $time !== false ? date('Y-m-d', $time) : null;
    };

    $monthOrder = ["MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC","JAN","FEB"];
    $monthNames = [
        'MAR' => 'Mar', 'APR' => 'Apr', 'MAY' => 'May', 'JUN' => 'Jun',
        'JUL' => 'Jul', 'AUG' => 'Aug', 'SEP' => 'Sep', 'OCT' => 'Oct',
        'NOV' => 'Nov', 'DEC' => 'Dec', 'JAN' => 'Jan', 'FEB' => 'Feb',
    ];

    $getPeriodString = function($months, $acYear) use ($monthNames) {
        $parts = explode('-', $acYear);
        $startYearStr = $parts[0] ?? '2026';
        $endYearStr = $parts[1] ?? '27';
        $startSuffix = substr($startYearStr, -2);
        $endSuffix = strlen($endYearStr) === 4 ? substr($endYearStr, -2) : $endYearStr;
        
        $getMonthYearSuffix = function($monthCode) use ($startSuffix, $endSuffix) {
            $isNextYear = $monthCode === 'JAN' || $monthCode === 'FEB';
            return $isNextYear ? $endSuffix : $startSuffix;
        };
        
        $firstMonth = ($monthNames[$months[0]] ?? $months[0]) . ' ' . $getMonthYearSuffix($months[0]);
        $lastMonth = ($monthNames[$months[count($months) - 1]] ?? $months[count($months) - 1]) . ' ' . $getMonthYearSuffix($months[count($months) - 1]);
        return count($months) === 1 ? $firstMonth : "$firstMonth – $lastMonth";
    };

    $receiptsList = [];
    $studentsProcessed = 0;

    $pdo->beginTransaction();

    for ($i = 1; $i < count($lines); $i++) {
        $row = explode("\t", $lines[$i]);
        $studentId = trim($row[0] ?? '');
        if (empty($studentId) || $studentId === 'STD_ID') {
            continue;
        }

        $name = trim($row[1] ?? '');
        $fatherNo = trim($row[2] ?? '');
        $motherNo = trim($row[3] ?? '');
        $contactNo = trim($row[4] ?? '');
        
        $rawAdmDate = trim($row[5] ?? '');
        $admDate = $parseDate($rawAdmDate) ?: date('Y-m-d');
        
        $rawDob = trim($row[6] ?? '');
        $dob = $parseDate($rawDob); // can be null
        
        $groupId = trim($row[7] ?? '');
        $class = trim($row[8] ?? '');
        $school = trim($row[9] ?? '');

        // Determine category and fee
        $category = $groupCategories[$groupId] ?? 'Junior';
        $feePerMonth = ($category === 'Senior') ? $feeSenior : $feeJunior;

        $existingStudent = $dbStudents[$studentId] ?? null;

        try {
            if ($existingStudent) {
                // Keep existing fee if already set
                $feePerMonth = (int)$existingStudent['fee_per_month'];
                // Update student
                $stmtUpdateStudent->execute([
                    $name, $fatherNo, $motherNo, $contactNo, $admDate, $dob, $groupId, $class, $school, $category, $feePerMonth, $studentId
                ]);
            } else {
                // Insert new student
                $stmtInsertStudent->execute([
                    $studentId, $name, $fatherNo, $motherNo, $contactNo, $admDate, $dob, $groupId, $class, $school, $category, $feePerMonth
                ]);
            }
        } catch (PDOException $ex) {
            echo "ERROR: Failed to save Student ID: '$studentId', Name: '$name', Group ID: '$groupId'\n";
            throw $ex;
        }

        // Process payments / receipts
        $paidMonths = [];
        for ($col = 10; $col < count($headers); $col++) {
            if (empty(trim($headers[$col]))) continue;
            $monthCode = strtoupper(trim($headers[$col]));
            $status = strtoupper(trim($row[$col] ?? ''));

            if ($status === 'PAID') {
                $paidMonths[] = $monthCode;
            }
        }

        if (!empty($paidMonths)) {
            // Sort chronologically
            usort($paidMonths, function($a, $b) use ($monthOrder) {
                return array_search($a, $monthOrder) - array_search($b, $monthOrder);
            });

            $totalPaid = count($paidMonths) * $feePerMonth;

            // Generate receipt ID
            $prefix = ($category === 'Senior') ? 'SR' : 'JR';
            $datePart = date('ymd', strtotime($admDate));
            $uniqueHash = strtoupper(substr(md5($studentId . $admDate . json_encode($paidMonths)), 0, 4));
            $receiptId = "$prefix-$datePart-$uniqueHash";

            $periodStr = $getPeriodString($paidMonths, $academicYear);

            $receiptsList[] = [
                'id' => $receiptId,
                'student_id' => $studentId,
                'student_name' => $name,
                'category' => $category,
                'class' => $class,
                'school' => $school,
                'fee_per_month' => $feePerMonth,
                'period' => $periodStr,
                'months' => $paidMonths,
                'amt_paid' => $totalPaid,
                'prev_due' => 0,
                'total_recv' => $totalPaid,
                'remaining_amount' => 0,
                'remaining_months' => null,
                'next_due' => '',
                'notes' => 'Bulk generated from command line',
                'generated_on' => $admDate . ' 12:00:00',
                'generated_by' => 'Admin',
                'academic_year' => $academicYear
            ];
        }

        $studentsProcessed++;
    }

    // Save receipts to backend/data/receipts.json
    $jsonContent = json_encode($receiptsList, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (file_put_contents($receiptsJsonPath, $jsonContent) === false) {
        throw new Exception("Failed to write receipts.json to: $receiptsJsonPath");
    }
    echo "Saved " . count($receiptsList) . " receipts to receipts.json.\n";

    // Insert/Update receipts into Database
    $stmtInsertReceipt = $pdo->prepare('
        INSERT INTO receipts (
            id, student_id, student_name, category, class, school, fee_per_month, 
            period, months, amt_paid, prev_due, total_recv, remaining_amount, remaining_months, next_due, notes, generated_on, generated_by, academic_year
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            student_name = VALUES(student_name),
            category = VALUES(category),
            class = VALUES(class),
            school = VALUES(school),
            fee_per_month = VALUES(fee_per_month),
            period = VALUES(period),
            months = VALUES(months),
            amt_paid = VALUES(amt_paid),
            total_recv = VALUES(total_recv),
            generated_on = VALUES(generated_on)
    ');

    $receiptsGenerated = 0;
    foreach ($receiptsList as $r) {
        $stmtInsertReceipt->execute([
            $r['id'],
            $r['student_id'],
            $r['student_name'],
            $r['category'],
            $r['class'],
            $r['school'],
            $r['fee_per_month'],
            $r['period'],
            json_encode($r['months']),
            $r['amt_paid'],
            $r['prev_due'],
            $r['total_recv'],
            $r['remaining_amount'],
            $r['remaining_months'],
            $r['next_due'],
            $r['notes'],
            $r['generated_on'],
            $r['generated_by'],
            $r['academic_year']
        ]);
        echo "Generated/Updated receipt {$r['id']} for {$r['student_name']} ({$r['student_id']}) - Period: {$r['period']} - Paid: {$r['amt_paid']}\n";
        $receiptsGenerated++;
    }

    $pdo->commit();

    echo "\nSummary:\n";
    echo "- Processed $studentsProcessed students.\n";
    echo "- Saved to backend/data/receipts.json.\n";
    echo "- Generated/Updated $receiptsGenerated receipts directly in DB.\n";
    echo "SUCCESS: Bulk receipt generation complete.\n";

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "ERROR during bulk receipt generation: " . $e->getMessage() . "\n";
    exit(1);
}
