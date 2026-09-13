<?php
/**
 * MCMS — Login Endpoint
 * POST /auth/login
 * Body: { username, password }
 * Returns: { success, token, user }
 */

require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/jwt.php';
require_once __DIR__ . '/../includes/functions.php';

cors_headers();

if (request_method() !== 'POST') {
    json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

$input = get_input();
$missing = validate_required($input, ['username', 'password']);

if (!empty($missing)) {
    json_response(['success' => false, 'error' => 'Username and password are required'], 400);
}

$username = sanitize_string($input['username'], 50);
$password = $input['password'];

// Reject excessively long passwords to prevent bcrypt DoS
if (strlen($password) > 256) {
    json_response(['success' => false, 'error' => 'Password is too long (max 256 characters)'], 400);
}

try {
    $pdo = get_db();
    
    // Proxy-aware client IP helper
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $ipAddress = trim($parts[0]);
    } elseif (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
        $ipAddress = $_SERVER['HTTP_CF_CONNECTING_IP'];
    }

    // 0. Prune stale login_attempts (older than 24 hours) to prevent table bloat
    $pdo->exec('DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL 24 HOUR');

    // 1. Rate limiting check (max 5 failed attempts per 15 minutes)
    $rateLimitStmt = $pdo->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip_address = ? AND attempted_at > NOW() - INTERVAL 15 MINUTE');
    $rateLimitStmt->execute([$ipAddress]);
    $failedAttempts = (int)$rateLimitStmt->fetchColumn();

    if ($failedAttempts >= 5) {
        write_log('warning', 'Brute-force login attempt blocked', ['ip' => $ipAddress, 'username' => $username]);
        json_response(['success' => false, 'error' => 'Too many login attempts. Please try again after 15 minutes.'], 429);
    }

    // 2. Find admin by username
    $stmt = $pdo->prepare('SELECT id, username, password_hash, name FROM admins WHERE username = ? LIMIT 1');
    $stmt->execute([$username]);
    $admin = $stmt->fetch();

    $isValid = false;
    $shouldRehash = false;

    if ($admin) {
        $stored = (string)($admin['password_hash'] ?? '');
        $hashInfo = password_get_info($stored);

        if (!empty($hashInfo['algo'])) {
            // Standard Bcrypt/Argon2 hash in database
            $isValid = password_verify($password, $stored);
        } else {
            // Direct plain-text password entered in MySQL by admin
            if (hash_equals($stored, $password) || hash_equals(trim($stored), trim($password))) {
                $isValid = true;
                $shouldRehash = true;
            }
        }
    }

    if (!$admin || !$isValid) {
        // Log failed attempt
        $logAttemptStmt = $pdo->prepare('INSERT INTO login_attempts (ip_address, username) VALUES (?, ?)');
        $logAttemptStmt->execute([$ipAddress, $username]);

        write_log('warning', 'Failed login attempt', ['ip' => $ipAddress, 'username' => $username]);
        json_response(['success' => false, 'error' => 'Invalid username or password'], 401);
    }

    // Auto-hash plain text password on first successful login
    if ($shouldRehash) {
        try {
            $newHash = password_hash($password, PASSWORD_BCRYPT);
            $rehashStmt = $pdo->prepare('UPDATE admins SET password_hash = ? WHERE id = ?');
            $rehashStmt->execute([$newHash, $admin['id']]);
            write_log('info', 'Auto-hashed plain text password for admin', ['username' => $username]);
        } catch (Throwable $rehashEx) {
            // Continue even if background rehash encounters an issue
        }
    }

    // 3. Clear failed attempts on successful login
    $clearStmt = $pdo->prepare('DELETE FROM login_attempts WHERE ip_address = ?');
    $clearStmt->execute([$ipAddress]);

    // 4. Generate JWT token (1-day expiry)
    $secret = get_jwt_secret();
    $payload = [
        'sub' => $admin['id'],
        'username' => $admin['username'],
        'name' => $admin['name'],
    ];
    $token = jwt_encode($payload, $secret, 86400);

    write_log('info', 'Successful login', ['username' => $username]);

    json_response([
        'success' => true,
        'token' => $token,
        'user' => [
            'id' => $admin['id'],
            'username' => $admin['username'],
            'name' => $admin['name'],
        ]
    ]);
} catch (Exception $e) {
    write_log('error', 'Server error during login', ['error' => $e->getMessage()]);
    json_response(['success' => false, 'error' => 'Server error'], 500);
}
