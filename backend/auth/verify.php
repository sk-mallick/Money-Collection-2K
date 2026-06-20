<?php
/**
 * MCMS — Token Verification Endpoint
 * GET /auth/verify
 * Headers: Authorization: Bearer <token>
 * Returns: { valid, user }
 */

require_once __DIR__ . '/../includes/auth.php';

cors_headers();

if (request_method() !== 'GET') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$payload = require_auth();

try {
    $pdo = get_db();
    $stmt = $pdo->prepare('SELECT id, username, name FROM admins WHERE id = ? LIMIT 1');
    $stmt->execute([$payload['sub'] ?? null]);
    $admin = $stmt->fetch();

    if ($admin) {
        json_response([
            'valid' => true,
            'user' => [
                'id' => $admin['id'],
                'username' => $admin['username'],
                'name' => $admin['name'],
            ]
        ]);
    } else {
        json_response(['valid' => false, 'error' => 'User not found'], 401);
    }
} catch (Exception $e) {
    // Fallback to payload if database query fails (e.g. database down momentarily)
    json_response([
        'valid' => true,
        'user' => [
            'id' => $payload['sub'] ?? null,
            'username' => $payload['username'] ?? '',
            'name' => $payload['name'] ?? 'Admin',
        ]
    ]);
}

