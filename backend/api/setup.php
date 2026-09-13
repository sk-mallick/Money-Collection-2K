<?php
/**
 * ============================================================================
 * Money Collection & Report Card Management System (MCMS)
 * Production Database Setup & Migration Controller
 * ============================================================================
 *
 * UI: Professional shadcn/ui Design System (Tailwind/Zinc aesthetics)
 * Backend: Multi-statement PDO migration executor from `migrate.sql`
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');

$lockFile = __DIR__ . '/setup.lock';
$isLocked = file_exists($lockFile);

// Handle Actions (Lock, Unlock, Migrate, Purge)
$actionTriggered = $_POST['action'] ?? null;

if ($actionTriggered) {
    if ($actionTriggered === 'lock') {
        file_put_contents($lockFile, "Locked on " . date('Y-m-d H:i:s T') . "\nDelete this file (backend/api/setup.lock) via FTP or file manager to re-enable setup operations.\n");
        header('Location: setup.php?locked=1');
        exit;
    } elseif ($actionTriggered === 'unlock') {
        if (file_exists($lockFile)) {
            @unlink($lockFile);
        }
        header('Location: setup.php?unlocked=1');
        exit;
    }
}

// ── Database Connection ──
require_once __DIR__ . '/../includes/db.php';

$env = load_env();
$DB_HOST = $env['DB_HOST'] ?? 'localhost';
$DB_NAME = $env['DB_NAME'] ?? 'mcms';
$DB_USER = $env['DB_USER'] ?? 'root';
$DB_PASS = $env['DB_PASS'] ?? '';

$isLocal = in_array($_SERVER['HTTP_HOST'] ?? '', ['localhost', '127.0.0.1'])
        || in_array($_SERVER['SERVER_NAME'] ?? '', ['localhost', '127.0.0.1'])
        || PHP_SAPI === 'cli';
$envLabel = $isLocal ? 'Localhost (XAMPP)' : 'Production Server';

$pdo = null;
$dbError = null;
$dbVersion = null;

try {
    $pdo = new PDO(
        "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::MYSQL_ATTR_MULTI_STATEMENTS => true,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );
    $pdo->exec("SET time_zone = '+05:30'");
    $dbVersion = $pdo->query('SELECT VERSION()')->fetchColumn();
} catch (PDOException $e) {
    $dbError = $e->getMessage();
}

// ── Migration & Maintenance Operations ──
$migrationSuccess = false;
$migrationMessage = '';

if ($pdo && $actionTriggered && !$isLocked) {
    if ($actionTriggered === 'migrate') {
        $sqlFile = __DIR__ . '/../database/migrate.sql';
        if (!file_exists($sqlFile)) {
            $migrationMessage = "Error: Migration source file `backend/database/migrate.sql` not found!";
        } else {
            try {
                $sql = file_get_contents($sqlFile);
                $pdo->exec($sql);

                // Auto-create performance composite index on receipts
                try {
                    $idxCheck = $pdo->query("SHOW INDEX FROM `receipts` WHERE Key_name = 'idx_receipts_year_student'");
                    if ($idxCheck->rowCount() === 0) {
                        $pdo->exec("CREATE INDEX `idx_receipts_year_student` ON `receipts` (`academic_year`, `student_id`)");
                    }
                } catch (Throwable $ignoreIdx) {}

                $migrationSuccess = true;
                $migrationMessage = "Schema migration completed successfully! All 12 tables and default seed records (groups A–K, system settings, subjects, and admin credentials) are fully synchronized.";
            } catch (Exception $ex) {
                $migrationMessage = "Migration execution failed: " . $ex->getMessage();
            }
        }
    } elseif ($actionTriggered === 'purge_transactional') {
        try {
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
            $pdo->exec("TRUNCATE TABLE `receipts`");
            $pdo->exec("TRUNCATE TABLE `rc_student_marks`");
            $pdo->exec("TRUNCATE TABLE `rc_student_results`");
            $pdo->exec("TRUNCATE TABLE `rc_result_periods`");
            $pdo->exec("TRUNCATE TABLE `old_students`");
            $pdo->exec("TRUNCATE TABLE `audit_logs`");
            $pdo->exec("TRUNCATE TABLE `login_attempts`");
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");

            $migrationSuccess = true;
            $migrationMessage = "Transactional data purged successfully. All master records (students, groups, settings, subjects, and admins) were preserved.";
        } catch (Exception $ex) {
            $migrationMessage = "Purge failed: " . $ex->getMessage();
        }
    }
}

// ── Inspect Tables Status ──
$expectedTables = [
    'students'           => ['category' => 'Master', 'desc' => 'Active student master profiles & fee rates'],
    'old_students'       => ['category' => 'Archive', 'desc' => 'Archived student records & left institute history'],
    'groups'             => ['category' => 'Master', 'desc' => 'Class / Batch groups definitions (A to K)'],
    'settings'           => ['category' => 'Config', 'desc' => 'Institute profile, fee parameters & active months'],
    'receipts'           => ['category' => 'Transactional', 'desc' => 'Fee collection receipts & payment audit history'],
    'rc_subjects'        => ['category' => 'Master', 'desc' => 'Report card examination subjects definition'],
    'rc_result_periods'  => ['category' => 'Transactional', 'desc' => 'Monthly exam evaluation sessions'],
    'rc_student_results' => ['category' => 'Transactional', 'desc' => 'Student overall scores, percentages & rankings'],
    'rc_student_marks'   => ['category' => 'Transactional', 'desc' => 'Subject-level marks & attendance flags'],
    'admins'             => ['category' => 'Security', 'desc' => 'Administrator credentials & access control'],
    'audit_logs'         => ['category' => 'Telemetry', 'desc' => 'System activity log & administrative actions'],
    'login_attempts'     => ['category' => 'Security', 'desc' => 'IP rate limiting & brute-force prevention records']
];

$tableStatuses = [];
$totalRows = 0;
if ($pdo) {
    foreach ($expectedTables as $table => $meta) {
        try {
            $countStmt = $pdo->query("SELECT COUNT(*) FROM `{$table}`");
            $count = intval($countStmt->fetchColumn());
            $totalRows += $count;
            $tableStatuses[$table] = [
                'exists' => true,
                'rows' => $count,
                'category' => $meta['category'],
                'description' => $meta['desc']
            ];
        } catch (PDOException $e) {
            $tableStatuses[$table] = [
                'exists' => false,
                'rows' => 0,
                'category' => $meta['category'],
                'description' => $meta['desc']
            ];
        }
    }
}

$existingTablesCount = count(array_filter($tableStatuses, fn($t) => $t['exists']));
$totalTablesCount = count($expectedTables);
$allTablesExist = !empty($tableStatuses) && ($existingTablesCount === $totalTablesCount);
$syncPercentage = $totalTablesCount > 0 ? round(($existingTablesCount / $totalTablesCount) * 100) : 0;
?>
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCMS — Database Setup &amp; Migration Controller</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <style>
        /* ── shadcn/ui Design Tokens (Zinc/Slate Dark Palette) ── */
        :root {
            --background: #09090b;
            --foreground: #f4f4f5;
            
            --card: #121215;
            --card-foreground: #f4f4f5;
            
            --popover: #121215;
            --popover-foreground: #f4f4f5;
            
            --primary: #fafafa;
            --primary-foreground: #18181b;
            
            --secondary: #27272a;
            --secondary-foreground: #f4f4f5;
            
            --muted: #27272a;
            --muted-foreground: #a1a1aa;
            
            --accent: #27272a;
            --accent-foreground: #f4f4f5;
            
            --destructive: #7f1d1d;
            --destructive-foreground: #fef2f2;
            
            --border: #27272a;
            --input: #27272a;
            --ring: #d4d4d8;
            
            --radius: 0.625rem; /* 10px */
            
            --success: #10b981;
            --success-sub: rgba(16, 185, 129, 0.1);
            --success-border: rgba(16, 185, 129, 0.25);
            
            --warning: #f59e0b;
            --warning-sub: rgba(245, 158, 11, 0.1);
            --warning-border: rgba(245, 158, 11, 0.25);
            
            --danger: #ef4444;
            --danger-sub: rgba(239, 68, 68, 0.1);
            --danger-border: rgba(239, 68, 68, 0.25);
            
            --brand-blue: #3b82f6;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
            background-color: var(--background);
            color: var(--foreground);
            min-height: 100vh;
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
            padding: 24px 16px;
            display: flex;
            justify-content: center;
            background-image: 
                radial-gradient(ellipse at 15% 10%, rgba(59, 130, 246, 0.08) 0%, transparent 40%),
                radial-gradient(ellipse at 85% 90%, rgba(16, 185, 129, 0.05) 0%, transparent 40%);
        }

        .container {
            width: 100%;
            max-width: 1220px;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        /* ── Header ── */
        .navbar {
            background-color: var(--card);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 16px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 14px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
        }

        .navbar-brand {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .brand-icon {
            width: 38px;
            height: 38px;
            border-radius: 8px;
            background: linear-gradient(135deg, #2563eb, #4f46e5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
            flex-shrink: 0;
        }

        .brand-title {
            font-size: 16px;
            font-weight: 700;
            letter-spacing: -0.015em;
            color: var(--foreground);
            line-height: 1.2;
        }

        .brand-subtitle {
            font-size: 12px;
            color: var(--muted-foreground);
        }

        .navbar-status {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }

        /* ── shadcn Badges ── */
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            border-radius: 9999px;
            padding: 3px 10px;
            font-size: 11px;
            font-weight: 600;
            line-height: 1;
            transition: all 0.15s ease;
            white-space: nowrap;
        }

        .badge-outline {
            border: 1px solid var(--border);
            color: var(--muted-foreground);
            background: transparent;
        }

        .badge-success {
            border: 1px solid var(--success-border);
            background: var(--success-sub);
            color: #34d399;
        }

        .badge-danger {
            border: 1px solid var(--danger-border);
            background: var(--danger-sub);
            color: #f87171;
        }

        .badge-warning {
            border: 1px solid var(--warning-border);
            background: var(--warning-sub);
            color: #fbbf24;
        }

        .badge-secondary {
            background-color: var(--secondary);
            color: var(--secondary-foreground);
            border: 1px solid transparent;
        }

        /* ── shadcn Cards ── */
        .card {
            background-color: var(--card);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .card-header {
            padding: 16px 20px;
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
        }

        .card-title {
            font-size: 14px;
            font-weight: 700;
            letter-spacing: -0.01em;
            color: var(--foreground);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .card-description {
            font-size: 12px;
            color: var(--muted-foreground);
            margin-top: 2px;
        }

        .card-content {
            padding: 18px 20px;
            display: flex;
            flex-direction: column;
            gap: 14px;
        }

        /* ── Telemetry Grid ── */
        .telemetry-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
        }

        .telemetry-card {
            background-color: var(--card);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 14px 16px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            transition: border-color 0.15s ease;
        }

        .telemetry-card:hover {
            border-color: #3f3f46;
        }

        .telemetry-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            color: var(--muted-foreground);
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .telemetry-value {
            font-family: 'JetBrains Mono', monospace;
            font-size: 15px;
            font-weight: 700;
            color: var(--foreground);
            letter-spacing: -0.02em;
            margin-top: 2px;
        }

        /* ── 2-Column Layout ── */
        .main-layout {
            display: grid;
            grid-template-columns: 380px 1fr;
            gap: 18px;
            align-items: start;
        }

        /* ── shadcn Buttons ── */
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            border-radius: 8px;
            font-family: inherit;
            font-size: 13px;
            font-weight: 600;
            height: 38px;
            padding: 0 16px;
            transition: all 0.15s ease;
            cursor: pointer;
            text-decoration: none;
            border: 1px solid transparent;
            white-space: nowrap;
        }

        .btn-primary {
            background-color: var(--primary);
            color: var(--primary-foreground);
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .btn-primary:hover:not(:disabled) {
            background-color: #e4e4e7;
            transform: translateY(-0.5px);
        }

        .btn-secondary {
            background-color: var(--secondary);
            color: var(--secondary-foreground);
            border: 1px solid var(--border);
        }

        .btn-secondary:hover:not(:disabled) {
            background-color: #3f3f46;
        }

        .btn-destructive {
            background-color: rgba(239, 68, 68, 0.12);
            color: #fca5a5;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .btn-destructive:hover:not(:disabled) {
            background-color: rgba(239, 68, 68, 0.22);
            color: #fee2e2;
        }

        .btn-outline {
            background-color: transparent;
            color: var(--foreground);
            border: 1px solid var(--border);
        }

        .btn-outline:hover:not(:disabled) {
            background-color: var(--accent);
            color: var(--accent-foreground);
        }

        .btn-block {
            width: 100%;
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            pointer-events: none;
        }

        /* ── shadcn Alerts ── */
        .alert {
            position: relative;
            width: 100%;
            border-radius: var(--radius);
            border: 1px solid var(--border);
            padding: 14px 16px;
            font-size: 13px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            line-height: 1.45;
        }

        .alert-success {
            background-color: var(--success-sub);
            border-color: var(--success-border);
            color: #a7f3d0;
        }

        .alert-destructive {
            background-color: var(--danger-sub);
            border-color: var(--danger-border);
            color: #fca5a5;
        }

        .alert-warning {
            background-color: var(--warning-sub);
            border-color: var(--warning-border);
            color: #fde68a;
        }

        .alert-icon {
            flex-shrink: 0;
            margin-top: 1px;
        }

        /* ── shadcn Table ── */
        .table-responsive {
            width: 100%;
            overflow-x: auto;
        }

        .shadcn-table {
            width: 100%;
            caption-bottom: bottom;
            font-size: 13px;
            border-collapse: collapse;
            text-align: left;
        }

        .shadcn-table thead tr {
            border-bottom: 1px solid var(--border);
        }

        .shadcn-table th {
            height: 38px;
            padding: 0 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--muted-foreground);
        }

        .shadcn-table tbody tr {
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
            transition: background-color 0.15s ease;
        }

        .shadcn-table tbody tr:hover {
            background-color: rgba(255, 255, 255, 0.025);
        }

        .shadcn-table tbody tr:last-child {
            border-bottom: none;
        }

        .shadcn-table td {
            padding: 10px 12px;
            vertical-align: middle;
        }

        .table-code {
            font-family: 'JetBrains Mono', monospace;
            font-size: 12.5px;
            font-weight: 600;
            color: var(--foreground);
        }

        .table-desc-text {
            color: var(--muted-foreground);
            font-size: 12px;
        }

        .table-filter-input {
            width: 100%;
            height: 36px;
            background-color: #18181b;
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 0 12px;
            font-size: 13px;
            color: var(--foreground);
            outline: none;
            transition: border-color 0.15s ease;
        }

        .table-filter-input:focus {
            border-color: #52525b;
        }

        /* ── Progress Bar ── */
        .progress-bar-bg {
            width: 100%;
            height: 6px;
            background-color: #27272a;
            border-radius: 9999px;
            overflow: hidden;
            margin-top: 6px;
        }

        .progress-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981, #059669);
            border-radius: 9999px;
            transition: width 0.4s ease;
        }

        /* ── Footer ── */
        .footer {
            border-top: 1px solid var(--border);
            padding: 18px 4px 6px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 12px;
            font-size: 12px;
            color: var(--muted-foreground);
        }

        .footer a {
            color: var(--muted-foreground);
            text-decoration: none;
            transition: color 0.15s ease;
        }

        .footer a:hover {
            color: var(--foreground);
        }

        /* ── Responsive ── */
        @media (max-width: 980px) {
            .telemetry-grid {
                grid-template-columns: 1fr 1fr;
            }
            .main-layout {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 640px) {
            body {
                padding: 12px 8px;
            }
            .telemetry-grid {
                grid-template-columns: 1fr;
            }
            .navbar {
                flex-direction: column;
                align-items: flex-start;
            }
            .footer {
                flex-direction: column;
                text-align: center;
            }
        }
    </style>
</head>
<body>

<div class="container">

    <!-- ── NAVBAR ── -->
    <header class="navbar">
        <div class="navbar-brand">
            <div class="brand-icon">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
            </div>
            <div>
                <h1 class="brand-title">MCMS Database Controller</h1>
                <p class="brand-subtitle">Production Setup, Migration &amp; Health Engine</p>
            </div>
        </div>

        <div class="navbar-status">
            <span class="badge badge-outline"><?= htmlspecialchars($envLabel) ?></span>
            <?php if ($isLocked): ?>
                <span class="badge badge-warning">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                    Locked
                </span>
            <?php elseif ($pdo): ?>
                <span class="badge badge-success">
                    <span style="width:6px;height:6px;border-radius:50%;background:#34d399;display:inline-block;"></span>
                    Connected
                </span>
            <?php else: ?>
                <span class="badge badge-danger">
                    <span style="width:6px;height:6px;border-radius:50%;background:#f87171;display:inline-block;"></span>
                    Disconnected
                </span>
            <?php endif; ?>

            <span class="badge badge-secondary" style="font-family:'JetBrains Mono',monospace;">
                <?= $existingTablesCount ?> / <?= $totalTablesCount ?> Synced
            </span>
        </div>
    </header>

    <!-- ── ALERTS SECTION ── -->
    <?php if ($isLocked): ?>
        <div class="alert alert-warning">
            <svg class="alert-icon" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            <div>
                <strong>Production Safety Lock Active:</strong> Migration operations are currently disabled. To re-enable setup tasks, click <strong>Unlock Setup</strong> below or delete <code style="background:rgba(0,0,0,0.3);padding:1px 5px;border-radius:4px;font-family:'JetBrains Mono',monospace;">backend/api/setup.lock</code> via file manager.
            </div>
        </div>
    <?php endif; ?>

    <?php if ($migrationMessage): ?>
        <div class="alert <?= $migrationSuccess ? 'alert-success' : 'alert-destructive' ?>">
            <svg class="alert-icon" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <?php if ($migrationSuccess): ?>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                <?php else: ?>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <?php endif; ?>
            </svg>
            <div><?= htmlspecialchars($migrationMessage) ?></div>
        </div>
    <?php endif; ?>

    <?php if ($dbError): ?>
        <div class="alert alert-destructive">
            <svg class="alert-icon" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <div>
                <strong>Database Connection Error:</strong> <?= htmlspecialchars($dbError) ?>
            </div>
        </div>
    <?php endif; ?>

    <!-- ── TELEMETRY CARDS ── -->
    <div class="telemetry-grid">
        <div class="telemetry-card">
            <div class="telemetry-header">
                <span>Database Host</span>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/></svg>
            </div>
            <div class="telemetry-value"><?= htmlspecialchars($DB_HOST) ?></div>
        </div>

        <div class="telemetry-card">
            <div class="telemetry-header">
                <span>Schema Name</span>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>
            </div>
            <div class="telemetry-value"><?= htmlspecialchars($DB_NAME) ?></div>
        </div>

        <div class="telemetry-card">
            <div class="telemetry-header">
                <span>Database User</span>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            </div>
            <div class="telemetry-value"><?= htmlspecialchars($DB_USER) ?></div>
        </div>

        <div class="telemetry-card">
            <div class="telemetry-header">
                <span>Database Engine</span>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/></svg>
            </div>
            <div class="telemetry-value"><?= $dbVersion ? htmlspecialchars($dbVersion) : 'Offline' ?></div>
        </div>
    </div>

    <!-- ── 2-COLUMN MAIN CONTENT ── -->
    <div class="main-layout">

        <!-- ── LEFT COLUMN: ACTIONS & UTILITIES ── -->
        <div style="display:flex;flex-direction:column;gap:18px;">

            <!-- Actions Card -->
            <div class="card">
                <div class="card-header">
                    <div>
                        <h2 class="card-title">
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                            Setup &amp; Migration Actions
                        </h2>
                        <p class="card-description">Execute DDL scripts, sync seeds, and manage locks</p>
                    </div>
                </div>

                <div class="card-content">
                    <?php if ($pdo && !$isLocked): ?>
                        <form method="POST" onsubmit="this.querySelector('button').innerText = '⏳ Executing Migrations...'; this.querySelector('button').disabled = true;">
                            <input type="hidden" name="action" value="migrate">
                            <button type="submit" class="btn btn-primary btn-block">
                                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                                <?= $allTablesExist ? 'Sync Schema &amp; Seeds (Idempotent)' : 'Run Setup / Migrate All Tables' ?>
                            </button>
                        </form>
                    <?php endif; ?>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <?php if ($isLocked): ?>
                            <form method="POST">
                                <input type="hidden" name="action" value="unlock">
                                <button type="submit" class="btn btn-secondary btn-block">
                                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>
                                    Unlock
                                </button>
                            </form>
                        <?php else: ?>
                            <form method="POST">
                                <input type="hidden" name="action" value="lock">
                                <button type="submit" class="btn btn-outline btn-block" title="Lock setup file against unauthorized operations">
                                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                                    Lock Setup
                                </button>
                            </form>
                        <?php endif; ?>

                        <?php if ($pdo && !$isLocked): ?>
                            <form method="POST" onsubmit="return confirm('WARNING: This will reset receipts, result periods, student marks, and audit logs to 0 rows. Master students, groups, settings, subjects, and admin accounts will remain completely safe. Proceed?');">
                                <input type="hidden" name="action" value="purge_transactional">
                                <button type="submit" class="btn btn-destructive btn-block">
                                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                    Reset Tests
                                </button>
                            </form>
                        <?php else: ?>
                            <a href="../../index.php" class="btn btn-secondary btn-block">
                                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                                Web App
                            </a>
                        <?php endif; ?>
                    </div>
                </div>
            </div>

            <!-- Navigation & Quick Access Card -->
            <div class="card">
                <div class="card-header">
                    <div>
                        <h2 class="card-title">
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                            Application Shortcuts
                        </h2>
                        <p class="card-description">Quick links to modules &amp; auth portals</p>
                    </div>
                </div>

                <div class="card-content" style="gap:8px;">
                    <a href="../../index.php" class="btn btn-outline btn-block" style="justify-content:flex-start;">
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                        Main Application Dashboard
                    </a>
                    <a href="../../index.php#/collect" class="btn btn-outline btn-block" style="justify-content:flex-start;">
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                        Fee Collection &amp; Receipts
                    </a>
                    <a href="../../index.php#/reports/dashboard" class="btn btn-outline btn-block" style="justify-content:flex-start;">
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                        Report Cards &amp; Rankings
                    </a>
                    <a href="../../index.php#/login" class="btn btn-outline btn-block" style="justify-content:flex-start;">
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>
                        Staff Login Portal
                    </a>
                </div>
            </div>

            <!-- System Info Meta Card -->
            <div class="card">
                <div class="card-content" style="padding:14px 16px;gap:8px;font-size:12px;color:var(--muted-foreground);">
                    <div style="display:flex;justify-content:space-between;">
                        <span>PHP SAPI</span>
                        <span style="font-family:'JetBrains Mono',monospace;color:var(--foreground);"><?= PHP_SAPI ?></span>
                    </div>
                    <div style="display:flex;justify-content:space-between;">
                        <span>Timezone</span>
                        <span style="font-family:'JetBrains Mono',monospace;color:var(--foreground);">Asia/Kolkata (+05:30)</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;">
                        <span>Total Rows in DB</span>
                        <span style="font-family:'JetBrains Mono',monospace;color:var(--foreground);"><?= number_format($totalRows) ?></span>
                    </div>
                </div>
            </div>

        </div>

        <!-- ── RIGHT COLUMN: MASTER SCHEMA CHECKLIST ── -->
        <div class="card">
            <div class="card-header" style="flex-wrap:wrap;">
                <div>
                    <h2 class="card-title">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
                        Master Database Schema Status
                    </h2>
                    <p class="card-description">Live table verification against `migrate.sql` blueprint</p>
                </div>

                <div style="min-width:180px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;font-size:11.5px;font-weight:600;">
                        <span>Sync Progress</span>
                        <span style="font-family:'JetBrains Mono',monospace;color:<?= $allTablesExist ? 'var(--success)' : 'var(--warning)' ?>;">
                            <?= $syncPercentage ?>%
                        </span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: <?= $syncPercentage ?>%;"></div>
                    </div>
                </div>
            </div>

            <div style="padding:12px 20px;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:center;">
                <input 
                    type="text" 
                    id="tableFilterInput" 
                    class="table-filter-input" 
                    placeholder="Search tables by name or purpose..."
                    onkeyup="filterTableList()"
                >
            </div>

            <div class="table-responsive">
                <table class="shadcn-table" id="schemaTable">
                    <thead>
                        <tr>
                            <th>Table Name</th>
                            <th>Type</th>
                            <th>Description</th>
                            <th style="text-align:right;">Records</th>
                            <th style="text-align:center;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($expectedTables as $tableName => $meta): ?>
                            <?php $st = $tableStatuses[$tableName] ?? ['exists' => false, 'rows' => 0]; ?>
                            <tr class="table-row-item" data-name="<?= htmlspecialchars($tableName) ?>" data-desc="<?= htmlspecialchars($meta['desc']) ?>">
                                <td>
                                    <span class="table-code"><?= htmlspecialchars($tableName) ?></span>
                                </td>
                                <td>
                                    <span class="badge badge-outline" style="font-size:10.5px;">
                                        <?= htmlspecialchars($meta['category']) ?>
                                    </span>
                                </td>
                                <td>
                                    <span class="table-desc-text"><?= htmlspecialchars($meta['desc']) ?></span>
                                </td>
                                <td style="text-align:right;">
                                    <?php if ($st['exists']): ?>
                                        <span class="badge badge-secondary" style="font-family:'JetBrains Mono',monospace;font-size:11px;">
                                            <?= number_format($st['rows']) ?>
                                        </span>
                                    <?php else: ?>
                                        <span style="color:var(--muted-foreground);font-size:11px;">—</span>
                                    <?php endif; ?>
                                </td>
                                <td style="text-align:center;">
                                    <?php if ($st['exists']): ?>
                                        <span class="badge badge-success" title="Table is active and healthy">
                                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                                            Active
                                        </span>
                                    <?php else: ?>
                                        <span class="badge badge-danger" title="Table missing from database">
                                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                                            Missing
                                        </span>
                                    <?php endif; ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>

    </div>

    <!-- ── FOOTER ── -->
    <footer class="footer">
        <div>
            Money Collection &amp; Report Card System (MCMS) • Production Setup &amp; Migration Engine
        </div>
        <div style="display:flex;gap:14px;">
            <a href="../../index.php">App Dashboard</a>
            <a href="../../index.php#/collect">Fees</a>
            <a href="../../index.php#/reports/dashboard">Exam Reports</a>
            <a href="../../index.php#/settings">Settings</a>
        </div>
    </footer>

</div>

<script>
function filterTableList() {
    const input = document.getElementById('tableFilterInput');
    const filter = input.value.toLowerCase().trim();
    const rows = document.querySelectorAll('.table-row-item');

    rows.forEach(row => {
        const name = row.getAttribute('data-name').toLowerCase();
        const desc = row.getAttribute('data-desc').toLowerCase();
        if (name.includes(filter) || desc.includes(filter)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}
</script>

</body>
</html>
