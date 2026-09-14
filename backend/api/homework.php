<?php
/**
 * Homework Report — API
 * GET    /api/homework?group_id=X&month=9&year=2026-27  → Get sessions + records for a group/month
 * GET    /api/homework?action=session_records&session_id=X → Get records for a specific session
 * GET    /api/homework?action=export&group_id=X&month=9&year=2026-27 → Export monthly data as JSON
 * POST   /api/homework                                  → Create a new session (auto-populates students)
 * PUT    /api/homework?action=save_records               → Save/update batch student records
 * DELETE /api/homework?session_id=X                      → Delete a session and all its records
 */

require_once __DIR__ . '/../includes/auth.php';

cors_headers();
$user = require_auth();
$pdo = get_db();
$method = request_method();

switch ($method) {
    case 'GET':
        $action = query_param('action');
        if ($action === 'session_records') {
            getSessionRecords($pdo);
        } elseif ($action === 'export') {
            exportMonthly($pdo);
        } else {
            getSessions($pdo);
        }
        break;
    case 'POST':
        createSession($pdo);
        break;
    case 'PUT':
        $action = query_param('action');
        if ($action === 'save_records') {
            saveRecords($pdo);
        } else {
            json_response(['success' => false, 'error' => 'Unknown action'], 400);
        }
        break;
    case 'DELETE':
        deleteSession($pdo);
        break;
    default:
        json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

/**
 * GET sessions for a group + month/year
 */
function getSessions(PDO $pdo): void {
    $groupId = query_param('group_id');
    $month = query_param('month');
    $year = query_param('year');

    if (empty($groupId)) {
        $sql = 'SELECT s.*, g.class as group_class, g.timing as group_timing, g.category as group_category,
                       (SELECT COUNT(*) FROM hw_student_records r WHERE r.session_id = s.id) as record_count
                FROM hw_class_sessions s
                LEFT JOIN `groups` g ON g.id = s.group_id
                ORDER BY s.session_date DESC';
        $stmt = $pdo->query($sql);
        $sessions = $stmt->fetchAll();
        json_response(['success' => true, 'sessions' => $sessions]);
        return;
    }

    $sql = 'SELECT s.*, g.class as group_class, g.timing as group_timing, g.category as group_category,
                   (SELECT COUNT(*) FROM hw_student_records r WHERE r.session_id = s.id) as record_count
            FROM hw_class_sessions s
            LEFT JOIN `groups` g ON g.id = s.group_id
            WHERE s.group_id = ?';
    $params = [$groupId];

    if (!empty($month)) {
        $sql .= ' AND MONTH(s.session_date) = ?';
        $params[] = (int)$month;
    }
    if (!empty($year)) {
        $sql .= ' AND s.academic_year = ?';
        $params[] = $year;
    }

    $sql .= ' ORDER BY s.session_date ASC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $sessions = $stmt->fetchAll();

    json_response(['success' => true, 'sessions' => $sessions]);
}

/**
 * Generate semantic session code (e.g. SEP26-A-01) following APR26-A pattern
 */
function generate_hw_session_code(string $academicYear, string $sessionDate, string $groupId): string {
    $dateObj = new DateTime($sessionDate);
    $day = $dateObj->format('d');
    $m = strtoupper($dateObj->format('M'));
    $g = strtoupper(trim($groupId));

    $parts = explode('-', $academicYear);
    $startYr = substr($parts[0] ?? '2026', -2);
    $endYr = substr($parts[1] ?? '27', -2);
    $yr = in_array($m, ['JAN', 'FEB'], true) ? $endYr : $startYr;

    return "{$m}{$yr}-{$g}-{$day}";
}

/**
 * GET records for a specific session
 */
function getSessionRecords(PDO $pdo): void {
    $sessionId = query_param('session_id');
    $sessionCode = query_param('session_code');
    if (empty($sessionId) && empty($sessionCode)) {
        json_response(['success' => false, 'error' => 'session_id or session_code required'], 400);
    }

    if (!empty($sessionId)) {
        $sessionStmt = $pdo->prepare('
            SELECT s.*, g.class as group_class, g.timing as group_timing, g.category as group_category
            FROM hw_class_sessions s
            LEFT JOIN `groups` g ON g.id = s.group_id
            WHERE s.id = ?
        ');
        $sessionStmt->execute([$sessionId]);
    } else {
        $sessionStmt = $pdo->prepare('
            SELECT s.*, g.class as group_class, g.timing as group_timing, g.category as group_category
            FROM hw_class_sessions s
            LEFT JOIN `groups` g ON g.id = s.group_id
            WHERE s.session_code = ?
        ');
        $sessionStmt->execute([$sessionCode]);
    }
    $session = $sessionStmt->fetch();

    if (!$session) {
        json_response(['success' => false, 'error' => 'Session not found'], 404);
    }
    $realId = $session['id'];

    $studentsStmt = $pdo->prepare('
        SELECT id, name, category, class, school
        FROM students
        WHERE group_id = ?
        ORDER BY name ASC
    ');
    $studentsStmt->execute([$session['group_id']]);
    $students = $studentsStmt->fetchAll();

    $recordsStmt = $pdo->prepare('
        SELECT r.*, st.name as student_name, st.class as student_class, st.school as student_school
        FROM hw_student_records r
        LEFT JOIN students st ON st.id = r.student_id
        WHERE r.session_id = ?
    ');
    $recordsStmt->execute([$realId]);
    $existingRecords = $recordsStmt->fetchAll();

    $recordMap = [];
    foreach ($existingRecords as $rec) {
        $recordMap[$rec['student_id']] = $rec;
    }

    $records = [];
    foreach ($students as $student) {
        if (isset($recordMap[$student['id']])) {
            $rec = $recordMap[$student['id']];
            $rec['student_name'] = $student['name'];
            $rec['student_class'] = $student['class'] ?? $rec['student_class'] ?? null;
            $rec['student_school'] = $student['school'] ?? $rec['student_school'] ?? null;
            $records[] = $rec;
        } else {
            $records[] = [
                'id' => null,
                'session_id' => (int)$realId,
                'session_code' => $session['session_code'],
                'student_id' => $student['id'],
                'student_name' => $student['name'],
                'student_class' => $student['class'] ?? null,
                'student_school' => $student['school'] ?? null,
                'homework_status' => null,
                'test_prep_status' => null,
                'practice_status' => null,
            ];
        }
    }

    json_response([
        'success' => true,
        'session' => $session,
        'records' => $records,
    ]);
}

/**
 * POST — Create a new session
 */
function createSession(PDO $pdo): void {
    $input = get_input();
    $groupId = sanitize_string($input['group_id'] ?? '', 10);
    $sessionDate = $input['session_date'] ?? '';
    $academicYear = sanitize_string($input['academic_year'] ?? '2026-27', 10);

    if (empty($groupId) || empty($sessionDate)) {
        json_response(['success' => false, 'error' => 'group_id and session_date are required'], 400);
    }

    $dateObj = DateTime::createFromFormat('Y-m-d', $sessionDate);
    if (!$dateObj) {
        json_response(['success' => false, 'error' => 'Invalid date format. Use YYYY-MM-DD'], 400);
    }

    $grpStmt = $pdo->prepare('SELECT id FROM `groups` WHERE id = ?');
    $grpStmt->execute([$groupId]);
    if (!$grpStmt->fetch()) {
        json_response(['success' => false, 'error' => 'Group not found'], 404);
    }

    $sessionCode = generate_hw_session_code($academicYear, $sessionDate, $groupId);
    $month = strtoupper($dateObj->format('M'));

    // Check duplicate by session_code OR (group_id, session_date)
    $dupStmt = $pdo->prepare('SELECT id FROM hw_class_sessions WHERE session_code = ? OR (group_id = ? AND session_date = ?)');
    $dupStmt->execute([$sessionCode, $groupId, $sessionDate]);
    if ($dupStmt->fetch()) {
        json_response(['success' => false, 'error' => "A session for Group $groupId on $sessionDate ($sessionCode) already exists"], 409);
    }

    global $user;
    $adminId = $user['sub'] ?? null;

    $stmt = $pdo->prepare('
        INSERT INTO hw_class_sessions (session_code, group_id, session_date, month, academic_year, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([$sessionCode, $groupId, $sessionDate, $month, $academicYear, $adminId]);
    $newId = (int)$pdo->lastInsertId();

    $studentsStmt = $pdo->prepare('SELECT id FROM students WHERE group_id = ?');
    $studentsStmt->execute([$groupId]);
    $studentIds = $studentsStmt->fetchAll(PDO::FETCH_COLUMN);

    if (!empty($studentIds)) {
        $insertStmt = $pdo->prepare('
            INSERT INTO hw_student_records (session_id, session_code, student_id) VALUES (?, ?, ?)
        ');
        foreach ($studentIds as $sid) {
            $insertStmt->execute([$newId, $sessionCode, $sid]);
        }
    }

    $auditStmt = $pdo->prepare('INSERT INTO audit_logs (admin_id, action, target_entity, target_id, description) VALUES (?, ?, ?, ?, ?)');
    $auditStmt->execute([
        $adminId,
        'CREATE',
        'homework_session',
        (string)$newId,
        "Created homework session $sessionCode ($groupId on $sessionDate)"
    ]);

    json_response(['success' => true, 'session_id' => $newId, 'session_code' => $sessionCode, 'message' => 'Session created successfully']);
}

/**
 * PUT — Save/update batch student records
 */
function saveRecords(PDO $pdo): void {
    $input = get_input();
    $sessionId = $input['session_id'] ?? null;
    $sessionCode = $input['session_code'] ?? null;
    $records = $input['records'] ?? [];

    if (empty($sessionId) && empty($sessionCode)) {
        json_response(['success' => false, 'error' => 'session_id or session_code is required'], 400);
    }

    if (!empty($sessionId)) {
        $checkStmt = $pdo->prepare('SELECT id, session_code, group_id FROM hw_class_sessions WHERE id = ?');
        $checkStmt->execute([$sessionId]);
    } else {
        $checkStmt = $pdo->prepare('SELECT id, session_code, group_id FROM hw_class_sessions WHERE session_code = ?');
        $checkStmt->execute([$sessionCode]);
    }
    $session = $checkStmt->fetch();
    if (!$session) {
        json_response(['success' => false, 'error' => 'Session not found'], 404);
    }
    $realId = $session['id'];
    $sCode = $session['session_code'];

    $validHW = ['Done', 'Not Done', 'Absent', 'N/A', null, ''];
    $validTP = ['Prepared', 'Not Prepared', 'Absent', 'N/A', null, ''];
    $validPR = ['Practiced', 'Not Practiced', 'On Leave', 'N/A', null, ''];

    $upsertStmt = $pdo->prepare('
        INSERT INTO hw_student_records (session_id, session_code, student_id, homework_status, test_prep_status, practice_status)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            session_code = VALUES(session_code),
            homework_status = VALUES(homework_status),
            test_prep_status = VALUES(test_prep_status),
            practice_status = VALUES(practice_status)
    ');

    $savedCount = 0;
    foreach ($records as $rec) {
        $studentId = $rec['student_id'] ?? '';
        if (empty($studentId)) continue;

        $hw = $rec['homework_status'] ?? null;
        $tp = $rec['test_prep_status'] ?? null;
        $pr = $rec['practice_status'] ?? null;

        if (!in_array($hw, $validHW)) $hw = null;
        if (!in_array($tp, $validTP)) $tp = null;
        if (!in_array($pr, $validPR)) $pr = null;

        if ($hw === '') $hw = null;
        if ($tp === '') $tp = null;
        if ($pr === '') $pr = null;

        $upsertStmt->execute([$realId, $sCode, $studentId, $hw, $tp, $pr]);
        $savedCount++;
    }

    global $user;
    $adminId = $user['sub'] ?? null;
    $auditStmt = $pdo->prepare('INSERT INTO audit_logs (admin_id, action, target_entity, target_id, description) VALUES (?, ?, ?, ?, ?)');
    $auditStmt->execute([
        $adminId,
        'UPDATE',
        'homework_records',
        (string)$realId,
        "Updated $savedCount homework records for session $sCode ($realId)"
    ]);

    json_response(['success' => true, 'message' => "Saved $savedCount records", 'saved_count' => $savedCount]);
}

/**
 * DELETE — Delete a session and all its records
 */
function deleteSession(PDO $pdo): void {
    $sessionId = query_param('session_id');
    $sessionCode = query_param('session_code');
    if (empty($sessionId) && empty($sessionCode)) {
        json_response(['success' => false, 'error' => 'session_id or session_code required'], 400);
    }

    if (!empty($sessionId)) {
        $checkStmt = $pdo->prepare('SELECT id, session_code, group_id, session_date FROM hw_class_sessions WHERE id = ?');
        $checkStmt->execute([$sessionId]);
    } else {
        $checkStmt = $pdo->prepare('SELECT id, session_code, group_id, session_date FROM hw_class_sessions WHERE session_code = ?');
        $checkStmt->execute([$sessionCode]);
    }
    $session = $checkStmt->fetch();
    if (!$session) {
        json_response(['success' => false, 'error' => 'Session not found'], 404);
    }
    $realId = $session['id'];

    $stmt = $pdo->prepare('DELETE FROM hw_class_sessions WHERE id = ?');
    $stmt->execute([$realId]);

    global $user;
    $adminId = $user['sub'] ?? null;
    $auditStmt = $pdo->prepare('INSERT INTO audit_logs (admin_id, action, target_entity, target_id, description) VALUES (?, ?, ?, ?, ?)');
    $auditStmt->execute([
        $adminId,
        'DELETE',
        'homework_session',
        (string)$realId,
        "Deleted homework session {$session['session_code']} ({$session['group_id']} on {$session['session_date']})"
    ]);

    json_response(['success' => true, 'message' => 'Session deleted successfully']);
}

/**
 * GET — Export monthly data as JSON
 */
function exportMonthly(PDO $pdo): void {
    $groupId = query_param('group_id');
    $month = query_param('month');
    $year = query_param('year');

    if (empty($groupId) || empty($month) || empty($year)) {
        json_response(['success' => false, 'error' => 'group_id, month, and year are required'], 400);
    }

    $grpStmt = $pdo->prepare('SELECT * FROM `groups` WHERE id = ?');
    $grpStmt->execute([$groupId]);
    $group = $grpStmt->fetch();
    if (!$group) {
        json_response(['success' => false, 'error' => 'Group not found'], 404);
    }

    $sessStmt = $pdo->prepare('
        SELECT s.*
        FROM hw_class_sessions s
        WHERE s.group_id = ? AND MONTH(s.session_date) = ? AND s.academic_year = ?
        ORDER BY s.session_date ASC
    ');
    $sessStmt->execute([$groupId, (int)$month, $year]);
    $sessions = $sessStmt->fetchAll();

    if (empty($sessions)) {
        json_response(['success' => true, 'group' => $group, 'sessions' => [], 'students' => [], 'records' => []]);
        return;
    }

    $sessionIds = array_column($sessions, 'id');

    $studentsStmt = $pdo->prepare('SELECT id, name, class, school FROM students WHERE group_id = ? ORDER BY name ASC');
    $studentsStmt->execute([$groupId]);
    $students = $studentsStmt->fetchAll();

    $placeholders = implode(',', array_fill(0, count($sessionIds), '?'));
    $recStmt = $pdo->prepare("
        SELECT r.*, st.name as student_name, st.class as student_class, st.school as student_school
        FROM hw_student_records r
        LEFT JOIN students st ON st.id = r.student_id
        WHERE r.session_id IN ($placeholders)
        ORDER BY st.name ASC, r.session_id ASC
    ");
    $recStmt->execute($sessionIds);
    $records = $recStmt->fetchAll();

    json_response([
        'success' => true,
        'group' => $group,
        'sessions' => $sessions,
        'students' => $students,
        'records' => $records,
    ]);
}
