export class Train {
  constructor() {
    this.image = null;
    // Normalized (0..1) anchor inside the sprite rect for smokestack opening.
    this.stackAnchor = { x: 0.704, y: 0.208 };

    // Wheel animation (normalized sprite-space).
    this.wheels = [
      // Large drive wheels (user-tuned).
      { cx: 0.3681, cy: 0.7546, r: 0.1172 },
      { cx: 0.5368, cy: 0.7602, r: 0.1232 },
      // Small front wheels (spin faster — see draw()).
      { cx: 0.6537, cy: 0.7946, r: 0.0520 },
      { cx: 0.7340, cy: 0.7976, r: 0.0500 },
    ];
    this.selectedWheelIndex = 0;

    this._wheelCanvases = [];
    this._wheelAngle = 0;
  }

  load(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Sprite is RGB with a black matte; remove only edge-connected black
        // so internal outlines/details remain intact.
        this.image = this._removeEdgeBlackBackground(img);
        this._prepareWheelLayers();
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  _removeEdgeBlackBackground(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const visited = new Uint8Array(width * height);
    const queue = [];

    const isBlack = (i) =>
      data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0 && data[i + 3] !== 0;

    const pushIfBlack = (x, y) => {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const idx = y * width + x;
      if (visited[idx]) return;
      const i = idx * 4;
      if (!isBlack(i)) return;
      visited[idx] = 1;
      queue.push(idx);
    };

    // Seed from the borders only.
    for (let x = 0; x < width; x++) {
      pushIfBlack(x, 0);
      pushIfBlack(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      pushIfBlack(0, y);
      pushIfBlack(width - 1, y);
    }

    while (queue.length) {
      const idx = queue.pop();
      const x = idx % width;
      const y = (idx - x) / width;
      const i = idx * 4;
      data[i + 3] = 0;

      pushIfBlack(x - 1, y);
      pushIfBlack(x + 1, y);
      pushIfBlack(x, y - 1);
      pushIfBlack(x, y + 1);
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  _prepareWheelLayers() {
    const src = this.image;
    const width = src.width;
    const height = src.height;

    this._wheelCanvases = [];

    for (const w of this.wheels) {
      const wheelCanvas = document.createElement('canvas');
      wheelCanvas.width = width;
      wheelCanvas.height = height;
      const wctx = wheelCanvas.getContext('2d');
      wctx.drawImage(src, 0, 0);
      const wData = wctx.getImageData(0, 0, width, height);
      const wd = wData.data;

      const cx = Math.round(w.cx * width);
      const cy = Math.round(w.cy * height);
      const r = Math.round(w.r * height);
      const rMask = Math.max(2, Math.round(r * 0.82));
      const r2 = rMask * rMask;

      // Zero everything outside the wheel circle in the wheel layer.
      for (let y = 0; y < height; y++) {
        const dy = y - cy;
        for (let x = 0; x < width; x++) {
          const dx = x - cx;
          const i = (y * width + x) * 4;
          if (dx * dx + dy * dy > r2) {
            wd[i + 3] = 0;
          } else {
            // Inside the wheel region: keep mostly dark wheel pixels.
            const rr = wd[i], gg = wd[i + 1], bb = wd[i + 2];
            const bright = rr + gg + bb;
            const isGold = rr > 150 && gg > 120 && bb < 140;
            if (isGold || bright > 380) {
              wd[i + 3] = 0;
            }
          }
        }
      }

      wctx.putImageData(wData, 0, 0);
      this._wheelCanvases.push({ canvas: wheelCanvas, cx, cy, r: rMask, normR: w.r });
    }
  }

  setSelectedWheelIndex(index) {
    this.selectedWheelIndex = Math.max(0, Math.min(this.wheels.length - 1, index));
  }

  getSelectedWheelIndex() {
    return this.selectedWheelIndex;
  }

  nudgeSelectedWheel(dx, dy, dr) {
    const w = this.wheels[this.selectedWheelIndex];
    if (!w) return;
    w.cx = Math.max(0, Math.min(1, w.cx + dx));
    w.cy = Math.max(0, Math.min(1, w.cy + dy));
    w.r = Math.max(0.02, Math.min(0.4, w.r + dr));
    this._prepareWheelLayers();
  }

  getWheelParams() {
    return this.wheels.map((w) => ({ ...w }));
  }

  _getLayout(canvasWidth, canvasHeight, speed, time) {
    const trackY = canvasHeight * 0.82;
    const wheelGroundY = trackY + 10;
    const drawHeight = canvasHeight * 0.38;
    const aspect = this.image.width / this.image.height;
    const drawWidth = drawHeight * aspect;
    const x = canvasWidth * 0.22;
    // Train is locked to rails; no vertical bob.
    const bob = 0;
    const wheelBottomRatio = 0.849;
    const y = wheelGroundY - drawHeight * wheelBottomRatio + bob;

    return { x, y, drawWidth, drawHeight, trackY };
  }

  getHornTipPosition(canvasWidth, canvasHeight, speed, time) {
    const layout = this._getLayout(canvasWidth, canvasHeight, speed, time);
    return {
      x: layout.x + layout.drawWidth * 0.925,
      y: layout.y + layout.drawHeight * 0.26,
    };
  }

  getSmokestackPosition(canvasWidth, canvasHeight, speed, time) {
    const layout = this._getLayout(canvasWidth, canvasHeight, speed, time);
    return {
      x: layout.x + layout.drawWidth * this.stackAnchor.x,
      y: layout.y + layout.drawHeight * this.stackAnchor.y,
    };
  }

  nudgeSmokestackAnchor(dx, dy) {
    this.stackAnchor.x = Math.max(0, Math.min(1, this.stackAnchor.x + dx));
    this.stackAnchor.y = Math.max(0, Math.min(1, this.stackAnchor.y + dy));
  }

  getSmokestackAnchor() {
    return { ...this.stackAnchor };
  }

  update(dt, speed) {
    // Rotation based on average large-wheel circumference.
    const largeWheels = this.wheels.filter((w) => w.r > 0.08);
    const avgR = largeWheels.reduce((s, w) => s + w.r, 0) / largeWheels.length;
    const wheelRadiusPx = avgR * 540;
    const circumference = Math.max(1, 2 * Math.PI * wheelRadiusPx);
    this._wheelAngle += (speed * dt / circumference) * Math.PI * 2;
  }

  draw(ctx, canvasWidth, canvasHeight, speed, time) {
    if (!this.image) return;

    const layout = this._getLayout(canvasWidth, canvasHeight, speed, time);

    ctx.drawImage(this.image, layout.x, layout.y, layout.drawWidth, layout.drawHeight);

    // Draw rotating wheels on top.
    if (this._wheelCanvases.length) {
      const refR = 0.126; // reference radius (avg of large wheels)
      for (const w of this._wheelCanvases) {
        const dx = layout.x + (w.cx / this.image.width) * layout.drawWidth;
        const dy = layout.y + (w.cy / this.image.height) * layout.drawHeight;
        const angle = this._wheelAngle * (refR / w.normR);

        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(angle);
        ctx.translate(-dx, -dy);
        ctx.drawImage(
          w.canvas,
          layout.x,
          layout.y,
          layout.drawWidth,
          layout.drawHeight
        );
        ctx.restore();
      }
    }
  }
}
