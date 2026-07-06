<?php
/* ============================================================
   api/get_puzzle.php
   Returns a Sudoku puzzle from MySQL based on difficulty + idx
   ============================================================ */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once '../config/db.php'; // see config/db.php

$level = $_GET['level'] ?? 'beginner';
$idx   = intval($_GET['idx'] ?? 0);

// Validate level
$allowed = ['beginner', 'normal', 'pro'];
if (!in_array($level, $allowed)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid difficulty level']);
    exit;
}

try {
    $pdo = getPDO();

    // Fetch puzzle by difficulty and ordering
    $stmt = $pdo->prepare(
        "SELECT puzzle, solution, puzzle_number
         FROM sudoku_puzzles
         WHERE difficulty = :level
         ORDER BY puzzle_number
         LIMIT 1 OFFSET :offset"
    );
    $stmt->bindValue(':level',  $level,            PDO::PARAM_STR);
    $stmt->bindValue(':offset', $idx % 3,          PDO::PARAM_INT); // 3 puzzles per level
    $stmt->execute();

    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'Puzzle not found']);
        exit;
    }

    echo json_encode([
        'puzzle'        => $row['puzzle'],
        'solution'      => $row['solution'],
        'puzzle_number' => $row['puzzle_number'],
        'difficulty'    => $level
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}