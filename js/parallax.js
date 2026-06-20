function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const LAYER_FACTORS = {
  far: 0.15,
  mid: 0.4,
  near: 0.75,
  ground: 0.9,
  track: 1.0,
  clouds: 0.12,
};

export class Parallax {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.trackY = height * 0.82;
    this.scroll = { far: 0, mid: 0, near: 0, ground: 0, track: 0, clouds: 0 };
    this.clouds = this._generateClouds(8);
    this.midObjects = this._generateMidObjects(24);
    this.nearObjects = this._generateNearObjects(40);
  }

  _generateClouds(count) {
    const clouds = [];
    for (let i = 0; i < count; i++) {
      clouds.push({
        x: seededRandom(i * 17) * this.width * 2,
        y: 30 + seededRandom(i * 31) * 80,
        w: 40 + seededRandom(i * 7) * 60,
        h: 16 + seededRandom(i * 13) * 12,
      });
    }
    return clouds;
  }

  _generateMidObjects(count) {
    const objects = [];
    for (let i = 0; i < count; i++) {
      const typeRoll = seededRandom(i * 41);
      let type = 'tree';
      if (typeRoll > 0.85) type = 'barn';
      else if (typeRoll > 0.75) type = 'windmill';
      else if (typeRoll > 0.65) type = 'fence';

      objects.push({
        x: (i / count) * this.width * 3,
        type,
        variant: Math.floor(seededRandom(i * 59) * 3),
        scale: 0.7 + seededRandom(i * 67) * 0.6,
      });
    }
    return objects;
  }

  _generateNearObjects(count) {
    const objects = [];
    for (let i = 0; i < count; i++) {
      objects.push({
        x: (i / count) * this.width * 2,
        type: seededRandom(i * 73) > 0.6 ? 'flower' : 'grass',
        variant: Math.floor(seededRandom(i * 79) * 4),
        yOffset: seededRandom(i * 83) * 20,
      });
    }
    return objects;
  }

  update(dt, speed) {
    this.scroll.far += speed * LAYER_FACTORS.far * dt;
    this.scroll.mid += speed * LAYER_FACTORS.mid * dt;
    this.scroll.near += speed * LAYER_FACTORS.near * dt;
    this.scroll.ground += speed * LAYER_FACTORS.ground * dt;
    this.scroll.track += speed * LAYER_FACTORS.track * dt;
    this.scroll.clouds += speed * LAYER_FACTORS.clouds * dt;
  }

  draw(ctx, speed, time) {
    this._drawSky(ctx);
    this._drawClouds(ctx);
    this._drawFarHills(ctx);
    this._drawMidLayer(ctx);
    this._drawNearLayer(ctx);
    this._drawGround(ctx);
    this._drawTracks(ctx);
  }

  _drawSky(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, this.trackY);
    grad.addColorStop(0, '#6ec6ff');
    grad.addColorStop(0.5, '#a8dff5');
    grad.addColorStop(1, '#c8eeb8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.trackY);
  }

  _drawClouds(ctx) {
    const cloudScroll = this.scroll.clouds;
    for (const cloud of this.clouds) {
      let cx = cloud.x - (cloudScroll % (this.width * 2));
      if (cx + cloud.w < -50) cx += this.width * 2;
      if (cx > this.width + 50) cx -= this.width * 2;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      const cy = cloud.y;
      ctx.fillRect(cx, cy + 4, cloud.w, cloud.h - 8);
      ctx.fillRect(cx + 10, cy, cloud.w - 20, cloud.h);
      ctx.fillRect(cx + cloud.w * 0.2, cy - 4, cloud.w * 0.5, cloud.h * 0.5);
    }
  }

  _drawFarHills(ctx) {
    const layerScroll = this.scroll.far;
    const baseY = this.trackY - 60;
    const segmentW = this.width;

    ctx.fillStyle = '#5a9e4b';
    ctx.beginPath();
    ctx.moveTo(0, this.trackY);

    for (let seg = -1; seg <= 2; seg++) {
      const offsetX = seg * segmentW - (layerScroll % segmentW);
      for (let x = 0; x <= segmentW; x += 20) {
        const wx = offsetX + x;
        const h = Math.sin((x + seg * 100) * 0.008) * 25 +
                  Math.sin((x + seg * 50) * 0.015) * 15;
        ctx.lineTo(wx, baseY + h);
      }
    }

    ctx.lineTo(this.width, this.trackY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#6db856';
    ctx.beginPath();
    ctx.moveTo(0, this.trackY);
    for (let seg = -1; seg <= 2; seg++) {
      const offsetX = seg * segmentW - (layerScroll % segmentW);
      for (let x = 0; x <= segmentW; x += 15) {
        const wx = offsetX + x;
        const h = Math.sin((x + seg * 80) * 0.012) * 18 +
                  Math.sin((x + seg * 30) * 0.02) * 10;
        ctx.lineTo(wx, baseY + 20 + h);
      }
    }
    ctx.lineTo(this.width, this.trackY);
    ctx.closePath();
    ctx.fill();
  }

  _drawMidLayer(ctx) {
    const layerScroll = this.scroll.mid;
    const segmentW = this.width * 3;

    for (const obj of this.midObjects) {
      let x = obj.x - (layerScroll % segmentW);
      if (x < -120) x += segmentW;
      const groundY = this.trackY - 8;

      switch (obj.type) {
        case 'tree':
          this._drawTree(ctx, x, groundY, obj.scale, obj.variant);
          break;
        case 'barn':
          this._drawBarn(ctx, x, groundY, obj.scale);
          break;
        case 'windmill':
          this._drawWindmill(ctx, x, groundY, obj.scale, layerScroll);
          break;
        case 'fence':
          this._drawFence(ctx, x, groundY, obj.scale);
          break;
      }
    }
  }

  _drawTree(ctx, x, groundY, scale, variant) {
    const s = scale;
    const trunkW = 8 * s;
    const trunkH = 24 * s;
    const crownColors = ['#2d6b30', '#3a8040', '#458a48'];
    ctx.fillStyle = '#5c3d1e';
    ctx.fillRect(x - trunkW / 2, groundY - trunkH, trunkW, trunkH);
    ctx.fillStyle = crownColors[variant % 3];
    ctx.fillRect(x - 18 * s, groundY - trunkH - 28 * s, 36 * s, 28 * s);
    ctx.fillRect(x - 12 * s, groundY - trunkH - 38 * s, 24 * s, 14 * s);
  }

  _drawBarn(ctx, x, groundY, scale) {
    const s = scale * 1.2;
    ctx.fillStyle = '#8b3030';
    ctx.fillRect(x - 20 * s, groundY - 30 * s, 40 * s, 30 * s);
    ctx.fillStyle = '#6b2020';
    ctx.beginPath();
    ctx.moveTo(x - 24 * s, groundY - 30 * s);
    ctx.lineTo(x, groundY - 48 * s);
    ctx.lineTo(x + 24 * s, groundY - 30 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3a2510';
    ctx.fillRect(x - 6 * s, groundY - 14 * s, 12 * s, 14 * s);
  }

  _drawWindmill(ctx, x, groundY, scale, layerScroll) {
    const s = scale;
    ctx.fillStyle = '#ccc5b0';
    ctx.fillRect(x - 4 * s, groundY - 50 * s, 8 * s, 50 * s);
    const angle = layerScroll * 0.005;
    ctx.save();
    ctx.translate(x, groundY - 50 * s);
    ctx.rotate(angle);
    ctx.fillStyle = '#eee8d8';
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.fillRect(-2 * s, 0, 4 * s, 28 * s);
    }
    ctx.restore();
  }

  _drawFence(ctx, x, groundY, scale) {
    const s = scale;
    ctx.fillStyle = '#8b6914';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(x + i * 14 * s, groundY - 16 * s, 4 * s, 16 * s);
    }
    ctx.fillRect(x, groundY - 12 * s, 56 * s, 3 * s);
    ctx.fillRect(x, groundY - 6 * s, 56 * s, 3 * s);
  }

  _drawNearLayer(ctx) {
    const layerScroll = this.scroll.near;
    const segmentW = this.width * 2;

    for (const obj of this.nearObjects) {
      let x = obj.x - (layerScroll % segmentW);
      if (x < -20) x += segmentW;
      const y = this.trackY - 4 + obj.yOffset;

      if (obj.type === 'grass') {
        const colors = ['#4a9a3a', '#3d8530', '#58a848'];
        ctx.fillStyle = colors[obj.variant % 3];
        ctx.fillRect(x, y - 8, 3, 8);
        ctx.fillRect(x + 4, y - 12, 3, 12);
        ctx.fillRect(x + 8, y - 6, 3, 6);
      } else {
        const flowerColors = ['#e84880', '#f0c030', '#d040e0', '#ff6040'];
        ctx.fillStyle = '#4a9a3a';
        ctx.fillRect(x + 2, y - 6, 2, 6);
        ctx.fillStyle = flowerColors[obj.variant % 4];
        ctx.fillRect(x, y - 10, 6, 6);
      }
    }
  }

  _drawGround(ctx) {
    ctx.fillStyle = '#7ec86a';
    ctx.fillRect(0, this.trackY - 8, this.width, this.height - this.trackY + 8);

    const layerScroll = this.scroll.ground;
    ctx.fillStyle = '#6bb858';
    for (let x = -(layerScroll % 40); x < this.width; x += 40) {
      ctx.fillRect(x, this.trackY + 20, 20, 4);
    }
  }

  _drawTracks(ctx) {
    const railY = this.trackY + 2;
    const tieScroll = this.scroll.track % 30;

    ctx.fillStyle = '#5a4030';
    for (let x = -tieScroll; x < this.width + 30; x += 30) {
      ctx.fillRect(x, railY + 4, 20, 6);
    }

    ctx.strokeStyle = '#888';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, railY);
    ctx.lineTo(this.width, railY);
    ctx.moveTo(0, railY + 12);
    ctx.lineTo(this.width, railY + 12);
    ctx.stroke();

    ctx.fillStyle = '#3a3028';
    ctx.fillRect(0, railY + 16, this.width, this.height - railY - 16);
  }
}
