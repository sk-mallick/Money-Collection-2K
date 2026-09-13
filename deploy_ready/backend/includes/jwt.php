<?php
/**
 * MCMS — Pure PHP JWT Implementation
 * No Composer/vendor dependencies required
 * HMAC-SHA256 signing
 */

function jwt_base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function jwt_base64url_decode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 3 - (3 + strlen($data)) % 4));
}

/**
 * Encode a payload into a JWT token
 * @param array $payload Data to encode
 * @param string $secret Secret key for signing
 * @param int $expiry Expiry in seconds (default 7 days)
 * @return string JWT token
 */
function jwt_encode(array $payload, string $secret, int $expiry = 604800): string {
    $header = [
        'typ' => 'JWT',
        'alg' => 'HS256'
    ];

    $payload['iat'] = time();
    $payload['exp'] = time() + $expiry;

    $headerEncoded = jwt_base64url_encode(json_encode($header));
    $payloadEncoded = jwt_base64url_encode(json_encode($payload));

    $signature = hash_hmac('sha256', "$headerEncoded.$payloadEncoded", $secret, true);
    $signatureEncoded = jwt_base64url_encode($signature);

    return "$headerEncoded.$payloadEncoded.$signatureEncoded";
}

/**
 * Decode and verify a JWT token
 * @param string $token JWT token string
 * @param string $secret Secret key for verification
 * @return array|false Decoded payload or false if invalid
 */
function jwt_decode(string $token, string $secret) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return false;
    }

    list($headerEncoded, $payloadEncoded, $signatureEncoded) = $parts;

    // Verify signature
    $expectedSignature = jwt_base64url_encode(
        hash_hmac('sha256', "$headerEncoded.$payloadEncoded", $secret, true)
    );

    if (!hash_equals($expectedSignature, $signatureEncoded)) {
        return false;
    }

    // Decode payload
    $payload = json_decode(jwt_base64url_decode($payloadEncoded), true);
    if (!$payload) {
        return false;
    }

    // Check expiry
    if (isset($payload['exp']) && $payload['exp'] < time()) {
        return false;
    }

    return $payload;
}
