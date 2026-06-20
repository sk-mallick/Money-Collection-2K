<?php
/**
 * MCMS — Settings API
 * GET  /api/settings  → Fetch all settings
 * POST /api/settings  → Update settings
 */

require_once __DIR__ . '/../includes/auth.php';

cors_headers();
$user = require_auth();
$pdo = get_db();
$method = request_method();

switch ($method) {
    case 'GET':
        getSettings($pdo);
        break;
    case 'POST':
        updateSettings($pdo);
        break;
    default:
        json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

function getSettings(PDO $pdo): void {
    $stmt = $pdo->query('SELECT setting_key, setting_value FROM settings');
    $rows = $stmt->fetchAll();

    $settings = [];
    foreach ($rows as $row) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }

    json_response(['success' => true, 'settings' => $settings]);
}

function updateSettings(PDO $pdo): void {
    $input = get_input();

    $allowedKeys = ['instituteName', 'address', 'phone1', 'phone2', 'academicYear', 'adminName', 'activeMonths', 'feeJunior', 'feeSenior'];

    // Read current fee settings BEFORE updating to detect changes
    $currentFees = [];
    $feeStmt = $pdo->prepare('SELECT setting_value FROM settings WHERE setting_key = ?');
    foreach (['feeJunior', 'feeSenior'] as $feeKey) {
        $feeStmt->execute([$feeKey]);
        $row = $feeStmt->fetch();
        $currentFees[$feeKey] = $row ? (int)$row['setting_value'] : ($feeKey === 'feeJunior' ? 1000 : 1000);
    }

    $stmt = $pdo->prepare('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)');

    foreach ($input as $key => $value) {
        if (in_array($key, $allowedKeys)) {
            $stmt->execute([$key, sanitize_string((string)$value, 500)]);
        }
    }

    // Bulk-update student fees when global defaults change
    $affectedJunior = 0;
    $affectedSenior = 0;

    if (isset($input['feeJunior'])) {
        $newFeeJunior = (int)$input['feeJunior'];
        $oldFeeJunior = $currentFees['feeJunior'];
        if ($newFeeJunior !== $oldFeeJunior && $newFeeJunior > 0) {
            $updateStmt = $pdo->prepare('UPDATE students SET fee_per_month = ? WHERE category = ? AND fee_per_month = ?');
            $updateStmt->execute([$newFeeJunior, 'Junior', $oldFeeJunior]);
            $affectedJunior = $updateStmt->rowCount();
        }
    }

    if (isset($input['feeSenior'])) {
        $newFeeSenior = (int)$input['feeSenior'];
        $oldFeeSenior = $currentFees['feeSenior'];
        if ($newFeeSenior !== $oldFeeSenior && $newFeeSenior > 0) {
            $updateStmt = $pdo->prepare('UPDATE students SET fee_per_month = ? WHERE category = ? AND fee_per_month = ?');
            $updateStmt->execute([$newFeeSenior, 'Senior', $oldFeeSenior]);
            $affectedSenior = $updateStmt->rowCount();
        }
    }

    // Add entry to audit_logs
    $adminId = $user['sub'] ?? null;
    $changedKeys = [];
    foreach ($input as $key => $value) {
        if (in_array($key, $allowedKeys)) {
            $changedKeys[] = $key;
        }
    }
    if (!empty($changedKeys)) {
        $auditStmt = $pdo->prepare('INSERT INTO audit_logs (admin_id, action, target_entity, target_id, description) VALUES (?, ?, ?, ?, ?)');
        $auditStmt->execute([
            $adminId,
            'UPDATE',
            'settings',
            'global',
            "Updated settings keys: " . implode(', ', $changedKeys) . 
            ($affectedJunior > 0 ? " (Bulk-updated $affectedJunior Juniors)" : "") .
            ($affectedSenior > 0 ? " (Bulk-updated $affectedSenior Seniors)" : "")
        ]);
    }

    json_response([
        'success' => true,
        'affectedJunior' => $affectedJunior,
        'affectedSenior' => $affectedSenior,
    ]);
}

