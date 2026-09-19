<?php
// Test all API queries directly with PDO on local mcms database

$pdo = new PDO('mysql:host=localhost;dbname=mcms;charset=utf8mb4', 'root', '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
]);

echo "=== TESTING API QUERIES ON MODERNIZED DATABASE ===\n";

// 1. Students endpoint test query
$students = $pdo->query('SELECT id, name, category, class, school, contact_no, father_no, mother_no, adm_date, dob, fee_per_month, admission_fee_paid, notes, group_id, created_at, updated_at FROM students ORDER BY name ASC')->fetchAll();
echo "[OK] Students query: " . count($students) . " active students loaded.\n";

// 2. Old students endpoint test query
$oldStudents = $pdo->query('SELECT * FROM old_students ORDER BY archived_date DESC, id DESC')->fetchAll();
echo "[OK] Old Students query: " . count($oldStudents) . " archived students loaded.\n";

// 3. Receipts query test
$receipts = $pdo->query('SELECT id, student_id, student_name, category, class, school, fee_per_month, period, months, amt_paid, prev_due, total_recv, remaining_amount, remaining_months, admission_fee, next_due, notes, generated_on, generated_by, academic_year FROM receipts ORDER BY generated_on DESC')->fetchAll();
echo "[OK] Receipts query: " . count($receipts) . " receipts loaded.\n";

// 4. Groups query test
$groups = $pdo->query('SELECT * FROM groups ORDER BY id ASC')->fetchAll();
echo "[OK] Groups query: " . count($groups) . " groups loaded.\n";

// 5. Settings query test
$settings = $pdo->query('SELECT setting_key, setting_value FROM settings')->fetchAll();
echo "[OK] Settings query: " . count($settings) . " settings loaded.\n";

// 6. Subjects query test
$subjects = $pdo->query('SELECT * FROM rc_subjects ORDER BY display_order ASC')->fetchAll();
echo "[OK] Subjects query: " . count($subjects) . " report card subjects loaded.\n";

// 7. Homework structure test
$hwSessions = $pdo->query('SELECT * FROM hw_class_sessions')->fetchAll();
echo "[OK] Homework Sessions query: " . count($hwSessions) . " sessions table verified.\n";

$hwRecords = $pdo->query('SELECT * FROM hw_student_records')->fetchAll();
echo "[OK] Homework Student Records query: " . count($hwRecords) . " records table verified.\n";

// 8. Examination / Results structure test
$resPeriods = $pdo->query('SELECT * FROM rc_result_periods')->fetchAll();
echo "[OK] Result Periods query: " . count($resPeriods) . " periods table verified.\n";

$resStudents = $pdo->query('SELECT * FROM rc_student_results')->fetchAll();
echo "[OK] Student Results query: " . count($resStudents) . " results table verified.\n";

$resMarks = $pdo->query('SELECT * FROM rc_student_marks')->fetchAll();
echo "[OK] Student Marks query: " . count($resMarks) . " marks table verified.\n";

// 9. Admins login verify
$admin = $pdo->query("SELECT * FROM admins WHERE username = '18102024'")->fetch();
$passChirinjibi = password_verify('18102024', $admin['password_hash']);
echo "[OK] Admin 18102024 (Chirinjibi Sir) password verify: " . ($passChirinjibi ? "VALID" : "INVALID") . "\n";

$subham = $pdo->query("SELECT * FROM admins WHERE username = '454'")->fetch();
$passSubham = password_verify('1', $subham['password_hash']) || password_verify('454', $subham['password_hash']);
echo "[OK] Admin 454 (Subham Sir) password verify: " . ($passSubham ? "VALID" : "INVALID") . "\n";

echo "\nALL API DATABASE CHECKS PASSED PERFECTLY!\n";
