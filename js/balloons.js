const RAINBOW = ['#ff4757', '#ff7f50', '#ffd93d', '#6bcb77', '#4d96ff', '#9b59b6'];

// Matches parallax mid-layer scroll so balloons move with the countryside.
const SCROLL_LAYER = 'mid';

export class Balloons {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.skyBottom = height * 0.72;
    this.list = [];
    this.spawnTimer = 1.5;
  }

  update(dt, layerScroll, speed = 0) {
    if (speed > 25) {
      const maxBalloons = this._maxBalloons(speed);
      const spawnInterval = this._spawnInterval(speed);

      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.list.length < maxBalloons) {
        const batch = this._spawnBatchSize(speed);
        for (let i = 0; i < batch && this.list.length < maxBalloons; i++) {
          this._spawn(layerScroll, i);
        }
        this.spawnTimer = spawnInterval;
      }
    }

    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i];
      b.wobble += dt * b.wobbleSpeed;

      const screenX = b.worldX - layerScroll;
      if (screenX < -80) {
        this.list.splice(i, 1);
      }
    }
  }

  _speedFactor(speed) {
    return Math.min(1, Math.max(0, (speed - 25) / 1775));
  }

  _maxBalloons(speed) {
    return Math.round(3 + this._speedFactor(speed) * 11);
  }

  _spawnInterval(speed) {
    const t = this._speedFactor(speed);
    return 4.8 - t * 3.6 + Math.random() * (1.8 - t * 1.2);
  }

  _spawnBatchSize(speed) {
    if (speed > 1200) return 3;
    if (speed > 700) return 2;
    return 1;
  }

  _spawn(layerScroll, index = 0) {
    this.list.push({
      worldX: layerScroll + this.width + 60 + Math.random() * 140 + index * 90,
      y: 35 + Math.random() * (this.skyBottom - 70),
      radius: 14 + Math.random() * 10,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 2 + Math.random() * 2,
      hueOffset: Math.floor(Math.random() * RAINBOW.length),
    });
  }

  _screenPos(b, layerScroll) {
    return {
      x: b.worldX - layerScroll,
      y: b.y + Math.sin(b.wobble) * 4,
    };
  }

  checkMagicHits(magicParticles, layerScroll) {
    const popped = [];

    for (let bi = this.list.length - 1; bi >= 0; bi--) {
      const b = this.list[bi];
      const { x, y } = this._screenPos(b, layerScroll);

      for (const p of magicParticles) {
        if (p.life <= 0 || !p.isProjectile) continue;

        const hitRadius = b.radius + p.size * 2;

        const dx = p.x - x;
        const dy = p.y - y;
        if (dx * dx + dy * dy <= hitRadius * hitRadius) {
          popped.push({ x, y, radius: b.radius, hueOffset: b.hueOffset });
          this.list.splice(bi, 1);
          p.life = 0;
          break;
        }
      }
    }

    return popped;
  }

  draw(ctx, layerScroll) {
    for (const b of this.list) {
      const { x, y } = this._screenPos(b, layerScroll);
      if (x > this.width + 80 || x < -80) continue;
      this._drawBalloon(ctx, x, y, b);
    }
  }

  _drawBalloon(ctx, x, y, b) {
    const rw = b.radius * 0.82;
    const rh = b.radius * 1.05;

    ctx.save();
    ctx.translate(x, y);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, rh * 0.85);
    ctx.quadraticCurveTo(4, rh + 14, -2, rh + 28);
    ctx.stroke();

    ctx.fillStyle = '#ddd';
    ctx.beginPath();
    ctx.moveTo(-3, rh * 0.82);
    ctx.lineTo(3, rh * 0.82);
    ctx.lineTo(0, rh * 0.95);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2);
    ctx.clip();

    const stripeH = (rh * 2) / RAINBOW.length;
    for (let i = 0; i < RAINBOW.length; i++) {
      const color = RAINBOW[(i + b.hueOffset) % RAINBOW.length];
      ctx.fillStyle = color;
      ctx.fillRect(-rw, -rh + i * stripeH, rw * 2, stripeH + 1);
    }
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-rw * 0.28, -rh * 0.25, rw * 0.22, rh * 0.18, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export { SCROLL_LAYER };
