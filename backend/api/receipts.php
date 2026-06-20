<?php
/**
 * MCMS — Receipts API
 * GET    /api/receipts              → List all receipts
 * GET    /api/receipts?studentId=X  → Receipts for one student
 * DELETE /api/receipts?id=X         → Delete a receipt
 */

require_once __DIR__ . '/../includes/auth.php';

cors_headers();
$user = require_auth();
$pdo = get_db();
$method = request_method();

switch ($method) {
    case 'GET':
        getReceipts($pdo);
        break;
    case 'DELETE':
        deleteReceipt($pdo);
        break;
    default:
        json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

function getReceipts(PDO $pdo): void {
    $studentId = query_param('studentId');

    if (!empty($studentId)) {
        $stmt = $pdo->prepare('SELECT * FROM receipts WHERE student_id = ? ORDER BY generated_on DESC');
        $stmt->execute([$studentId]);
    } else {
        $stmt = $pdo->query('SELECT * FROM receipts ORDER BY generated_on DESC');
    }

    $receipts = $stmt->fetchAll();

    foreach ($receipts as &$r) {
        $r['fee_per_month'] = (int)$r['fee_per_month'];
        $r['amt_paid'] = (int)$r['amt_paid'];
        $r['prev_due'] = (int)$r['prev_due'];
        $r['total_recv'] = (int)$r['total_recv'];
        $r['months'] = json_decode($r['months'], true) ?: [];
    }

    json_response(['success' => true, 'receipts' => $receipts]);
}

function deleteReceipt(PDO $pdo): void {
    global $user;
    $id = query_param('id');
    if (empty($id)) {
        json_response(['success' => false, 'error' => 'Receipt ID required'], 400);
    }

    $pdo->beginTransaction();
    try {
        // Fetch receipt first to delete associated payments
        $getStmt = $pdo->prepare('SELECT student_id, months, academic_year FROM receipts WHERE id = ?');
        $getStmt->execute([$id]);
        $receipt = $getStmt->fetch();

        if (!$receipt) {
            $pdo->rollBack();
            json_response(['success' => false, 'error' => 'Receipt not found'], 404);
        }

        // Decode months
        $months = json_decode($receipt['months'], true) ?: [];

        // Delete receipt
        $stmt = $pdo->prepare('DELETE FROM receipts WHERE id = ?');
        $stmt->execute([$id]);

        // Add entry to audit_logs
        $adminId = $user['sub'] ?? null;
        $auditStmt = $pdo->prepare('INSERT INTO audit_logs (admin_id, action, target_entity, target_id, description) VALUES (?, ?, ?, ?, ?)');
        $auditStmt->execute([
            $adminId,
            'DELETE',
            'receipt',
            $id,
            "Deleted receipt: $id"
        ]);

        $pdo->commit();
        json_response(['success' => true]);
    } catch (Exception $e) {
        $pdo->rollBack();
        write_log('error', 'Failed to delete receipt', ['id' => $id, 'error' => $e->getMessage()]);
        json_response(['success' => false, 'error' => 'Server error during deletion'], 500);
    }
}
