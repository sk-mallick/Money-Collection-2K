<?php
/**
 * MCMS — Groups API
 * GET    /api/groups         → List all groups
 * POST   /api/groups         → Create group
 * PUT    /api/groups?id=X    → Update group
 * DELETE /api/groups?id=X    → Delete group
 */

require_once __DIR__ . '/../includes/auth.php';

cors_headers();
$user = require_auth();
$pdo = get_db();
$method = request_method();

switch ($method) {
    case 'GET':
        getGroups($pdo);
        break;
    case 'POST':
        createGroup($pdo);
        break;
    case 'PUT':
        updateGroup($pdo);
        break;
    case 'DELETE':
        deleteGroup($pdo);
        break;
    default:
        json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

function getGroups(PDO $pdo): void {
    $stmt = $pdo->query('SELECT * FROM `groups` ORDER BY id ASC');
    $groups = $stmt->fetchAll();
    json_response(['success' => true, 'groups' => $groups]);
}

function createGroup(PDO $pdo): void {
    $input = get_input();
    $missing = validate_required($input, ['id', 'class', 'category']);

    if (!empty($missing)) {
        json_response(['success' => false, 'error' => 'Missing required fields: ' . implode(', ', $missing)], 400);
    }

    $id = strtoupper(sanitize_string($input['id'], 10));

    // Check unique ID
    $check = $pdo->prepare('SELECT id FROM `groups` WHERE id = ?');
    $check->execute([$id]);
    if ($check->fetch()) {
        json_response(['success' => false, 'error' => 'Group ID already exists'], 409);
    }

    $stmt = $pdo->prepare('
        INSERT INTO `groups` (id, class, timing, category)
        VALUES (?, ?, ?, ?)
    ');

    $stmt->execute([
        $id,
        sanitize_string($input['class'], 100),
        sanitize_string($input['timing'] ?? '', 100),
        in_array($input['category'], ['Junior', 'Senior']) ? $input['category'] : 'Junior'
    ]);

    // Add entry to audit_logs
    global $user;
    $adminId = $user['sub'] ?? null;
    $auditStmt = $pdo->prepare('INSERT INTO audit_logs (admin_id, action, target_entity, target_id, description) VALUES (?, ?, ?, ?, ?)');
    $auditStmt->execute([
        $adminId,
        'CREATE',
        'group',
        $id,
        "Created group: $id (" . sanitize_string($input['class'], 100) . ")"
    ]);

    json_response(['success' => true, 'message' => 'Group created successfully']);
}

function updateGroup(PDO $pdo): void {
    $id = query_param('id');
    if (empty($id)) {
        json_response(['success' => false, 'error' => 'Group ID required'], 400);
    }
    
    $id = strtoupper(sanitize_string($id, 10));
    
    $input = get_input();
    $missing = validate_required($input, ['class', 'category']);

    if (!empty($missing)) {
        json_response(['success' => false, 'error' => 'Missing required fields: ' . implode(', ', $missing)], 400);
    }

    $stmt = $pdo->prepare('
        UPDATE `groups`
        SET class = ?, timing = ?, category = ?
        WHERE id = ?
    ');

    $stmt->execute([
        sanitize_string($input['class'], 100),
        sanitize_string($input['timing'] ?? '', 100),
        in_array($input['category'], ['Junior', 'Senior']) ? $input['category'] : 'Junior',
        $id
    ]);

    // Add entry to audit_logs
    global $user;
    $adminId = $user['sub'] ?? null;
    $auditStmt = $pdo->prepare('INSERT INTO audit_logs (admin_id, action, target_entity, target_id, description) VALUES (?, ?, ?, ?, ?)');
    $auditStmt->execute([
        $adminId,
        'UPDATE',
        'group',
        $id,
        "Updated group: $id (" . sanitize_string($input['class'], 100) . ")"
    ]);

    json_response(['success' => true, 'message' => 'Group updated successfully']);
}

function deleteGroup(PDO $pdo): void {
    $id = query_param('id');
    if (empty($id)) {
        json_response(['success' => false, 'error' => 'Group ID required'], 400);
    }
    
    $id = strtoupper(sanitize_string($id, 10));

    // First check if any non-deleted student is assigned to this group
    $check = $pdo->prepare('SELECT COUNT(*) FROM students WHERE group_id = ? AND deleted_at IS NULL');
    $check->execute([$id]);
    $count = (int)$check->fetchColumn();

    if ($count > 0) {
        json_response(['success' => false, 'error' => 'Cannot delete group. Students are currently assigned to it.'], 400);
    }

    $stmt = $pdo->prepare('DELETE FROM `groups` WHERE id = ?');
    $stmt->execute([$id]);

    // Add entry to audit_logs
    global $user;
    $adminId = $user['sub'] ?? null;
    $auditStmt = $pdo->prepare('INSERT INTO audit_logs (admin_id, action, target_entity, target_id, description) VALUES (?, ?, ?, ?, ?)');
    $auditStmt->execute([
        $adminId,
        'DELETE',
        'group',
        $id,
        "Deleted group: $id"
    ]);

    json_response(['success' => true, 'message' => 'Group deleted successfully']);
}

