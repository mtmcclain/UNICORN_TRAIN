import { Game, INTERNAL_WIDTH, INTERNAL_HEIGHT } from './game.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);

let lastTime = 0;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const aspect = INTERNAL_WIDTH / INTERNAL_HEIGHT;
  let displayWidth = window.innerWidth;
  let displayHeight = window.innerHeight;

  if (displayWidth / displayHeight > aspect) {
    displayWidth = displayHeight * aspect;
  } else {
    displayHeight = displayWidth / aspect;
  }

  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
  canvas.width = INTERNAL_WIDTH * dpr;
  canvas.height = INTERNAL_HEIGHT * dpr;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  game.width = INTERNAL_WIDTH;
  game.height = INTERNAL_HEIGHT;
}

function loop(timestamp) {
  if (lastTime === 0) {
    lastTime = timestamp;
    requestAnimationFrame(loop);
    return;
  }

  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  game.update(dt);
  game.draw();

  requestAnimationFrame(loop);
}

async function boot() {
  resize();
  window.addEventListener('resize', resize);

  await game.init();

  document.getElementById('controls-hint')?.classList.add('visible');
  setTimeout(() => {
    document.getElementById('controls-hint')?.classList.remove('visible');
  }, 5000);

  requestAnimationFrame(loop);
}

boot();
