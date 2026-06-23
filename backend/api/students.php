<?php
/**
 * MCMS — Students API
 * GET    /api/students         → List all students
 * POST   /api/students         → Create student
 * PUT    /api/students?id=X    → Update student
 * DELETE /api/students?id=X    → Delete student
 */

require_once __DIR__ . '/../includes/auth.php';

cors_headers();
$user = require_auth();
$pdo = get_db();
$method = request_method();

switch ($method) {
    case 'GET':
        getStudents($pdo);
        break;
    case 'POST':
        createStudent($pdo);
        break;
    case 'PUT':
        updateStudent($pdo);
        break;
    case 'DELETE':
        deleteStudent($pdo);
        break;
    default:
        json_response(['success' => false, 'error' => 'Method not allowed'], 405);
}

function getStudents(PDO $pdo): void {
    // 1. Fetch all students (explicit columns, excluding soft-deleted ones)
    $stmt = $pdo->query('SELECT id, name, category, class, school, contact_no, father_no, mother_no, adm_date, dob, fee_per_month, notes, group_id, created_at, updated_at FROM students WHERE deleted_at IS NULL ORDER BY name ASC');
    $students = $stmt->fetchAll();

    // 2. Fetch active academic year from settings
    $yearStmt = $pdo->prepare('SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1');
    $yearStmt->execute(['academicYear']);
    $activeYear = $yearStmt->fetchColumn() ?: '2026-27';

    // Allow override via query parameter
    $filterYear = query_param('academic_year', $activeYear, 10);

    // 3. Fetch all receipts for active students for the selected academic year
    $receiptsStmt = $pdo->prepare('
        SELECT r.student_id, r.amt_paid, r.prev_due, r.months, r.generated_on, r.academic_year 
        FROM receipts r
        INNER JOIN students s ON r.student_id = s.id
        WHERE r.academic_year = ? AND s.deleted_at IS NULL
        ORDER BY r.generated_on ASC
    ');
    $receiptsStmt->execute([$filterYear]);
    $receipts = $receiptsStmt->fetchAll();

    // Group receipts by student
    $receiptsByStudent = [];
    foreach ($receipts as $receipt) {
        $sid = $receipt['student_id'];
        if (!isset($receiptsByStudent[$sid])) {
            $receiptsByStudent[$sid] = [];
        }
        $receiptsByStudent[$sid][] = $receipt;
    }

    // 4. Compute payments on-the-fly and map them to students
    foreach ($students as &$s) {
        $studentId = $s['id'];
        $feePerMonth = (int)$s['fee_per_month'];
        
        $sReceipts = $receiptsByStudent[$studentId] ?? [];
        $sPayments = allocate_receipts_to_months($sReceipts, $feePerMonth, $studentId, $filterYear);
        
        // Cast types as before
        $s['payments'] = [];
        foreach ($sPayments as $p) {
            if ($p['paid']) {
                $s['payments'][] = [
                    'month' => $p['month'],
                    'paid' => true,
                    'amount' => (int)$p['amount'],
                    'date' => $p['date'],
                    'academic_year' => $p['academic_year']
                ];
            }
        }
        $s['fee_per_month'] = $feePerMonth;
        $s['group'] = $s['group_id'] ?? null;
    }
    unset($s); // break reference

    json_response(['success' => true, 'students' => $students]);
}

function createStudent(PDO $pdo): void {
    $input = get_input();
    $missing = validate_required($input, ['id', 'name', 'category', 'admDate', 'feePerMonth']);

    if (!empty($missing)) {
        json_response(['success' => false, 'error' => 'Missing required fields: ' . implode(', ', $missing)], 400);
    }

    $id = strtoupper(sanitize_string($input['id'], 10));

    // Check unique ID
    $check = $pdo->prepare('SELECT id FROM students WHERE id = ?');
    $check->execute([$id]);
    if ($check->fetch()) {
        json_response(['success' => false, 'error' => 'Student ID already exists'], 409);
    }

    $stmt = $pdo->prepare('
        INSERT INTO students (id, name, category, class, school, contact_no, father_no, mother_no, adm_date, dob, fee_per_month, notes, group_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');

    $stmt->execute([
        $id,
        sanitize_string($input['name'], 100),
        in_array($input['category'], ['Junior', 'Senior']) ? $input['category'] : 'Junior',
        sanitize_string($input['class'] ?? '', 50),
        sanitize_string($input['school'] ?? '', 100),
        sanitize_string($input['contactNo'] ?? '', 15),
        sanitize_string($input['fatherNo'] ?? '', 15),
        sanitize_string($input['motherNo'] ?? '', 15),
        $input['admDate'] && preg_match('/^\d{4}-\d{2}-\d{2}$/', $input['admDate']) ? $input['admDate'] : date('Y-m-d'),
        !empty($input['dob']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $input['dob']) ? $input['dob'] : null,
        (int)$input['feePerMonth'],
        sanitize_string($input['notes'] ?? '', 500),
        !empty($input['group']) ? sanitize_string($input['group'], 10) : null,
    ]);

    // Add entry to audit_logs
    global $user;
    $adminId = $user['sub'] ?? null;
    $auditStmt = $pdo->prepare('INSERT INTO audit_logs (admin_id, action, target_entity, target_id, description) VALUES (?, ?, ?, ?, ?)');
    $auditStmt->execute([
        $adminId,
        'CREATE',
        'student',
        $id,
        "Created student: $id (" . sanitize_string($input['name'], 100) . ")"
    ]);

    json_response(['success' => true, 'id' => $id], 201);
}

function updateStudent(PDO $pdo): void {
    $id = query_param('id');
    if (empty($id)) {
        json_response(['success' => false, 'error' => 'Student ID required'], 400);
    }

    $input = get_input();

    $fields = [];
    $values = [];

    // Allow updating primary key ID if provided and different
    $newId = null;
    if (isset($input['id'])) {
        $newIdVal = strtoupper(sanitize_string($input['id'], 10));
        if ($newIdVal !== strtoupper($id)) {
            // Check if new student ID already exists
            $check = $pdo->prepare('SELECT id FROM students WHERE id = ?');
            $check->execute([$newIdVal]);
            if ($check->fetch()) {
                json_response(['success' => false, 'error' => 'Student ID already exists'], 409);
            }
            $fields[] = '`id` = ?';
            $values[] = $newIdVal;
            $newId = $newIdVal;
        }
    }

    $allowedFields = [
        'name' => ['col' => 'name', 'max' => 100],
        'category' => ['col' => 'category', 'max' => 10],
        'class' => ['col' => 'class', 'max' => 50],
        'school' => ['col' => 'school', 'max' => 100],
        'contactNo' => ['col' => 'contact_no', 'max' => 15],
        'fatherNo' => ['col' => 'father_no', 'max' => 15],
        'motherNo' => ['col' => 'mother_no', 'max' => 15],
        'notes' => ['col' => 'notes', 'max' => 500],
        'group' => ['col' => 'group_id', 'max' => 10],
    ];

    foreach ($allowedFields as $key => $conf) {
        if (isset($input[$key])) {
            $fields[] = "`{$conf['col']}` = ?";
            $values[] = sanitize_string($input[$key], $conf['max']);
        }
    }

    if (isset($input['admDate'])) {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $input['admDate'])) {
            json_response(['success' => false, 'error' => 'Invalid admission date format. Must be YYYY-MM-DD.'], 400);
        }
        $fields[] = '`adm_date` = ?';
        $values[] = $input['admDate'];
    }
    if (isset($input['dob'])) {
        if (!empty($input['dob']) && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $input['dob'])) {
            json_response(['success' => false, 'error' => 'Invalid date of birth format. Must be YYYY-MM-DD.'], 400);
        }
        $fields[] = '`dob` = ?';
        $values[] = !empty($input['dob']) ? $input['dob'] : null;
    }
    if (isset($input['feePerMonth'])) {
        $fields[] = '`fee_per_month` = ?';
        $values[] = (int)$input['feePerMonth'];
    }

    if (empty($fields)) {
        json_response(['success' => false, 'error' => 'No fields to update'], 400);
    }

    $values[] = $id;
    $sql = 'UPDATE students SET ' . implode(', ', $fields) . ' WHERE id = ?';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($values);

    // Add entry to audit_logs
    global $user;
    $adminId = $user['sub'] ?? null;
    $auditStmt = $pdo->prepare('INSERT INTO audit_logs (admin_id, action, target_entity, target_id, description) VALUES (?, ?, ?, ?, ?)');
    $auditStmt->execute([
        $adminId,
        'UPDATE',
        'student',
        $newId ?? $id,
        "Updated student details: " . ($newId ? "$id -> $newId" : $id)
    ]);

    json_response(['success' => true]);
}

