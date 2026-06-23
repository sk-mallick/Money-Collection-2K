<?php
/**
 * Database Seed / JSON Import Script
 * Parses data from backend/data/*.json and populates the database (excluding payments).
 */

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => 'Access Denied: This script can only be run via CLI.']);
    exit;
}

require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = get_db();
    echo "Connected to database successfully.\n";

    // Disable foreign key checks to allow truncating/deleting easily
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $pdo->exec("TRUNCATE TABLE `receipts`;");
    $pdo->exec("TRUNCATE TABLE `students`;");
    $pdo->exec("TRUNCATE TABLE `groups`;");
    $pdo->exec("TRUNCATE TABLE `settings`;");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
    echo "Cleared old database tables.\n";

    // 1. Load settings.json
    $settingsPath = __DIR__ . '/../data/settings.json';
    if (!file_exists($settingsPath)) {
        throw new Exception("settings.json not found at: $settingsPath");
    }
    $settingsData = json_decode(file_get_contents($settingsPath), true);
    if ($settingsData === null) {
        throw new Exception("Failed to decode settings.json");
    }

    $stmtSettings = $pdo->prepare("INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`)");
    foreach ($settingsData as $key => $value) {
        if (is_bool($value)) {
            $value = $value ? '1' : '0';
        }
        $stmtSettings->execute([$key, (string)$value]);
    }
    // Ensure activeMonths is present since it's required for some UI operations
    if (!isset($settingsData['activeMonths'])) {
        $stmtSettings->execute(['activeMonths', 'MAR,APR,MAY,JUN,JUL,AUG,SEP,OCT,NOV,DEC,JAN,FEB']);
    }
    echo "Imported settings.\n";

    // 2. Load groups.json
    $groupsPath = __DIR__ . '/../data/groups.json';
    if (!file_exists($groupsPath)) {
        throw new Exception("groups.json not found at: $groupsPath");
    }
    $groupsData = json_decode(file_get_contents($groupsPath), true);
    if ($groupsData === null) {
        throw new Exception("Failed to decode groups.json");
    }

    $stmtGroup = $pdo->prepare("INSERT INTO `groups` (`id`, `class`, `timing`, `category`) VALUES (?, ?, ?, ?)");
    foreach ($groupsData as $g) {
        $stmtGroup->execute([
            $g['id'],
            $g['class'],
            $g['timing'] ?? '',
            $g['category']
        ]);
    }
    echo "Imported " . count($groupsData) . " groups.\n";

    // 3. Load students.json
    $studentsPath = __DIR__ . '/../data/students.json';
    if (!file_exists($studentsPath)) {
        throw new Exception("students.json not found at: $studentsPath");
    }
    $studentsData = json_decode(file_get_contents($studentsPath), true);
    if ($studentsData === null) {
        throw new Exception("Failed to decode students.json");
    }

    $stmtStudent = $pdo->prepare("
        INSERT INTO `students` (
            `id`, `name`, `category`, `group_id`, `class`, `school`, 
            `contact_no`, `father_no`, `mother_no`, `adm_date`, `dob`, 
            `fee_per_month`, `notes`, `created_at`, `updated_at`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $stmtReceipt = $pdo->prepare('
        INSERT INTO `receipts` (
            `id`, `student_id`, `student_name`, `category`, `class`, `school`, `fee_per_month`, 
            `period`, `months`, `amt_paid`, `prev_due`, `total_recv`, `remaining_amount`, `remaining_months`, `next_due`, `notes`, `generated_on`, `generated_by`, `academic_year`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');

    $academicYear = $settingsData['academicYear'] ?? '2026-27';
    $studentCount = 0;
    $receiptCount = 0;

    $monthOrder = ["MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC","JAN","FEB"];
    $monthNames = [
        'MAR' => 'Mar', 'APR' => 'Apr', 'MAY' => 'May', 'JUN' => 'Jun',
        'JUL' => 'Jul', 'AUG' => 'Aug', 'SEP' => 'Sep', 'OCT' => 'Oct',
        'NOV' => 'Nov', 'DEC' => 'Dec', 'JAN' => 'Jan', 'FEB' => 'Feb',
    ];

    // Helper for formatting period label
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

    foreach ($studentsData as $s) {
        $dob = null;
        if (isset($s['dob']) && $s['dob'] !== 'NIL' && !empty($s['dob'])) {
            $dob = $s['dob'];
        }
        
        $admDate = isset($s['admDate']) && !empty($s['admDate']) ? $s['admDate'] : date('Y-m-d');

        // Parse created_at / updated_at timestamps
        $createdAt = date('Y-m-d H:i:s');
        $updatedAt = date('Y-m-d H:i:s');
        if (isset($s['updatedAt'])) {
            $time = strtotime($s['updatedAt']);
            if ($time !== false) {
                $updatedAt = date('Y-m-d H:i:s', $time);
                $createdAt = date('Y-m-d H:i:s', $time);
            }
        }

        $stmtStudent->execute([
            $s['id'],
            $s['name'],
            $s['category'],
            $s['group'] ?? null,
            $s['class'] ?? '',
            $s['school'] ?? '',
            $s['contactNo'] ?? '',
            $s['fatherNo'] ?? '',
            $s['motherNo'] ?? '',
            $admDate,
            $dob,
            $s['feePerMonth'] ?? 700,
            $s['notes'] ?? '',
            $createdAt,
            $updatedAt
        ]);
        $studentCount++;

        // Import payments and generate receipts
        if (isset($s['payments']) && (is_array($s['payments']) || is_object($s['payments']))) {
            $paymentsList = (array)$s['payments'];
            
            // Group paid months by payment date
            $paymentsByDate = [];
            foreach ($paymentsList as $mCode => $pData) {
                if (isset($pData['paid']) && $pData['paid']) {
                    $pDate = $pData['date'] ?? $admDate;
                    $paymentsByDate[$pDate][$mCode] = $pData;
                }
            }

            foreach ($paymentsByDate as $pDate => $monthsGroup) {
                // Sort months of this receipt chronologically
                $mCodes = array_keys($monthsGroup);
                usort($mCodes, function($a, $b) use ($monthOrder) {
                    return array_search($a, $monthOrder) - array_search($b, $monthOrder);
                });

                // Generate Receipt
                $totalPaid = 0;
                foreach ($mCodes as $m) {
                    $totalPaid += (int)$monthsGroup[$m]['amount'];
                }

                $prefix = ($s['category'] === 'Senior') ? 'SR' : 'JR';
                $datePart = date('ymd', strtotime($pDate));
                $uniqueHash = strtoupper(substr(md5($s['id'] . $pDate . json_encode($mCodes)), 0, 4));
                $receiptId = "$prefix-$datePart-$uniqueHash";
                $periodStr = $getPeriodString($mCodes, $academicYear);

                $stmtReceipt->execute([
                    $receiptId,
                    $s['id'],
                    $s['name'],
                    $s['category'],
                    $s['class'] ?? '',
                    $s['school'] ?? '',
                    $s['feePerMonth'] ?? 700,
                    $periodStr,
                    json_encode($mCodes),
                    $totalPaid,
                    0, // prev_due
                    $totalPaid, // total_recv
                    0, // remaining_amount
                    null, // remaining_months
                    '', // next_due
                    '', // notes
                    $pDate . ' 12:00:00', // generated_on
                    'Admin',
                    $academicYear
                ]);
                $receiptCount++;
            }
        }
    }

    echo "Imported $studentCount students successfully!\n";
    echo "Generated $receiptCount receipts successfully!\n";

} catch (Exception $e) {
    echo "ERROR during import: " . $e->getMessage() . "\n";
    exit(1);
}
