const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('best-score');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const startButton = document.getElementById('start-button');

const TILE = 32;
const ROWS = 15;
const COLS = 15;
const START_LIVES = 3;
const BASE_SPEED = 140;

const levelMaps = [
  [
    '111111111111111',
    '100000100000001',
    '101111101111101',
    '100001000010001',
    '101101111101101',
    '100100000100001',
    '111101011101111',
    '000101000101000',
    '111101011101111',
    '100100000100001',
    '101101111101101',
    '100001000010001',
    '101111101111101',
    '100000100000001',
    '111111111111111',
  ],
  [
    '111111111111111',
    '100000000000001',
    '101111011111101',
    '100001010000001',
    '101101010110101',
    '100100010100001',
    '111101010111111',
    '000101000001000',
    '111101011101111',
    '100001000010001',
    '101111011110101',
    '100000010000001',
    '101111110111101',
    '100000000000001',
    '111111111111111',
  ],
  [
    '111111111111111',
    '100000100000001',
    '101111101111101',
    '100000000000001',
    '101101111101101',
    '100101000101001',
    '111101011101111',
    '000100010001000',
    '111101010111111',
    '100001010000001',
    '101111010111101',
    '100000000000001',
    '101111101111101',
    '100000100000001',
    '111111111111111',
  ],
];

const directionKeys = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
};

let player;
let ghosts;
let maze;
let pellets;
let powerPellets;
let score;
let bestScore;
let lives;
let level;
let activeDirection;
let lastMove;
let transitionTimer;
let powerTimer;
let gameStarted;
let gameOver;

function initState() {
  bestScore = Number(localStorage.getItem('maze-chomp-best') || 0);
  bestScoreEl.textContent = String(bestScore);
  score = 0;
  lives = START_LIVES;
  level = 1;
  activeDirection = { x: 0, y: 0 };
  lastMove = 0;
  transitionTimer = 0;
  powerTimer = 0;
  gameStarted = false;
  gameOver = false;
  overlay.classList.remove('hidden');
  overlayTitle.textContent = 'Ready?';
  overlayText.textContent = 'Use the arrow keys or WASD to chomp your way through the maze.';
  startButton.textContent = 'Start game';
  buildLevel(level);
  updateHud();
}

function buildLevel(currentLevel) {
  const chosen = levelMaps[(currentLevel - 1) % levelMaps.length];
  maze = chosen.map((row) => row.split('').map((cell) => Number(cell)));

  player = { x: 1, y: 1 };
  ghosts = [
    { x: 13, y: 1, color: '#ff6b6b', mode: 'chase', buffer: 0 },
    { x: 11, y: 13, color: '#ffd166', mode: 'chase', buffer: 0 },
    { x: 1, y: 13, color: '#7ee8a8', mode: 'chase', buffer: 0 },
  ];

  pellets = [];
  powerPellets = [];
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (maze[y][x] === 0) {
        const isStart = (x === 1 && y === 1) || ghostStarts.some(([gx, gy]) => gx === x && gy === y);
        if (!isStart) {
          pellets.push({ x, y });
        }
      }
    }
  }

  const powerSpawnPoints = [
    [1, 1],
    [13, 1],
    [1, 13],
    [13, 13],
  ];

  for (const [x, y] of powerSpawnPoints) {
    if (maze[y][x] === 0 && !(x === 1 && y === 1)) {
      powerPellets.push({ x, y, active: true });
    }
  }

  transitionTimer = 0;
  powerTimer = 0;
  updateHud();
}

const ghostStarts = [
  [13, 1],
  [11, 13],
  [1, 13],
];

function updateHud() {
  scoreEl.textContent = String(score);
  bestScoreEl.textContent = String(bestScore);
  levelEl.textContent = String(level);
  livesEl.textContent = String(lives);
}

function startGame() {
  score = 0;
  lives = START_LIVES;
  level = 1;
  bestScore = Number(localStorage.getItem('maze-chomp-best') || 0);
  buildLevel(level);
  gameStarted = true;
  gameOver = false;
  overlay.classList.add('hidden');
  updateHud();
}

function isWall(x, y) {
  return x < 0 || x >= COLS || y < 0 || y >= ROWS || maze[y][x] === 1;
}

function attemptMove(entity, dx, dy) {
  const nx = entity.x + dx;
  const ny = entity.y + dy;
  if (!isWall(nx, ny)) {
    entity.x = nx;
    entity.y = ny;
    return true;
  }
  return false;
}

function collectPellets() {
  const remaining = pellets.filter((pellet) => !(pellet.x === player.x && pellet.y === player.y));
  if (remaining.length !== pellets.length) {
    score += 10;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('maze-chomp-best', String(bestScore));
    }
  }
  pellets = remaining;

  const activePower = powerPellets.find((pellet) => pellet.x === player.x && pellet.y === player.y && pellet.active);
  if (activePower) {
    activePower.active = false;
    powerTimer = 5000;
    score += 25;
    ghosts.forEach((ghost) => {
      ghost.mode = 'scared';
    });
  }

  if (pellets.length === 0) {
    transitionTimer = 1.2;
    level += 1;
  }
}

