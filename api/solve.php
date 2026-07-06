<?php
/* ============================================================
   api/solve.php
   Receives an 81-char board string, passes it to the C++ solver
   binary, and returns the solved board or "not possible".

   C++ binary location: ../bin/sudoku_solver
   Usage: ./sudoku_solver "530070000600195000..."
   ============================================================ */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$body  = file_get_contents('php://input');
$data  = json_decode($body, true);
$board = $data['board'] ?? '';

// Validate input
if (!preg_match('/^[0-9]{81}$/', $board)) {
    http_response_code(400);
    echo json_encode(['error' => 'Board must be exactly 81 digits (0-9)']);
    exit;
}

// Path to compiled C++ solver
$solverBin = __DIR__ . '/../bin/sudoku_solver';

if (!file_exists($solverBin) || !is_executable($solverBin)) {
    // C++ binary not available — tell JS to use its own solver
    http_response_code(503);
    echo json_encode(['error' => 'Solver binary not available']);
    exit;
}

// Sanitize and run C++ solver
$escapedBoard = escapeshellarg($board);
$output       = shell_exec("$solverBin $escapedBoard 2>&1");
$output       = trim($output ?? '');

// The C++ binary outputs either 81 digits (solved) or "NOT_POSSIBLE"
if (preg_match('/^[1-9]{81}$/', $output)) {
    echo json_encode([
        'solved'   => true,
        'solution' => $output
    ]);
} else {
    echo json_encode([
        'solved'  => false,
        'message' => 'Not Possible'
    ]);
}