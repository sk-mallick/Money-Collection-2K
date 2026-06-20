<?php
/**
 * MCMS — Payments API
 * POST /api/payments  → Submit payment + create receipt
 * GET  /api/payments?studentId=X → Fetch payments for a student
 */

require_once __DIR__ . '/../includes/auth.php';

cors_headers();
$user = require_auth();
$pdo = get_db();
$method = request_method();

switch ($method) {
    case 'GET':
        getPayments($pdo);
        break;
    case 'POST':
        submitPayment($pdo, $user);
        break;
    default:
        json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

function getPayments(PDO $pdo): void {
    $studentId = query_param('studentId');
    $academicYear = query_param('academicYear');
    
    if (empty($studentId) || $studentId === 'all') {
        if (!empty($academicYear)) {
            $receiptsStmt = $pdo->prepare('SELECT student_id, amt_paid, months, generated_on, academic_year FROM receipts WHERE academic_year = ? ORDER BY generated_on ASC');
            $receiptsStmt->execute([$academicYear]);
        } else {
            $receiptsStmt = $pdo->query('SELECT student_id, amt_paid, months, generated_on, academic_year FROM receipts ORDER BY generated_on ASC');
        }
        $receipts = $receiptsStmt->fetchAll();

        // Get all active students
        $studentsStmt = $pdo->query('SELECT id, fee_per_month FROM students WHERE deleted_at IS NULL');
        $studentFees = [];
        while ($row = $studentsStmt->fetch()) {
            $studentFees[$row['id']] = (int)$row['fee_per_month'];
        }

        // Group receipts by student and academic year
        $groupedReceipts = [];
        foreach ($receipts as $receipt) {
            $sid = $receipt['student_id'];
            $ay = $receipt['academic_year'];
            if (!isset($groupedReceipts[$sid])) {
                $groupedReceipts[$sid] = [];
            }
            if (!isset($groupedReceipts[$sid][$ay])) {
                $groupedReceipts[$sid][$ay] = [];
            }
            $groupedReceipts[$sid][$ay][] = $receipt;
        }

        $payments = [];
        foreach ($groupedReceipts as $sid => $yearsData) {
            $fee = $studentFees[$sid] ?? 1000;
            foreach ($yearsData as $ay => $rList) {
                $payments = array_merge($payments, allocate_receipts_to_months($rList, $fee, $sid, $ay));
            }
        }
    } else {
        if (!empty($academicYear)) {
            $payments = compute_payments_for_student($pdo, $studentId, $academicYear);
        } else {
            // Fetch all distinct academic years from receipts for this student
            $yearStmt = $pdo->prepare('SELECT DISTINCT academic_year FROM receipts WHERE student_id = ?');
            $yearStmt->execute([$studentId]);
            $years = $yearStmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
            
            // Also add the active academic year from settings if not already present
            $settingStmt = $pdo->query('SELECT setting_value FROM settings WHERE setting_key = "academicYear" LIMIT 1');
            $activeYear = $settingStmt->fetchColumn() ?: '2026-27';
            if (!in_array($activeYear, $years)) {
                $years[] = $activeYear;
            }
            
            $payments = [];
            foreach ($years as $year) {
                $payments = array_merge($payments, compute_payments_for_student($pdo, $studentId, $year));
            }
        }
    }

    // Cast numeric fields
    foreach ($payments as &$p) {
        $p['paid'] = (bool)$p['paid'];
        $p['amount'] = (int)$p['amount'];
    }

    json_response(['success' => true, 'payments' => $payments]);
}

function submitPayment(PDO $pdo, array $user): void {
    $input = get_input();
    $missing = validate_required($input, ['studentId', 'months', 'amtPaid', 'receiptId']);

    if (!empty($missing)) {
        json_response(['success' => false, 'error' => 'Missing fields: ' . implode(', ', $missing)], 400);
    }

    $studentId = sanitize_string($input['studentId'], 10);
    $months = $input['months']; // Array of month codes
    if (!is_array($months) || empty($months)) {
        json_response(['success' => false, 'error' => 'At least one month must be selected for payment'], 400);
    }
    $amtPaid = (int)$input['amtPaid'];
    $receiptId = sanitize_string($input['receiptId'], 20);
    $prevDue = (int)($input['prevDue'] ?? 0);
    $remainingAmount = (int)($input['remainingAmount'] ?? 0);
    $nextDue = sanitize_string($input['nextDue'] ?? '', 100);
    $notes = sanitize_string($input['notes'] ?? '', 500);
    $date = $input['date'] ?? date('Y-m-d');
    $academicYear = sanitize_string($input['academicYear'] ?? '2026-27', 10);

    // Get student info
    $stmt = $pdo->prepare('SELECT * FROM students WHERE id = ?');
    $stmt->execute([$studentId]);
    $student = $stmt->fetch();

    if (!$student) {
        json_response(['success' => false, 'error' => 'Student not found'], 404);
    }

    $totalRecv = $amtPaid + $prevDue;
    $feePerMonth = (int)$student['fee_per_month'];

    // Sort months in academic order
    $monthOrder = ["MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC","JAN","FEB"];
    if (is_array($months) && count($months) > 0) {
        usort($months, function($a, $b) use ($monthOrder) {
            return array_search($a, $monthOrder) - array_search($b, $monthOrder);
        });
    } else {
        $months = [];
    }

    // Calculate student's admission academic index
    $studentAdmDate = $student['adm_date'] ?? '';
    $admAcademicIndex = 0;
    if (!empty($studentAdmDate)) {
        $admTime = strtotime($studentAdmDate);
        $admMonth = (int)date('n', $admTime);
        $admYear = (int)date('Y', $admTime);
        $admAcademicYear = ($admMonth >= 3) ? $admYear : ($admYear - 1);
        
        $parts = explode('-', $academicYear);
        $selectedAcademicYear = (int)($parts[0] ?? 2026);
        
        if ($admAcademicYear > $selectedAcademicYear) {
            $admAcademicIndex = 12;
        } else if ($admAcademicYear === $selectedAcademicYear) {
            $calendarToAcademic = [
                3 => 0, 4 => 1, 5 => 2, 6 => 3, 7 => 4, 8 => 5,
                9 => 6, 10 => 7, 11 => 8, 12 => 9, 1 => 10, 2 => 11
            ];
            $admAcademicIndex = $calendarToAcademic[$admMonth] ?? 0;
        }
    }

    // Find the last selected month's index
    $lastSelectedMonth = $months[count($months) - 1];
    $lastSelectedIndex = array_search($lastSelectedMonth, $monthOrder);
    $sliceLength = max(0, $lastSelectedIndex - $admAcademicIndex + 1);
    $monthsUpToLast = array_slice($monthOrder, $admAcademicIndex, $sliceLength);

    // Fetch existing payment records for all months up to the last selected month
    $existingPayments = [];
    if (count($monthsUpToLast) > 0) {
        $studentPayments = compute_payments_for_student($pdo, $studentId, $academicYear);
        foreach ($studentPayments as $p) {
            if (in_array($p['month'], $monthsUpToLast, true)) {
                $existingPayments[$p['month']] = [
                    'amount' => (int)$p['amount'],
                    'paid' => (bool)$p['paid']
                ];
            }
        }
    }

    // Sequential allocation
    $remaining = $amtPaid;
    $newTotals = [];

    foreach ($months as $month) {
        $alreadyPaid = $existingPayments[$month]['amount'] ?? 0;
        $due = max(0, $feePerMonth - $alreadyPaid);
        
        if ($remaining >= $due) {
            $alloc = $due;
            $remaining -= $due;
        } else {
            $alloc = $remaining;
            $remaining = 0;
        }
        $newTotals[$month] = $alreadyPaid + $alloc;
    }

    if ($remaining > 0 && count($months) > 0) {
        $lastMonth = $months[count($months) - 1];
        $newTotals[$lastMonth] += $remaining;
    }

    // Generate period string
    $monthNames = [
        'MAR' => 'Mar', 'APR' => 'Apr', 'MAY' => 'May', 'JUN' => 'Jun',
        'JUL' => 'Jul', 'AUG' => 'Aug', 'SEP' => 'Sep', 'OCT' => 'Oct',
        'NOV' => 'Nov', 'DEC' => 'Dec', 'JAN' => 'Jan', 'FEB' => 'Feb',
    ];
    
    $parts = explode('-', $academicYear);
    $startYearStr = isset($parts[0]) ? $parts[0] : '2026';
    $endYearStr = isset($parts[1]) ? $parts[1] : '27';
    $startSuffix = substr($startYearStr, -2);
    $endSuffix = strlen($endYearStr) === 4 ? substr($endYearStr, -2) : $endYearStr;
    
    $getMonthYearSuffix = function($monthCode) use ($startSuffix, $endSuffix) {
        $isNextYear = $monthCode === 'JAN' || $monthCode === 'FEB';
        return $isNextYear ? $endSuffix : $startSuffix;
    };

    $firstMonth = ($monthNames[$months[0]] ?? $months[0]) . ' ' . $getMonthYearSuffix($months[0]);
    $lastMonth = ($monthNames[$months[count($months) - 1]] ?? $months[count($months) - 1]) . ' ' . $getMonthYearSuffix($months[count($months) - 1]);
    $period = count($months) === 1 ? $firstMonth : "$firstMonth – $lastMonth";

    // Compute remaining months list checking all months up to last selected
    $remainingMonths = null;
    if ($remainingAmount > 0) {
        $remMonthsList = [];
        foreach ($monthsUpToLast as $m) {
            $isPaid = isset($newTotals[$m]) ? true : ($existingPayments[$m]['paid'] ?? false);
            $amt = isset($newTotals[$m]) ? $newTotals[$m] : ($existingPayments[$m]['amount'] ?? 0);
            $isWaived = $isPaid && ($amt === 0);
            
            if (!$isWaived) {
                if (!$isPaid || $amt < $feePerMonth) {
                    $remMonthsList[] = $monthNames[$m] ?? $m;
                }
            }
        }
        if (!empty($remMonthsList)) {
            $remainingMonths = implode(', ', $remMonthsList);
        }
    } else {
        // Find the fully paid month when remainingAmount is 0
        $fullyPaidMonth = null;
        foreach ($months as $m) {
            $prevAmount = $existingPayments[$m]['amount'] ?? 0;
            if ($prevAmount > 0 && $prevAmount < $feePerMonth) {
                $fullyPaidMonth = $monthNames[$m] ?? $m;
            }
        }
        // If a month had a previous outstanding partial due, set remainingMonths to it.
        // Otherwise, remainingMonths remains null (meaning we do not display the remaining balance line).
        $remainingMonths = $fullyPaidMonth;
    }

    try {
        $pdo->beginTransaction();

        // Insert receipt
        $receiptStmt = $pdo->prepare('
            INSERT INTO receipts (id, student_id, student_name, category, class, school, fee_per_month, period, months, amt_paid, prev_due, total_recv, remaining_amount, remaining_months, next_due, notes, generated_on, generated_by, academic_year)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)
            ON DUPLICATE KEY UPDATE
                amt_paid = VALUES(amt_paid), prev_due = VALUES(prev_due),
                total_recv = VALUES(total_recv), remaining_amount = VALUES(remaining_amount),
                remaining_months = VALUES(remaining_months),
                months = VALUES(months), period = VALUES(period),
                next_due = VALUES(next_due), notes = VALUES(notes)
        ');

        $receiptStmt->execute([
            $receiptId,
            $studentId,
            $student['name'],
            $student['category'],
            $student['class'],
            $student['school'],
            $feePerMonth,
            $period,
            json_encode($months),
            $amtPaid,
            $prevDue,
            $totalRecv,
            $remainingAmount,
            $remainingMonths,
            $nextDue,
            $notes,
            $user['name'] ?? 'Admin',
            $academicYear,
        ]);

        $pdo->commit();

        json_response([
            'success' => true,
            'receipt' => [
                'id' => $receiptId,
                'period' => $period,
                'amtPaid' => $amtPaid,
                'totalRecv' => $totalRecv,
            ]
        ], 201);
    } catch (Exception $e) {
        $pdo->rollBack();
        json_response(['success' => false, 'error' => 'Payment processing failed'], 500);
    }
}
