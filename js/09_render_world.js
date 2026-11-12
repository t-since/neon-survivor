// 화면 그리기: 바닥, 날씨, 장애물, 신단, 포탈
function renderWorldContents() {
  ctx.save();
  const shakeK = (typeof gameSettings !== 'undefined') ? gameSettings.shake : 1; // 설정: 화면 흔들림 끄기/약하게/보통
  const shakeX = (state.screenShake > 0) ? (Math.random() - 0.5) * state.screenShake * shakeK : 0;
  const shakeY = (state.screenShake > 0) ? (Math.random() - 0.5) * state.screenShake * shakeK : 0;
  ctx.translate(gameWidth / 2 - state.camera.x + shakeX, gameHeight / 2 - state.camera.y + shakeY);

  // 1. Draw Ground Tiles
  renderGround();

  // 1.01 Draw Battlefield Corpses & Skeleton Remains (전장에 남는 몬스터 시체 및 백골 잔해)
  renderCorpses();

  // 1.02 Draw Persistent Ground Decals & Fissures (지열혈파 지면 대지 균열)
  renderGroundDecals();

  // 1.05 Draw Boss Arena Magic Seal (Zone 4 결전장)
  // (결전장 봉인 문양 renderBossArenaSeal: 사용자 요청으로 끔 — 최종보스 나올 때 바닥이 바뀌지 않게)

  // 1.06 Draw 2.5D Isometric Obstacles (석등, 이끼 거암, 대나무 군락, 방어 목책)
  renderObstacles('back');

  // 1.07 Draw Diablo-Style Martial Shrines (태을혈기, 풍신선풍, 금강불괴, 만천비검 신단)
  renderShrines();

  // 1.08 Draw Dropped Items with Diablo 3D Light Beams & Floating Badges
  renderDroppedItems();

  // 1.09 Draw Zone Isometric Decorative Props (성벽 횃불, 동굴 혈석 등)
  renderEnvironmentProps();

  // 1.1 Draw Victory Town Portal (디아블로2 승리 진격 관문)
  renderVictoryPortal();

  // 1.2 Draw Herbs (천년 영약)
  renderHerbs();

  // 1.4 Draw Chests (무림 비급 상자)
  renderChests();

  // 1.5 Draw Click Markers
  renderClickMarkers();

  // 1.8 Draw Poison Mist Zones (만천화우 독 안개 장판)
  renderPoisonZones();
  renderBossHazards();

  // 2. Draw Exp Gems & Recovery Elixirs
  renderExpGems();

  // 3. Draw Ground Bombs
  renderGroundBombs();

  // 4. Draw Dash Ink Afterimages
  renderDashAfterimages();

  // 5. Draw Enemies & Boss (with dynamic running/hopping motion!)
  renderEnemies();

  // 6. Draw Player (with 4-frame walk cycle!)
  renderPlayer();

  // 6.5 주인공보다 앞쪽(아래)에 있는 소품은 주인공 위에 그림 (뒤로 지나가면 가려짐)
  renderObstacles('front');

  // 7. Draw Flying Swords & Projectiles
  renderProjectiles();

  // 8. Draw Particles & Damage Numbers
  renderParticles();

  // 9. Draw Drifting Plum Blossoms (매화 꽃잎)
  renderPlumBlossoms();

  // 9.1 Draw Zone Atmospheric Weather Particles (댓잎, 불씨, 자색 독무, 룬 스파크)
  renderEnvironmentWeather();

  // 10. Draw Offscreen Objective Guides (영약/비급함/중간보스 유도)
  renderOffscreenGuides();

  ctx.restore();
}

function renderGame() {
  // 화면 배율(viewScale) × 선명도(renderDpr)를 기본으로 깔고, 그 위는 모두 월드 단위로 그림
  mainCtx.setTransform(viewScale * renderDpr, 0, 0, viewScale * renderDpr, 0, 0);
  if (state.isPixelArtMode) {
    const scale = state.pixelScale || 2.2;
    const pW = Math.max(1, Math.floor(gameWidth / scale));
    const pH = Math.max(1, Math.floor(gameHeight / scale));

    if (pixelBufferCanvas.width !== pW || pixelBufferCanvas.height !== pH) {
      pixelBufferCanvas.width = pW;
      pixelBufferCanvas.height = pH;
    }

    // Direct all world rendering into the low-res pixel buffer
    ctx = pixelBufferCtx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, pW, pH);

    // Scale down into low-res buffer while keeping existing world coordinates
    ctx.save();
    ctx.scale(1 / scale, 1 / scale);
    renderWorldContents();
    ctx.restore();

    // Upscale crisp chunky retro 16-bit pixel blocks onto the main canvas
    ctx = mainCtx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, gameWidth, gameHeight);
    ctx.drawImage(pixelBufferCanvas, 0, 0, gameWidth, gameHeight);
  } else {
    // Standard High-Res Mode
    ctx = mainCtx;
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, gameWidth, gameHeight);
    renderWorldContents();
  }

  // 11. Zone Auto-Warp Transition Fade (화면 전환 페이드 오버레이)
  renderZoneTransitionOverlay();
}

// --- Zone Environmental Props & Atmospheric Weather Particle System ---
let envWeatherParticles = [];
const MAX_ENV_PARTICLES = 42;

