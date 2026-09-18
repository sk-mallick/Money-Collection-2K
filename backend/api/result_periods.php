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
            getResultPeriod($pdo, $id);
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
            (SELECT COUNT(*) FROM rc_student_results sr WHERE sr.result_period_id = rp.id AND sr.status = 'Absent') as absent_count,
            (SELECT COUNT(*) FROM rc_student_results sr WHERE sr.result_period_id = rp.id AND sr.status = 'Present' AND sr.percentage IS NOT NULL) as ranked_count
            FROM rc_result_periods rp
            LEFT JOIN `groups` g ON rp.group_id = g.id
            $whereClause
            ORDER BY rp.academic_year DESC, FIELD(rp.month, 'MAR','FEB','JAN','DEC','NOV','OCT','SEP','AUG','JUL','JUN','MAY','APR') ASC, rp.group_id DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $periods = $stmt->fetchAll();
    
    json_response(['success' => true, 'periods' => $periods]);
}

function getResultPeriod(PDO $pdo, $identifier): void {
    $period = resolve_period($pdo, $identifier);
    
    if (!$period) {
        json_response(['success' => false, 'error' => 'Result period not found'], 404);
    }
    
    $id = (int)$period['id'];
    
    // Default max marks — no longer stored in a separate table
    // Return empty array for backward compatibility with frontend
    $period['default_max_marks'] = [];
    
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
    
    // Generate semantic period code
    $periodCode = generate_period_code($academicYear, $month, $groupId);
    
    // Check for duplicate by compound attributes or period code
    $check = $pdo->prepare('SELECT id FROM rc_result_periods WHERE (academic_year = ? AND month = ? AND group_id = ?) OR period_code = ?');
    $check->execute([$academicYear, $month, $groupId, $periodCode]);
    if ($check->fetch()) {
        json_response(['success' => false, 'error' => "A result period already exists for this session ($periodCode)"], 409);
    }
    
    $pdo->beginTransaction();
    try {
        global $user;
        $adminId = $user['sub'] ?? null;
        
        // Create result period with period_code
        $stmt = $pdo->prepare('INSERT INTO rc_result_periods (period_code, academic_year, month, group_id, category, created_by) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$periodCode, $academicYear, $month, $groupId, $category, $adminId]);
        $periodId = (int)$pdo->lastInsertId();
        
        // Build default max marks map from input (used directly, not stored in separate table)
        $defaultMaxMarks = [];
        if (isset($input['defaultMaxMarks']) && is_array($input['defaultMaxMarks'])) {
            foreach ($input['defaultMaxMarks'] as $mm) {
                if (isset($mm['subjectId']) && isset($mm['maxMarks']) && (int)$mm['maxMarks'] > 0) {
                    $defaultMaxMarks[(int)$mm['subjectId']] = (int)$mm['maxMarks'];
                }
            }
        }
        
        // Load students from the group
        $studentStmt = $pdo->prepare('SELECT id, name, category, class, group_id, school FROM students WHERE group_id = ? ORDER BY name ASC');
        $studentStmt->execute([$groupId]);
        $students = $studentStmt->fetchAll();
        
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
                $maxMarks = $defaultMaxMarks[$subject['id']] ?? 0;
                $smStmt->execute([$studentResultId, $subject['id'], $maxMarks]);
            }
        }
        
        // Audit log
        $auditStmt = $pdo->prepare('INSERT INTO audit_logs (admin_id, action, target_entity, target_id, description) VALUES (?, ?, ?, ?, ?)');
        $auditStmt->execute([$adminId, 'CREATE', 'rc_result_period', $periodId, "Created result period: $periodCode ($academicYear $month Group $groupId, $category) with " . count($students) . " students"]);
        
        $pdo->commit();
        json_response(['success' => true, 'id' => $periodId, 'period_code' => $periodCode, 'studentCount' => count($students)], 201);
    } catch (Exception $e) {
        $pdo->rollBack();
        write_log('error', 'Failed to create result period', ['error' => $e->getMessage()]);
        json_response(['success' => false, 'error' => 'Failed to create result period: ' . $e->getMessage()], 500);
    }
}

