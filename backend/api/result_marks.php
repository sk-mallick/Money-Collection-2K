<?php
/**
 * Report Cards — Marks API
 * GET  /api/result-marks?period_id=X          → Get all marks for a period
 * POST /api/result-marks                      → Save/update marks (batch)
 * PUT  /api/result-marks?period_id=X&action=recalculate → Recalculate totals & rankings
 */

require_once __DIR__ . '/../includes/auth.php';

cors_headers();
$user = require_auth();
$pdo = get_db();
$method = request_method();

switch ($method) {
    case 'GET':
        getMarks($pdo);
        break;
    case 'POST':
        saveMarks($pdo);
        break;
    case 'PUT':
        $action = query_param('action');
        if ($action === 'recalculate') {
            recalculate($pdo);
        } else {
            json_response(['success' => false, 'error' => 'Unknown action'], 400);
        }
        break;
    default:
        json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

function ensureIsAbsentColumn(PDO $pdo): void {
    static $checked = false;
    if ($checked) return;
    try {
        $pdo->exec("ALTER TABLE rc_student_marks ADD COLUMN IF NOT EXISTS is_absent TINYINT(1) NOT NULL DEFAULT 0");
    } catch (Exception $e) {
        // Table or column already updated
    }
    $checked = true;
}

function getMarks(PDO $pdo): void {
    ensureIsAbsentColumn($pdo);
    $periodId = query_param('period_id');
    if (empty($periodId)) {
        json_response(['success' => false, 'error' => 'period_id required'], 400);
    }
    
    $stmt = $pdo->prepare("
        SELECT sr.id as student_result_id, sr.student_id, sr.snapshot_name, sr.snapshot_class,
               sr.snapshot_group_id, sr.snapshot_school, sr.snapshot_category, sr.status,
               sr.total_obtained, sr.total_max, sr.percentage, sr.class_rank, sr.group_rank,
               sm.id as mark_id, sm.subject_id, sm.max_marks, sm.obtained_marks, sm.is_absent, sm.is_default_max,
               s.name as subject_name, s.category as subject_category, s.display_order
        FROM rc_student_results sr
        LEFT JOIN rc_student_marks sm ON sm.student_result_id = sr.id
        LEFT JOIN rc_subjects s ON sm.subject_id = s.id
        WHERE sr.result_period_id = ?
        ORDER BY sr.snapshot_name ASC, s.display_order ASC
    ");
    $stmt->execute([(int)$periodId]);
    $rows = $stmt->fetchAll();
    
    // Group by student
    $students = [];
    foreach ($rows as $row) {
        $srId = $row['student_result_id'];
        if (!isset($students[$srId])) {
            $students[$srId] = [
                'studentResultId' => (int)$row['student_result_id'],
                'studentId' => $row['student_id'],
                'name' => $row['snapshot_name'],
                'class' => $row['snapshot_class'],
                'groupId' => $row['snapshot_group_id'],
                'school' => $row['snapshot_school'],
                'category' => $row['snapshot_category'],
                'status' => $row['status'],
                'totalObtained' => $row['total_obtained'] !== null ? (float)$row['total_obtained'] : null,
                'totalMax' => $row['total_max'] !== null ? (float)$row['total_max'] : null,
                'percentage' => $row['percentage'] !== null ? (float)$row['percentage'] : null,
                'classRank' => $row['class_rank'] !== null ? (int)$row['class_rank'] : null,
                'groupRank' => $row['group_rank'] !== null ? (int)$row['group_rank'] : null,
                'marks' => [],
            ];
        }
        if ($row['mark_id']) {
            $students[$srId]['marks'][] = [
                'markId' => (int)$row['mark_id'],
                'subjectId' => (int)$row['subject_id'],
                'subjectName' => $row['subject_name'],
                'subjectCategory' => $row['subject_category'],
                'maxMarks' => (int)$row['max_marks'],
                'obtainedMarks' => $row['obtained_marks'] !== null ? (float)$row['obtained_marks'] : null,
                'isAbsent' => (bool)($row['is_absent'] ?? 0),
                'isDefaultMax' => (bool)$row['is_default_max'],
                'displayOrder' => (int)$row['display_order'],
            ];
        }
    }
    
    json_response(['success' => true, 'students' => array_values($students)]);
}

function saveMarks(PDO $pdo): void {
    ensureIsAbsentColumn($pdo);
    $input = get_input();
    
    if (!isset($input['periodId'])) {
        json_response(['success' => false, 'error' => 'periodId required'], 400);
    }
    if (!isset($input['students']) || !is_array($input['students'])) {
        json_response(['success' => false, 'error' => 'students array required'], 400);
    }
    
    $periodId = (int)$input['periodId'];
    
    // Verify period exists
    $check = $pdo->prepare('SELECT id, status FROM rc_result_periods WHERE id = ?');
    $check->execute([$periodId]);
    $period = $check->fetch();
    if (!$period) {
        json_response(['success' => false, 'error' => 'Result period not found'], 404);
    }
    
    $pdo->beginTransaction();
    try {
        $updateStatusStmt = $pdo->prepare('UPDATE rc_student_results SET status = ? WHERE id = ?');
        $updateMarksStmt = $pdo->prepare('UPDATE rc_student_marks SET obtained_marks = ?, max_marks = ?, is_default_max = ?, is_absent = ? WHERE id = ?');
        
        $errors = [];
        
        foreach ($input['students'] as $studentData) {
            $srId = (int)($studentData['studentResultId'] ?? 0);
            if ($srId <= 0) continue;
            
            // Update marks
            if (isset($studentData['marks']) && is_array($studentData['marks'])) {
                foreach ($studentData['marks'] as $markData) {
                    $markId = (int)($markData['markId'] ?? 0);
                    if ($markId <= 0) continue;
                    
                    $maxMarks = (int)($markData['maxMarks'] ?? 0);
                    $isAbsent = !empty($markData['isAbsent']) ? 1 : 0;
                    
                    if ($isAbsent === 1) {
                        $obtainedMarks = null;
                    } else {
                        $obtainedMarks = isset($markData['obtainedMarks']) && $markData['obtainedMarks'] !== null && $markData['obtainedMarks'] !== '' 
                            ? (float)$markData['obtainedMarks'] 
                            : null;
                    }
                    
                    $isDefaultMax = isset($markData['isDefaultMax']) ? ($markData['isDefaultMax'] ? 1 : 0) : 1;
                    
                    // Validate
                    if ($maxMarks <= 0) {
                        $errors[] = "Maximum marks must be greater than 0 for mark ID $markId";
                        continue;
                    }
                    if (!$isAbsent && $obtainedMarks !== null && $obtainedMarks < 0) {
                        $errors[] = "Negative marks are not allowed for mark ID $markId";
                        continue;
                    }
                    if (!$isAbsent && $obtainedMarks !== null && $obtainedMarks > $maxMarks) {
                        $errors[] = "Obtained marks ($obtainedMarks) exceed maximum ($maxMarks) for mark ID $markId";
                        continue;
                    }
                    
                    $updateMarksStmt->execute([$obtainedMarks, $maxMarks, $isDefaultMax, $isAbsent, $markId]);
                }
            }
            
            // If explicit student status provided, we update it; recalculation will refine it automatically
            if (isset($studentData['status'])) {
                $status = in_array($studentData['status'], ['Present', 'Absent', 'Incomplete']) ? $studentData['status'] : 'Present';
                $updateStatusStmt->execute([$status, $srId]);
            }
        }
        
        if (!empty($errors)) {
            $pdo->rollBack();
            json_response(['success' => false, 'error' => 'Validation errors', 'errors' => $errors], 400);
        }
        
        // Recalculate totals, percentages, and status
        recalculateForPeriod($pdo, $periodId);
        
        // Audit log
        global $user;
        $adminId = $user['sub'] ?? null;
        $auditStmt = $pdo->prepare('INSERT INTO audit_logs (admin_id, action, target_entity, target_id, description) VALUES (?, ?, ?, ?, ?)');
        $auditStmt->execute([$adminId, 'UPDATE', 'rc_marks', $periodId, "Updated marks for period ID: $periodId (" . count($input['students']) . " students)"]);
        
        $pdo->commit();
        json_response(['success' => true]);
    } catch (Exception $e) {
        $pdo->rollBack();
        write_log('error', 'Failed to save marks', ['error' => $e->getMessage()]);
        json_response(['success' => false, 'error' => 'Failed to save marks: ' . $e->getMessage()], 500);
    }
}

function recalculate(PDO $pdo): void {
    ensureIsAbsentColumn($pdo);
    $periodId = query_param('period_id');
    if (empty($periodId)) {
        json_response(['success' => false, 'error' => 'period_id required'], 400);
    }
    
    $pdo->beginTransaction();
    try {
        recalculateForPeriod($pdo, (int)$periodId);
        $pdo->commit();
        json_response(['success' => true]);
    } catch (Exception $e) {
        $pdo->rollBack();
        json_response(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

/**
 * Recalculate totals, percentages, statuses, and rankings for a result period
 */
function recalculateForPeriod(PDO $pdo, int $periodId): void {
    ensureIsAbsentColumn($pdo);
    // 1. Calculate totals, percentages, and statuses for each student
    $srStmt = $pdo->prepare('SELECT id, status, snapshot_class, snapshot_group_id FROM rc_student_results WHERE result_period_id = ?');
    $srStmt->execute([$periodId]);
    $studentResults = $srStmt->fetchAll();
    
    $updateSrStmt = $pdo->prepare('UPDATE rc_student_results SET total_obtained = ?, total_max = ?, percentage = ?, status = ? WHERE id = ?');
    
    $presentStudents = []; // For ranking
    
    foreach ($studentResults as $sr) {
        // Query all subject marks for this student
        $marksStmt = $pdo->prepare('SELECT id, max_marks, obtained_marks, is_absent FROM rc_student_marks WHERE student_result_id = ?');
        $marksStmt->execute([$sr['id']]);
        $marks = $marksStmt->fetchAll();
        
        $totalSubjects = count($marks);
        if ($totalSubjects === 0) {
            $updateSrStmt->execute([null, null, null, 'Incomplete', $sr['id']]);
            continue;
        }
        
        $absentCount = 0;
        $enteredCount = 0;
        $totalObtained = 0.0;
        $totalMax = 0.0;
        
        foreach ($marks as $m) {
            $mMax = (float)$m['max_marks'];
            $totalMax += $mMax;
            
            if (!empty($m['is_absent'])) {
                $absentCount++;
                $enteredCount++;
            } elseif ($m['obtained_marks'] !== null && $m['obtained_marks'] !== '') {
                $enteredCount++;
                $totalObtained += (float)$m['obtained_marks'];
            }
        }
        
        if ($enteredCount === 0) {
            // Nothing entered yet
            $updateSrStmt->execute([null, null, null, 'Incomplete', $sr['id']]);
        } elseif ($absentCount === $totalSubjects) {
            // Student is absent for ALL subjects
            $updateSrStmt->execute([null, null, null, 'Absent', $sr['id']]);
        } else {
            // Student attended at least one subject
            $status = ($enteredCount === $totalSubjects) ? 'Present' : 'Incomplete';
            $percentage = $totalMax > 0 ? round(($totalObtained / $totalMax) * 100, 2) : 0;
            
            $updateSrStmt->execute([$totalObtained, $totalMax, $percentage, $status, $sr['id']]);
            
            if ($status === 'Present') {
                $presentStudents[] = [
                    'id' => $sr['id'],
                    'percentage' => $percentage,
                    'class' => $sr['snapshot_class'],
                    'groupId' => $sr['snapshot_group_id'],
                ];
            }
        }
    }
    
    // 2. Calculate class rankings (by snapshot_class)
    $classBuckets = [];
    foreach ($presentStudents as $s) {
        $classBuckets[$s['class']][] = $s;
    }
    
    $updateRankStmt = $pdo->prepare('UPDATE rc_student_results SET class_rank = ?, group_rank = ? WHERE id = ?');
    
    // Reset ranks for absent or non-ranked students
    $resetStmt = $pdo->prepare("UPDATE rc_student_results SET class_rank = NULL, group_rank = NULL WHERE result_period_id = ? AND (status != 'Present' OR total_obtained IS NULL)");
    $resetStmt->execute([$periodId]);
    
    foreach ($classBuckets as &$bucket) {
        usort($bucket, fn($a, $b) => $b['percentage'] <=> $a['percentage']);
        $rank = 1;
        for ($i = 0; $i < count($bucket); $i++) {
            if ($i > 0 && $bucket[$i]['percentage'] < $bucket[$i - 1]['percentage']) {
                $rank = $i + 1; // Competition ranking
            }
            $bucket[$i]['classRank'] = $rank;
        }
    }
    unset($bucket);
    
    // 3. Calculate group rankings (by snapshot_group_id)
    $groupBuckets = [];
    foreach ($presentStudents as $s) {
        $groupBuckets[$s['groupId']][] = $s;
    }
    
    foreach ($groupBuckets as &$bucket) {
        usort($bucket, fn($a, $b) => $b['percentage'] <=> $a['percentage']);
        $rank = 1;
        for ($i = 0; $i < count($bucket); $i++) {
            if ($i > 0 && $bucket[$i]['percentage'] < $bucket[$i - 1]['percentage']) {
                $rank = $i + 1;
            }
            $bucket[$i]['groupRank'] = $rank;
        }
    }
    unset($bucket);
    
    // 4. Apply rankings
    $classRankMap = [];
    foreach ($classBuckets as $bucket) {
        foreach ($bucket as $s) {
            $classRankMap[$s['id']] = $s['classRank'];
        }
    }
    
    $groupRankMap = [];
    foreach ($groupBuckets as $bucket) {
        foreach ($bucket as $s) {
            $groupRankMap[$s['id']] = $s['groupRank'];
        }
    }
    
    foreach ($presentStudents as $s) {
        $classRank = $classRankMap[$s['id']] ?? null;
        $groupRank = $groupRankMap[$s['id']] ?? null;
        $updateRankStmt->execute([$classRank, $groupRank, $s['id']]);
    }
}
