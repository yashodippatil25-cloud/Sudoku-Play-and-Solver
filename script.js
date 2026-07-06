/* ============================================================
   SUDOKU — script.js
   Play Mode + Solve Mode (frontend logic)
   Backend calls: fetch('api/get_puzzle.php'), fetch('api/solve.php')
   ============================================================ */

/* ═══════════════════════════════════════════════
   THEME SWITCHER
═══════════════════════════════════════════════ */
document.querySelectorAll('.theme-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const theme = btn.dataset.theme;
    document.body.dataset.theme = theme;
    document.body.className = 'theme-' + theme;
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

/* ═══════════════════════════════════════════════
   MODE TABS
═══════════════════════════════════════════════ */
const tabPlay  = document.getElementById('tabPlay');
const tabSolve = document.getElementById('tabSolve');
const panelPlay  = document.getElementById('panelPlay');
const panelSolve = document.getElementById('panelSolve');

tabPlay.addEventListener('click', () => {
  tabPlay.classList.add('active');
  tabSolve.classList.remove('active');
  panelPlay.classList.add('active');
  panelSolve.classList.remove('active');
});
tabSolve.addEventListener('click', () => {
  tabSolve.classList.add('active');
  tabPlay.classList.remove('active');
  panelSolve.classList.add('active');
  panelPlay.classList.remove('active');
  if (!solveGridBuilt) { buildSolveGrid(); solveGridBuilt = true; }
});

/* ═══════════════════════════════════════════════
   BUILT-IN PUZZLES (fallback / demo data)
   In production these come from get_puzzle.php
═══════════════════════════════════════════════ */
const PUZZLES = {
  beginner: [
    // puzzle (81 chars, 0 = empty), solution
    {
      puzzle:   "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
      solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179"
    },
    {
      puzzle:   "200080300060070084030500209000105408000000000402706000301007040720040060004010003",
      solution: "241986375965273184738514269679135428153842697482769531316297840827641963594328712"  /* simplified */
    },
    {
      puzzle:   "000000000020603040075010603400807065900040008260905001850030710030208090000000000",
      solution: "163492857928653741475817693491827365937564128264981537851349276736275984649138452"
    }
  ],
  normal: [
    {
      puzzle:   "800000000003600000070090200060005300400803001005300060000010040000008006000000500",  /* simplified for demo */
      solution: "812753649943682175675491238268145397419873561357926084521034782784269953000000500"  /* note: demo only */
    },
    {
      puzzle:   "000260701680070090190004500820100040004602900050003028009300074040050036703018000",
      solution: "435269781682571493197834562826195347374682915951743628519326874248957136763418259"
    },
    {
      puzzle:   "100007090030020008009600500005300900010080002600004000300000010041000007007000300",
      solution: "162857493534129678789643521425381967917865342638274185356792814241538769873416235"
    }
  ],
  pro: [
    {
      puzzle:   "000000000000003085001620000000090000000000456000800000000000000068000741000000000",
      solution: "987654321246173985351928674128537496634291578795846213519362847863415732472689153"
    },
    {
      puzzle:   "800000000003600000070090200060005300400803001005300060000010040000008006000000500",
      solution: "812753649943682175675491238268145397419837561357926084521034782784269953196578420"
    },
    {
      puzzle:   "000000012000000003002300400001800005060070800000009000008500000900040500470006000",
      solution: "836597412514268793792314865321876945465731829978459361183645237629043518457192683"
    }
  ]
};

/* ═══════════════════════════════════════════════
   PLAY MODE STATE
═══════════════════════════════════════════════ */
let playState = {
  puzzle:      [],   // 0-81 original givens (0=empty)
  solution:    [],   // correct solution
  userBoard:   [],   // current user values
  selected:    -1,   // selected cell index
  mistakes:    0,
  timerSec:    0,
  timerHandle: null,
  difficulty:  'beginner',
  running:     false,
  puzzleIdx:   0
};

const playGrid      = document.getElementById('playGrid');
const mistakeCount  = document.getElementById('mistakeCount');
const timerDisplay  = document.getElementById('timerDisplay');
const puzzleLabel   = document.getElementById('puzzleLabel');
const overlayPlay   = document.getElementById('overlayPlay');
const overlayTitle  = document.getElementById('overlayTitle');
const overlayMsg    = document.getElementById('overlayMsg');
const overlayIcon   = document.getElementById('overlayIcon');

/* ── Build grid DOM ── */
function buildGrid(container, editable = true) {
  container.innerHTML = '';
  for (let i = 0; i < 81; i++) {
    const row = Math.floor(i / 9);
    const col = i % 9;
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;
    cell.dataset.row   = row;
    cell.dataset.col   = col;
    if (editable) {
      cell.addEventListener('click', () => onPlayCellClick(i));
    }
    container.appendChild(cell);
  }
}

function renderPlayBoard() {
  const cells = playGrid.querySelectorAll('.cell');
  cells.forEach((cell, i) => {
    const val = playState.userBoard[i];
    cell.textContent = val > 0 ? val : '';
    cell.className = 'cell';
    if (playState.puzzle[i] > 0) {
      cell.classList.add('given');
    } else if (val > 0) {
      cell.classList.add('user-filled');
    }
  });
  mistakeCount.textContent = playState.mistakes;
}

function highlightRelated(idx) {
  const row = Math.floor(idx / 9);
  const col = idx % 9;
  const boxR = Math.floor(row / 3) * 3;
  const boxC = Math.floor(col / 3) * 3;
  const cells = playGrid.querySelectorAll('.cell');
  cells.forEach((cell, i) => {
    cell.classList.remove('selected', 'highlight');
    const r = Math.floor(i / 9), c = i % 9;
    if (i === idx) cell.classList.add('selected');
    else if (r === row || c === col ||
             (r >= boxR && r < boxR+3 && c >= boxC && c < boxC+3)) {
      cell.classList.add('highlight');
    }
  });
}

function onPlayCellClick(idx) {
  if (!playState.running) return;
  if (playState.puzzle[idx] > 0) return; // given
  playState.selected = idx;
  renderPlayBoard();
  highlightRelated(idx);
}

function triggerScreenFlash() {
  const el = document.getElementById('screenFlash');
  el.classList.remove('flash');
  // Force reflow so animation restarts even on rapid mistakes
  void el.offsetWidth;
  el.classList.add('flash');
  el.addEventListener('animationend', () => el.classList.remove('flash'), { once: true });
}

function enterNumber(num) {
  if (!playState.running) return;
  const idx = playState.selected;
  if (idx < 0 || playState.puzzle[idx] > 0) return;

  if (num === 0) {
    // erase
    playState.userBoard[idx] = 0;
    renderPlayBoard();
    highlightRelated(idx);
    return;
  }

  const correct = playState.solution[idx];
  playState.userBoard[idx] = num;

  if (num !== correct) {
    playState.mistakes++;
    triggerScreenFlash();           // ← screen flash
    const cells = playGrid.querySelectorAll('.cell');
    cells[idx].classList.add('error');
    setTimeout(() => renderPlayBoard(), 600);
    if (playState.mistakes >= 3) {
      gameOver();
      return;
    }
  }

  renderPlayBoard();
  highlightRelated(idx);

  // Check win
  if (checkWin()) gameWin();
}

function checkWin() {
  for (let i = 0; i < 81; i++) {
    if (playState.userBoard[i] !== playState.solution[i]) return false;
  }
  return true;
}

function gameOver() {
  stopTimer();
  playState.running = false;
  overlayIcon.textContent = '💀';
  overlayTitle.textContent = 'Game Over';
  overlayMsg.textContent   = 'Too many mistakes! Try again.';
  overlayPlay.classList.remove('hidden');
}

function gameWin() {
  stopTimer();
  playState.running = false;
  // color win cells
  playGrid.querySelectorAll('.cell').forEach(c => c.classList.add('win-cell'));
  overlayIcon.textContent = '🏆';
  overlayTitle.textContent = 'You Won!';
  overlayMsg.textContent   = `Completed in ${timerDisplay.textContent} with ${playState.mistakes} mistake(s).`;
  setTimeout(() => overlayPlay.classList.remove('hidden'), 700);
}

/* ── Timer ── */
function startTimer() {
  stopTimer();
  playState.timerSec = 0;
  updateTimerDisplay();
  playState.timerHandle = setInterval(() => {
    playState.timerSec++;
    updateTimerDisplay();
  }, 1000);
}
function stopTimer() {
  if (playState.timerHandle) {
    clearInterval(playState.timerHandle);
    playState.timerHandle = null;
  }
}
function updateTimerDisplay() {
  const m = String(Math.floor(playState.timerSec / 60)).padStart(2, '0');
  const s = String(playState.timerSec % 60).padStart(2, '0');
  timerDisplay.textContent = `${m}:${s}`;
}

/* ── Load puzzle ── */
async function loadPuzzle() {
  const level = playState.difficulty;
  const list  = PUZZLES[level];
  const idx   = Math.floor(Math.random() * list.length);
  playState.puzzleIdx = idx;
  let p, sol;

  try {
    // Attempt to fetch from PHP backend
    const res = await fetch(`api/get_puzzle.php?level=${level}&idx=${idx}`);
    if (!res.ok) throw new Error('No backend');
    const data = await res.json();
    p   = data.puzzle.split('').map(Number);
    sol = data.solution.split('').map(Number);
  } catch {
    // Fallback to built-in puzzles
    p   = list[idx].puzzle.split('').map(Number);
    sol = list[idx].solution.split('').map(Number);
  }

  playState.puzzle    = p;
  playState.solution  = sol;
  playState.userBoard = [...p];
  playState.mistakes  = 0;
  playState.selected  = -1;
  playState.running   = true;
  puzzleLabel.textContent = `${level} #${idx + 1}`;
  overlayPlay.classList.add('hidden');

  buildGrid(playGrid);
  renderPlayBoard();
  startTimer();
}

/* ── Difficulty buttons ── */
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    playState.difficulty = btn.dataset.level;
  });
});

