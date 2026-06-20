<?php
/**
 * MCMS — Change Admin Password API
 * POST /api/change-password
 * Headers: Authorization: Bearer <token>
 * Body: { oldPassword, newPassword }
 * Returns: { success, message }
 */

require_once __DIR__ . '/../includes/auth.php';

cors_headers();
$user = require_auth();
$pdo = get_db();

if (request_method() !== 'POST') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$input = get_input();
$missing = validate_required($input, ['oldPassword', 'newPassword']);

if (!empty($missing)) {
    json_response(['success' => false, 'error' => 'Current and new passwords are required'], 400);
}

$oldPassword = $input['oldPassword'];
$newPassword = $input['newPassword'];

if (strlen($newPassword) < 8) {
    json_response(['success' => false, 'error' => 'New password must be at least 8 characters long'], 400);
}

if (strlen($newPassword) > 256) {
    json_response(['success' => false, 'error' => 'New password cannot exceed 256 characters'], 400);
}

try {
    // 1. Get current admin hashed password from database
    $stmt = $pdo->prepare('SELECT id, password_hash FROM admins WHERE id = ? LIMIT 1');
    $stmt->execute([$user['sub']]);
    $admin = $stmt->fetch();

    if (!$admin) {
        json_response(['success' => false, 'error' => 'Admin user not found'], 404);
    }

    // 2. Verify current password
    if (!password_verify($oldPassword, $admin['password_hash'])) {
        write_log('warning', 'Password change failed: incorrect current password', ['admin_id' => $user['sub']]);
        json_response(['success' => false, 'error' => 'Incorrect current password'], 400);
    }

    // 3. Hash and update new password
    $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
    $updateStmt = $pdo->prepare('UPDATE admins SET password_hash = ? WHERE id = ?');
    $updateStmt->execute([$newHash, $user['sub']]);

    write_log('info', 'Admin password changed successfully', ['admin_id' => $user['sub']]);
    json_response(['success' => true, 'message' => 'Password updated successfully']);

} catch (Exception $e) {
    write_log('error', 'Server error during password change', ['error' => $e->getMessage()]);
    json_response(['success' => false, 'error' => 'Server error'], 500);
}
