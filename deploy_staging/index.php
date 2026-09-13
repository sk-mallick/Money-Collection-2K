<?php
/**
 * MCMS v2.0 — SPA Fallback Redirect
 * Directs traffic to dist/index.html with dynamically injected <base> tag.
 */

$distIndex = __DIR__ . '/dist/index.html';

if (file_exists($distIndex)) {
    $html = file_get_contents($distIndex);
    
    // Determine the base path for this installation (e.g. "/Money%20Collection%202K/" or "/")
    $scriptDir = dirname($_SERVER['SCRIPT_NAME'] ?? '/');
    $basePath = str_replace('\\', '/', $scriptDir);
    if ($basePath === '/' || $basePath === '.' || $basePath === '') {
        $basePath = '/';
    } else {
        $basePath = '/' . trim($basePath, '/') . '/';
    }
    
    // URL-encode path components (e.g. spaces -> %20) so browser matches window.location.pathname
    $encodedParts = array_map('rawurlencode', explode('/', trim($basePath, '/')));
    $encodedBasePath = '/' . implode('/', $encodedParts) . '/';
    if ($basePath === '/') {
        $encodedBasePath = '/';
    }
    
    // Inject <base href="..."> into <head>
    $baseTag = '<base href="' . htmlspecialchars($encodedBasePath, ENT_QUOTES, 'UTF-8') . '" />';
    if (stripos($html, '<base ') === false) {
        $html = preg_replace('/<head(\s*[^>]*)>/i', "<head$1>\n    $baseTag", $html, 1);
    }
    
    header('Content-Type: text/html; charset=UTF-8');
    echo $html;
} else {
    http_response_code(500);
    echo "<h1>Internal Server Error</h1>";
    echo "<p>MCMS Build directory is missing or empty. Please run <code>npm run build</code> in the frontend folder before deploying.</p>";
}
