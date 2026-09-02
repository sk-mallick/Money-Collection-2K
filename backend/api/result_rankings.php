<?php
/**
 * Report Cards — Rankings API
 * GET /api/result-rankings?period_id=X&type=class  → Class rankings
 * GET /api/result-rankings?period_id=X&type=group  → Group rankings
 */

require_once __DIR__ . '/../includes/auth.php';

cors_headers();
$user = require_auth();
$pdo = get_db();
$method = request_method();

if ($method !== 'GET') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$periodId = query_param('period_id');
$type = query_param('type', 'class', 10);
$academicYear = query_param('academic_year', '', 10);
$month = query_param('month', '', 3);

// Support filtering by academic_year + month for aggregate rankings
if (!$periodId && $academicYear && $month) {
    // Get all period IDs for this academic year + month
    $pStmt = $pdo->prepare('SELECT id FROM rc_result_periods WHERE academic_year = ? AND month = ?');
    $pStmt->execute([$academicYear, $month]);
    $periodIds = $pStmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($periodIds)) {
        json_response(['success' => true, 'rankings' => []]);
    }
    
    $placeholders = implode(',', array_fill(0, count($periodIds), '?'));
    
    if ($type === 'group') {
        $sql = "SELECT sr.*, rp.group_id, rp.academic_year, rp.month, g.class as group_class
                FROM rc_student_results sr
                JOIN rc_result_periods rp ON sr.result_period_id = rp.id
                LEFT JOIN `groups` g ON rp.group_id = g.id
                WHERE sr.result_period_id IN ($placeholders) AND sr.status = 'Present' AND sr.percentage IS NOT NULL
                ORDER BY sr.snapshot_group_id ASC, sr.percentage DESC";
    } else {
        $sql = "SELECT sr.*, rp.group_id, rp.academic_year, rp.month, g.class as group_class
                FROM rc_student_results sr
                JOIN rc_result_periods rp ON sr.result_period_id = rp.id
                LEFT JOIN `groups` g ON rp.group_id = g.id
                WHERE sr.result_period_id IN ($placeholders) AND sr.status = 'Present' AND sr.percentage IS NOT NULL
                ORDER BY sr.snapshot_class ASC, sr.percentage DESC";
    }
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($periodIds);
} else {
    if (empty($periodId)) {
        json_response(['success' => false, 'error' => 'period_id or academic_year + month required'], 400);
    }
    
    if ($type === 'group') {
        $sql = "SELECT sr.*, rp.group_id, rp.academic_year, rp.month, g.class as group_class
                FROM rc_student_results sr
                JOIN rc_result_periods rp ON sr.result_period_id = rp.id
                LEFT JOIN `groups` g ON rp.group_id = g.id
                WHERE sr.result_period_id = ? AND sr.status = 'Present' AND sr.percentage IS NOT NULL
                ORDER BY sr.group_rank ASC, sr.percentage DESC";
    } else {
        $sql = "SELECT sr.*, rp.group_id, rp.academic_year, rp.month, g.class as group_class
                FROM rc_student_results sr
                JOIN rc_result_periods rp ON sr.result_period_id = rp.id
                LEFT JOIN `groups` g ON rp.group_id = g.id
                WHERE sr.result_period_id = ? AND sr.status = 'Present' AND sr.percentage IS NOT NULL
                ORDER BY sr.class_rank ASC, sr.percentage DESC";
    }
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([(int)$periodId]);
}

$results = $stmt->fetchAll();

// Group results by class or group
$rankings = [];
foreach ($results as $r) {
    $key = $type === 'group' ? ($r['snapshot_group_id'] ?? 'Unknown') : ($r['snapshot_class'] ?: 'Unknown');
    if (!isset($rankings[$key])) {
        $rankings[$key] = [
            'key' => $key,
            'label' => $type === 'group' ? "Group $key" . ($r['group_class'] ? " ({$r['group_class']})" : '') : "Class $key",
            'students' => [],
        ];
    }
    $rankings[$key]['students'][] = [
        'studentId' => $r['student_id'],
        'name' => $r['snapshot_name'],
        'class' => $r['snapshot_class'],
        'school' => $r['snapshot_school'],
        'groupId' => $r['snapshot_group_id'],
        'totalObtained' => (float)$r['total_obtained'],
        'totalMax' => (float)$r['total_max'],
        'percentage' => (float)$r['percentage'],
        'classRank' => $r['class_rank'] !== null ? (int)$r['class_rank'] : null,
        'groupRank' => $r['group_rank'] !== null ? (int)$r['group_rank'] : null,
    ];
}

json_response(['success' => true, 'rankings' => array_values($rankings)]);
