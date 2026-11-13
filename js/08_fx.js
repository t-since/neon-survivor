// PixelFX 이펙트
const PixelFX = {
  PALETTES: {
    blade: ['#ffffff', '#bae6fd', '#38bdf8', '#0284c7', '#0369a1'], // 청운 비검
    blood: ['#ffffff', '#fca5a5', '#ef4444', '#b91c1c', '#7f1d1d'], // 핏빛 타격
    fire: ['#ffffff', '#fef08a', '#f59e0b', '#ea580c', '#991b1b'],  // 화염/폭발
    dust: ['#f1f5f9', '#cbd5e1', '#94a3b8', '#64748b', '#475569'],  // 신법 흙먼지
    heal: ['#ffffff', '#a7f3d0', '#34d399', '#059669', '#047857'],  // 영약 치유
    gold: ['#ffffff', '#fef08a', '#facc15', '#ca8a04', '#854d0e'],  // 비급함 황금
    shadow: ['#ffffff', '#e9d5ff', '#c084fc', '#9333ea', '#581c87'] // 마교 마기
  },

  // 1. 타격 충격파 & 십자 플레어 (pixelfx/impacts/hit-spark & crit-hit)
  spawnHitSparks(x, y, color = '#ef4444', count = 16) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 120;
      particles.push({
        isPixelSpark: true,
        x: x,
        y: y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 30,
        gravity: 240,
        size: Math.random() < 0.5 ? 2.5 : 1.8,
        color: color,
        life: 0.2 + Math.random() * 0.15,
        maxLife: 0.35
      });
    }
  },

  spawnHitSpark(x, y, angle, isCrit = false) {
    const pal = isCrit ? this.PALETTES.gold : this.PALETTES.blade;

    // (1) 십자 다이아몬드 코어 플레어 (Cross Diamond Flare)
    particles.push({
      isPixelCross: true,
      x: x,
      y: y,
      size: isCrit ? 26 : 16,
      angle: angle,
      color: pal[0],
      glowColor: pal[2],
      life: 0.12,
      maxLife: 0.12
    });

    // (2) 타격 방향 콘으로 튀는 바운스 픽셀 스파크 (Spark Cone)
    const count = isCrit ? 14 : 7;
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * 1.3;
      const speed = (isCrit ? 160 : 100) + Math.random() * 140;
      particles.push({
        isPixelSpark: true,
        x: x,
        y: y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 35,
        gravity: 280,
        size: Math.random() < 0.5 ? 2.5 : 1.8,
        color: pal[Math.floor(Math.random() * pal.length)],
        life: 0.22 + Math.random() * 0.14,
        maxLife: 0.36
      });
    }

    // (3) 크리티컬 시 핏빛 타격 스플래시 추가
    if (isCrit) {
      for (let j = 0; j < 6; j++) {
        const ca = Math.random() * Math.PI * 2;
        const spd = 70 + Math.random() * 80;
        particles.push({
          isPixelSpark: true,
          x: x,
          y: y,
          vx: Math.cos(ca) * spd,
          vy: Math.sin(ca) * spd,
          gravity: 220,
          size: 2.2,
          color: this.PALETTES.blood[2],
          life: 0.25,
          maxLife: 0.25
        });
      }
    }
  },

  // 2. 부채꼴 픽셀 검광 (pixelfx/melee/sword-slash)
  spawnSwordSlash(x, y, angle, radius = 55, color = '#38bdf8') {
    particles.push({
      isPixelSlash: true,
      x: x,
      y: y,
      angle: angle,
      radius: radius,
      color: color,
      life: 0.15,
      maxLife: 0.15
    });
  },

  // 3. 신법 질주 흙먼지 & 수묵 폭발 (pixelfx/moves/dust-dash)
  spawnDashDust(x, y, dirX, dirY) {
    const oppA = Math.atan2(-dirY, -dirX);
    for (let i = 0; i < 14; i++) {
      const a = oppA + (Math.random() - 0.5) * 1.4;
      const speed = 40 + Math.random() * 110;
      particles.push({
        isPixelDust: true,
        x: x + (Math.random() - 0.5) * 12,
        y: y + 8 + (Math.random() - 0.5) * 6,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed * 0.5 - 20,
        size: 3 + Math.random() * 4,
        color: this.PALETTES.dust[Math.floor(Math.random() * this.PALETTES.dust.length)],
        life: 0.35 + Math.random() * 0.2,
        maxLife: 0.55
      });
    }
  },

  // 4. 적 소멸 마기 파편 & 보스 폭발 (pixelfx/spawn/dissolve & heavy-explosion)
  spawnEnemyDeath(x, y, isBoss = false, isMiniBoss = false) {
    const pal = isBoss ? this.PALETTES.fire : isMiniBoss ? this.PALETTES.gold : this.PALETTES.shadow;
    const count = isBoss ? 45 : isMiniBoss ? 28 : 12;

    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = (isBoss ? 130 : 50) + Math.random() * (isBoss ? 190 : 100);
      particles.push({
        isPixelDissolve: true,
        x: x + (Math.random() - 0.5) * 16,
        y: y - 10 + (Math.random() - 0.5) * 20,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 40,
        gravity: 160,
        size: (isBoss ? 3.5 : 2.2) + Math.random() * 2,
        color: pal[Math.floor(Math.random() * pal.length)],
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7
      });
    }

    if (isBoss) {
      createShockwave(x, y, 160, '#ef4444');
      state.cameraShake = 0.6;
    } else if (isMiniBoss) {
      createShockwave(x, y, 90, '#f59e0b');
    }
  },

  // 5. 영약/비급함 픽셀 빛무리 (pixelfx/pickups/sparkle & holy)
  spawnPickupSparkle(x, y, type = 'herb') {
    const pal = type === 'herb' ? this.PALETTES.heal : this.PALETTES.gold;
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 60;
      particles.push({
        isPixelSparkle: true,
        x: x,
        y: y,
        vx: Math.cos(a) * speed,
        vy: -40 - Math.random() * 70,
        size: 2.2 + Math.random() * 2.5,
        color: pal[Math.floor(Math.random() * pal.length)],
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8
      });
    }
    createShockwave(x, y, 50, pal[2]);
  },

  // 6. 벽력탄 전용 중화약 뇌격 폭발 (pixelfx/explosions/heavy-blast - 폭죽 느낌 완전 탈피!)
  spawnThunderBombExplosion(x, y, radius = 95) {
    // (1) 백열 섬광 코어 (White-Hot Ignition Flash)
    particles.push({
      isPixelFlash: true,
      x: x,
      y: y,
      size: radius * 1.25,
      color: '#ffffff',
      glowColor: '#f59e0b',
      life: 0.12,
      maxLife: 0.12
    });

    // (2) 묵직한 화약 화염 및 검은 매연 덩어리 (Gunpowder Fire & Soot Smoke)
    const smokeColors = ['#f59e0b', '#ea580c', '#9a3412', '#431407', '#1c1917'];
    for (let i = 0; i < 32; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * (radius * 1.8);
      particles.push({
        isPixelSmoke: true,
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed * 0.65 - 35,
        size: 4 + Math.random() * 7,
        color: smokeColors[Math.floor(Math.random() * smokeColors.length)],
        life: 0.45 + Math.random() * 0.35,
        maxLife: 0.8
      });
    }

    // (3) 지면을 긁으며 튀는 파편 및 불씨 (Shrapnel & Ember Sparks)
    for (let j = 0; j < 24; j++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 90 + Math.random() * 180;
      particles.push({
        isPixelSpark: true,
        x: x,
        y: y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 60,
        gravity: 380,
        size: 2.2 + Math.random() * 2.2,
        color: Math.random() < 0.6 ? '#fef08a' : '#f97316',
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.6
      });
    }

    // (4) 묵직한 지면 충격파 및 화면 진동
    createShockwave(x, y, radius * 0.95, '#f59e0b');
    state.screenShake = 9;
    sound.playPalmBlast();
  }
};

