<?php
/**
 * Report Cards — Blank Marks Sheet API
 * GET /api/result-blank-sheet?group_id=X&category=Y → Generate blank sheet data
 */

require_once __DIR__ . '/../includes/auth.php';

cors_headers();
$user = require_auth();
$pdo = get_db();
$method = request_method();

if ($method !== 'GET') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$groupId = query_param('group_id', '', 10);
$category = query_param('category', '', 10);

if (empty($groupId)) {
    json_response(['success' => false, 'error' => 'group_id required'], 400);
}

// Determine category from group if not provided
if (empty($category) || !in_array($category, ['Junior', 'Senior'])) {
    $groupStmt = $pdo->prepare('SELECT category FROM `groups` WHERE id = ?');
    $groupStmt->execute([$groupId]);
    $group = $groupStmt->fetch();
    $category = $group ? $group['category'] : 'Senior';
}

// Get students in the group
$studentStmt = $pdo->prepare('SELECT id, name, class, school FROM students WHERE group_id = ? AND deleted_at IS NULL ORDER BY name ASC');
$studentStmt->execute([$groupId]);
$students = $studentStmt->fetchAll();

// Get applicable subjects
$subjectStmt = $pdo->prepare("SELECT id, name, display_order FROM rc_subjects WHERE (category = ? OR category = 'Both') AND is_active = 1 ORDER BY display_order ASC");
$subjectStmt->execute([$category]);
$subjects = $subjectStmt->fetchAll();

// Get group info
$groupInfoStmt = $pdo->prepare('SELECT id, class, timing, category FROM `groups` WHERE id = ?');
$groupInfoStmt->execute([$groupId]);
$groupInfo = $groupInfoStmt->fetch();

// Get settings for header
$settingsStmt = $pdo->query("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('instituteName', 'address', 'phone1', 'adminName', 'academicYear')");
$settingsRows = $settingsStmt->fetchAll();
$settings = [];
foreach ($settingsRows as $row) {
    $settings[$row['setting_key']] = $row['setting_value'];
}

json_response([
    'success' => true,
    'students' => $students,
    'subjects' => $subjects,
    'group' => $groupInfo,
    'settings' => $settings,
]);
