<?php
/**
 * Report Cards — Result Periods API
 * GET    /api/result-periods              → List all result periods
 * GET    /api/result-periods?id=X         → Get single result period
 * POST   /api/result-periods              → Create result period + load students
 * PUT    /api/result-periods?id=X         → Update result period
 * DELETE /api/result-periods?id=X         → Delete result period
 */

require_once __DIR__ . '/../includes/auth.php';

cors_headers();
$user = require_auth();
$pdo = get_db();
$method = request_method();

switch ($method) {
    case 'GET':
        $id = query_param('id');
        if ($id) {
            getResultPeriod($pdo, (int)$id);
        } else {
            listResultPeriods($pdo);
        }
        break;
    case 'POST':
        createResultPeriod($pdo);
        break;
    case 'PUT':
        updateResultPeriod($pdo);
        break;
    case 'DELETE':
        deleteResultPeriod($pdo);
        break;
    default:
        json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

function listResultPeriods(PDO $pdo): void {
    $academicYear = query_param('academic_year', '', 10);
    $month = query_param('month', '', 3);
    $groupId = query_param('group_id', '', 10);
    $status = query_param('status', '', 20);
    
    $where = [];
    $params = [];
    
    if ($academicYear) {
        $where[] = 'rp.academic_year = ?';
        $params[] = $academicYear;
    }
    if ($month) {
        $where[] = 'rp.month = ?';
        $params[] = $month;
    }
    if ($groupId) {
        $where[] = 'rp.group_id = ?';
        $params[] = $groupId;
    }
    if ($status && in_array($status, ['Draft', 'Completed', 'Published'])) {
        $where[] = 'rp.status = ?';
        $params[] = $status;
    }
    
    $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
    
    $sql = "SELECT rp.*, g.class as group_class, g.timing as group_timing,
            (SELECT COUNT(*) FROM rc_student_results sr WHERE sr.result_period_id = rp.id) as student_count,
            (SELECT COUNT(*) FROM rc_student_results sr WHERE sr.result_period_id = rp.id AND sr.status = 'Absent') as absent_count
            FROM rc_result_periods rp
            LEFT JOIN `groups` g ON rp.group_id = g.id
            $whereClause
            ORDER BY rp.academic_year DESC, FIELD(rp.month, 'MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC','JAN','FEB') ASC, rp.group_id ASC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $periods = $stmt->fetchAll();
    
    json_response(['success' => true, 'periods' => $periods]);
}

function getResultPeriod(PDO $pdo, int $id): void {
    $stmt = $pdo->prepare("SELECT rp.*, g.class as group_class, g.timing as group_timing
                           FROM rc_result_periods rp 
                           LEFT JOIN `groups` g ON rp.group_id = g.id 
                           WHERE rp.id = ?");
    $stmt->execute([$id]);
    $period = $stmt->fetch();
    
    if (!$period) {
        json_response(['success' => false, 'error' => 'Result period not found'], 404);
    }
    
    // Get default max marks
    $maxStmt = $pdo->prepare("SELECT dmm.*, s.name as subject_name, s.category as subject_category
                               FROM rc_default_max_marks dmm
                               JOIN rc_subjects s ON dmm.subject_id = s.id
                               WHERE dmm.result_period_id = ?
                               ORDER BY s.display_order ASC");
    $maxStmt->execute([$id]);
    $period['default_max_marks'] = $maxStmt->fetchAll();
    
    // Get student results
    $srStmt = $pdo->prepare("SELECT sr.* FROM rc_student_results sr WHERE sr.result_period_id = ? ORDER BY sr.snapshot_name ASC");
    $srStmt->execute([$id]);
    $studentResults = $srStmt->fetchAll();
    
    // Get marks for each student result
    foreach ($studentResults as &$sr) {
        $marksStmt = $pdo->prepare("SELECT sm.*, s.name as subject_name, s.category as subject_category
                                     FROM rc_student_marks sm
                                     JOIN rc_subjects s ON sm.subject_id = s.id
                                     WHERE sm.student_result_id = ?
                                     ORDER BY s.display_order ASC");
        $marksStmt->execute([$sr['id']]);
        $sr['marks'] = $marksStmt->fetchAll();
    }
    unset($sr);
    
    $period['student_results'] = $studentResults;
    
    json_response(['success' => true, 'period' => $period]);
}

function createResultPeriod(PDO $pdo): void {
    $input = get_input();
    $missing = validate_required($input, ['academicYear', 'month', 'groupId', 'category']);
    
    if (!empty($missing)) {
        json_response(['success' => false, 'error' => 'Missing required fields: ' . implode(', ', $missing)], 400);
    }
    
    $academicYear = sanitize_string($input['academicYear'], 10);
    $month = strtoupper(sanitize_string($input['month'], 3));
    $groupId = sanitize_string($input['groupId'], 10);
    $category = in_array($input['category'], ['Junior', 'Senior']) ? $input['category'] : 'Junior';
    
    // Validate month
    $validMonths = ['MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC','JAN','FEB'];
    if (!in_array($month, $validMonths)) {
        json_response(['success' => false, 'error' => 'Invalid month code'], 400);
    }
    
    // Check for duplicate
    $check = $pdo->prepare('SELECT id FROM rc_result_periods WHERE academic_year = ? AND month = ? AND group_id = ?');
    $check->execute([$academicYear, $month, $groupId]);
    if ($check->fetch()) {
        json_response(['success' => false, 'error' => 'A result period already exists for this academic year, month, and group'], 409);
    }
    
    $pdo->beginTransaction();
    try {
        global $user;
        $adminId = $user['sub'] ?? null;
        
        // Create result period
        $stmt = $pdo->prepare('INSERT INTO rc_result_periods (academic_year, month, group_id, category, created_by) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$academicYear, $month, $groupId, $category, $adminId]);
        $periodId = (int)$pdo->lastInsertId();
        
        // Insert default max marks
        if (isset($input['defaultMaxMarks']) && is_array($input['defaultMaxMarks'])) {
            $maxStmt = $pdo->prepare('INSERT INTO rc_default_max_marks (result_period_id, subject_id, max_marks) VALUES (?, ?, ?)');
            foreach ($input['defaultMaxMarks'] as $mm) {
                if (isset($mm['subjectId']) && isset($mm['maxMarks']) && (int)$mm['maxMarks'] > 0) {
                    $maxStmt->execute([$periodId, (int)$mm['subjectId'], (int)$mm['maxMarks']]);
                }
            }
        }
        
        // Load students from the group
        $studentStmt = $pdo->prepare('SELECT id, name, category, class, group_id, school FROM students WHERE group_id = ? AND deleted_at IS NULL ORDER BY name ASC');
        $studentStmt->execute([$groupId]);
        $students = $studentStmt->fetchAll();
        
        // Get default max marks for creating student marks
        $defaultMaxMarks = [];
        $dmmStmt = $pdo->prepare('SELECT subject_id, max_marks FROM rc_default_max_marks WHERE result_period_id = ?');
        $dmmStmt->execute([$periodId]);
        while ($row = $dmmStmt->fetch()) {
            $defaultMaxMarks[$row['subject_id']] = (int)$row['max_marks'];
        }
        
        // Get applicable subjects for this category
        $subjectStmt = $pdo->prepare("SELECT id FROM rc_subjects WHERE (category = ? OR category = 'Both') AND is_active = 1 ORDER BY display_order ASC");
        $subjectStmt->execute([$category]);
        $subjects = $subjectStmt->fetchAll();
        
        // Create student results and marks
        $srStmt = $pdo->prepare('INSERT INTO rc_student_results (result_period_id, student_id, snapshot_name, snapshot_class, snapshot_group_id, snapshot_school, snapshot_category) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $smStmt = $pdo->prepare('INSERT INTO rc_student_marks (student_result_id, subject_id, max_marks, is_default_max) VALUES (?, ?, ?, 1)');
        
        foreach ($students as $student) {
            $srStmt->execute([
                $periodId,
                $student['id'],
                $student['name'],
                $student['class'],
                $student['group_id'],
                $student['school'],
                $student['category']
            ]);
            $studentResultId = (int)$pdo->lastInsertId();
            
            foreach ($subjects as $subject) {
                $maxMarks = $defaultMaxMarks[$subject['id']] ?? 20;
                $smStmt->execute([$studentResultId, $subject['id'], $maxMarks]);
            }
        }
        
        // Audit log
        $auditStmt = $pdo->prepare('INSERT INTO audit_logs (admin_id, action, target_entity, target_id, description) VALUES (?, ?, ?, ?, ?)');
        $auditStmt->execute([$adminId, 'CREATE', 'rc_result_period', $periodId, "Created result period: $academicYear $month Group $groupId ($category) with " . count($students) . " students"]);
        
        $pdo->commit();
        json_response(['success' => true, 'id' => $periodId, 'studentCount' => count($students)], 201);
    } catch (Exception $e) {
        $pdo->rollBack();
        write_log('error', 'Failed to create result period', ['error' => $e->getMessage()]);
        json_response(['success' => false, 'error' => 'Failed to create result period: ' . $e->getMessage()], 500);
    }
}

function updateResultPeriod(PDO $pdo): void {
    $id = query_param('id');
    if (empty($id)) {
        json_response(['success' => false, 'error' => 'Result period ID required'], 400);
    }
    $id = (int)$id;
    
    $input = get_input();
    
    // Check if period exists
    $check = $pdo->prepare('SELECT status FROM rc_result_periods WHERE id = ?');
    $check->execute([$id]);
    $existing = $check->fetch();
    if (!$existing) {
        json_response(['success' => false, 'error' => 'Result period not found'], 404);
    }
    
    $fields = [];
    $values = [];
    
    if (isset($input['status'])) {
        if (!in_array($input['status'], ['Draft', 'Completed', 'Published'])) {
            json_response(['success' => false, 'error' => 'Invalid status'], 400);
        }
        $fields[] = 'status = ?';
        $values[] = $input['status'];
    }
    
    if (!empty($fields)) {
        $values[] = $id;
        $sql = 'UPDATE rc_result_periods SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
    }
    
    // Update default max marks if provided
    if (isset($input['defaultMaxMarks']) && is_array($input['defaultMaxMarks'])) {
        foreach ($input['defaultMaxMarks'] as $mm) {
            if (isset($mm['subjectId']) && isset($mm['maxMarks'])) {
                $upsertStmt = $pdo->prepare('INSERT INTO rc_default_max_marks (result_period_id, subject_id, max_marks) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE max_marks = VALUES(max_marks)');
                $upsertStmt->execute([$id, (int)$mm['subjectId'], (int)$mm['maxMarks']]);
            }
        }
    }
    
    // Audit log
    global $user;
    $adminId = $user['sub'] ?? null;
    $auditStmt = $pdo->prepare('INSERT INTO audit_logs (admin_id, action, target_entity, target_id, description) VALUES (?, ?, ?, ?, ?)');
    $auditStmt->execute([$adminId, 'UPDATE', 'rc_result_period', $id, "Updated result period ID: $id"]);
    
    json_response(['success' => true]);
}

function deleteResultPeriod(PDO $pdo): void {
    $id = query_param('id');
    if (empty($id)) {
        json_response(['success' => false, 'error' => 'Result period ID required'], 400);
    }
    $id = (int)$id;
    
    // Check exists
    $check = $pdo->prepare('SELECT id, academic_year, month, group_id FROM rc_result_periods WHERE id = ?');
    $check->execute([$id]);
    $period = $check->fetch();
    if (!$period) {
        json_response(['success' => false, 'error' => 'Result period not found'], 404);
    }
    
    // Cascade delete (handled by FK constraints, but let's be explicit)
    $stmt = $pdo->prepare('DELETE FROM rc_result_periods WHERE id = ?');
    $stmt->execute([$id]);
    
    // Audit log
    global $user;
    $adminId = $user['sub'] ?? null;
    $auditStmt = $pdo->prepare('INSERT INTO audit_logs (admin_id, action, target_entity, target_id, description) VALUES (?, ?, ?, ?, ?)');
    $auditStmt->execute([$adminId, 'DELETE', 'rc_result_period', $id, "Deleted result period: {$period['academic_year']} {$period['month']} Group {$period['group_id']}"]);
    
    json_response(['success' => true]);
}