function deleteStudent(PDO $pdo): void {
    global $user; // Authenticated user payload
    $id = query_param('id');
    if (empty($id)) {
        json_response(['success' => false, 'error' => 'Student ID required'], 400);
    }

    $pdo->beginTransaction();
    try {
        // Generate a unique 10-character ID to free the original ID for reuse
        $deletedId = '';
        do {
            $deletedId = 'DEL' . substr(md5(uniqid(mt_rand(), true)), 0, 7);
            $check = $pdo->prepare('SELECT id FROM students WHERE id = ?');
            $check->execute([$deletedId]);
        } while ($check->fetch());

        // Soft delete and rename ID. ON UPDATE CASCADE automatically updates associated payments and receipts.
        $stmt = $pdo->prepare('UPDATE students SET id = ?, deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND deleted_at IS NULL');
        $stmt->execute([$deletedId, $id]);

        if ($stmt->rowCount() === 0) {
            $pdo->rollBack();
            json_response(['success' => false, 'error' => 'Student not found or already deleted'], 404);
        }

        // Add entry to audit_logs
        $adminId = $user['sub'] ?? null;
        $auditStmt = $pdo->prepare('INSERT INTO audit_logs (admin_id, action, target_entity, target_id, description) VALUES (?, ?, ?, ?, ?)');
        $auditStmt->execute([
            $adminId,
            'DELETE',
            'student',
            $deletedId,
            "Soft deleted and renamed student: $id -> $deletedId"
        ]);

        $pdo->commit();
        json_response(['success' => true]);
    } catch (Exception $e) {
        $pdo->rollBack();
        write_log('error', 'Failed to soft delete student', ['id' => $id, 'error' => $e->getMessage()]);
        json_response(['success' => false, 'error' => 'Server error during deletion'], 500);
    }
}