/* ── New Game ── */
document.getElementById('btnNewGame').addEventListener('click', () => {
  loadPuzzle();
});

/* ── Reset ── */
document.getElementById('btnResetPlay').addEventListener('click', () => {
  if (!playState.running) return;
  playState.userBoard = [...playState.puzzle];
  playState.mistakes  = 0;
  playState.selected  = -1;
  renderPlayBoard();
  startTimer();
});

/* ── Retry (overlay button) ── */
document.getElementById('overlayRetry').addEventListener('click', () => {
  overlayPlay.classList.add('hidden');
  loadPuzzle();
});

/* ── Numpad ── */
document.querySelectorAll('#playNumpad .num-btn').forEach(btn => {
  btn.addEventListener('click', () => enterNumber(Number(btn.dataset.num)));
});

/* ── Keyboard ── */
document.addEventListener('keydown', e => {
  if (panelPlay.classList.contains('active')) {
    if (e.key >= '1' && e.key <= '9') enterNumber(Number(e.key));
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') enterNumber(0);
    if (e.key === 'ArrowRight' && playState.selected >= 0) {
      playState.selected = Math.min(80, playState.selected + 1);
      highlightRelated(playState.selected);
    }
    if (e.key === 'ArrowLeft' && playState.selected >= 0) {
      playState.selected = Math.max(0, playState.selected - 1);
      highlightRelated(playState.selected);
    }
    if (e.key === 'ArrowDown' && playState.selected >= 0) {
      playState.selected = Math.min(80, playState.selected + 9);
      highlightRelated(playState.selected);
    }
    if (e.key === 'ArrowUp' && playState.selected >= 0) {
      playState.selected = Math.max(0, playState.selected - 9);
      highlightRelated(playState.selected);
    }
  }
});

