<?php
/**
 * MCMS — Shared Utility Functions
 */

// CORS headers for API
function cors_headers(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    // Load allowed origins from environment (default to localhost)
    $allowedOriginsStr = get_env('ALLOWED_ORIGINS', 'http://localhost:5173');
    $allowedOrigins = array_map('trim', explode(',', $allowedOriginsStr));

    // Detect same-origin requests (same host and port)
    $isSameOrigin = false;
    $host = $_SERVER['HTTP_HOST'] ?? '';
    if (!empty($origin) && !empty($host)) {
        $parsedOriginHost = parse_url($origin, PHP_URL_HOST);
        $parsedOriginPort = parse_url($origin, PHP_URL_PORT);
        
        $parsedServerHost = parse_url('http://' . $host, PHP_URL_HOST);
        $parsedServerPort = parse_url('http://' . $host, PHP_URL_PORT);
        
        if ($parsedOriginHost === $parsedServerHost && $parsedOriginPort == $parsedServerPort) {
            $isSameOrigin = true;
        }
    }

    if (in_array($origin, $allowedOrigins, true) || $isSameOrigin) {
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Credentials: true');
    }

    // Enforce Origin check for state-changing requests (POST, PUT, DELETE) to prevent CSRF
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (in_array($method, ['POST', 'PUT', 'DELETE'], true)) {
        if (!empty($origin) && !in_array($origin, $allowedOrigins, true) && !$isSameOrigin) {
            write_log('warning', 'CORS / CSRF Block: Request from unauthorized origin', ['origin' => $origin, 'method' => $method]);
            json_response(['success' => false, 'error' => 'Forbidden origin'], 403);
        }
    }

    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
    header('Access-Control-Max-Age: 86400');
    header('Content-Type: application/json; charset=utf-8');

    // Handle preflight
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/**
 * Send JSON response
 * @param mixed $data Response data
 * @param int $code HTTP status code
 */
function json_response($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Parse JSON request body
 * @return array
 */
function get_input(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/**
 * Validate required fields
 * @param array $data Input data
 * @param array $fields Required field names
 * @return array Missing fields
 */
function validate_required(array $data, array $fields): array {
    $missing = [];
    foreach ($fields as $field) {
        if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
            $missing[] = $field;
        }
    }
    return $missing;
}

/**
 * Sanitize string input
 * @param string $str
 * @param int $maxLen
 * @return string
 */
function sanitize_string(string $str, int $maxLen = 255): string {
    return mb_substr(trim($str), 0, $maxLen);
}

/**
 * Get request method
 * @return string
 */
function request_method(): string {
    return strtoupper($_SERVER['REQUEST_METHOD']);
}

/**
 * Get query parameter with length limit
 * @param string $key
 * @param string $default
 * @param int $maxLen
 * @return string
 */
function query_param(string $key, string $default = '', int $maxLen = 255): string {
    if (!isset($_GET[$key])) {
        return $default;
    }
    $val = trim($_GET[$key]);
    return mb_substr($val, 0, $maxLen);
}

/**
 * Write structured JSON log
 * @param string $level Log level (info, warning, error)
 * @param string $message Log message
 * @param array $context Additional context metadata
 */
function write_log(string $level, string $message, array $context = []): void {
    $logDir = __DIR__ . '/../data/logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }
    
    $logFile = $logDir . '/app.log';

    // Size-based rotation: rotate when log exceeds 5MB
    $maxSize = 5 * 1024 * 1024; // 5MB
    if (file_exists($logFile) && filesize($logFile) > $maxSize) {
        $rotatedName = $logDir . '/app-' . date('Y-m-d_His') . '.log';
        @rename($logFile, $rotatedName);
    }

    // Prune rotated logs older than 30 days
    static $lastPrune = 0;
    $now = time();
    if ($now - $lastPrune > 86400) { // Check once per day per process
        $lastPrune = $now;
        $files = glob($logDir . '/app-*.log');
        if ($files) {
            foreach ($files as $file) {
                if (filemtime($file) < $now - (30 * 86400)) {
                    @unlink($file);
                }
            }
        }
    }

    $logEntry = json_encode([
        'timestamp' => date('Y-m-d H:i:s'),
        'level' => strtoupper($level),
        'message' => $message,
        'context' => $context,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
        'uri' => $_SERVER['REQUEST_URI'] ?? ''
    ], JSON_UNESCAPED_UNICODE) . "\n";
    
    @error_log($logEntry, 3, $logFile);
}

/**
 * Compute payment status for a student in a specific academic year on-the-fly from receipts
 * @param PDO $pdo
 * @param string $studentId
 * @param string $academicYear
 * @return array List of month-wise payment states
 */
function compute_payments_for_student(PDO $pdo, string $studentId, string $academicYear): array {
    // 1. Get student fee_per_month
    $stmt = $pdo->prepare('SELECT fee_per_month FROM students WHERE id = ?');
    $stmt->execute([$studentId]);
    $student = $stmt->fetch();
    if (!$student) {
        return [];
    }
    $feePerMonth = (int)$student['fee_per_month'];

    // 2. Fetch all receipts for this student and year in chronological order
    $receiptsStmt = $pdo->prepare('SELECT amt_paid, prev_due, months, generated_on FROM receipts WHERE student_id = ? AND academic_year = ? ORDER BY generated_on ASC');
    $receiptsStmt->execute([$studentId, $academicYear]);
    $receipts = $receiptsStmt->fetchAll();

    return allocate_receipts_to_months($receipts, $feePerMonth, $studentId, $academicYear);
}

/**
 * Allocate receipts to months chronologically
 * @param array $receipts
 * @param int $feePerMonth
 * @param string $studentId
 * @param string $academicYear
 * @return array
 */
function allocate_receipts_to_months(array $receipts, int $feePerMonth, string $studentId, string $academicYear): array {
    $paymentsState = [];
    $monthOrder = ["MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC","JAN","FEB"];

    // Fetch student's admission date to find their starting month index
    $admAcademicIndex = 0;
    try {
        $pdo = get_db();
        $stmt = $pdo->prepare('SELECT adm_date FROM students WHERE id = ?');
        $stmt->execute([$studentId]);
        $admDate = $stmt->fetchColumn();
        if (!empty($admDate)) {
            $admTime = strtotime($admDate);
            $admMonth = (int)date('n', $admTime);
            $admYear = (int)date('Y', $admTime);
            $admAcademicYear = ($admMonth >= 3) ? $admYear : ($admYear - 1);
            
            $parts = explode('-', $academicYear);
            $selectedAcademicYear = (int)($parts[0] ?? 2026);
            
            if ($admAcademicYear > $selectedAcademicYear) {
                $admAcademicIndex = 12;
            } else if ($admAcademicYear === $selectedAcademicYear) {
                $calendarToAcademic = [
                    3 => 0, 4 => 1, 5 => 2, 6 => 3, 7 => 4, 8 => 5,
                    9 => 6, 10 => 7, 11 => 8, 12 => 9, 1 => 10, 2 => 11
                ];
                $admAcademicIndex = $calendarToAcademic[$admMonth] ?? 0;
            }
        }
    } catch (Exception $e) {
        // Fallback to 0 if database or query fails
    }

    foreach ($receipts as $receipt) {
        $months = is_string($receipt['months']) ? (json_decode($receipt['months'], true) ?: []) : ($receipt['months'] ?: []);
        if (empty($months)) continue;

        // Sort months in academic order
        usort($months, function($a, $b) use ($monthOrder) {
            return array_search($a, $monthOrder) - array_search($b, $monthOrder);
        });

        // 1. Allocate prev_due chronologically to unpaid/partially paid months before or equal to the last month of the receipt
        $prevDueRemaining = (int)($receipt['prev_due'] ?? 0);
        if ($prevDueRemaining > 0) {
            $lastMonth = $months[count($months) - 1];
            $lastMonthIndex = array_search($lastMonth, $monthOrder);
            if ($lastMonthIndex !== false) {
                for ($i = $admAcademicIndex; $i <= $lastMonthIndex; $i++) {
                    if ($prevDueRemaining <= 0) break;
                    
                    $m = $monthOrder[$i];
                    $alreadyPaid = $paymentsState[$m]['amount'] ?? 0;
                    $due = max(0, $feePerMonth - $alreadyPaid);
                    
                    if ($due > 0) {
                        $alloc = min($prevDueRemaining, $due);
                        $prevDueRemaining -= $alloc;
                        
                        $paymentsState[$m] = [
                            'student_id' => $studentId,
                            'month' => $m,
                            'paid' => true,
                            'amount' => $alreadyPaid + $alloc,
                            'date' => substr($receipt['generated_on'], 0, 10),
                            'academic_year' => $academicYear
                        ];
                    }
                }
            }
        }

        // 2. Allocate amt_paid to the months of the receipt
        $remaining = (int)$receipt['amt_paid'];

        foreach ($months as $month) {
            $alreadyPaid = $paymentsState[$month]['amount'] ?? 0;
            $due = max(0, $feePerMonth - $alreadyPaid);

            if ($remaining >= $due) {
                $alloc = $due;
                $remaining -= $due;
            } else {
                $alloc = $remaining;
                $remaining = 0;
            }

            $paymentsState[$month] = [
                'student_id' => $studentId,
                'month' => $month,
                'paid' => true,
                'amount' => $alreadyPaid + $alloc,
                'date' => substr($receipt['generated_on'], 0, 10),
                'academic_year' => $academicYear
            ];
        }

        if ($remaining > 0 && count($months) > 0) {
            $lastMonth = $months[count($months) - 1];
            $paymentsState[$lastMonth]['amount'] += $remaining;
        }
    }

    // Convert keys to sequential array, and match output schema
    $result = [];
    foreach ($monthOrder as $m) {
        if (isset($paymentsState[$m])) {
            $result[] = $paymentsState[$m];
        }
    }
    return $result;
}
