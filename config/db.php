<?php
/* ============================================================
   config/db.php
   PDO database connection — update credentials below
   ============================================================ */

define('DB_HOST', 'localhost');
define('DB_NAME', 'sudoku_db');
define('DB_USER', 'root');       // ← change this
define('DB_PASS', '');           // ← change this
define('DB_CHAR', 'utf8mb4');

function getPDO(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        DB_HOST, DB_NAME, DB_CHAR
    );
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    return $pdo;
}