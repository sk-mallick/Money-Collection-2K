<?php
/**
 * MCMS — Auth Middleware
 * Extracts and validates JWT from Authorization header
 */

require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/functions.php';

/**
 * Require valid JWT authentication
 * Returns the decoded payload or sends 401 response
 * @return array Decoded JWT payload
 */
function require_auth(): array {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

    // Try alternate header (some servers)
    if (empty($authHeader) && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }

    // Apache may strip Authorization header — check for it
    if (empty($authHeader) && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    if (empty($authHeader) || !preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
        json_response(['success' => false, 'error' => 'Authorization token required'], 401);
    }

    $token = $matches[1];
    $secret = get_jwt_secret();
    $payload = jwt_decode($token, $secret);

    if ($payload === false) {
        json_response(['success' => false, 'error' => 'Invalid or expired token'], 401);
    }

    return $payload;
}
