<?php
/**
 * MCMS — Year Rollover API
 * POST /api/rollover  → Transition the system to the next academic year
 */

require_once __DIR__ . '/../includes/auth.php';

cors_headers();
$user = require_auth();
$pdo = get_db();
$method = request_method();

if ($method !== 'POST') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

try {
    $pdo->beginTransaction();

    // 1. Fetch current academic year from settings
    $stmt = $pdo->prepare("SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1");
    $stmt->execute(['academicYear']);
    $currentYear = $stmt->fetchColumn() ?: '2026-27';

    // Calculate next academic year (e.g. 2026-27 -> 2027-28)
    $parts = explode('-', $currentYear);
    if (count($parts) === 2) {
        $startYear = (int)$parts[0];
        $nextStart = $startYear + 1;
        $nextEnd = ($nextStart + 1) % 100;
        $nextYear = $nextStart . '-' . str_pad((string)$nextEnd, 2, '0', STR_PAD_LEFT);
    } else {
        $nextYear = '2027-28';
    }

    // 2. Promote non-deleted student classes
    $studentsStmt = $pdo->query("SELECT id, class FROM students WHERE deleted_at IS NULL");
    $students = $studentsStmt->fetchAll();

    $updateStudentStmt = $pdo->prepare("UPDATE students SET class = ? WHERE id = ?");
    foreach ($students as $student) {
        $currentClass = $student['class'] ?? '';
        $nextClass = $currentClass;

        if (preg_match('/\d+/', $currentClass, $matches)) {
            $currentNum = (int)$matches[0];
            $nextNum = $currentNum + 1;
            $pos = strpos($currentClass, (string)$currentNum);
            if ($pos !== false) {
                $nextClass = substr_replace($currentClass, (string)$nextNum, $pos, strlen((string)$currentNum));
            }
        }
        $updateStudentStmt->execute([$nextClass, $student['id']]);
    }

    // 3. Update setting value for academicYear
    $updateSettingStmt = $pdo->prepare("
        INSERT INTO settings (setting_key, setting_value) 
        VALUES ('academicYear', ?) 
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    ");
    $updateSettingStmt->execute([$nextYear]);

    // 4. Record Year Rollover in Audit Logs
    $logStmt = $pdo->prepare("
        INSERT INTO audit_logs (admin_id, action, target_entity, target_id, description)
        VALUES (?, 'ROLLOVER', 'settings', 'academicYear', ?)
    ");
    $logStmt->execute([
        $user['sub'] ?? null,
        "Rolled over system from academic year $currentYear to $nextYear."
    ]);

    $pdo->commit();

    json_response([
        'success' => true,
        'message' => "Successfully rolled over to academic year $nextYear",
        'nextAcademicYear' => $nextYear
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_response([
        'success' => false,
        'error' => 'Failed to perform year rollover: ' . $e->getMessage()
    ], 500);
}