function updateEnvironmentWeather(dt) {
  const secIdx = Math.max(0, Math.min(4, (currentSelectedSector || 1) - 1));
  const zoneIdx = Math.max(0, Math.min(3, (state.currentZone || 1) - 1));
  const zoneCfg = (ZONE_CONFIGS[secIdx] && ZONE_CONFIGS[secIdx][zoneIdx]) ? ZONE_CONFIGS[secIdx][zoneIdx] : ZONE_CONFIGS[0][0];
  const weatherType = secIdx === 3 ? 'snow' : (zoneCfg.weather || 'leaves'); // 4구역 북해: 눈

  // Spawn weather particles to keep screen immersed
  while (envWeatherParticles.length < MAX_ENV_PARTICLES) {
    const pX = state.camera.x + (Math.random() - 0.5) * (gameWidth + 300);
    const pY = state.camera.y + (Math.random() - 0.5) * (gameHeight + 300);

    if (weatherType === 'snow') {
      // 북해 설원·빙궁: 비스듬히 내리는 눈
      envWeatherParticles.push({ type: 'snow', x: pX, y: pY, vx: -30 - Math.random() * 30, vy: 50 + Math.random() * 50, rot: 0, vRot: 0, size: 1.5 + Math.random() * 2.5, life: 3 + Math.random() * 3, maxLife: 6, color: '#f1f5f9' });
    } else if (weatherType === 'leaves') {
      // 1관문: 스산한 숲바람에 살랑살랑 흩날리는 은은한 마른 잎사귀 (차분한 디아블로 무협 톤)
      envWeatherParticles.push({
        type: 'leaves',
        x: pX,
        y: pY,
        vx: -60 - Math.random() * 50,
        vy: 30 + Math.random() * 30,
        rot: Math.random() * Math.PI * 2,
        vRot: 0.8 + Math.random() * 1.2,
        size: 3 + Math.random() * 3.5, // 작고 섬세함
        life: 3 + Math.random() * 2.5,
        maxLife: 5.5,
        color: Math.random() < 0.6 ? '#223824' : '#333e24'
      });
    } else if (weatherType === 'embers') {
      // 2관문: 불타는 성벽의 주황빛 불씨와 흙먼지
      envWeatherParticles.push({
        type: 'embers',
        x: pX,
        y: pY,
        vx: (Math.random() - 0.5) * 35,
        vy: -55 - Math.random() * 65, // 위로 솟구치는 불꽃
        rot: Math.random() * Math.PI * 2,
        vRot: Math.random() * 4,
        size: 2.5 + Math.random() * 3.5,
        life: 2.5 + Math.random() * 2.5,
        maxLife: 5,
        color: Math.random() < 0.5 ? '#f59e0b' : '#ef4444'
      });
    } else if (weatherType === 'miasma') {
      // 3관문: 동굴 바닥에서 솟아나는 자색 마기와 피안개
      envWeatherParticles.push({
        type: 'miasma',
        x: pX,
        y: pY,
        vx: (Math.random() - 0.5) * 20,
        vy: -22 - Math.random() * 25,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.8,
        size: 22 + Math.random() * 28,
        life: 3.5 + Math.random() * 3,
        maxLife: 6.5,
        color: Math.random() < 0.6 ? 'rgba(168, 85, 247, 0.16)' : 'rgba(236, 72, 153, 0.13)'
      });
    } else {
      // 4관문: 결전장의 붉은 마교 번개 스파크 & 룬 파편
      envWeatherParticles.push({
        type: 'runes',
        x: pX,
        y: pY,
        vx: (Math.random() - 0.5) * 60,
        vy: (Math.random() - 0.5) * 60,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 6,
        size: 3 + Math.random() * 5,
        life: 1.2 + Math.random() * 1.5,
        maxLife: 2.7,
        color: Math.random() < 0.7 ? '#f43f5e' : '#fbbf24'
      });
    }
  }

  // Update existing particles
  for (let i = envWeatherParticles.length - 1; i >= 0; i--) {
    const p = envWeatherParticles[i];
    p.life -= dt;
    if (p.life <= 0 || p.type !== weatherType) {
      envWeatherParticles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vRot * dt;

    // Reset if drifted too far from camera
    if (Math.abs(p.x - state.camera.x) > gameWidth / 2 + 180 || Math.abs(p.y - state.camera.y) > gameHeight / 2 + 180) {
      envWeatherParticles.splice(i, 1);
    }
  }
}

function renderEnvironmentWeather() {
  ctx.save();
  for (let i = 0; i < envWeatherParticles.length; i++) {
    const p = envWeatherParticles[i];
    const alpha = Math.min(1, p.life / 0.8, (p.maxLife - p.life) / 0.8);
    if (alpha <= 0.01) continue;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    if (p.type === 'snow') {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, Math.min(0.75, alpha * 0.8));
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'leaves') {
      // 숲바람 낙엽 (은은하고 자연스러운 22% 투명도)
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, Math.min(0.24, alpha * 0.3));
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'embers') {
      // 타오르는 불씨 (빛나는 다이아몬드 스파크)
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(0, 0, p.size * 0.7, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'miasma') {
      // 자색 독무 안개 구름
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 룬 스파크 번개 파편
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.rect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

// 쿼터뷰 입체 환경 오브젝트 (대나무 기둥 군락, 성벽 횃불, 동굴 혈석 등)
function renderEnvironmentProps() {
  // 관문 장식 소품 (제미나이 그림, 2026-11-09): 성채 = 쇠 화로, 동굴 = 종유석·빛나는 버섯, 결전장 = 청동 향로, 죽림 = 없음
  // (예전: 코드로 그린 횃불·뾰족한 보라 수정·룬 표식 → 배경과 어울리지 않아 교체)
  const secIdx = Math.max(0, Math.min(4, (currentSelectedSector || 1) - 1));
  const zoneIdx = Math.max(0, Math.min(3, (state.currentZone || 1) - 1));
  const zoneCfg = (ZONE_CONFIGS[secIdx] && ZONE_CONFIGS[secIdx][zoneIdx]) ? ZONE_CONFIGS[secIdx][zoneIdx] : ZONE_CONFIGS[0][0];
  // 구역별로 바꿔 끼우는 장식 (3구역 독 밀림, 4구역 빙궁) — 없으면 아래 기본
  const BY_SECTOR = {
    1: { torch: { key: 'prop_lantern_post', h: 140, glow: [251, 113, 133] } },
    4: { torch: { key: 'prop_blood_brazier', h: 110, glow: [239, 68, 68] }, crystal: { key: 'prop_rune_stele', h: 120, glow: [239, 68, 68] } },
    2: { crystal: { key: 'prop_poison_mushroom', h: 110, glow: [192, 132, 252] }, torch: { key: 'prop_vine_stump', h: 120, glow: [74, 222, 128] } },
    3: { crystal: { key: 'prop_ice_crystal', h: 125, glow: [125, 211, 252] }, torch: { key: 'prop_icicle_rock', h: 110, glow: [186, 230, 253] } }
  };
  const secArt = BY_SECTOR[secIdx] && BY_SECTOR[secIdx][zoneCfg.propType];
  const ART = (secArt && SPRITES[secArt.key] && SPRITES[secArt.key].width) ? secArt : {
    torch:   { key: 'prop_brazier',    h: 105, glow: [251, 146, 60] },
    crystal: { key: 'prop_stalagmite', h: 125, glow: [45, 212, 191] },
    altar:   { key: 'prop_incense',    h: 95,  glow: null }
  }[zoneCfg.propType];
  if (!ART) return;
  const img = SPRITES[ART.key];
  if (!img || !img.width) return;

  const gridSize = 430;
  const minGX = Math.floor((state.camera.x - gameWidth / 2 - 160) / gridSize);
  const maxGX = Math.ceil((state.camera.x + gameWidth / 2 + 160) / gridSize);
  const minGY = Math.floor((state.camera.y - gameHeight / 2 - 200) / gridSize);
  const maxGY = Math.ceil((state.camera.y + gameHeight / 2 + 200) / gridSize);
  const h = ART.h, w = h * img.width / img.height;

  for (let gx = minGX; gx <= maxGX; gx++) {
    for (let gy = minGY; gy <= maxGY; gy++) {
      const hash = Math.sin(gx * 374761393 + gy * 668265263) * 10000;
      const rnd = hash - Math.floor(hash);
      if (rnd > 0.3) continue; // 칸마다 30% 확률
      const px = gx * gridSize + (rnd * 260) - 130;
      const py = gy * gridSize + ((rnd * 7) % 1 * 260) - 130;
      if (Math.hypot(px, py) < 260) continue; // 시작 지점·결전 제단 가운데는 비움
      // 신단·다른 소품과 겹치지 않게 (11-12 사용자: 신단 위에 화로가 서 있던 문제)
      if (shrines.some(s => Math.abs(s.x - px) < 200 && Math.abs(s.y - py) < 200)) continue;
      if (obstacles.some(o => Math.abs(o.x - px) < 110 && Math.abs(o.y - py) < 110)) continue;

      ctx.save();
      ctx.translate(px, py);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 2, w * 0.4, w * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      if (ART.glow) {
        const pulse = 1 + Math.sin(state.gameTime * 6 + px) * 0.1;
        const gy2 = -h * 0.7;
        const g = ctx.createRadialGradient(0, gy2, 4, 0, gy2, 80 * pulse);
        g.addColorStop(0, `rgba(${ART.glow[0]}, ${ART.glow[1]}, ${ART.glow[2]}, 0.32)`);
        g.addColorStop(1, `rgba(${ART.glow[0]}, ${ART.glow[1]}, ${ART.glow[2]}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(-90, gy2 - 90, 180, 180);
      }
      if (rnd < 0.15) ctx.scale(-1, 1);
      ctx.drawImage(img, -w / 2, -h + 6, w, h);
      ctx.restore();
    }
  }
}


// --- 몬스터 시체 및 백골 잔해 시스템 (Battlefield Remains) ---
function updateCorpses(dt) {
  for (let i = corpses.length - 1; i >= 0; i--) {
    const c = corpses[i];
    c.life -= dt;
    if (c.life <= 0) {
      corpses.splice(i, 1);
    }
  }
}

// 적이 쓰러지는 모습: 그 적의 그림이 뒤로 넘어져 어둡게 누워 있다가, 먹물처럼 흩어지며 5초 뒤 사라짐
// (예전: 남색 덩어리·뼈 도형이 7.5초 동안 바닥에 남아 화면이 지저분했음)
const CORPSE_SPRITE_BY_TYPE = {
  skeleton: 'skeleton_run_0', archer: 'archer_shoot_0', jiangshi: 'jiangshi',
  ghoul: 'ghoul_run_0', necromancer: 'necromancer', butcher: 'butcher_run_0',
  barbarian: 'barbarian_run_0', sorceress: 'sorceress'
};
// 쓰러진 적이 살아 있을 때와 같은 새 그림을 쓰도록 (예전엔 옛 그림이 쓰러졌음)
function corpseArtOf(e) {
  try {
    if (e.isBoss) {
      const s = bossStyle(e);
      if (SPRITES[s.art + '_walk_1']) return { key: s.art, h: s.h, filter: null }; // 보스 그림은 색 바꾸지 않음 (drawBossBody 와 같게)
    } else if (e.isMiniBoss) {
      const l = miniBossLook(e);
      if (l.art) return { key: l.art, h: l.h, filter: l.filter || null };
    } else if (typeof enemyArt === 'function' && enemyArt(e) && SPRITES[enemyArt(e).key + '_walk_1']) {
      const a = enemyArt(e);
      return { key: a.key, h: a.h, filter: (e.elite ? (a.filter ? a.filter + ' ' : '') + 'sepia(0.35) saturate(1.8) hue-rotate(-25deg) brightness(0.95)' : a.filter) || null };
    }
  } catch (_) { /* 그림 정보가 없으면 예전 그림 */ }
  return null;
}
function corpseSpriteFor(c) {
  if (c.isBoss) return SPRITES.boss_demon;
  if (c.isMiniBoss) return SPRITES.miniboss_run_0 || SPRITES.assassin;
  return SPRITES[CORPSE_SPRITE_BY_TYPE[c.type]] || SPRITES.assassin_run_0 || SPRITES.assassin;
}

function renderCorpses() {
  if (!corpses || corpses.length === 0) return;
  const camX = state.camera.x;
  const camY = state.camera.y;
  const cullW = gameWidth / 2 + 120;
  const cullH = gameHeight / 2 + 120;

  corpses.forEach(c => {
    if (Math.abs(c.x - camX) > cullW || Math.abs(c.y - camY) > cullH) return;
    const img = corpseSpriteFor(c);
    const t = 1 - c.life / c.maxLife;          // 0 → 1
    const fall = Math.min(1, t / 0.08);         // 처음 0.4초 동안 넘어짐
    const ease = 1 - Math.pow(1 - fall, 3);
    const fade = t < 0.7 ? 1 : Math.max(0, 1 - (t - 0.7) / 0.3); // 마지막 30%(1.5초) 동안 흐려짐

    ctx.save();
    ctx.translate(c.x, c.y);
    // 바닥 그림자 (점점 옅어짐)
    ctx.globalAlpha = 0.35 * fade;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, 4, 34 * c.scale, 12 * c.scale, 0, 0, Math.PI * 2);
    ctx.fill();

    const artImg = c.art && SPRITES[c.art.key + '_walk_1'];
    if (artImg && artImg.width > 0) {
      const k = c.art.h / 300;
      ctx.globalAlpha = fade;
      ctx.scale(c.facing, 1);
      ctx.rotate(-ease * 1.3);
      ctx.scale(1, 1 - ease * 0.35);
      const q = Math.round(ease * 5) / 5;
      const dark = `brightness(${(1 - q * 0.55).toFixed(2)}) saturate(${(1 - q * 0.5).toFixed(2)})`;
      ctx.drawImage(tinted(artImg, (c.art.filter ? c.art.filter + ' ' : '') + dark), -220 * k, -320 * k + 4, 440 * k, 340 * k);
    } else if (img && img.width > 0) {
      const h = 118 * c.scale * (c.isBoss ? 1.6 : 1);
      const w = h * img.width / img.height;
      ctx.globalAlpha = fade;
      ctx.scale(c.facing, 1);
      ctx.rotate(-ease * 1.3);                     // 발을 축으로 뒤로 넘어짐
      ctx.scale(1, 1 - ease * 0.35);               // 위에서 보는 시점이라 눕는 만큼 납작하게
      const q = Math.round(ease * 5) / 5; // 0, 0.2 … 1 (6단계만 만들어 둠)
      ctx.drawImage(tinted(img, `brightness(${(1 - q * 0.55).toFixed(2)}) saturate(${(1 - q * 0.5).toFixed(2)})`), -w / 2, -h + 10, w, h);
    }
    ctx.restore();

    // 사라질 때 먹물 입자가 위로 흩어짐
    if (t > 0.7 && !c.inked) {
      c.inked = true;
      for (let k = 0; k < 7; k++) {
        particles.push({
          x: c.x + (Math.random() - 0.5) * 50 * c.scale,
          y: c.y - Math.random() * 30,
          vx: (Math.random() - 0.5) * 30,
          vy: -25 - Math.random() * 35,
          color: 'rgba(20, 22, 30, 0.8)',
          radius: 3 + Math.random() * 4,
          life: 0.7,
          maxLife: 0.7
        });
      }
    }
  });
}

function drawFissureLines(ctx, radius, seed) {
  const branches = 7;
  for (let b = 0; b < branches; b++) {
    const baseAng = (b / branches) * Math.PI * 2 + (seed * 0.1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    let curR = 0;
    let curAng = baseAng;
    const segs = 4;
    for (let s = 1; s <= segs; s++) {
      curR += (radius / segs) * (0.8 + Math.sin(seed + b * 3 + s) * 0.3);
      curAng += Math.sin(seed * 2 + b + s * 2) * 0.35;
      const fx = Math.cos(curAng) * curR;
      const fy = Math.sin(curAng) * (curR * 0.6); // 2.5D 입체 바닥 비율
      ctx.lineTo(fx, fy);
    }
    ctx.stroke();
  }
}

// 지열혈파 지속 지면 파쇄 및 마법진 데칼
function renderGroundDecals() {
  if (!groundDecals || groundDecals.length === 0) return;
  groundDecals.forEach(d => {
    ctx.save();
    ctx.translate(d.x, d.y);
    const alpha = Math.min(1.0, d.life / 0.6);
    ctx.globalAlpha = alpha;

    if (d.type === 'scorch') {
      // 벽력탄이 터진 자리의 검게 그을린 자국 (천천히 사라짐)
      ctx.globalAlpha = Math.min(1, d.life / 1.5) * 0.7;
      const g = ctx.createRadialGradient(0, 0, d.radius * 0.1, 0, 0, d.radius);
      g.addColorStop(0, 'rgba(10, 8, 6, 0.85)');
      g.addColorStop(0.6, 'rgba(30, 20, 12, 0.45)');
      g.addColorStop(1, 'rgba(30, 20, 12, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, d.radius, d.radius * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (d.type === 'blood_fissure' && SPRITES.fx_fissure && SPRITES.fx_fissure.width) {
      const size = d.radius * 2.5;
      const t = 1 - d.life / (d.maxLife || 2.2);
      const grow = Math.min(1, t / 0.12); // 처음에 확 갈라짐
      ctx.globalAlpha = Math.min(1, d.life / 0.6);
      ctx.drawImage(SPRITES.fx_fissure, -size / 2 * grow, -size / 2 * 0.62 * grow, size * grow, size * 0.62 * grow);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, d.life / 0.6) * (0.35 + Math.sin(state.gameTime * 10) * 0.15);
      ctx.drawImage(SPRITES.fx_fissure, -size / 2 * grow, -size / 2 * 0.62 * grow, size * grow, size * 0.62 * grow);
      ctx.restore();
      return;
    }
    if (d.type === 'blood_fissure') {
      // 1. 그을린 분화구 암흑 적색 베이스
      const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, d.radius);
      grad.addColorStop(0, 'rgba(153, 27, 27, 0.45)');
      grad.addColorStop(0.55, 'rgba(69, 10, 10, 0.3)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, d.radius, d.radius * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. 바깥쪽 암흑 흑요석 균열 (Charred jagged fracture)
      ctx.save();
      ctx.strokeStyle = '#2b0707';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      drawFissureLines(ctx, d.radius, d.seed);

      // 3. 중심부 핏빛 용암 발광 균열 (Molten blood crimson cracks)
      ctx.strokeStyle = '#ef4444';
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.6;
      drawFissureLines(ctx, d.radius, d.seed);

      // 4. 최심부 고열 백색-연분홍 심핵선
      ctx.strokeStyle = '#fecaca';
      ctx.lineWidth = 1.2;
      drawFissureLines(ctx, d.radius * 0.65, d.seed);
      ctx.restore();
    }
    ctx.restore();
  });
}

// ---------- 바닥 위 움직이는 효과 (같은 바닥 그림이라도 구역 재질이 느껴지게) ----------
// 월드를 칸으로 나눠 칸마다 정해진 자리에 효과 하나 (칸 번호로 만든 난수라 화면이 움직여도 제자리)
function groundCellRand(cx, cy, k) {
  let s = (Math.imul(cx, 374761393) ^ Math.imul(cy, 668265263) ^ Math.imul(k, 2246822519)) >>> 0;
  s = Math.imul(s ^ (s >>> 13), 1274126177) >>> 0;
  return ((s ^ (s >>> 16)) >>> 0) / 4294967296;
}
const GROUND_FX = {
  ground_new_ice:  { cell: 150, kind: 'glint', sheen: true },
  ground_ice_v2:   { cell: 150, kind: 'glint', sheen: true },
  ground_new_snow: { cell: 110, kind: 'glint', small: true },
  ground_snow_v2:  { cell: 110, kind: 'glint', small: true },
  ground_new_swamp: { cell: 210, kind: 'bubble' },
  ground_swamp_v2:  { cell: 210, kind: 'bubble' },
  ground_new_cavern: { cell: 260, kind: 'glow', color: [167, 139, 250] },
  ground_cavern_v2:  { cell: 260, kind: 'glow', color: [167, 139, 250] },
  ground_new_bloodpalace: { cell: 280, kind: 'glow', color: [239, 68, 68] },
  ground_bloodpalace_v2:  { cell: 280, kind: 'glow', color: [239, 68, 68] }
};
function drawGroundFx(key) {
  const fx = GROUND_FX[key];
  if (!fx) return;
  const t = state.gameTime || 0;
  const L = state.camera.x - gameWidth / 2, T = state.camera.y - gameHeight / 2;
  const C = fx.cell;
  ctx.save();
  // 빙판: 넓은 광택 띠가 천천히 대각선으로 흘러감
  if (fx.sheen) {
    // 8초마다 화면을 왼쪽 위 → 오른쪽 아래로 한 번 쓸고 지나감
    const u = ((t / 8) % 1) * 1.8 - 0.4;
    const cxs = L + u * (gameWidth + gameHeight), w = 260;
    const g = ctx.createLinearGradient(cxs - w, T, cxs + w, T + w * 2);
    g.addColorStop(0, 'rgba(224, 242, 254, 0)');
    g.addColorStop(0.5, 'rgba(224, 242, 254, 0.13)');
    g.addColorStop(1, 'rgba(224, 242, 254, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(L, T, gameWidth, gameHeight);
  }
  ctx.globalCompositeOperation = fx.kind === 'bubble' ? 'source-over' : 'lighter';
  const x0 = Math.floor(L / C), x1 = Math.floor((L + gameWidth) / C), y0 = Math.floor(T / C), y1 = Math.floor((T + gameHeight) / C);
  for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
    const px = (cx + 0.15 + groundCellRand(cx, cy, 1) * 0.7) * C;
    const py = (cy + 0.15 + groundCellRand(cx, cy, 2) * 0.7) * C;
    const ph = groundCellRand(cx, cy, 3) * 6.28, sp = 0.6 + groundCellRand(cx, cy, 4) * 0.9;
    if (fx.kind === 'glint') {
      // 반짝: 대부분 꺼져 있다가 잠깐 별처럼 빛남
      const a = Math.pow(Math.max(0, Math.sin(t * sp * 1.6 + ph)), 14);
      if (a < 0.03) continue;
      const r = (fx.small ? 5 : 8) * (0.6 + a * 0.6);
      ctx.fillStyle = `rgba(255, 255, 255, ${a * 0.9})`;
      ctx.beginPath();
      ctx.moveTo(px - r, py); ctx.lineTo(px - r * 0.15, py - r * 0.15); ctx.lineTo(px, py - r); ctx.lineTo(px + r * 0.15, py - r * 0.15);
      ctx.lineTo(px + r, py); ctx.lineTo(px + r * 0.15, py + r * 0.15); ctx.lineTo(px, py + r); ctx.lineTo(px - r * 0.15, py + r * 0.15);
      ctx.closePath(); ctx.fill();
    } else if (fx.kind === 'bubble') {
      // 늪 거품: 부풀었다가 톡 터짐 (3초 주기)
      const cyc = ((t * sp * 0.35 + ph / 6.28) % 1);
      if (cyc > 0.85) continue;
      const r = 3 + cyc * 9;
      ctx.strokeStyle = `rgba(190, 242, 100, ${0.55 * (1 - cyc)})`;
      ctx.fillStyle = `rgba(101, 163, 13, ${0.22 * (1 - cyc)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (fx.kind === 'glow') {
      // 수정·핏빛 불씨: 은은하게 숨 쉬듯 밝아졌다 어두워짐
      const a = 0.10 + 0.12 * (0.5 + 0.5 * Math.sin(t * sp + ph));
      const r = 50 + groundCellRand(cx, cy, 5) * 40;
      const [cr, cg, cb] = fx.color;
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${a})`);
      g.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(px - r, py - r, r * 2, r * 2);
    }
  }
  ctx.restore();
}

function renderGround() {
  const secIdx = Math.max(0, Math.min(4, (currentSelectedSector || 1) - 1));
  const zoneIdx = Math.max(0, Math.min(3, (state.currentZone || 1) - 1));
  const zoneCfg = (ZONE_CONFIGS[secIdx] && ZONE_CONFIGS[secIdx][zoneIdx]) ? ZONE_CONFIGS[secIdx][zoneIdx] : ZONE_CONFIGS[0][0];

  // 관문 테마별 바닥 (제미나이로 만든 이음새 없는 바닥 그림, 2026-11)
  const GROUND_BY_THEME = {
    bamboo_grove: 'ground_new_bamboo',
    stone_fortress: 'ground_new_fortress',
    blood_cavern: 'ground_new_cavern',
    demon_sanctum: 'ground_new_fortress'
  };
  // 구역마다 다른 바닥 (2구역 뒷골목, 3구역 밀림·늪, 4구역 설원·빙궁, 5구역 혈마전) — 그림이 없으면 위 기본 바닥
  const GROUND_BY_SECTOR = [
    {},
    { stone_fortress: 'ground_new_alley' },
    { bamboo_grove: 'ground_new_jungle', stone_fortress: 'ground_new_jungle', blood_cavern: 'ground_new_swamp', demon_sanctum: 'ground_new_swamp' },
    { stone_fortress: 'ground_new_snow', blood_cavern: 'ground_new_ice', demon_sanctum: 'ground_new_ice' },
    { stone_fortress: 'ground_new_bloodpalace', demon_sanctum: 'ground_new_bloodpalace' }
  ];
  const secKey = (GROUND_BY_SECTOR[secIdx] || {})[zoneCfg.theme];
  let newKey = (secKey && SPRITES[secKey] && SPRITES[secKey].width > 0) ? secKey : (GROUND_BY_THEME[zoneCfg.theme] || 'ground_new_fortress');
  // 2차 바닥 그림(ground_<이름>_v2)이 있으면 그것을 씀
  const v2Key = newKey.replace('ground_new_', 'ground_') + '_v2';
  if (SPRITES[v2Key] && SPRITES[v2Key].width > 0) newKey = v2Key;
  const newImg = SPRITES[newKey];
  let groundImg = (newImg && newImg.width > 0) ? newImg : (SPRITES['ground_seamless_stone'] || SPRITES.ground_stone_iso || SPRITES.ground);

  // 새 바닥은 크게 깔아서 반복 무늬가 덜 보이게 함
  const tileSize = (groundImg === newImg) ? 820 : 512;
  const startX = Math.floor((state.camera.x - gameWidth / 2) / tileSize) * tileSize;
  const endX = Math.ceil((state.camera.x + gameWidth / 2) / tileSize) * tileSize;
  const startY = Math.floor((state.camera.y - gameHeight / 2) / tileSize) * tileSize;
  const endY = Math.ceil((state.camera.y + gameHeight / 2) / tileSize) * tileSize;

  // 1. 타일 경계선 없는 심리스 베이스 지형 렌더링
  if (groundImg && ((typeof HTMLCanvasElement !== 'undefined' && groundImg instanceof HTMLCanvasElement) || groundImg.complete || (groundImg.width > 0))) {
    for (let x = startX; x <= endX; x += tileSize) {
      for (let y = startY; y <= endY; y += tileSize) {
        // 1px씩 겹쳐 깔아 확대·축소 때 타일 사이 가는 틈(격자선)이 보이지 않게 함
        ctx.drawImage(groundImg, x - 1, y - 1, tileSize + 2, tileSize + 2);
      }
    }
  } else {
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(startX, startY, endX - startX + tileSize, endY - startY + tileSize);
  }

  state.groundKey = (groundImg === newImg) ? newKey : null; // 빙판 미끄러짐 등에서 씀 (07_update)
  drawGroundFx(state.groundKey);
  if (typeof drawEnemyTelegraphs === 'function') drawEnemyTelegraphs(); // 묵직한 공격 경고 (07_update)

  // 2. 매크로 라이팅 & 대기감 (타일 격자감을 완전히 지우는 자연스러운 조명/그늘 비네트)
  // (화면 가장자리 어둡게 하기는 index.html 의 #vignette 고정 층으로 옮김 — 매번 그리면 PC에서 느림)

  // 3. 관문별 독자적 색조와 대기감 주입
  if (zoneCfg.ambient) {
    ctx.fillStyle = zoneCfg.ambient;
    ctx.fillRect(state.camera.x - gameWidth / 2, state.camera.y - gameHeight / 2, gameWidth, gameHeight); // 보이는 화면만
  }

  // 4. 고대 제단 마법진 랜드마크 (각진 직사각형 경계선 없는 원형 융합 랜드마크)
  if (false && (zoneCfg.spriteKey === 'ground_sanctum' || zoneCfg.theme === 'demon_sanctum')) { // 결전장 붉은 제단 바닥: 사용자 요청으로 끔
    const sanctumImg = SPRITES['ground_sanctum_feathered'] || SPRITES.ground_sanctum;
    if (sanctumImg && (sanctumImg.complete || sanctumImg.width > 0)) {
      ctx.save();
      const altarW = 920;
      const altarH = 920;
      ctx.drawImage(sanctumImg, -altarW / 2, -altarH / 2, altarW, altarH);
      // 어울리지 않는 인위적인 선형식 회전 링 완전 제거 (고풍 석판 제단 원본 텍스처 자체만 자연스럽게 유지)
      ctx.restore();
    }
  }
}

// 2.5D Isometric Obstacles (고풍 3단 석등, 이끼 거암, 대나무 군락, 방어 목책)
// 소품 그림 크기(월드 단위). 서진 키 = 144
const PROP_SPRITE_DEFS = {
  bamboo:     { key: 'prop_bamboo',     h: 210, foot: 8,  shadowW: 0.34, sway: true },
  rock_big:   { key: 'prop_rock_big',   w: 128, foot: 10, shadowW: 0.46 },
  boulder:    { key: 'prop_rock_big',   w: 128, foot: 10, shadowW: 0.46 },
  rock_small: { key: 'prop_rock_small', w: 70,  foot: 6,  shadowW: 0.46 },
  lantern:    { key: 'prop_lantern',    h: 112, foot: 8,  shadowW: 0.40, glow: true },
  fence:      { key: 'prop_barricade',  w: 120, foot: 8,  shadowW: 0.42 },
  // 3구역 독 밀림·늪
  poison_mushroom: { key: 'prop_poison_mushroom', h: 120, foot: 8, shadowW: 0.40 },
  swamp_reeds:     { key: 'prop_swamp_reeds',     h: 140, foot: 6, shadowW: 0.34, sway: true },
  vine_stump:      { key: 'prop_vine_stump',      h: 130, foot: 8, shadowW: 0.44 },
  bone_pile:       { key: 'prop_bone_pile',       w: 110, foot: 6, shadowW: 0.46 },
  // 4구역 빙궁·설원
  ice_crystal:     { key: 'prop_ice_crystal',     h: 140, foot: 8, shadowW: 0.38 },
  snow_rock:       { key: 'prop_snow_rock',       w: 120, foot: 10, shadowW: 0.46 },
  ice_pillar:      { key: 'prop_ice_pillar',      h: 150, foot: 8, shadowW: 0.34 },
  icicle_rock:     { key: 'prop_icicle_rock',     w: 125, foot: 10, shadowW: 0.46 },
  // 2구역 하오문 뒷골목
  wine_barrels:    { key: 'prop_wine_barrels',    w: 105, foot: 8, shadowW: 0.44 },
  cargo_crates:    { key: 'prop_cargo_crates',    w: 115, foot: 8, shadowW: 0.46 },
  broken_cart:     { key: 'prop_broken_cart',     w: 130, foot: 8, shadowW: 0.46 },
  lantern_post:    { key: 'prop_lantern_post',    h: 150, foot: 6, shadowW: 0.28, glow: true },
  // 5구역 마교
  blood_brazier:   { key: 'prop_blood_brazier',   h: 115, foot: 8, shadowW: 0.36, glow: true },
  demon_statue:    { key: 'prop_demon_statue',    h: 135, foot: 8, shadowW: 0.40 },
  skull_heap:      { key: 'prop_skull_heap',      w: 115, foot: 6, shadowW: 0.46 },
  rune_stele:      { key: 'prop_rune_stele',      h: 130, foot: 8, shadowW: 0.36 }
};

// pass: 'back' = 주인공보다 뒤(위쪽)에 있는 소품, 'front' = 주인공보다 앞(아래쪽)에 있는 소품
// 이렇게 두 번 나눠 그려서 주인공이 대나무·석등 뒤로 지나가면 가려지게 함
function renderObstacles(pass = 'all') {
  if (typeof ensureObstacleChunks === 'function') ensureObstacleChunks();
  if (!obstacles || obstacles.length === 0) return;
  const camX = state.camera.x;
  const camY = state.camera.y;
  const cullW = gameWidth / 2 + 160;
  const cullH = gameHeight / 2 + 240;

  obstacles.forEach(obs => {
    if (Math.abs(obs.x - camX) > cullW || Math.abs(obs.y - camY) > cullH) return;
    if (pass === 'back' && obs.y > player.y) return;
    if (pass === 'front' && obs.y <= player.y) return;
    ctx.save();
    ctx.translate(obs.x, obs.y);

    // --- 새 그림 소품 (있으면 그림으로, 없으면 아래 예전 도형 그리기) ---
    const def = PROP_SPRITE_DEFS[obs.type];
    const img = def && SPRITES[def.key];
    if (img && img.width > 0) {
      const sc = obs.scale || 1;
      const h = (def.h || def.w * img.height / img.width) * sc;
      const w = (def.w || def.h * img.width / img.height) * sc;
      // 바닥 그림자
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.beginPath();
      ctx.ellipse(0, 2, w * def.shadowW, w * def.shadowW * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      // 석등 불빛
      if (def.glow) {
        const pulse = 1.0 + Math.sin(state.gameTime * 6 + obs.x) * 0.1;
        const g = ctx.createRadialGradient(0, -h * 0.55, 4, 0, -h * 0.55, 70 * pulse);
        g.addColorStop(0, 'rgba(251, 191, 36, 0.35)');
        g.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(-80, -h * 0.55 - 80, 160, 160);
      }
      // 주인공이 앞쪽 소품 뒤에 숨으면 살짝 투명하게
      if (pass === 'front' && Math.abs(player.x - obs.x) < w * 0.45 && player.y > obs.y - h && player.y < obs.y) {
        ctx.globalAlpha = 0.55;
      }
      if (obs.flip) ctx.scale(-1, 1);
      if (def.sway) {
        // 대나무는 바람에 살랑 (윗부분만 휘도록 기울임)
        const sway = Math.sin(state.gameTime * 1.6 + obs.x * 0.01) * 0.035;
        ctx.transform(1, 0, sway, 1, 0, 0);
      }
      ctx.drawImage(img, -w / 2, -h + def.foot, w, h);
      ctx.restore();
      return;
    }

    if (obs.type === 'lantern') {
      // 1. 고풍 3단 무협 석등 (Stone Pagoda Lantern)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 8, 22, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Warm Fire Lantern Glow
      const pulse = 1.0 + Math.sin(state.gameTime * 7 + obs.x) * 0.12;
      const lanternGlow = ctx.createRadialGradient(0, -22, 3, 0, -22, 42 * pulse);
      lanternGlow.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
      lanternGlow.addColorStop(0.5, 'rgba(245, 158, 11, 0.15)');
      lanternGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lanternGlow;
      ctx.beginPath();
      ctx.ellipse(0, -20, 42 * pulse, 30 * pulse, 0, 0, Math.PI * 2);
      ctx.fill();

      // Lower stone pedestal
      ctx.fillStyle = '#334155';
      ctx.fillRect(-12, -4, 24, 10);
      ctx.fillStyle = '#475569';
      ctx.fillRect(-10, -14, 20, 10);

      // Mid pillar
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-5, -28, 10, 14);

      // Lantern Chamber (Warm paper screen)
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-8, -36, 16, 10);
      // Wooden lattice bars
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-8, -36, 16, 2);
      ctx.fillRect(-8, -28, 16, 2);
      ctx.fillRect(-1, -36, 2, 10);

      // Curved Pagoda Roof (2.5D tiled overhang)
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(0, -48);
      ctx.quadraticCurveTo(-14, -42, -18, -36);
      ctx.lineTo(18, -36);
      ctx.quadraticCurveTo(14, -42, 0, -48);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Spire Finial
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(0, -50, 3, 0, Math.PI * 2);
      ctx.fill();

    } else if (obs.type === 'boulder') {
      // 2. 이끼 낀 2.5D 거암 (Craggy Moss Boulder)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
      ctx.beginPath();
      ctx.ellipse(2, 6, 36, 18, -0.15, 0, Math.PI * 2);
      ctx.fill();

      // Rock Base Dark Side
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(-30, 2);
      ctx.lineTo(-24, -26);
      ctx.lineTo(0, -38);
      ctx.lineTo(26, -28);
      ctx.lineTo(34, 0);
      ctx.lineTo(18, 10);
      ctx.lineTo(-18, 8);
      ctx.closePath();
      ctx.fill();

      // Rock Light Top & Facets
      const rockGrad = ctx.createLinearGradient(-15, -35, 20, 10);
      rockGrad.addColorStop(0, '#64748b');
      rockGrad.addColorStop(0.5, '#475569');
      rockGrad.addColorStop(1, '#334155');
      ctx.fillStyle = rockGrad;
      ctx.beginPath();
      ctx.moveTo(-18, -24);
      ctx.lineTo(0, -36);
      ctx.lineTo(22, -26);
      ctx.lineTo(8, -10);
      ctx.lineTo(-12, -8);
      ctx.closePath();
      ctx.fill();

      // Dark Obsidian Weathering (바닥 석판과 자연스럽게 녹아드는 흑요석 음영)
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(-8, -28, 9, 5, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.ellipse(10, -22, 7, 4, 0.2, 0, Math.PI * 2);
      ctx.fill();

    } else if (obs.type === 'bamboo_clump') {
      // 3. 2.5D 대나무 군락 (Natural Bamboo Clump)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
      ctx.beginPath();
      ctx.ellipse(0, 6, 26, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      const stalkXs = [-10, 2, 12];
      const stalkHeights = [52, 68, 58];
      const leanings = [-0.08, 0.02, 0.1];

      for (let s = 0; s < 3; s++) {
        const sx = stalkXs[s];
        const sh = stalkHeights[s];
        const lean = leanings[s];

        ctx.save();
        ctx.translate(sx, 0);
        ctx.rotate(lean);

        const bambooGrad = ctx.createLinearGradient(-3, 0, 3, 0);
        bambooGrad.addColorStop(0, '#166534');
        bambooGrad.addColorStop(0.5, '#22c55e');
        bambooGrad.addColorStop(1, '#14532d');
        ctx.fillStyle = bambooGrad;
        ctx.fillRect(-3.5, -sh, 7, sh);

        ctx.fillStyle = '#0f291e';
        for (let yj = -15; yj > -sh; yj -= 16) {
          ctx.fillRect(-4.5, yj, 9, 2.2);
          ctx.fillStyle = '#4ade80';
          ctx.fillRect(-4, yj - 1, 8, 0.8);
          ctx.fillStyle = '#0f291e';
        }

        const wind = Math.sin(state.gameTime * 3 + sx) * 5;
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.ellipse(wind, -sh - 6, 18, 6, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.ellipse(wind - 4, -sh - 10, 14, 5, 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

    } else {
      // 4. 무협 방어 목책 (Wuxia Wooden Barricade)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 28, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      const stakeXs = [-14, -4, 6, 16];
      ctx.fillStyle = '#78350f';
      for (let px of stakeXs) {
        ctx.beginPath();
        ctx.moveTo(px - 3, 2);
        ctx.lineTo(px + 3, 2);
        ctx.lineTo(px + 3, -32);
        ctx.lineTo(px, -40);
        ctx.lineTo(px - 3, -32);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-18, -14, 38, 5);
      ctx.fillRect(-18, -26, 38, 5);

      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-14, -14, 2, 5);
      ctx.fillRect(6, -26, 2, 5);
    }

    ctx.restore();
  });
}

// 디아블로풍 기연 신단 (태을혈기, 풍신선풍, 금강불괴, 만천비검 신단)
function renderShrines() {
  if (!shrines || shrines.length === 0) return;
  shrines.forEach(s => {
    ctx.save();
    ctx.translate(s.x, s.y);

    const now = state.gameTime * 2.5 + (s.pulse || 0);
    const pulse = 1.0 + Math.sin(now) * 0.1;

    // --- 새 그림 신단 ---
    const simg = SPRITES['shrine_' + s.type];
    if (simg && simg.width > 0) {
      const w = 150;
      const h = w * simg.height / simg.width;
      // 바닥 그림자
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 6, w * 0.48, w * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      if (s.active) {
        // 바닥에 은은하게 도는 빛 고리
        ctx.save();
        ctx.globalAlpha = 0.55 + Math.sin(now) * 0.15;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.56 * pulse, w * 0.24 * pulse, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else {
        // 이미 쓴 신단은 빛이 꺼진 돌 (아래 그릴 때 회색 그림 사용)
        if (s.respawn > 0 && Math.hypot(player.x - s.x, player.y - s.y) < 300) {
          ctx.save(); ctx.filter = 'none';
          ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
          ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
          const txt = Math.ceil(s.respawn) + '초 뒤 다시 깨어남';
          ctx.strokeText(txt, 0, -h + w * 0.2 - 12); ctx.fillStyle = '#cbd5e1'; ctx.fillText(txt, 0, -h + w * 0.2 - 12);
          ctx.restore();
        }
      }
      ctx.drawImage(s.active ? simg : tinted(simg, 'grayscale(1) brightness(0.55)'), -w / 2, -h + w * 0.2, w, h);
      ctx.filter = 'none';
      if (s.active) {
        // 구슬이 숨 쉬듯 빛남
        const orbY = -h + w * 0.2 + h * 0.36;
        const orbX = (s.type === 'invincible' || s.type === 'infinite_blades') ? w * 0.02 : -w * 0.06;
        const g = ctx.createRadialGradient(orbX, orbY, 2, orbX, orbY, 34 * pulse);
        g.addColorStop(0, 'rgba(255,255,255,0.55)');
        g.addColorStop(0.4, s.color + '88');
        g.addColorStop(1, s.color + '00');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(orbX, orbY, 34 * pulse, 0, Math.PI * 2);
        ctx.fill();
        // 이름은 가까이 왔을 때만 짧게 표시 (화면을 가리지 않게)
        const near = Math.hypot(player.x - s.x, player.y - s.y) < 260;
        if (near) {
          const shortName = s.name.split(' (')[0];
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = 4;
          ctx.strokeStyle = 'rgba(0,0,0,0.85)';
          ctx.strokeText(`${s.icon} ${shortName}`, 0, -h + w * 0.2 - 12);
          ctx.fillStyle = '#fff';
          ctx.fillText(`${s.icon} ${shortName}`, 0, -h + w * 0.2 - 12);
        }
      }
      ctx.restore();
      return;
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 36, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    if (s.active) {
      // 1. 바닥 회전 팔괘 마법진 (Rotating Bagua Elemental Array)
      ctx.save();
      ctx.rotate(now * 0.4);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.ellipse(0, 0, 48 * pulse, 24 * pulse, 0, 0, Math.PI * 2);
      ctx.stroke();

      for (let k = 0; k < 6; k++) {
        const ka = (k / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ka) * 36 * pulse, Math.sin(ka) * 18 * pulse);
        ctx.lineTo(Math.cos(ka + Math.PI * 0.7) * 36 * pulse, Math.sin(ka + Math.PI * 0.7) * 18 * pulse);
        ctx.stroke();
      }
      ctx.restore();

      // 2. 수직 기연 광선 (Vertical Light Beacon)
      const beaconGrad = ctx.createLinearGradient(0, 0, 0, -110);
      beaconGrad.addColorStop(0, s.color);
      beaconGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.4)');
      beaconGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = beaconGrad;
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(-4, -110);
      ctx.lineTo(4, -110);
      ctx.lineTo(16, 0);
      ctx.closePath();
      ctx.fill();
    }

    // 3. 고대 기연 석좌 (Carved Stone Pedestal)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-22, -6, 44, 14);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-18, -14, 36, 10);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-14, -20, 28, 8);

    // 4. 기연 비석 (Upright Martial Stele)
    const steleGrad = ctx.createLinearGradient(-12, -60, 12, -20);
    steleGrad.addColorStop(0, s.active ? '#334155' : '#1e293b');
    steleGrad.addColorStop(1, s.active ? '#1e293b' : '#0f172a');
    ctx.fillStyle = steleGrad;
    ctx.beginPath();
    ctx.moveTo(0, -66);
    ctx.lineTo(12, -56);
    ctx.lineTo(12, -20);
    ctx.lineTo(-12, -20);
    ctx.lineTo(-12, -56);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = s.active ? s.color : '#475569';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.font = 'bold 11px serif';
    ctx.fillStyle = s.active ? s.color : '#64748b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = s.active ? s.color : 'transparent';
    ctx.shadowBlur = s.active ? 8 : 0;
    ctx.fillText(s.active ? '神壇' : '無氣', 0, -38);
    ctx.shadowBlur = 0;

    // 5. 상단 칭호 명패 & 아이콘 (Overhead Floating Badge)
    if (s.active) {
      const bobY = Math.sin(now * 1.5) * 4;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(-48, -95 + bobY, 96, 24, 6);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${s.icon} ${s.name}`, 0, -83 + bobY);
    }

    ctx.restore();
  });
}

// 디아블로식 필드 드롭 아이템 (수직 빛기둥, 보빙 아이콘, 이름표)
function renderDroppedItems() {
  return;
  if (!droppedItems || droppedItems.length === 0) return;
  droppedItems.forEach(item => {
    ctx.save();
    ctx.translate(item.x, item.y);

    const bob = Math.sin(item.bobTimer || 0) * 5;
    const tierColor = item.tier === 'legendary' ? '#fbbf24' : (item.tier === 'epic' ? '#c084fc' : '#38bdf8');

    // 1. Soft ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 20, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. High-Pillar Diablo Loot Light Beam
    const beamGrad = ctx.createLinearGradient(0, 0, 0, -85);
    beamGrad.addColorStop(0, tierColor);
    beamGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.55)');
    beamGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(-2, -85);
    ctx.lineTo(2, -85);
    ctx.lineTo(10, 0);
    ctx.closePath();
    ctx.fill();

    // 3. Rotating Loot Sparkle Rings
    const rot = (item.bobTimer || 0) * 1.5;
    ctx.strokeStyle = tierColor;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = tierColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(0, -18 + bob, 16, 7, rot, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 4. Floating Item Icon & Label Badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.strokeStyle = tierColor;
    ctx.lineWidth = 1.8;
    ctx.shadowColor = tierColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(-45, -50 + bob, 90, 22, 6);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${item.icon} ${item.name.split(' ')[0]}`, 0, -39 + bob);

    ctx.restore();
  });
}

function renderBossArenaSeal() {
  ctx.save();
  ctx.translate(0, 0); // Arena origin
  const now = state.gameTime * 0.45;

  // Outer demonic ring
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 480, 280, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Middle rotating blood rune ring
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 320, 180, now * 0.35, 0, Math.PI * 2);
  ctx.stroke();

  // Inner pentagram/hexagram magic lines
  ctx.strokeStyle = 'rgba(244, 63, 94, 0.35)';
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 6; i++) {
    const a1 = (i * Math.PI / 3) + now * 0.2;
    const a2 = ((i + 2) * Math.PI / 3) + now * 0.2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a1) * 320, Math.sin(a1) * 180);
    ctx.lineTo(Math.cos(a2) * 320, Math.sin(a2) * 180);
    ctx.stroke();
  }
  ctx.restore();
}

function renderVictoryPortal() {
  if (!state.victoryPortal || !state.victoryPortal.active) return;
  const p = state.victoryPortal;
  const now = state.gameTime * 2.8;
  if (SPRITES.fx_portal && SPRITES.fx_portal.width) {
    const t = state.gameTime;
    const pulse = 1 + Math.sin(t * 3) * 0.05;
    // 바닥 빛 (납작하게)
    drawFxImage('fx_portal', p.x, p.y + 6, 230 * pulse, 0.45, -t * 1.2, 0.35);
    // 서 있는 소용돌이: 큰 것은 천천히, 안쪽 것은 반대로 빠르게
    drawFxImage('fx_portal', p.x, p.y - 95, 190 * pulse, 0.8, t * 1.6);
    drawFxImage('fx_portal', p.x, p.y - 95, 110, 0.3, -t * 2.6);
    // 주변 빛 입자가 가운데로 빨려 들어감
    if (Math.random() < 0.5 * (state.frameK || 0)) {
      const a = Math.random() * Math.PI * 2, r = 120 + Math.random() * 40;
      particles.push({ x: p.x + Math.cos(a) * r, y: p.y - 95 + Math.sin(a) * r, vx: -Math.cos(a) * r * 1.6, vy: -Math.sin(a) * r * 1.6,
        color: Math.random() < 0.5 ? '#fde68a' : '#bae6fd', radius: 2 + Math.random() * 2, life: 0.55, maxLife: 0.55 });
    }
    return;
  }

  ctx.save();
  ctx.translate(p.x, p.y);

  const pulse = 1 + Math.sin(now * 2.2) * 0.08;

  // --- 1. 지면 차원 균열 & 심연 소용돌이 (pixelfx/arcane/portal.js & spawn-portal.js) ---
  // (1) 외곽 확장형 바닥 방사 진기 파동 (Expanding Ground Ripple Shockwave)
  const waveCycle = (state.gameTime * 0.6) % 1.0;
  const waveR = 30 + waveCycle * 80;
  ctx.strokeStyle = `rgba(251, 191, 36, ${Math.max(0, (1 - waveCycle) * 0.65)})`;
  ctx.lineWidth = 2.5 * (1 - waveCycle);
  ctx.beginPath();
  ctx.ellipse(0, 0, waveR, waveR * 0.52, 0, 0, Math.PI * 2);
  ctx.stroke();

  // (2) 광대한 바닥 심연 아우라 (Deep Amethyst & Amber Floor Gradient)
  const auraGrad = ctx.createRadialGradient(0, 0, 15, 0, 0, 105 * pulse);
  auraGrad.addColorStop(0, 'rgba(251, 191, 36, 0.95)'); // 중심 황금빛
  auraGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.7)'); // 에테르 청록빛
  auraGrad.addColorStop(0.65, 'rgba(147, 51, 234, 0.35)'); // 심연 자색
  auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 105 * pulse, 54 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();

  // (3) 회전하는 외곽 팔괘/금강 천공 법륜 (Outer Rotating 8-Point Golden Seal)
  ctx.save();
  ctx.rotate(now * 0.6);
  ctx.strokeStyle = '#fbbf24';
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 18;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 68 * pulse, 36 * pulse, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 8방향 룬 부적 표식 (8 Celestial Runes)
  for (let r = 0; r < 8; r++) {
    const rAng = (r * Math.PI) / 4;
    const rx = Math.cos(rAng) * (68 * pulse);
    const ry = Math.sin(rAng) * (36 * pulse);
    ctx.fillStyle = (r % 2 === 0) ? '#ffffff' : '#fbbf24';
    ctx.fillRect(rx - 2.5, ry - 2.5, 5, 5);
  }
  ctx.restore();

  // (4) 역회전하는 내곽 청록 영기 마법진 (Counter-rotating Inner Cyan Ring)
  ctx.save();
  ctx.rotate(-now * 1.3);
  ctx.strokeStyle = '#38bdf8';
  ctx.shadowColor = '#0284c7';
  ctx.shadowBlur = 14;
  ctx.lineWidth = 2.4;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.ellipse(0, 0, 48 * pulse, 25 * pulse, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // (5) 차원 심연 홀 & 4줄기 빨려 들어가는 나선 기류 (Suction Vortex Spiral Arms)
  ctx.fillStyle = '#090514'; // 암흑 심연
  ctx.beginPath();
  ctx.ellipse(0, 0, 28, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.rotate(now * 2.2);
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
  ctx.lineWidth = 2.2;
  for (let a = 0; a < 4; a++) {
    const aAng = (a * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(aAng) * 44, Math.sin(aAng) * 23);
    ctx.quadraticCurveTo(
      Math.cos(aAng + 0.5) * 22, Math.sin(aAng + 0.5) * 11,
      Math.cos(aAng + 1.2) * 6, Math.sin(aAng + 1.2) * 3
    );
    ctx.stroke();
  }
  ctx.restore();

  // --- 2. 260px 높이로 하늘 높이 솟구치는 거대한 천공 빛기둥 (Towering Skyward Light Pillar) ---
  const beamTop = -250;
  // (1) 외곽 에테르 광염 원추 (Outer Wide Ethereal Shroud)
  const beamAura = ctx.createLinearGradient(0, 10, 0, beamTop);
  beamAura.addColorStop(0, 'rgba(251, 191, 36, 0.7)');
  beamAura.addColorStop(0.35, 'rgba(56, 189, 248, 0.5)');
  beamAura.addColorStop(0.75, 'rgba(147, 51, 234, 0.25)');
  beamAura.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = beamAura;
  ctx.beginPath();
  ctx.moveTo(-42 * pulse, 0);
  ctx.lineTo(-24, beamTop);
  ctx.lineTo(24, beamTop);
  ctx.lineTo(42 * pulse, 0);
  ctx.closePath();
  ctx.fill();

  // (2) 고밀도 에너지 빛기둥 (Inner High-Energy Column)
  const coreBeam = ctx.createLinearGradient(0, 5, 0, beamTop);
  coreBeam.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  coreBeam.addColorStop(0.25, 'rgba(254, 240, 138, 0.85)');
  coreBeam.addColorStop(0.65, 'rgba(56, 189, 248, 0.6)');
  coreBeam.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = coreBeam;
  ctx.beginPath();
  ctx.moveTo(-18 * pulse, 0);
  ctx.lineTo(-10, beamTop);
  ctx.lineTo(10, beamTop);
  ctx.lineTo(18 * pulse, 0);
  ctx.closePath();
  ctx.fill();

  // (3) 중심 백열 레이저 심핵 (White-Hot Laser Center Core)
  ctx.strokeStyle = '#ffffff';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 20;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(0, beamTop);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // --- 3. 빛기둥을 타고 하늘로 승천하는 파동 광환들 (Ascending Light Rings - teleporter-pad 기법) ---
  for (let ring = 0; ring < 3; ring++) {
    const ringPhase = ((state.gameTime * 0.7 + ring * 0.33) % 1.0);
    const ringY = -ringPhase * 210;
    const ringScale = 1.0 - ringPhase * 0.35;
    const ringAlpha = Math.sin(ringPhase * Math.PI) * 0.85;

    ctx.strokeStyle = `rgba(254, 240, 138, ${ringAlpha})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, ringY, 26 * ringScale, 10 * ringScale, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- 4. 나선형으로 부유하는 차원 영기 입자들 (Spiraling Luminous Motes) ---
  for (let m = 0; m < 14; m++) {
    const mPhase = (state.gameTime * 0.8 + m * 0.22) % 1.0;
    const mAngle = m * 1.35 + state.gameTime * 2.5;
    const mDist = (1 - mPhase * 0.7) * 36;
    const mx = Math.cos(mAngle) * mDist;
    const my = -mPhase * 180 + Math.sin(mAngle) * (mDist * 0.45);
    const mAlpha = Math.sin(mPhase * Math.PI) * 0.9;

    ctx.fillStyle = (m % 2 === 0) ? `rgba(255, 255, 255, ${mAlpha})` : `rgba(251, 191, 36, ${mAlpha})`;
    ctx.fillRect(mx - 1.5, my - 1.5, 3, 3);
  }

  // --- 5. 머리 위 대형 랜드마크 배너 & 애니메이션 화살표 (Floating Landmark Badge & Bouncing Arrow) ---
  const badgeY = -180;
  const arrowBob = Math.sin(state.gameTime * 6) * 8;

  // 아래를 가리키는 대형 황금 애니메이션 화살표 (Bouncing Pointer Arrow)
  ctx.fillStyle = '#fbbf24';
  ctx.shadowColor = '#d97706';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(0, badgeY + 34 + arrowBob);
  ctx.lineTo(-12, badgeY + 16 + arrowBob);
  ctx.lineTo(12, badgeY + 16 + arrowBob);
  ctx.closePath();
  ctx.fill();

  // 대형 황금 칭호 배너 박스
  const bw = 240;
  const bh = 34;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.roundRect(-bw / 2, badgeY - bh / 2, bw, bh, 8);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('🌀【 다음 스테이지 진격 관문 】', 0, badgeY - 2);

  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('▲ 포탈 중심으로 이동하여 다음 관문 돌파 ▲', 0, badgeY + 28);

  ctx.restore();
}

function renderZoneTransitionOverlay() {
  if (!state.zoneTransitionTimer || state.zoneTransitionTimer <= 0) return;
  const t = 1 - state.zoneTransitionTimer; // 0 to 1
  const alpha = Math.sin(t * Math.PI); // Smooth in and out curve

  if (alpha > 0.02) {
    const secIdx = Math.max(0, Math.min(4, (currentSelectedSector || 1) - 1));
    const curZone = state.currentZone || 1;
    const zoneCfg = (ZONE_CONFIGS[secIdx] && ZONE_CONFIGS[secIdx][curZone - 1]) ? ZONE_CONFIGS[secIdx][curZone - 1] : ZONE_CONFIGS[0][0];

    ctx.save();
    // 1. Heavy ink wash fade
    ctx.fillStyle = `rgba(5, 7, 12, ${alpha * 0.92})`;
    ctx.fillRect(0, 0, gameWidth, gameHeight);

    // 2. Cinematic Hanja & Wuxia banner in center when transition is near peak
    if (alpha > 0.35) {
      const bannerAlpha = Math.min(1, (alpha - 0.35) / 0.5);
      ctx.globalAlpha = bannerAlpha;

      const cx = gameWidth / 2;
      const cy = gameHeight / 2;

      // Decorative golden border frame
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#d97706';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.roundRect(cx - 260, cy - 80, 520, 160, 12);
      ctx.fill();
      ctx.stroke();

      // Top Hanja Subtitle
      ctx.shadowBlur = 0;
      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = '#f59e0b';
      ctx.textAlign = 'center';
      ctx.fillText(`✦ ${zoneCfg.hanjaTitle || '關 門 突 破'} ✦`, cx, cy - 42);

      // Main Zone Name
      ctx.font = '900 26px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 8;
      ctx.fillText(zoneCfg.name, cx, cy - 4);

      // Flavor Description
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.shadowBlur = 0;
      ctx.fillText(`"${zoneCfg.desc}"`, cx, cy + 36);

      // Corner seal stamps
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cx - 245, cy - 65, 14, 14);
      ctx.fillRect(cx + 231, cy - 65, 14, 14);
    }

    ctx.restore();
  }
}

function renderClickMarkers() {
  clickMarkers.forEach(m => {
    ctx.save();
    const prog = 1 - (m.life / m.maxLife);
    const cr = m.r + (m.maxR - m.r) * prog;
    ctx.strokeStyle = '#38bdf8';
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2 * (1 - prog);
    ctx.globalAlpha = 1 - prog;
    ctx.beginPath();
    ctx.ellipse(m.x, m.y, cr, cr * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
}

function renderPoisonZones() {
  poisonZones.forEach(pz => {
    if (SPRITES.fx_poison && SPRITES.fx_poison.width) {
      const fadeIn = Math.min(1, (pz.maxLife - pz.life) / 0.3);
      const fadeOut = Math.min(1, pz.life / (pz.maxLife * 0.25));
      const wob = 1 + Math.sin(state.gameTime * 3 + pz.x) * 0.04;
      drawFxImage('fx_poison', pz.x, pz.y, pz.radius * 2.5 * wob, 0.85 * Math.min(fadeIn, fadeOut), 0, 0.85, pz.isEvo ? 'hue-rotate(150deg) saturate(1.4)' : null); // 초월: 보랏빛
      return;
    }
    ctx.save();
    ctx.translate(pz.x, pz.y);
    const alpha = Math.min(1, pz.life / (pz.maxLife * 0.25)) * 0.78;
    const now = state.gameTime * 2.8;

    // --- 레퍼런스 스타일: 돌바닥에 유기적으로 고인 짙은 녹색 맹독 웅덩이 (Organic Toxic Sludge Pool) ---
    // 1. 바닥 석판과 자연스럽게 융합되는 외곽 암녹색 수렁층 (Soft Olive/Mossy Edge)
    ctx.save();
    ctx.shadowColor = '#15803d';
    ctx.shadowBlur = 14;
    ctx.fillStyle = `rgba(20, 83, 45, ${alpha * 0.75})`;
    ctx.beginPath();
    const segments = 18;
    for (let s = 0; s <= segments; s++) {
      const theta = (s / segments) * Math.PI * 2;
      const wobble = 1.0 + Math.sin(theta * 3 + now) * 0.06 + Math.cos(theta * 5 - now * 1.2) * 0.04;
      const rx = Math.cos(theta) * pz.radius * wobble;
      const ry = Math.sin(theta) * (pz.radius * 0.58) * wobble;
      if (s === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.fill();

    // 2. 맹독 용액 중심부 (Vivid Lime / Emerald Toxic Liquid Layer)
    const acidGrad = ctx.createRadialGradient(0, 0, pz.radius * 0.08, 0, 0, pz.radius * 0.88);
    acidGrad.addColorStop(0, `rgba(132, 204, 22, ${alpha * 0.88})`); // 중심부 라임빛 독기
    acidGrad.addColorStop(0.35, `rgba(34, 197, 94, ${alpha * 0.75})`); // 에메랄드 맹독
    acidGrad.addColorStop(0.75, `rgba(22, 101, 52, ${alpha * 0.55})`); // 짙은 녹청 수렁
    acidGrad.addColorStop(1, 'rgba(20, 83, 45, 0)'); // 부드러운 소멸 경계
    ctx.fillStyle = acidGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, pz.radius * 0.86, pz.radius * 0.50, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. 액체 표면 광택 & 유기적 찰랑임 (Caustic Liquid Reflections)
    ctx.fillStyle = `rgba(190, 242, 100, ${alpha * 0.35})`;
    ctx.beginPath();
    ctx.ellipse(pz.radius * 0.15, -pz.radius * 0.08, pz.radius * 0.45, pz.radius * 0.22, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. 레퍼런스 스타일 은은한 독거품 기포 (Soft Natural Toxic Bubbles - 인위적 점선 제거)
    if (!pz.bubbles) {
      pz.bubbles = [];
      for (let b = 0; b < 6; b++) {
        const bAng = Math.random() * Math.PI * 2;
        const bDist = Math.random() * pz.radius * 0.65;
        pz.bubbles.push({
          x: Math.cos(bAng) * bDist,
          y: Math.sin(bAng) * bDist * 0.58,
          maxR: 3.5 + Math.random() * 4.5,
          speed: 1.8 + Math.random() * 2.2,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    pz.bubbles.forEach(b => {
      const bCycle = ((now * b.speed + b.phase) % (Math.PI * 2));
      const bProgress = Math.sin(bCycle);
      if (bProgress > 0) {
        const currR = b.maxR * bProgress;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.fillStyle = `rgba(132, 204, 22, ${alpha * (0.6 + bProgress * 0.3)})`;
        ctx.beginPath();
        ctx.arc(0, 0, currR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
        ctx.beginPath();
        ctx.arc(-currR * 0.28, -currR * 0.28, currR * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });

    ctx.restore();
  });
}

function renderExpGems() {
  const camX = state.camera.x;
  const camY = state.camera.y;
  const cullW = gameWidth / 2 + 80;
  const cullH = gameHeight / 2 + 80;

  expGems.forEach(gem => {
    if (Math.abs(gem.x - camX) > cullW || Math.abs(gem.y - camY) > cullH) return;
    if (gem.isHeal) {
      ctx.save();
      ctx.translate(gem.x, gem.y);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-2, -5, 4, 10);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(gem.x, gem.y);
      const pulse = 1 + Math.sin(state.gameTime * 6 + gem.x) * 0.2;
      
      ctx.fillStyle = gem.color === '#f59e0b' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(56, 189, 248, 0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, (gem.radius + 6) * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = gem.color;
      ctx.beginPath();
      ctx.moveTo(0, -gem.radius * pulse);
      ctx.lineTo(gem.radius * pulse, 0);
      ctx.lineTo(0, gem.radius * pulse);
      ctx.lineTo(-gem.radius * pulse, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, gem.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
}

function renderGroundBombs() {
  groundBombs.forEach(b => {
    const currX = b.startX + (b.targetX - b.startX) * b.progress;
    const currY = b.startY + (b.targetY - b.startY) * b.progress - Math.sin(b.progress * Math.PI) * 120;

    ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
    ctx.beginPath();
    ctx.ellipse(b.targetX, b.targetY, b.radius * b.progress, b.radius * 0.5 * b.progress, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(currX, currY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(currX, currY - 9, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function renderDashAfterimages() {
  player.afterImages.forEach(img => {
    const frameIndex = img.frame;
    const newHero = SPRITES['seojin_walk_' + frameIndex];
    const sprite = (newHero && newHero.width > 0) ? newHero : SPRITES['hero_' + frameIndex];
    const isCanvas = (typeof HTMLCanvasElement !== 'undefined' && sprite instanceof HTMLCanvasElement);
    if (!sprite || (!isCanvas && !sprite.complete && (!sprite.width || sprite.width <= 0))) return;

    ctx.save();
    ctx.translate(img.x, img.y);
    ctx.globalAlpha = img.alpha * 0.5;
    ctx.scale(img.facing * img.scale, img.scale);

    if (sprite === newHero) {
      const K = 0.44; // renderPlayer 의 FRAME_K 와 같게
      ctx.drawImage(tinted(sprite, 'sepia(1) hue-rotate(160deg) saturate(2) brightness(1.25)'), -220 * K, -320 * K + 4, 440 * K, 340 * K); // 푸른 잔상
    } else {
      const w = 84;
      const h = 138;
      ctx.drawImage(sprite, -w / 2, -h + 14, w, h);
    }
    ctx.restore();
  });
}

