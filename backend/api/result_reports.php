<?php
/**
 * Report Cards — Student Reports API
 * GET /api/result-reports?student_id=X              → Full result history
 * GET /api/result-reports?student_id=X&period_id=Y  → Single period report
 */

require_once __DIR__ . '/../includes/auth.php';

cors_headers();
$user = require_auth();
$pdo = get_db();
$method = request_method();

if ($method !== 'GET') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$studentId = query_param('student_id', '', 10);
$periodId = query_param('period_id', '', 10);

if (empty($studentId)) {
    json_response(['success' => false, 'error' => 'student_id required'], 400);
}

// Get student info
$studentStmt = $pdo->prepare('SELECT id, name, category, class, school, group_id, adm_date, dob, contact_no, father_no, mother_no FROM students WHERE id = ? AND deleted_at IS NULL');
$studentStmt->execute([$studentId]);
$student = $studentStmt->fetch();

if (!$student) {
    json_response(['success' => false, 'error' => 'Student not found'], 404);
}

if ($periodId) {
    // Single period report
    getSingleReport($pdo, $studentId, (int)$periodId, $student);
} else {
    // Full history
    getFullHistory($pdo, $studentId, $student);
}

function getSingleReport(PDO $pdo, string $studentId, int $periodId, array $student): void {
    $srStmt = $pdo->prepare("
        SELECT sr.*, rp.academic_year, rp.month, rp.group_id, rp.category as period_category, rp.status as period_status,
               g.class as group_class
        FROM rc_student_results sr
        JOIN rc_result_periods rp ON sr.result_period_id = rp.id
        LEFT JOIN `groups` g ON rp.group_id = g.id
        WHERE sr.student_id = ? AND sr.result_period_id = ?
    ");
    $srStmt->execute([$studentId, $periodId]);
    $result = $srStmt->fetch();
    
    if (!$result) {
        json_response(['success' => false, 'error' => 'Result not found for this student and period'], 404);
    }
    
    // Get marks
    $marksStmt = $pdo->prepare("
        SELECT sm.*, s.name as subject_name, s.category as subject_category
        FROM rc_student_marks sm
        JOIN rc_subjects s ON sm.subject_id = s.id
        WHERE sm.student_result_id = ?
        ORDER BY s.display_order ASC
    ");
    $marksStmt->execute([$result['id']]);
    $result['marks'] = $marksStmt->fetchAll();

    // Get settings for print header
    $settingsStmt = $pdo->query("SELECT setting_key, setting_value FROM settings");
    $settingsRows = $settingsStmt->fetchAll();
    $settings = [];
    foreach ($settingsRows as $row) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    
    json_response(['success' => true, 'student' => $student, 'result' => $result, 'settings' => $settings]);
}

function getFullHistory(PDO $pdo, string $studentId, array $student): void {
    $admDate = $student['adm_date'];
    
    // Get all results for this student, ordered chronologically
    $sql = "
        SELECT sr.*, rp.academic_year, rp.month, rp.group_id, rp.category as period_category, rp.status as period_status,
               g.class as group_class
        FROM rc_student_results sr
        JOIN rc_result_periods rp ON sr.result_period_id = rp.id
        LEFT JOIN `groups` g ON rp.group_id = g.id
        WHERE sr.student_id = ?
        ORDER BY rp.academic_year ASC, FIELD(rp.month, 'APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC','JAN','FEB','MAR') ASC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$studentId]);
    $results = $stmt->fetchAll();
    
    // Filter results to only include those on or after the student's admission date
    $filteredResults = [];
    foreach ($results as $r) {
        // Convert academic year + month to a comparable date
        $monthMap = [
            'MAR' => 3, 'APR' => 4, 'MAY' => 5, 'JUN' => 6, 'JUL' => 7, 'AUG' => 8,
            'SEP' => 9, 'OCT' => 10, 'NOV' => 11, 'DEC' => 12, 'JAN' => 1, 'FEB' => 2,
        ];
        $calMonth = $monthMap[$r['month']] ?? 1;
        $yearParts = explode('-', $r['academic_year']);
        $startYear = (int)($yearParts[0] ?? 2026);
        $calYear = ($r['month'] === 'JAN' || $r['month'] === 'FEB') ? $startYear + 1 : $startYear;
        $resultDate = sprintf('%04d-%02d-01', $calYear, $calMonth);
        
        if (!$admDate || $resultDate >= substr($admDate, 0, 7) . '-01') {
            // Get marks for each result
            $marksStmt = $pdo->prepare("
                SELECT sm.*, s.name as subject_name, s.category as subject_category
                FROM rc_student_marks sm
                JOIN rc_subjects s ON sm.subject_id = s.id
                WHERE sm.student_result_id = ?
                ORDER BY s.display_order ASC
            ");
            $marksStmt->execute([$r['id']]);
            $r['marks'] = $marksStmt->fetchAll();
            $filteredResults[] = $r;
        }
    }
    
    // Get all settings for print header
    $settingsStmt = $pdo->query("SELECT setting_key, setting_value FROM settings");
    $settingsRows = $settingsStmt->fetchAll();
    $settings = [];
    foreach ($settingsRows as $row) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    
    json_response([
        'success' => true,
        'student' => $student,
        'results' => $filteredResults,
        'settings' => $settings,
    ]);
}
