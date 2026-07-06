/*
 * ============================================================
 * solver/sudoku_solver.cpp
 * Backtracking Sudoku Solver
 *
 * Compile:
 *   g++ -O2 -o ../bin/sudoku_solver sudoku_solver.cpp
 *
 * Usage:
 *   ./sudoku_solver "530070000600195000098000060800060003400803001700020006060000280000419005000080079"
 *
 * Output:
 *   Prints 81-digit solved string on success, or "NOT_POSSIBLE" on failure.
 * ============================================================
 */

#include <iostream>
#include <string>
#include <array>
#include <cstring>

using Board = std::array<int, 81>;

/* ── Validate a single placement ── */
bool isValid(const Board& b, int pos, int val) {
    int row = pos / 9;
    int col = pos % 9;
    int boxRow = (row / 3) * 3;
    int boxCol = (col / 3) * 3;

    for (int i = 0; i < 9; i++) {
        // Row check
        if (b[row * 9 + i] == val) return false;
        // Column check
        if (b[i * 9 + col] == val) return false;
        // 3×3 box check
        int r = boxRow + i / 3;
        int c = boxCol + i % 3;
        if (b[r * 9 + c] == val) return false;
    }
    return true;
}

/* ── Backtracking solver ── */
bool solve(Board& b, int pos = 0) {
    // Skip filled cells
    while (pos < 81 && b[pos] != 0) pos++;

    // All cells filled → solution found
    if (pos == 81) return true;

    for (int val = 1; val <= 9; val++) {
        if (isValid(b, pos, val)) {
            b[pos] = val;
            if (solve(b, pos + 1)) return true;
            b[pos] = 0; // backtrack
        }
    }
    return false; // trigger backtrack
}

/* ── Validate input puzzle (no conflicts in givens) ── */
bool validateInput(const Board& b) {
    for (int pos = 0; pos < 81; pos++) {
        if (b[pos] == 0) continue;
        int val = b[pos];

        // Temporarily zero out to check cleanly
        Board tmp = b;
        tmp[pos] = 0;
        if (!isValid(tmp, pos, val)) return false;
    }
    return true;
}

/* ── Main ── */
int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "Usage: " << argv[0] << " <81-char-board-string>\n";
        std::cerr << "  Use 0 for empty cells.\n";
        return 1;
    }

    std::string input(argv[1]);

    // Basic length check
    if (input.size() != 81) {
        std::cerr << "NOT_POSSIBLE\n";
        return 1;
    }

    Board board{};
    for (int i = 0; i < 81; i++) {
        char ch = input[i];
        if (ch < '0' || ch > '9') {
            std::cerr << "NOT_POSSIBLE\n";
            return 1;
        }
        board[i] = ch - '0';
    }

    // Validate given clues
    if (!validateInput(board)) {
        std::cout << "NOT_POSSIBLE\n";
        return 0;
    }

    // Solve
    if (solve(board)) {
        for (int v : board) std::cout << v;
        std::cout << "\n";
    } else {
        std::cout << "NOT_POSSIBLE\n";
    }

    return 0;
}