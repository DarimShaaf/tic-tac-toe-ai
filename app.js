/* Tic-Tac-Toe vs Computer (Easy/Hard) */

const els = {
  board: document.getElementById("board"),
  turnPill: document.getElementById("turnPill"),
  scorePill: document.getElementById("scorePill"),
  newBtn: document.getElementById("newBtn"),
  resetScoreBtn: document.getElementById("resetScoreBtn"),
};

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/** @type {("X"|"O"|"")[]} */
let board = Array(9).fill("");

let human = "X";
let cpu = "O";
let difficulty = "hard"; // "easy" | "hard"

let current = "X";
let gameOver = false;
let lastMove = -1;
let winningLine = null;

let score = { human: 0, cpu: 0, draw: 0 };

/** @type {HTMLButtonElement[]} */
let cellEls = [];

// Load and save scores from localStorage
function loadScore() {
  const saved = localStorage.getItem('tictactoe-score');
  if (saved) {
    try {
      score = JSON.parse(saved);
    } catch (e) {
      score = { human: 0, cpu: 0, draw: 0 };
    }
  }
}

function saveScore() {
  localStorage.setItem('tictactoe-score', JSON.stringify(score));
}

function other(p) {
  return p === "X" ? "O" : "X";
}

function setSegActive(selector, activeValue, attr) {
  document.querySelectorAll(selector).forEach((btn) => {
    const v = btn.getAttribute(attr);
    btn.classList.toggle("isActive", v === activeValue);
  });
}

function setTurnText(text) {
  els.turnPill.textContent = text;
}

function setScoreText() {
  els.scorePill.textContent = `You ${score.human} · CPU ${score.cpu} · Draw ${score.draw}`;
}

function getWinner(b) {
  for (const line of WIN_LINES) {
    const [a, c, d] = line;
    const v = b[a];
    if (v && v === b[c] && v === b[d]) return { winner: v, line };
  }
  return { winner: "", line: null };
}

function isDraw(b) {
  return b.every((x) => x !== "") && !getWinner(b).winner;
}

function emptyMoves(b) {
  const moves = [];
  for (let i = 0; i < 9; i++) if (b[i] === "") moves.push(i);
  return moves;
}

function render() {
  for (let i = 0; i < 9; i++) {
    const el = cellEls[i];
    const v = board[i];
    el.textContent = v;
    el.classList.toggle("disabled", gameOver || v !== "" || current !== human);
    el.classList.toggle("isLast", i === lastMove && lastMove !== -1);
    el.classList.toggle("isWinning", !!winningLine && winningLine.includes(i));
    el.setAttribute(
      "aria-label",
      `Row ${Math.floor(i / 3) + 1}, Col ${(i % 3) + 1}, ${v ? v : "empty"}`
    );
  }

  if (gameOver) {
    const { winner } = getWinner(board);
    if (winner === human) setTurnText("You win");
    else if (winner === cpu) setTurnText("CPU wins");
    else setTurnText("Draw");
  } else {
    setTurnText(current === human ? "Your turn" : "CPU thinking…");
  }

  setScoreText();
}

function buildBoardOnce() {
  els.board.innerHTML = "";
  cellEls = [];

  for (let i = 0; i < 9; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cell";
    btn.setAttribute("role", "gridcell");
    btn.setAttribute("aria-rowindex", String(Math.floor(i / 3) + 1));
    btn.setAttribute("aria-colindex", String((i % 3) + 1));
    btn.dataset.idx = String(i);
    btn.addEventListener("click", () => tryHumanMove(i));
    cellEls.push(btn);
    els.board.appendChild(btn);
  }
}

function endIfNeeded() {
  const res = getWinner(board);
  if (res.winner) {
    gameOver = true;
    winningLine = res.line;
    if (res.winner === human) score.human += 1;
    else score.cpu += 1;
    saveScore();
    return true;
  }
  if (isDraw(board)) {
    gameOver = true;
    winningLine = null;
    score.draw += 1;
    saveScore();
    return true;
  }
  return false;
}

