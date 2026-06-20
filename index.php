<?php
/**
 * MCMS v2.0 — SPA Fallback Redirect
 * Directs traffic to dist/index.html if direct access bypasses RewriteRules.
 */

$distIndex = __DIR__ . '/dist/index.html';

if (file_exists($distIndex)) {
    readfile($distIndex);
} else {
    http_response_code(500);
    echo "<h1>Internal Server Error</h1>";
    echo "<p>MCMS Build directory is missing or empty. Please run <code>npm run build</code> in the frontend folder before deploying.</p>";
}
