<?php
/**
 * Syncs the entire project to `deploy_ready` for immediate production deployment.
 */

$rootDir = dirname(__DIR__);
$deployDir = $rootDir . '/deploy_ready';

function copyDir($src, $dst) {
    $dir = opendir($src);
    @mkdir($dst, 0777, true);
    while (false !== ($file = readdir($dir))) {
        if ($file != '.' && $file != '..') {
            if (is_dir($src . '/' . $file)) {
                copyDir($src . '/' . $file, $dst . '/' . $file);
            } else {
                copy($src . '/' . $file, $dst . '/' . $file);
            }
        }
    }
    closedir($dir);
}

function cleanDir($dir) {
    if (!is_dir($dir)) return;
    $files = scandir($dir);
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;
        $path = $dir . '/' . $file;
        if (is_dir($path)) {
            cleanDir($path);
            rmdir($path);
        } else {
            unlink($path);
        }
    }
}

echo "Syncing deploy_ready directory...\n";

// 1. Clean deploy_ready dist & backend
@mkdir($deployDir, 0777, true);

// Remove zip files
foreach (glob($deployDir . '/*.zip') as $zipFile) {
    unlink($zipFile);
    echo "Removed old zip: " . basename($zipFile) . "\n";
}

// 2. Copy root files to deploy_ready/
$rootFiles = [
    'if0_42017220_mcms.sql',
    '.env',
    '.env.example',
    '.env.production',
    '.htaccess',
    'index.php',
    'setup.php',
    'icon.png',
    'login-bg-desktop.webp',
    'login-bg-mobile.webp',
];

foreach ($rootFiles as $rf) {
    $src = $rootDir . '/' . $rf;
    $dst = $deployDir . '/' . $rf;
    if (file_exists($src)) {
        copy($src, $dst);
        echo "[OK] Copied {$rf} (" . filesize($src) . " bytes)\n";
    } else {
        echo "[WARN] {$rf} not found in root\n";
    }
}

// 3. Copy dist/
cleanDir($deployDir . '/dist');
copyDir($rootDir . '/dist', $deployDir . '/dist');
echo "[OK] Synced dist/ directory\n";

// 4. Copy backend/
cleanDir($deployDir . '/backend');
copyDir($rootDir . '/backend', $deployDir . '/backend');
echo "[OK] Synced backend/ directory\n";

echo "\nDeploy_ready sync completed successfully!\n";