function newRound({ cpuStarts = null } = {}) {
  board = Array(9).fill("");
  gameOver = false;
  lastMove = -1;
  winningLine = null;

  // If human chose O, CPU should start as X by default
  if (cpuStarts === null) {
    current = "X";
  } else {
    current = cpuStarts ? cpu : human;
  }

  render();
  maybeCpuMove();
}

function applyMove(idx, player) {
  if (board[idx] !== "") return false;
  board[idx] = player;
  lastMove = idx;
  return true;
}

function tryHumanMove(idx) {
  if (gameOver) return;
  if (current !== human) return;
  if (!applyMove(idx, human)) return;

  if (endIfNeeded()) {
    render();
    return;
  }

  current = cpu;
  render();
  maybeCpuMove();
}

function maybeCpuMove() {
  if (gameOver) return;
  if (current !== cpu) return;

  // slight delay for UX
  window.setTimeout(() => {
    if (gameOver || current !== cpu) return;
    const idx = chooseCpuMove();
    applyMove(idx, cpu);

    if (endIfNeeded()) {
      render();
      return;
    }

    current = human;
    render();
  }, 220);
}

function chooseCpuMove() {
  const moves = emptyMoves(board);
  if (moves.length === 0) return 0;

  if (difficulty === "easy") {
    // 35% random, else "hard" move
    if (Math.random() < 0.35) return moves[Math.floor(Math.random() * moves.length)];
  }

  return bestMoveMinimax(board, cpu).idx;
}

function bestMoveMinimax(b, player) {
  // Returns best move for `player` assuming perfect play.
  // Score from CPU perspective: win=+10, loss=-10, draw=0 (with depth)
  const { winner } = getWinner(b);
  if (winner === cpu) return { idx: -1, score: 10 };
  if (winner === human) return { idx: -1, score: -10 };
  if (b.every((x) => x !== "")) return { idx: -1, score: 0 };

  const moves = emptyMoves(b);
  let best = { idx: moves[0], score: player === cpu ? -Infinity : Infinity };

  for (const idx of moves) {
    const next = b.slice();
    next[idx] = player;
    const result = bestMoveMinimax(next, other(player));

    // depth adjustment: prefer quicker wins and slower losses
    const scoreAdjusted = result.score + (result.score > 0 ? -1 : result.score < 0 ? 1 : 0);

    if (player === cpu) {
      if (scoreAdjusted > best.score) best = { idx, score: scoreAdjusted };
    } else {
      if (scoreAdjusted < best.score) best = { idx, score: scoreAdjusted };
    }
  }

  return best;
}

function wireControls() {
  document.querySelectorAll("[data-human]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nextHuman = btn.getAttribute("data-human");
      if (nextHuman !== "X" && nextHuman !== "O") return;

      human = nextHuman;
      cpu = other(human);

      setSegActive("[data-human]", human, "data-human");
      newRound({ cpuStarts: human === "O" }); // if human is O, CPU starts
    });
  });

  document.querySelectorAll("[data-difficulty]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = btn.getAttribute("data-difficulty");
      if (next !== "easy" && next !== "hard") return;
      difficulty = next;
      setSegActive("[data-difficulty]", difficulty, "data-difficulty");
      render();
    });
  });

  els.newBtn.addEventListener("click", () => newRound({ cpuStarts: human === "O" }));
  els.resetScoreBtn.addEventListener("click", () => {
    score = { human: 0, cpu: 0, draw: 0 };
    saveScore();
    setScoreText();
  });

  // Keyboard: 1-9 like numpad (1 bottom-left, 9 top-right)
  const keyToIdx = {
    "7": 0,
    "8": 1,
    "9": 2,
    "4": 3,
    "5": 4,
    "6": 5,
    "1": 6,
    "2": 7,
    "3": 8,
  };
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const idx = keyToIdx[e.key];
    if (idx === undefined) return;
    e.preventDefault();
    tryHumanMove(idx);
  });
}

function init() {
  buildBoardOnce();
  wireControls();
  loadScore();
  setSegActive("[data-human]", human, "data-human");
  setSegActive("[data-difficulty]", difficulty, "data-difficulty");
  setScoreText();
  newRound({ cpuStarts: false });
}

init();

