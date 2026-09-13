<?php
/**
 * Report Cards — Subjects API
 * GET    /api/result-subjects         → List all subjects
 * POST   /api/result-subjects         → Create subject
 * PUT    /api/result-subjects?id=X    → Update subject
 * DELETE /api/result-subjects?id=X    → Deactivate subject
 */

require_once __DIR__ . '/../includes/auth.php';

cors_headers();
$user = require_auth();
$pdo = get_db();
$method = request_method();

switch ($method) {
    case 'GET':
        getSubjects($pdo);
        break;
    case 'POST':
        createSubject($pdo);
        break;
    case 'PUT':
        updateSubject($pdo);
        break;
    case 'DELETE':
        deleteSubject($pdo);
        break;
    default:
        json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

function getSubjects(PDO $pdo): void {
    $category = query_param('category', '', 10);
    
    if ($category && in_array($category, ['Junior', 'Senior'])) {
        $stmt = $pdo->prepare("SELECT * FROM rc_subjects WHERE (category = ? OR category = 'Both') AND is_active = 1 ORDER BY display_order ASC");
        $stmt->execute([$category]);
    } else {
        $stmt = $pdo->query('SELECT * FROM rc_subjects ORDER BY display_order ASC');
    }
    
    $subjects = $stmt->fetchAll();
    json_response(['success' => true, 'subjects' => $subjects]);
}

function createSubject(PDO $pdo): void {
    $input = get_input();
    $missing = validate_required($input, ['name', 'category']);
    
    if (!empty($missing)) {
        json_response(['success' => false, 'error' => 'Missing required fields: ' . implode(', ', $missing)], 400);
    }
    
    $name = sanitize_string($input['name'], 50);
    $category = in_array($input['category'], ['Junior', 'Senior', 'Both']) ? $input['category'] : 'Both';
    $displayOrder = isset($input['displayOrder']) ? (int)$input['displayOrder'] : 0;
    
    // Check for duplicates
    $check = $pdo->prepare('SELECT id FROM rc_subjects WHERE name = ? AND category = ?');
    $check->execute([$name, $category]);
    if ($check->fetch()) {
        json_response(['success' => false, 'error' => 'Subject already exists for this category'], 409);
    }
    
    $stmt = $pdo->prepare('INSERT INTO rc_subjects (name, category, display_order) VALUES (?, ?, ?)');
    $stmt->execute([$name, $category, $displayOrder]);
    
    $id = $pdo->lastInsertId();
    
    // Audit log
    global $user;
    $adminId = $user['sub'] ?? null;
    $auditStmt = $pdo->prepare('INSERT INTO audit_logs (admin_id, action, target_entity, target_id, description) VALUES (?, ?, ?, ?, ?)');
    $auditStmt->execute([$adminId, 'CREATE', 'rc_subject', $id, "Created subject: $name ($category)"]);
    
    json_response(['success' => true, 'id' => $id], 201);
}

function updateSubject(PDO $pdo): void {
    $id = query_param('id');
    if (empty($id)) {
        json_response(['success' => false, 'error' => 'Subject ID required'], 400);
    }
    
    $input = get_input();
    $fields = [];
    $values = [];
    
    if (isset($input['name'])) {
        $fields[] = 'name = ?';
        $values[] = sanitize_string($input['name'], 50);
    }
    if (isset($input['category'])) {
        $fields[] = 'category = ?';
        $values[] = in_array($input['category'], ['Junior', 'Senior', 'Both']) ? $input['category'] : 'Both';
    }
    if (isset($input['displayOrder'])) {
        $fields[] = 'display_order = ?';
        $values[] = (int)$input['displayOrder'];
    }
    if (isset($input['isActive'])) {
        $fields[] = 'is_active = ?';
        $values[] = $input['isActive'] ? 1 : 0;
    }
    
    if (empty($fields)) {
        json_response(['success' => false, 'error' => 'No fields to update'], 400);
    }
    
    $values[] = (int)$id;
    $sql = 'UPDATE rc_subjects SET ' . implode(', ', $fields) . ' WHERE id = ?';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($values);
    
    // Audit log
    global $user;
    $adminId = $user['sub'] ?? null;
    $auditStmt = $pdo->prepare('INSERT INTO audit_logs (admin_id, action, target_entity, target_id, description) VALUES (?, ?, ?, ?, ?)');
    $auditStmt->execute([$adminId, 'UPDATE', 'rc_subject', $id, "Updated subject ID: $id"]);
    
    json_response(['success' => true]);
}

function deleteSubject(PDO $pdo): void {
    $id = query_param('id');
    if (empty($id)) {
        json_response(['success' => false, 'error' => 'Subject ID required'], 400);
    }
    
    // Soft-delete: deactivate instead of hard delete
    $stmt = $pdo->prepare('UPDATE rc_subjects SET is_active = 0 WHERE id = ?');
    $stmt->execute([(int)$id]);
    
    // Audit log
    global $user;
    $adminId = $user['sub'] ?? null;
    $auditStmt = $pdo->prepare('INSERT INTO audit_logs (admin_id, action, target_entity, target_id, description) VALUES (?, ?, ?, ?, ?)');
    $auditStmt->execute([$adminId, 'DELETE', 'rc_subject', $id, "Deactivated subject ID: $id"]);
    
    json_response(['success' => true]);
}