// --- Visual Helpers ---
function createHitSparks(x, y, color) {
  PixelFX.spawnHitSpark(x, y, Math.random() * Math.PI * 2, false);
}

function createShockwave(x, y, radius, color) {
  particles.push({
    isRing: true,
    x: x,
    y: y,
    r: 10,
    maxR: radius,
    color: color,
    life: 0.35,
    maxLife: 0.35
  });
}

// 검은 배경 빛 이펙트 그림을 더하기 합성으로 그림 (검은색은 안 보이고 빛만 남음)
// sy: 세로 눌림(바닥에 깔린 느낌), rot: 회전
// 가장자리를 둥글게 서서히 지운 그림 (11-13 사용자: 여래신장 손바닥 "끝이 잘려 보임" — 빛줄기가 네모 끝에서 직선으로 끊기고, jpg 검정이 완전 0 이 아니라 네모 테두리가 비침)
const FX_SOFT = { fx_buddha_palm: 0.36 }; // 그림 이름: 이 반지름(그림 크기 비율)부터 바깥으로 0 이 되게
const fxSoftCache = {};
function softFxImage(key, img) {
  if (fxSoftCache[key]) return fxSoftCache[key];
  const w = img.width, h = img.height, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  try {
    const id = x.getImageData(0, 0, w, h), d = id.data, r0 = FX_SOFT[key], r1 = 0.5;
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const r = Math.hypot(xx / w - 0.5, yy / h - 0.5);
      const k = r <= r0 ? 1 : r >= r1 ? 0 : Math.pow(1 - (r - r0) / (r1 - r0), 1.6);
      const i = (yy * w + xx) * 4;
      for (let q = 0; q < 3; q++) d[i + q] = Math.max(0, (d[i + q] - 6) * 255 / 249) * k; // 검정 바닥 잡티(jpg)도 0 으로
    }
    x.putImageData(id, 0, 0);
  } catch (e) { return img; } // 파일로 열었을 때(file://) 등 읽기 막히면 그대로
  return (fxSoftCache[key] = c);
}
function drawFxImage(key, x, y, size, alpha = 1, rot = 0, sy = 1, tint = null) {
  const base = (FX_SOFT[key] && SPRITES[key] && SPRITES[key].width) ? softFxImage(key, SPRITES[key]) : SPRITES[key];
  const img = tint ? tinted(base, tint) : base;
  if (!img || !img.width) return false;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.translate(x, y);
  ctx.scale(1, sy);
  if (rot) ctx.rotate(rot);
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
  return true;
}