/* ═══════════════════════════════════════════════
   SOLVE MODE
═══════════════════════════════════════════════ */
let solveGridBuilt   = false;
let solveSelectedIdx = -1;
let solveCells       = [];
const solveGrid   = document.getElementById('solveGrid');
const btnSolve    = document.getElementById('btnSolve');
const btnClear    = document.getElementById('btnClearSolve');
const solveResult = document.getElementById('solveResult');
const resultBadge = document.getElementById('resultBadge');

function buildSolveGrid() {
  buildSolveGridDOM();
}

function buildSolveGridDOM() {
  solveGrid.innerHTML = '';
  solveCells = [];
  for (let i = 0; i < 81; i++) {
    const row = Math.floor(i / 9), col = i % 9;
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;
    cell.dataset.row   = row;
    cell.dataset.col   = col;
    cell.contentEditable = true;
    cell.inputMode = 'numeric';
    cell.addEventListener('click', () => {
      solveSelectedIdx = i;
      solveGrid.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
    });
    cell.addEventListener('keydown', e => {
      e.preventDefault();
      if (e.key >= '1' && e.key <= '9') {
        cell.textContent = e.key;
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        cell.textContent = '';
      }
      // arrow nav
      if (e.key === 'ArrowRight') moveSolveSel(i, 0, 1);
      if (e.key === 'ArrowLeft')  moveSolveSel(i, 0, -1);
      if (e.key === 'ArrowDown')  moveSolveSel(i, 1, 0);
      if (e.key === 'ArrowUp')    moveSolveSel(i, -1, 0);
    });
    solveGrid.appendChild(cell);
    solveCells.push(cell);
  }
}

