import os

setup_file = r'backend/api/setup.php'
with open(setup_file, 'r', encoding='utf-8') as f:
    setup_code = f.read()

# Helper function definition to place after requires
helper_code = '''
// Security: Check if setup actions are authorized
function is_setup_authorized(?PDO $pdo): bool {
    // 1. CLI is always authorized
    if (PHP_SAPI === 'cli') return true;

    // 2. Direct localhost IP is authorized
    $remoteIp = $_SERVER['REMOTE_ADDR'] ?? '';
    if ($remoteIp === '127.0.0.1' || $remoteIp === '::1') return true;

    // 3. If database is not configured or no admins exist, permit initial onboarding
    if (!$pdo) return true;
    try {
        $count = (int)$pdo->query("SELECT COUNT(*) FROM admins")->fetchColumn();
        if ($count === 0) return true;
    } catch (Throwable $e) {
        return true;
    }

    // 4. Verify admin credentials provided in POST request
    $authUser = trim($_POST['auth_username'] ?? '');
    $authPass = (string)($_POST['auth_password'] ?? '');
    if (!empty($authUser) && !empty($authPass)) {
        try {
            $stmt = $pdo->prepare("SELECT password_hash FROM admins WHERE username = ? LIMIT 1");
            $stmt->execute([$authUser]);
            $row = $stmt->fetch();
            if ($row) {
                $stored = (string)($row['password_hash'] ?? '');
                $hashInfo = password_get_info($stored);
                if (!empty($hashInfo['algo'])) {
                    if (password_verify($authPass, $stored)) return true;
                } else {
                    if (hash_equals($stored, $authPass) || hash_equals(trim($stored), trim($authPass))) return true;
                }
            }
        } catch (Throwable $authEx) {}
    }

    return false;
}
'''

# Check if helper already in code
if 'is_setup_authorized' not in setup_code:
    # Insert helper before action handling
    anchor = "// Handle Actions (Lock, Unlock, Migrate, Purge, Save Env, Adopt Prod Env)"
    setup_code = setup_code.replace(anchor, helper_code + "\n" + anchor)

    # Wrap the actions with authorization check
    old_unlock = """    } elseif ($actionTriggered === 'unlock') {
        if (file_exists($lockFile)) {
            @unlink($lockFile);
        }
        header('Location: setup.php?unlocked=1');
        exit;"""

    new_unlock = """    } elseif ($actionTriggered === 'unlock') {
        // Require authorization to unlock in production
        $isLocalReq = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1']) || PHP_SAPI === 'cli';
        if (!$isLocalReq && file_exists($lockFile)) {
            // Check if admin password provided
            require_once __DIR__ . '/../includes/db.php';
            try { $checkPdo = get_db(); } catch (Throwable $e) { $checkPdo = null; }
            if (!is_setup_authorized($checkPdo)) {
                header('Location: setup.php?auth_error=1');
                exit;
            }
        }
        if (file_exists($lockFile)) {
            @unlink($lockFile);
        }
        header('Location: setup.php?unlocked=1');
        exit;"""

    setup_code = setup_code.replace(old_unlock, new_unlock)

    # Protect purge_transactional and reset_admin_credentials
    old_ops_check = "if ($pdo && $actionTriggered && !$isLocked) {"
    new_ops_check = """if ($pdo && $actionTriggered && !$isLocked) {
    // Enforce authorization for destructive operations in production
    if (in_array($actionTriggered, ['purge_transactional', 'reset_admin_credentials', 'save_env'], true)) {
        if (!is_setup_authorized($pdo)) {
            $migrationSuccess = false;
            $migrationMessage = "Security Restriction: Administrative credentials or local access required to execute destructive operations in production.";
            $actionTriggered = null;
        }
    }
}
if ($pdo && $actionTriggered && !$isLocked) {"""

    setup_code = setup_code.replace(old_ops_check, new_ops_check)

    with open(setup_file, 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(setup_code)
    print('Updated backend/api/setup.php with authentication guards')
else:
    print('setup.php already contains is_setup_authorized')

