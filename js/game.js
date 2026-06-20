const INTERNAL_WIDTH = 960;
const INTERNAL_HEIGHT = 540;

const MIN_SPEED = 0;
const MAX_SPEED = 1800;
const DEFAULT_SPEED = 80;
const ACCEL = 700;
const DECEL = 520;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = INTERNAL_WIDTH;
    this.height = INTERNAL_HEIGHT;
    this.speed = DEFAULT_SPEED;
    this.targetSpeed = DEFAULT_SPEED;
    this.time = 0;
    this.shake = 0;
    this.woohooCooldown = 1.5;
    this._woohooUnlocked = false;
    this.score = 0;

    this.keys = new Set();
    this.touch = { speedUp: false, speedDown: false, magicHold: false };
    this.magicRepeatTimer = 0;
    this.hornPressed = false;
    this.magicPressed = false;
    this.debugAnchors = false;
    this.debugWheels = false;

    this.train = null;
    this.parallax = null;
    this.effects = null;
    this.balloons = null;

    this._bindInput();
  }

  async init() {
    const { Train } = await import('./train.js');
    const { Parallax } = await import('./parallax.js');
    const { Effects } = await import('./effects.js');
    const { Balloons, SCROLL_LAYER } = await import('./balloons.js');

    this.train = new Train();
    await this.train.load('assets/unicorn-train.png');

    this.parallax = new Parallax(this.width, this.height);
    this.effects = new Effects();
    this.balloons = new Balloons(this.width, this.height);
    this._balloonScrollLayer = SCROLL_LAYER;
  }

  _getBalloonScroll() {
    return this.parallax?.scroll?.[this._balloonScrollLayer] ?? 0;
  }

  _checkBalloonHits() {
    if (!this.balloons || !this.effects) return;

    const popped = this.balloons.checkMagicHits(this.effects.magicParticles, this._getBalloonScroll());
    for (const pop of popped) {
      this.score += 1;
      this.effects.spawnBalloonPop(pop.x, pop.y, pop.radius, pop.hueOffset);
      this.effects.playPop();
    }
  }

  _bindInput() {
    const speedUpKeys = new Set(['ArrowUp', 'KeyW']);
    const speedDownKeys = new Set(['ArrowDown', 'KeyS']);
    const hornKeys = new Set(['KeyH', 'Space']);
    const magicKeys = new Set(['KeyX']);

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      this.effects?.resumeAudio();

      // Debug: toggle + nudge smokestack anchor.
      if (e.code === 'Backquote') {
        this.debugAnchors = !this.debugAnchors;
        this._showControlsHint();
        e.preventDefault();
        return;
      }

      // Debug: toggle + nudge wheel alignment.
      if (e.code === 'KeyV') {
        this.debugWheels = !this.debugWheels;
        this._showControlsHint();
        e.preventDefault();
        return;
      }

      if (this.debugWheels && e.code === 'Digit1') {
        this.train?.setSelectedWheelIndex?.(0);
        e.preventDefault();
        return;
      }
      if (this.debugWheels && e.code === 'Digit2') {
        this.train?.setSelectedWheelIndex?.(1);
        e.preventDefault();
        return;
      }
      if (this.debugWheels && e.code === 'Digit3') {
        this.train?.setSelectedWheelIndex?.(2);
        e.preventDefault();
        return;
      }
      if (this.debugWheels && e.code === 'Digit4') {
        this.train?.setSelectedWheelIndex?.(3);
        e.preventDefault();
        return;
      }

      // Smoke anchor: I/J/K/L (no Alt — avoids OS/Cursor shortcuts).
      if (this.debugAnchors && !this.debugWheels) {
        const step = e.shiftKey ? 0.01 : 0.003;
        if (e.code === 'KeyJ') this.train?.nudgeSmokestackAnchor(-step, 0);
        if (e.code === 'KeyL') this.train?.nudgeSmokestackAnchor(step, 0);
        if (e.code === 'KeyI') this.train?.nudgeSmokestackAnchor(0, -step);
        if (e.code === 'KeyK') this.train?.nudgeSmokestackAnchor(0, step);
        if (['KeyI', 'KeyJ', 'KeyK', 'KeyL'].includes(e.code)) {
          e.preventDefault();
          return;
        }
      }

      // Wheel align: plain arrows + -/= (no Alt/Ctrl).
      if (this.debugWheels) {
        const step = e.shiftKey ? 0.01 : 0.003;
        const rStep = e.shiftKey ? 0.008 : 0.002;
        if (e.code === 'ArrowLeft') this.train?.nudgeSelectedWheel?.(-step, 0, 0);
        if (e.code === 'ArrowRight') this.train?.nudgeSelectedWheel?.(step, 0, 0);
        if (e.code === 'ArrowUp') this.train?.nudgeSelectedWheel?.(0, -step, 0);
        if (e.code === 'ArrowDown') this.train?.nudgeSelectedWheel?.(0, step, 0);
        if (e.code === 'Minus') this.train?.nudgeSelectedWheel?.(0, 0, -rStep);
        if (e.code === 'Equal') this.train?.nudgeSelectedWheel?.(0, 0, rStep);
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Minus', 'Equal'].includes(e.code)) {
          e.preventDefault();
          return;
        }
      }

      if (hornKeys.has(e.code) && !this.hornPressed) {
        this.hornPressed = true;
        this._honk();
      }
      if (magicKeys.has(e.code) && !this.magicPressed) {
        this.magicPressed = true;
        this._shootMagic();
      }

      if (speedUpKeys.has(e.code) || speedDownKeys.has(e.code) ||
          hornKeys.has(e.code) || magicKeys.has(e.code)) {
        e.preventDefault();
        this._showControlsHint();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (hornKeys.has(e.code)) this.hornPressed = false;
      if (magicKeys.has(e.code)) this.magicPressed = false;
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' && e.target !== this.canvas) return;
      this.effects?.resumeAudio();
      this._shootMagic();
      this._showControlsHint();
    });

    this._bindTouchControls();
  }

  _isMobileControls() {
    return window.matchMedia('(hover: none) and (pointer: coarse), (max-width: 768px)').matches;
  }

  _bindTouchControls() {
    const panel = document.getElementById('touch-controls');
    if (!panel) return;

    const setHold = (action, active, btn) => {
      if (action === 'speedUp') this.touch.speedUp = active;
      if (action === 'speedDown') this.touch.speedDown = active;
      if (action === 'magic') this.touch.magicHold = active;
      btn?.classList.toggle('active', active);
    };

    for (const btn of panel.querySelectorAll('[data-action]')) {
      const action = btn.dataset.action;

      const onDown = (e) => {
        e.preventDefault();
        this.effects?.resumeAudio();
        this._showControlsHint();

        if (action === 'speedUp' || action === 'speedDown') {
          setHold(action, true, btn);
          btn.setPointerCapture?.(e.pointerId);
        } else if (action === 'horn') {
          this._honk();
        } else if (action === 'magic') {
          setHold('magic', true, btn);
          btn.setPointerCapture?.(e.pointerId);
          this._shootMagic();
          this.magicRepeatTimer = 0.2;
        }
      };

      const onUp = (e) => {
        if (action === 'speedUp' || action === 'speedDown' || action === 'magic') {
          setHold(action, false, btn);
        }
      };

      btn.addEventListener('pointerdown', onDown);
      btn.addEventListener('pointerup', onUp);
      btn.addEventListener('pointercancel', onUp);
      btn.addEventListener('pointerleave', onUp);
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    document.addEventListener('touchmove', (e) => {
      if (e.target.closest('#touch-controls')) return;
      e.preventDefault();
    }, { passive: false });
  }

  _showControlsHint() {
    const hint = document.getElementById('controls-hint');
    const mobileHint = document.getElementById('mobile-hint');
    if (hint && !this._isMobileControls()) {
      hint.classList.add('visible');
    }
    if (mobileHint && this._isMobileControls()) {
      mobileHint.classList.add('visible');
    }
    clearTimeout(this._hintTimeout);
    this._hintTimeout = setTimeout(() => {
      hint?.classList.remove('visible');
      mobileHint?.classList.remove('visible');
    }, 5000);
  }

  _honk() {
    const pos = this.train.getSmokestackPosition(this.width, this.height, this.speed, this.time);
    this.effects.spawnHornRing(pos.x, pos.y);
    this.effects.playHorn();
    this.shake = 6;
  }

  _shootMagic() {
    const pos = this.train.getHornTipPosition(this.width, this.height, this.speed, this.time);
    this.effects.spawnMagic(pos.x, pos.y, this.speed);
    this.effects.playMagic();
  }

  update(dt) {
    this.time += dt;

    const speedUp = !this.debugWheels && (
      this.keys.has('ArrowUp') || this.keys.has('KeyW') || this.touch.speedUp
    );
    const speedDown = !this.debugWheels && (
      this.keys.has('ArrowDown') || this.keys.has('KeyS') || this.touch.speedDown
    );

    if (speedUp) {
      this.targetSpeed = Math.min(MAX_SPEED, this.targetSpeed + ACCEL * dt);
    } else if (speedDown) {
      this.targetSpeed = Math.max(MIN_SPEED, this.targetSpeed - DECEL * dt);
    }

    const lerpRate = speedUp || speedDown ? 16 : 3;
    this.speed += (this.targetSpeed - this.speed) * Math.min(1, dt * lerpRate);

    const atMaxSpeed = speedUp && this.targetSpeed >= MAX_SPEED - 2 && this.speed >= MAX_SPEED * 0.92;
    if (atMaxSpeed) {
      if (!this._woohooUnlocked) {
        this.effects?.resumeAudio();
        this._woohooUnlocked = true;
      }
      this.woohooCooldown -= dt;
      if (this.woohooCooldown <= 0) {
        try {
          this.effects?.playWoohoo?.();
        } catch (err) {
          console.warn('Woohoo failed:', err);
        }
        this.woohooCooldown = 3.5;
      }
    } else {
      this.woohooCooldown = Math.min(this.woohooCooldown, 1.5);
      if (this.speed < MAX_SPEED * 0.75) {
        this._woohooUnlocked = false;
      }
    }

    this.parallax.update(dt, this.speed);
    this.balloons?.update(dt, this._getBalloonScroll(), this.speed);
    this.train.update(dt, this.speed);

    const stack = this.train.getSmokestackPosition(this.width, this.height, this.speed, this.time);
    this.effects.updateSmoke(dt, this.speed, stack.x, stack.y);
    this.effects.update(dt, this.speed);
    this._checkBalloonHits();

    if (this.touch.magicHold) {
      this.magicRepeatTimer -= dt;
      if (this.magicRepeatTimer <= 0) {
        this._shootMagic();
        this.magicRepeatTimer = 0.2;
      }
    }

    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 18);
    }
  }

  draw() {
    const ctx = this.ctx;
    let offsetX = 0;
    let offsetY = 0;
    if (this.shake > 0) {
      offsetX = (Math.random() - 0.5) * this.shake;
      offsetY = (Math.random() - 0.5) * this.shake;
    }

    ctx.save();
    ctx.translate(offsetX, offsetY);

    this.parallax.draw(ctx, this.speed, this.time);
    this.balloons?.draw(ctx, this._getBalloonScroll());
    this._drawScore(ctx);
    this.train.draw(ctx, this.width, this.height, this.speed, this.time);
    this.effects.draw(ctx);

    if (this.debugAnchors && this.train) {
      const stack = this.train.getSmokestackPosition(this.width, this.height, this.speed, this.time);
      const a = this.train.getSmokestackAnchor();
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 0, 255, 0.95)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(stack.x - 8, stack.y);
      ctx.lineTo(stack.x + 8, stack.y);
      ctx.moveTo(stack.x, stack.y - 8);
      ctx.lineTo(stack.x, stack.y + 8);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(10, 10, 360, 32);
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.fillText(
        `stackAnchor x=${a.x.toFixed(3)} y=${a.y.toFixed(3)}  (toggle: \`  nudge: I/J/K/L, Shift=big)`,
        16,
        31
      );
      ctx.restore();
    }

    if (this.debugWheels && this.train) {
      const wheels = this.train.getWheelParams?.() ?? [];
      const sel = this.train.getSelectedWheelIndex?.() ?? 0;
      const layout = this.train._getLayout?.(this.width, this.height, this.speed, this.time);

      if (layout && wheels.length) {
        ctx.save();
        for (let i = 0; i < wheels.length; i++) {
          const w = wheels[i];
          const cx = layout.x + layout.drawWidth * w.cx;
          const cy = layout.y + layout.drawHeight * w.cy;
          const r = layout.drawHeight * w.r;

          ctx.strokeStyle = i === sel ? 'rgba(255, 0, 255, 0.95)' : 'rgba(0, 255, 255, 0.75)';
          ctx.lineWidth = i === sel ? 3 : 2;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(cx - 6, cy);
          ctx.lineTo(cx + 6, cy);
          ctx.moveTo(cx, cy - 6);
          ctx.lineTo(cx, cy + 6);
          ctx.stroke();
        }

        const active = wheels[sel] ?? wheels[0];
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(10, 46, 520, 36);
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.fillText(
          `wheelDebug (V) wheel ${sel + 1}/${wheels.length} (pick: 1-4)  cx=${active.cx.toFixed(4)} cy=${active.cy.toFixed(4)} r=${active.r.toFixed(4)}  nudge: Arrows  radius: - / =  Shift=big`,
          16,
          68
        );
        ctx.restore();
      }
    }

    ctx.restore();
  }

  _drawScore(ctx) {
    const label = 'BALLOONS';
    const scoreText = String(this.score);
    const cx = this.width / 2;
    const y = 22;

    ctx.save();
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const labelW = ctx.measureText(label).width;
    const scoreW = ctx.measureText(scoreText).width;
    const boxW = Math.max(labelW, scoreW) + 24;
    const boxH = 36;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(cx - boxW / 2, y - 10, boxW, boxH);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(label, cx, y + 2);

    ctx.fillStyle = '#ffd93d';
    ctx.fillText(scoreText, cx, y + 16);
    ctx.restore();
  }
}

export { INTERNAL_WIDTH, INTERNAL_HEIGHT };
