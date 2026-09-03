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

function normalizeRankClass(?string $cls): string {
    if (!$cls) return 'General';
    $raw = trim($cls);
    if (preg_match('/^(\d+)/', $raw, $m)) {
        $n = (int)$m[1];
        if ($n === 1) return '1st';
        if ($n === 2) return '2nd';
        if ($n === 3) return '3rd';
        return $n . 'th';
    }
    return $raw;
}

$results = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Group results by class or group
$rankings = [];
foreach ($results as $r) {
    $normalizedClass = normalizeRankClass($r['snapshot_class']);
    $key = $type === 'group' ? ($r['snapshot_group_id'] ?? 'Unknown') : $normalizedClass;
    if (!isset($rankings[$key])) {
        $rankings[$key] = [
            'key' => $key,
            'label' => $type === 'group' ? "Group $key" . ($r['group_class'] ? " ({$r['group_class']})" : '') : "Class $key",
            'type' => $type,
            'students' => [],
        ];
    }
    $rankings[$key]['students'][] = [
        'studentId' => $r['student_id'],
        'name' => $r['snapshot_name'],
        'class' => $normalizedClass,
        'school' => $r['snapshot_school'],
        'groupId' => $r['snapshot_group_id'],
        'totalObtained' => (float)$r['total_obtained'],
        'totalMax' => (float)$r['total_max'],
        'percentage' => (float)$r['percentage'],
        'classRank' => $r['class_rank'] !== null ? (int)$r['class_rank'] : null,
        'groupRank' => $r['group_rank'] !== null ? (int)$r['group_rank'] : null,
    ];
}

// Calculate true distinct sequential ranking (1, 2, 3, 4, 5...) per bucket
foreach ($rankings as &$bucket) {
    usort($bucket['students'], function ($a, $b) {
        if ($b['percentage'] != $a['percentage']) {
            return $b['percentage'] <=> $a['percentage'];
        }
        if ($b['totalObtained'] != $a['totalObtained']) {
            return $b['totalObtained'] <=> $a['totalObtained'];
        }
        return strcmp($a['name'], $b['name']);
    });
    for ($i = 0; $i < count($bucket['students']); $i++) {
        $rank = $i + 1; // 1, 2, 3, 4, 5...
        if ($type === 'group') {
            $bucket['students'][$i]['groupRank'] = $rank;
        } else {
            $bucket['students'][$i]['classRank'] = $rank;
        }
        $bucket['students'][$i]['displayRank'] = $rank;
    }
}
unset($bucket);

// Sort buckets in logical order
$rankingList = array_values($rankings);
if ($type === 'group') {
    usort($rankingList, fn($a, $b) => strcmp($a['key'], $b['key']));
} else {
    // Sort classes numerically (e.g. 4th, 5th, 6th...)
    usort($rankingList, function($a, $b) {
        $numA = (int)preg_replace('/[^0-9]/', '', $a['key']);
        $numB = (int)preg_replace('/[^0-9]/', '', $b['key']);
        if ($numA !== $numB && $numA > 0 && $numB > 0) {
            return $numA <=> $numB;
        }
        return strcmp($a['key'], $b['key']);
    });
}

json_response(['success' => true, 'rankings' => $rankingList]);