function updateResultPeriod(PDO $pdo): void {
    $id = query_param('id');
    if (empty($id)) {
        json_response(['success' => false, 'error' => 'Result period ID or code required'], 400);
    }
    
    // Resolve period by id or code
    $period = resolve_period($pdo, $id);
    if (!$period) {
        json_response(['success' => false, 'error' => 'Result period not found'], 404);
    }
    $realId = (int)$period['id'];
    
    $input = get_input();
    
    $fields = [];
    $values = [];
    
    if (isset($input['status'])) {
        if (!in_array($input['status'], ['Draft', 'Completed', 'Published'])) {
            json_response(['success' => false, 'error' => 'Invalid status'], 400);
        }
        $fields[] = 'status = ?';
        $values[] = $input['status'];
    }
    
    // Update default max marks: propagate to rc_student_marks directly (only allowed if not published, or if transitioning to Draft)
    if (isset($input['defaultMaxMarks']) && is_array($input['defaultMaxMarks'])) {
        $newStatus = $input['status'] ?? $period['status'];
        if ($period['status'] === 'Published' && $newStatus === 'Published') {
            json_response(['success' => false, 'error' => 'This result period is published and locked. Revert to Draft to modify maximum marks.'], 403);
        }
        
        // Get all student_result_ids for this period
        $srIdStmt = $pdo->prepare('SELECT id FROM rc_student_results WHERE result_period_id = ?');
        $srIdStmt->execute([$realId]);
        $srIds = $srIdStmt->fetchAll(PDO::FETCH_COLUMN);
        
        if (!empty($srIds)) {
            $updateMaxStmt = $pdo->prepare('UPDATE rc_student_marks SET max_marks = ? WHERE student_result_id = ? AND subject_id = ? AND is_default_max = 1');
            foreach ($input['defaultMaxMarks'] as $mm) {
                if (isset($mm['subjectId']) && isset($mm['maxMarks'])) {
                    foreach ($srIds as $srId) {
                        $updateMaxStmt->execute([(int)$mm['maxMarks'], (int)$srId, (int)$mm['subjectId']]);
                    }
                }
            }
        }
    }

    if (!empty($fields)) {
        $values[] = $realId;
        $sql = 'UPDATE rc_result_periods SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
    }
    
    // Audit log
    global $user;
    $adminId = $user['sub'] ?? null;
    $auditDesc = "Updated result period: {$period['period_code']} (ID: $realId)";
    if (isset($input['status'])) {
        if ($period['status'] === 'Published' && $input['status'] === 'Draft') {
            $auditDesc = "Reverted result period: {$period['period_code']} from Published to Draft";
        } elseif ($input['status'] === 'Published') {
            $auditDesc = "Published and finalized result period: {$period['period_code']}";
        } else {
            $auditDesc = "Changed status of result period {$period['period_code']} to {$input['status']}";
        }
    }
    $auditStmt = $pdo->prepare('INSERT INTO audit_logs (admin_id, action, target_entity, target_id, description) VALUES (?, ?, ?, ?, ?)');
    $auditStmt->execute([$adminId, 'UPDATE', 'rc_result_period', $realId, $auditDesc]);
    
    json_response(['success' => true]);
}

function deleteResultPeriod(PDO $pdo): void {
    $id = query_param('id');
    if (empty($id)) {
        json_response(['success' => false, 'error' => 'Result period ID or code required'], 400);
    }
    
    // Resolve period by id or code
    $period = resolve_period($pdo, $id);
    if (!$period) {
        json_response(['success' => false, 'error' => 'Result period not found'], 404);
    }
    if (($period['status'] ?? '') === 'Published') {
        json_response(['success' => false, 'error' => 'Published result periods cannot be deleted. Please revert to Draft first.'], 403);
    }
    $realId = (int)$period['id'];
    
    // Cascade delete (handled by FK constraints, but let's be explicit)
    $stmt = $pdo->prepare('DELETE FROM rc_result_periods WHERE id = ?');
    $stmt->execute([$realId]);
    
    // Audit log
    global $user;
    $adminId = $user['sub'] ?? null;
    $auditStmt = $pdo->prepare('INSERT INTO audit_logs (admin_id, action, target_entity, target_id, description) VALUES (?, ?, ?, ?, ?)');
    $auditStmt->execute([$adminId, 'DELETE', 'rc_result_period', $realId, "Deleted result period: {$period['period_code']} ({$period['academic_year']} {$period['month']} Group {$period['group_id']})"]);
    
    json_response(['success' => true]);
}