function movePlayer() {
  const dx = activeDirection.x;
  const dy = activeDirection.y;
  if (dx !== 0 || dy !== 0) {
    attemptMove(player, dx, dy);
    collectPellets();
  }
}

function moveGhost(ghost) {
  const options = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  let bestOption = null;
  let bestScore = Infinity;

  for (const option of options) {
    const nx = ghost.x + option.x;
    const ny = ghost.y + option.y;
    if (isWall(nx, ny)) continue;

    const targetX = ghost.mode === 'scared' ? 0 : player.x;
    const targetY = ghost.mode === 'scared' ? 0 : player.y;
    const diff = Math.abs((nx - targetX)) + Math.abs((ny - targetY));

    if (diff < bestScore) {
      bestScore = diff;
      bestOption = option;
    }
  }

  if (bestOption) {
    ghost.x += bestOption.x;
    ghost.y += bestOption.y;
  }
}

function handleCollision() {
  for (const ghost of ghosts) {
    if (Math.abs(player.x - ghost.x) < 0.5 && Math.abs(player.y - ghost.y) < 0.5) {
      if (ghost.mode === 'scared') {
        const [resetX, resetY] = ghostStarts[Math.floor(Math.random() * ghostStarts.length)];
        ghost.x = resetX;
        ghost.y = resetY;
        ghost.mode = 'chase';
        score += 50;
      } else {
        lives -= 1;
        if (lives <= 0) {
          gameOver = true;
          overlay.classList.remove('hidden');
          overlayTitle.textContent = 'Game Over';
          overlayText.textContent = `You scored ${score}. Press start to try again.`;
          startButton.textContent = 'Play again';
          return;
        }
        player.x = 1;
        player.y = 1;
        activeDirection = { x: 0, y: 0 };
        ghosts.forEach((ghostEntity) => {
          const [resetX, resetY] = ghostStarts[Math.floor(Math.random() * ghostStarts.length)];
          ghostEntity.x = resetX;
          ghostEntity.y = resetY;
          ghostEntity.mode = 'chase';
        });
      }
    }
  }

  updateHud();
}

function updateGame(dt) {
  if (!gameStarted || gameOver) return;

  if (transitionTimer > 0) {
    transitionTimer -= dt;
    if (transitionTimer <= 0) {
      buildLevel(level);
      overlay.classList.add('hidden');
    }
    return;
  }

  if (powerTimer > 0) {
    powerTimer -= dt;
    if (powerTimer <= 0) {
      ghosts.forEach((ghost) => {
        ghost.mode = 'chase';
      });
    }
  }

  lastMove += dt;
  const stepTime = BASE_SPEED / (1 + (level - 1) * 0.12);
  if (lastMove >= stepTime) {
    lastMove = 0;
    movePlayer();
    ghosts.forEach((ghost) => moveGhost(ghost));
    handleCollision();
  }
}

function drawMaze() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#07151d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const px = x * TILE;
      const py = y * TILE;

      if (maze[y][x] === 1) {
        ctx.fillStyle = '#1d4f72';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = 'rgba(158, 227, 255, 0.16)';
        ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      }
    }
  }

  for (const pellet of pellets) {
    const px = pellet.x * TILE + TILE / 2;
    const py = pellet.y * TILE + TILE / 2;
    ctx.fillStyle = '#dfefff';
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const pellet of powerPellets) {
    if (!pellet.active) continue;
    const px = pellet.x * TILE + TILE / 2;
    const py = pellet.y * TILE + TILE / 2;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  const playerX = player.x * TILE + TILE / 2;
  const playerY = player.y * TILE + TILE / 2;
  ctx.fillStyle = '#7ee8a8';
  ctx.beginPath();
  ctx.arc(playerX, playerY, 12, 0, Math.PI * 2);
  ctx.fill();

  for (const ghost of ghosts) {
    const gx = ghost.x * TILE + TILE / 2;
    const gy = ghost.y * TILE + TILE / 2;
    ctx.fillStyle = ghost.mode === 'scared' ? '#7aa2ff' : ghost.color;
    ctx.beginPath();
    ctx.arc(gx, gy, 12, 0, Math.PI * 2);
    ctx.fill();
  }
}

function animate(timestamp) {
  if (!animate.lastTimestamp) animate.lastTimestamp = timestamp;
  const dt = timestamp - animate.lastTimestamp;
  animate.lastTimestamp = timestamp;

  updateGame(dt);
  drawMaze();
  requestAnimationFrame(animate);
}

window.addEventListener('keydown', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const direction = directionKeys[key];
  if (!direction) return;
  event.preventDefault();
  activeDirection = direction;
  if (!gameStarted && !gameOver) {
    startGame();
  }
});

startButton.addEventListener('click', () => {
  startGame();
});

initState();
requestAnimationFrame(animate);
