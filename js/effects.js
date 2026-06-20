export class Effects {
  constructor() {
    this.hornRings = [];
    this.magicParticles = [];
    this.smokePuffs = [];
    this.smokeTimer = 0;
    this.audioCtx = null;
  }

  resumeAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playHorn() {
    this.resumeAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const duration = 0.9;

    // Three-chime chord (classic locomotive air-horn spacing).
    const chimes = [311, 370, 440, 554];

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.001, now);
    master.gain.exponentialRampToValueAtTime(0.28, now + 0.06);
    master.gain.setValueAtTime(0.28, now + 0.5);
    master.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.frequency.exponentialRampToValueAtTime(900, now + duration);
    filter.Q.value = 0.8;
    filter.connect(master);
    master.connect(ctx.destination);

    for (const freq of chimes) {
      const osc = ctx.createOscillator();
      const toneGain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      toneGain.gain.value = 0.22 / chimes.length;
      osc.connect(toneGain);
      toneGain.connect(filter);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    }

    // Low body rumble underneath the chimes.
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(155, now);
    subGain.gain.setValueAtTime(0.08, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    sub.connect(subGain);
    subGain.connect(filter);
    sub.start(now);
    sub.stop(now + duration + 0.05);
  }

  playMagic() {
    this.resumeAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  spawnSmokePuff(x, y, speed) {
    const drift = -8 - speed * 0.04;
    const life = 1.1 + Math.random() * 0.4;
    this.smokePuffs.push({
      x: x + (Math.random() - 0.5) * 4,
      y: y + (Math.random() - 0.5) * 2,
      vx: drift + (Math.random() - 0.5) * 6,
      vy: -(28 + speed * 0.08 + Math.random() * 12),
      life,
      maxLife: life,
      size: 5 + Math.random() * 3,
      wobble: Math.random() * Math.PI * 2,
    });
  }

  updateSmoke(dt, speed, stackX, stackY) {
    if (speed > 3) {
      this.smokeTimer += dt;
      const interval = Math.max(0.08, 0.35 - speed * 0.001);
      if (this.smokeTimer >= interval) {
        this.smokeTimer = 0;
        this.spawnSmokePuff(stackX, stackY, speed);
        if (speed > 120 && Math.random() > 0.5) {
          this.spawnSmokePuff(stackX, stackY, speed);
        }
      }
    }

    for (let i = this.smokePuffs.length - 1; i >= 0; i--) {
      const puff = this.smokePuffs[i];
      puff.life -= dt;
      puff.x += puff.vx * dt;
      puff.y += puff.vy * dt;
      puff.vy -= 18 * dt;
      puff.vx *= 1 - dt * 0.4;
      puff.wobble += dt * 4;
      if (puff.life <= 0) {
        this.smokePuffs.splice(i, 1);
      }
    }
  }

  _drawSmokePuff(ctx, puff) {
    const t = 1 - puff.life / puff.maxLife;
    const alpha = puff.life / puff.maxLife * 0.55;
    const baseSize = puff.size * (1 + t * 2.2);
    const wobbleX = Math.sin(puff.wobble) * 2 * t;

    const blobs = [
      { dx: 0, dy: 0, scale: 1 },
      { dx: -baseSize * 0.35, dy: baseSize * 0.1, scale: 0.75 },
      { dx: baseSize * 0.3, dy: baseSize * 0.15, scale: 0.65 },
    ];

    for (const blob of blobs) {
      const size = baseSize * blob.scale;
      ctx.fillStyle = `rgba(220, 210, 190, ${alpha * (1 - t * 0.3)})`;
      ctx.beginPath();
      ctx.arc(
        puff.x + wobbleX + blob.dx,
        puff.y + blob.dy,
        size,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.fillStyle = `rgba(255, 248, 235, ${alpha * 0.35})`;
    ctx.beginPath();
    ctx.arc(puff.x + wobbleX, puff.y, baseSize * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  spawnHornRing(x, y) {
    this.hornRings.push({ x, y, life: 1, maxLife: 1 });
  }

  spawnMagic(x, y, speed) {
    const colors = ['#d040e0', '#f0c030', '#ff80ff', '#fff0a0', '#b060ff'];
    for (let i = 0; i < 16; i++) {
      const angle = -0.3 + (Math.random() - 0.5) * 0.8;
      const vel = 120 + Math.random() * 180 + speed * 0.3;
      this.magicParticles.push({
        x,
        y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel,
        life: 0.6 + Math.random() * 0.5,
        maxLife: 1,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    this.magicParticles.push({
      x,
      y,
      vx: 200 + speed * 0.5,
      vy: -20,
      life: 0.8,
      maxLife: 0.8,
      size: 10,
      color: '#fff0a0',
      isCore: true,
    });
  }

  update(dt, speed) {
    for (let i = this.hornRings.length - 1; i >= 0; i--) {
      this.hornRings[i].life -= dt * 1.5;
      if (this.hornRings[i].life <= 0) {
        this.hornRings.splice(i, 1);
      }
    }

    for (let i = this.magicParticles.length - 1; i >= 0; i--) {
      const p = this.magicParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 40 * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.magicParticles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (const puff of this.smokePuffs) {
      this._drawSmokePuff(ctx, puff);
    }

    for (const ring of this.hornRings) {
      const progress = 1 - ring.life / ring.maxLife;
      const radius = 8 + progress * 40;
      const alpha = ring.life * 0.6;
      ctx.strokeStyle = `rgba(255, 230, 150, ${alpha})`;
      ctx.lineWidth = 3 - progress * 2;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = `rgba(255, 240, 200, ${alpha * 0.4})`;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of this.magicParticles) {
      const alpha = Math.min(1, p.life / (p.maxLife || 1));
      const r = parseInt(p.color.slice(1, 3), 16);
      const g = parseInt(p.color.slice(3, 5), 16);
      const b = parseInt(p.color.slice(5, 7), 16);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.isCore ? 1 : alpha), 0, Math.PI * 2);
      ctx.fill();

      if (!p.isCore && alpha > 0.3) {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
        ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
      }
    }
  }
}