// 번개 줄기 점 만들기 (지그재그)
function lightningPoints(x1, y1, x2, y2, segs = 9, jag = 26) {
  const pts = [[x1, y1]];
  for (let i = 1; i < segs; i++) {
    const t = i / segs, nx = -(y2 - y1), ny = x2 - x1, l = Math.hypot(nx, ny) || 1;
    const off = (Math.random() * 2 - 1) * jag * Math.sin(Math.PI * t);
    pts.push([x1 + (x2 - x1) * t + nx / l * off, y1 + (y2 - y1) * t + ny / l * off]);
  }
  pts.push([x2, y2]);
  return pts;
}
function createExplosion(x, y, radius) {
  // 벽력탄: '폭탄이 터지는 느낌' (테스터 피드백: 약하다)
  // 1) 하얀 섬광  2) 큰 번개 폭발 그림  3) 충격파 고리 2겹  4) 화면 흔들림  5) 파편·불씨  6) 그을린 자국  7) 폭발음
  particles.push({ flash: true, x, y: y - 10, vx: 0, vy: 0, size: radius * 3.2, life: 0.18, maxLife: 0.18 });
  if (SPRITES.fx_thunder && SPRITES.fx_thunder.width) {
    particles.push({ fxKey: 'fx_thunder', x, y: y - 14, vx: 0, vy: 0, size: radius * 3.4, rot: Math.random() * Math.PI * 2, life: 0.55, maxLife: 0.55 });
  }
  createShockwave(x, y, radius * 1.3, '#fde68a');
  setTimeout(() => createShockwave(x, y, radius * 1.9, '#fb923c'), 70);
  const d = Math.hypot(player.x - x, player.y - y);
  state.screenShake = Math.max(state.screenShake || 0, d < 900 ? 14 * (1 - d / 900) + 4 : 3);
  for (let k = 0; k < 22; k++) {
    const a = Math.random() * Math.PI * 2, sp = 180 + Math.random() * 380;
    particles.push({ x, y: y - 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7 - 120, gravity: 520,
      color: Math.random() < 0.5 ? '#fbbf24' : (Math.random() < 0.5 ? '#f97316' : '#57534e'),
      radius: 2 + Math.random() * 3.5, life: 0.5 + Math.random() * 0.35, maxLife: 0.85 });
  }
  groundDecals.push({ type: 'scorch', x, y, radius: radius * 0.95, life: 3.5, maxLife: 3.5 });
  if (sound.playExplosion) sound.playExplosion();
  // (예전 PixelFX 화약 구슬 효과는 새 폭발 그림과 겹쳐 어색해서 뺌)
}

// --- Rendering Loop & 16-Bit Retro Pixel Downscaler Pipeline ---