function moveSolveSel(idx, dr, dc) {
  const r = Math.floor(idx / 9) + dr;
  const c = (idx % 9) + dc;
  if (r < 0 || r > 8 || c < 0 || c > 8) return;
  const ni = r * 9 + c;
  solveCells[ni].focus();
  solveSelectedIdx = ni;
  solveGrid.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
  solveCells[ni].classList.add('selected');
}

/* ── JS Backtracking solver (client-side fallback) ── */
function jsSolve(board) {
  const b = [...board];
  function isValid(idx, val) {
    const row = Math.floor(idx / 9), col = idx % 9;
    const boxR = Math.floor(row / 3) * 3, boxC = Math.floor(col / 3) * 3;
    for (let i = 0; i < 9; i++) {
      if (b[row * 9 + i] === val) return false;
      if (b[i * 9 + col] === val) return false;
      const r = boxR + Math.floor(i / 3), c = boxC + (i % 3);
      if (b[r * 9 + c] === val) return false;
    }
    return true;
  }
  function bt(pos) {
    while (pos < 81 && b[pos] !== 0) pos++;
    if (pos === 81) return true;
    for (let v = 1; v <= 9; v++) {
      if (isValid(pos, v)) {
        b[pos] = v;
        if (bt(pos + 1)) return true;
        b[pos] = 0;
      }
    }
    return false;
  }
  return bt(0) ? b : null;
}

btnSolve.addEventListener('click', async () => {
  solveResult.classList.add('hidden');

  // Read board from grid
  const board = solveCells.map(c => {
    const v = parseInt(c.textContent.trim(), 10);
    return isNaN(v) || v < 1 || v > 9 ? 0 : v;
  });

  let solved = null;

  try {
    // Try C++ solver via PHP
    const res = await fetch('api/solve.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ board: board.join('') })
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    if (data.solved) {
      solved = data.solution.split('').map(Number);
    } else {
      solved = null;
    }
  } catch {
    // Fallback: JS backtracking solver
    solved = jsSolve(board);
  }

  if (!solved) {
    resultBadge.textContent = '✗ Not Possible — Invalid or unsolvable puzzle';
    resultBadge.className = 'result-badge fail';
    solveResult.classList.remove('hidden');
    return;
  }

  // Animate solution
  solveCells.forEach((cell, i) => {
    const wasEmpty = board[i] === 0;
    cell.contentEditable = false;
    cell.textContent = solved[i];
    cell.className = 'cell';
    if (wasEmpty) {
      // Stagger animation
      setTimeout(() => cell.classList.add('solved-cell'), i * 8);
    } else {
      cell.classList.add('given');
    }
  });

  resultBadge.textContent = '✔ Solved!';
  resultBadge.className = 'result-badge success';
  solveResult.classList.remove('hidden');
});

btnClear.addEventListener('click', () => {
  solveCells.forEach(c => {
    c.textContent = '';
    c.className = 'cell';
    c.contentEditable = true;
  });
  solveResult.classList.add('hidden');
  solveSelectedIdx = -1;
});

buildGrid(playGrid);
loadPuzzle();