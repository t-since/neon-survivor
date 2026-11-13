// 무공, 근접 공격, 데미지, 레벨업, 보물상자, 승리, 치트
function updateSkills(dt) {
  // 1. Flying Swords (어검술) & 만검귀종 (초월)
  if (player.skills.flying_swords > 0) {
    const isEvo = !!player.evolutions.evo_flying_swords;
    const bladesBuff = player.activeBuffs && player.activeBuffs.infinite_blades > 0; // 만천비검신단
    const swordCount = (isEvo ? 8 : (1 + player.skills.flying_swords)) + (bladesBuff ? 3 : 0);
    while (flyingSwords.length > swordCount && !flyingSwords[flyingSwords.length - 1].isLaunching) flyingSwords.pop();
    while (flyingSwords.length < swordCount) {
      flyingSwords.push({
        angle: (flyingSwords.length / swordCount) * Math.PI * 2,
        orbitDist: isEvo ? 75 : 60,
        orbitSpeed: isEvo ? 4.8 : 3.5,
        target: null,
        isLaunching: false,
        x: player.x,
        y: player.y,
        vx: 0,
        vy: 0,
        cooldown: 0,
        isEvo: isEvo
      });
    }

    flyingSwords.forEach((sw) => {
      sw.isEvo = isEvo;
      if (!sw.isLaunching) {
        sw.angle += sw.orbitSpeed * dt;
        sw.orbitDist = isEvo ? 75 : 60;
        sw.x = player.x + Math.cos(sw.angle) * sw.orbitDist;
        sw.y = player.y + Math.sin(sw.angle) * sw.orbitDist;
        sw.cooldown -= dt;

        if (sw.cooldown <= 0 && enemies.length > 0) {
          const closest = findClosestEnemy(sw.x, sw.y, 480);
          if (closest) {
            sw.isLaunching = true;
            triggerSkillMotion('sword', 0.22);
            sw.cooldown = 1.0 / (1 + (isEvo ? 7 : player.skills.flying_swords) * 0.18) * (bladesBuff ? 0.5 : 1);
            const dx = closest.x - sw.x;
            const dy = closest.y - sw.y;
            const len = Math.hypot(dx, dy) || 1;
            const speed = isEvo ? 720 : 580;
            sw.vx = (dx / len) * speed;
            sw.vy = (dy / len) * speed;
            sw.life = 1.3;
          }
        }
      } else {
        sw.x += sw.vx * dt;
        sw.y += sw.vy * dt;
        sw.life -= dt;
        // 날아가는 매화검 뒤로 꽃잎이 흩날림 (초월은 더 많이)
        if (Math.random() < (isEvo ? 0.9 : 0.5) * (state.frameK || 1)) spawnPetals(sw.x - sw.vx * 0.03, sw.y - sw.vy * 0.03, isEvo ? 2 : 1, 0.35);

        for (let e of enemies) {
          if (e.hp <= 0) continue;
          if (Math.hypot(e.x - sw.x, e.y - sw.y) < e.radius + 16) {
            dealDamage(e, (isEvo ? 85 : 42) * player.atkMultiplier, true);
            createHitSparks(sw.x, sw.y, isEvo ? '#fb7185' : '#f9a8d4');
            if (isEvo) createShockwave(e.x, e.y - 20, 56, 'rgba(251, 113, 133, 0.75)'); // 매화검기: 맞은 자리에서 꽃이 확 핌
            spawnPetals(e.x, e.y - 30, isEvo ? 8 : 4 + player.skills.flying_swords); // 벤 자리에 매화가 흩날림
            sw.isLaunching = false;
            sw.orbitDist = isEvo ? 75 : 60;
            break;
          }
        }
        if (sw.life <= 0) {
          sw.isLaunching = false;
        }
      }
    });

    // 초월 '매화만개'의 매화검우(부채꼴 꽃잎 물결)는 updatePlumTrees() 에서
  }

  // 2. Dagger Rain (만천화우)
  if (player.skills.dagger_rain > 0) {
    const interval = Math.max(1.0, 3.0 - player.skills.dagger_rain * 0.4);
    if (activeSkillTick('dagger_rain', interval, dt)) { /* 버튼 모드: 19_active_skills.js 에서 누를 때 씀 */ } else {
    player.timers.dagger_rain += dt;
    if (player.timers.dagger_rain >= interval) {
      player.timers.dagger_rain = 0;
      castDaggerRain();
    }
    }
  }

  // 3. Palm Blast (벽공장 / 여래신장)
  if (player.skills.palm_blast > 0) {
    const interval = Math.max(1.2, 3.0 - player.skills.palm_blast * 0.4); // 예전 3.8-0.5×레벨 (1레벨 3.3초 → 2.6초)
    if (activeSkillTick('palm_blast', interval, dt)) { /* 버튼 모드: 19_active_skills.js 에서 누를 때 씀 */ } else {
    player.timers.palm_blast += dt;
    if (player.timers.palm_blast >= interval) {
      player.timers.palm_blast = 0;
      castPalmBlast();
    }
    }
  }

  // 4. Thunder Bomb (벽력탄)
  if (player.skills.thunder_bomb > 0) {
    const interval = Math.max(1.2, 3.5 - player.skills.thunder_bomb * 0.4);
    if (activeSkillTick('thunder_bomb', interval, dt)) { /* 버튼 모드: 19_active_skills.js 에서 누를 때 씀 */ } else {
    player.timers.thunder_bomb += dt;
    if (player.timers.thunder_bomb >= interval) {
      player.timers.thunder_bomb = 0;
      castThunderBomb();
    }
    }
  }

  updatePlumTrees(dt);

  // 5. Vajra Shield pulse (금강불괴 / 무적신공)
  if (player.skills.vajra_shield > 0) {
    if (activeSkillTick('vajra_shield', VAJRA_INTERVAL, dt)) { /* 버튼 모드 */ }
    else {
      player.timers.vajra_shield += dt;
      if (player.timers.vajra_shield >= VAJRA_INTERVAL) { player.timers.vajra_shield = 0; castVajraPulse(); }
    }

    // 천지무적신공 초월: 1.5초마다 주위 번개 연쇄 방출
    if (player.evolutions.evo_vajra_shield) {
      player.evoTimer.vajra_shield = (player.evoTimer.vajra_shield || 0) + dt;
      if (player.evoTimer.vajra_shield >= 1.5) {
        player.evoTimer.vajra_shield = 0;
        let hitCount = 0;
        for (let e of enemies) {
          if (Math.hypot(e.x - player.x, e.y - player.y) <= 240) {
            dealDamage(e, 110 * player.atkMultiplier, true);
            createHitSparks(e.x, e.y, '#facc15');
            hitCount++;
            if (hitCount >= 8) break;
          }
        }
        if (hitCount > 0) {
          createShockwave(player.x, player.y, 160, 'rgba(250, 204, 21, 0.6)');
        }
      }
    }
  }
}


// 금강불괴 방어 충격파 (자동이면 3초마다, 버튼 모드면 누를 때)
const VAJRA_INTERVAL = 3.0;
function castVajraPulse() {
  const radius = 135 + player.skills.vajra_shield * 18;
  for (let e of enemies) {
    if (Math.hypot(e.x - player.x, e.y - player.y) <= radius) {
      dealDamage(e, 35 * player.atkMultiplier, false);
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      const d = Math.hypot(dx, dy) || 1;
      e.x += (dx / d) * 70;
      e.y += (dy / d) * 70;
    }
  }
  createShockwave(player.x, player.y, radius, '#fbbf24');
  particles.push({ fxKey: 'fx_shield', x: player.x, y: player.y, vx: 0, vy: 0, size: radius * 1.9, sy: 0.45, rot: 0, life: 0.45, maxLife: 0.45 }); // 바닥 금빛 문양
  player._vajraFlash = 0.35;
  sound.playPalmBlast();
}

// ---------- 이십사수매화검법 (어검술 자리) ----------
// 매화 꽃잎 입자: 벤 자리·날아가는 검 뒤에 흩날림 (particles 에 petal 표시, 그리기는 renderParticles)
function spawnPetals(x, y, n, spread = 1, color = null) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = (40 + Math.random() * 110) * spread;
    particles.push({
      petal: true, x: x + (Math.random() - 0.5) * 14, y: y + (Math.random() - 0.5) * 14,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7 - 20,
      rot: Math.random() * Math.PI * 2, spin: (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 6),
      size: 5 + Math.random() * 4, color: color || (Math.random() < 0.75 ? '#f9a8d4' : '#fff1f2'),
      life: 0.7 + Math.random() * 0.5, maxLife: 1.2
    });
  }
}

// 매화만개(초월) — 매화검우(梅花劍雨): 일정 시간마다 서진 앞에서 적이 몰린 쪽으로
// 매화 꽃잎이 부채꼴로 쏟아져 나가며, 물결이 지나가는 자리의 적을 벰 (예전 매화나무 대신. 목록 이름은 plumTrees 그대로)
// 11-12 사용자: 한 방향 부채꼴 → 사방(360°), 대신 대기 시간 2.6 → 4.2초
const PLUM_WAVE = { every: 4.2, range: 440, speed: 620, halfArc: Math.PI, dmg: 95, push: 260 };
function spawnPlumWave() {
  // 방향: 서진 주변 480 안의 적이 가장 많은 방향 (8방향 중), 없으면 바라보는 쪽
  const bins = new Array(8).fill(0);
  let any = false;
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const dx = e.x - player.x, dy = e.y - player.y;
    if (dx * dx + dy * dy > 480 * 480) continue;
    any = true;
    bins[(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8]++;
  }
  let aim = player.facing < 0 ? Math.PI : 0;
  if (any) {
    let bi = 0;
    for (let k = 1; k < 8; k++) if (bins[k] + (bins[(k + 7) % 8] + bins[(k + 1) % 8]) * 0.5 > bins[bi] + (bins[(bi + 7) % 8] + bins[(bi + 1) % 8]) * 0.5) bi = k;
    aim = bi * Math.PI / 4;
  }
  if (Math.cos(aim) < -0.15) player.facing = -1; else if (Math.cos(aim) > 0.15) player.facing = 1;
  plumTrees.push({ x: player.x, y: player.y - 20, aim, r: 0, hit: new Set() });
  triggerSkillMotion('sword', 0.4);
  sound.playSwordSlash();
  sound.playSample && sound.playSample('wx_slash_heavy', 0.5, 1.25, 0.05, 0.1);
}
function updatePlumTrees(dt) {
  if (player.evolutions.evo_flying_swords) {
    player.evoTimer.flying_swords = (player.evoTimer.flying_swords || 0) + dt;
    if (player.evoTimer.flying_swords >= PLUM_WAVE.every) { player.evoTimer.flying_swords = 0; spawnPlumWave(); }
  }
  for (let i = plumTrees.length - 1; i >= 0; i--) {
    const w = plumTrees[i];
    const prevR = w.r;
    w.r += PLUM_WAVE.speed * dt;
    // 물결 앞머리가 지나간 적을 한 번씩 벰 + 앞으로 밀어냄
    for (const e of enemies) {
      if (e.hp <= 0 || w.hit.has(e)) continue;
      const dx = e.x - w.x, dy = e.y - w.y;
      const d = Math.hypot(dx, dy);
      if (d > w.r + e.radius || d < prevR - 60) continue;
      const ea = Math.atan2(dy, dx);
      let da = ea - w.aim;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) > PLUM_WAVE.halfArc + 0.08) continue;
      w.hit.add(e);
      dealDamage(e, PLUM_WAVE.dmg * player.atkMultiplier, true);
      if (!e.isBoss) { // 가운데에서 바깥쪽으로 밀어냄
        e.knockbackVx = Math.cos(ea) * PLUM_WAVE.push * (e.isMiniBoss ? 0.3 : 1);
        e.knockbackVy = Math.sin(ea) * PLUM_WAVE.push * (e.isMiniBoss ? 0.3 : 1);
        e.stunTimer = Math.max(e.stunTimer || 0, 0.12);
      }
      if (Math.random() < 0.5) spawnPetals(e.x, e.y - 30, 2, 0.6);
    }
    // 앞으로 쏟아지는 꽃잎 (부채꼴 안에서 물결 앞머리 근처)
    const k = state.frameK || 1;
    for (let n = 0; n < Math.round(9 * k); n++) { // 사방이라 꽃잎을 더 많이
      const a = w.aim + (Math.random() * 2 - 1) * PLUM_WAVE.halfArc;
      const rr = Math.max(10, w.r - Math.random() * 140);
      const sp = 300 + Math.random() * 300;
      particles.push({
        petal: true, x: w.x + Math.cos(a) * rr, y: w.y + Math.sin(a) * rr * 0.8,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8,
        rot: Math.random() * Math.PI * 2, spin: (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 8),
        size: 6 + Math.random() * 5, color: Math.random() < 0.7 ? '#f9a8d4' : (Math.random() < 0.5 ? '#fff1f2' : '#fb7185'),
        life: 0.3 + Math.random() * 0.3, maxLife: 0.6
      });
    }
    if (w.r >= PLUM_WAVE.range + 60) plumTrees.splice(i, 1);
  }
}

function triggerSkillMotion(poseType, duration = 0.3) {
  player.isAttacking = true;
  player.skillPose = poseType;
  player.attackTimer = Math.max(duration, 0.32);
  player.attackDuration = Math.max(duration, 0.32);
  // 시전 손끝 번쩍임 (앞쪽 손 위치)
  const handX = player.x + player.facing * 34, handY = player.y - 78;
  const color = { palm: '#a5f3fc', rain: '#e9d5ff', sword: '#7dd3fc', bomb: '#fdba74' }[poseType] || '#ffffff';
  particles.push({ flash: true, x: handX, y: handY, vx: 0, vy: 0, size: 46, life: 0.16, maxLife: 0.16 });
  for (let k = 0; k < 6; k++) {
    const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 90;
    particles.push({ x: handX, y: handY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, color, radius: 2 + Math.random() * 2, life: 0.3, maxLife: 0.3 });
  }
  if (poseType === 'palm' || poseType === 'bomb') state.screenShake = Math.max(state.screenShake || 0, 4);
}

function applyPoison(target, duration, dps) {
  if (!target || target.hp <= 0) return;
  target.poisonTimer = Math.max(target.poisonTimer || 0, duration);
  target.poisonDps = Math.max(target.poisonDps || 0, dps);
  if (!target.poisonTickTimer) target.poisonTickTimer = 0.4;
}

function createPoisonBubble(x, y) {
  particles.push({
    x: x + (Math.random() - 0.5) * 20,
    y: y + (Math.random() - 0.5) * 20,
    vx: (Math.random() - 0.5) * 15,
    vy: -20 - Math.random() * 25,
    life: 0.5,
    maxLife: 0.5,
    color: '#34d399',
    size: 3 + Math.random() * 3
  });
}

function castDaggerRain() {
  triggerSkillMotion('rain', 0.38);

  const isEvo = !!player.evolutions.evo_dagger_rain;
  const needleCount = isEvo ? 36 : (14 + player.skills.dagger_rain * 5);
  const closest = enemies.length > 0 ? findClosestEnemy(player.x, player.y, 450) : null;
  const targetCenterX = closest ? closest.x : player.x + (player.facing * 110);
  const targetCenterY = closest ? closest.y : player.y;
  if (isEvo) particles.push({ fxKey: 'fx_needles', x: targetCenterX, y: targetCenterY - 40, vx: 0, vy: 0, size: 320, rot: Math.random() * 6.28, life: 0.55, maxLife: 0.55 }); // 생사부: 독침 폭발

  for (let i = 0; i < needleCount; i++) {
    const spreadR = isEvo ? 140 : (75 + player.skills.dagger_rain * 20);
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * spreadR;
    const destX = targetCenterX + Math.cos(angle) * dist;
    const destY = targetCenterY + Math.sin(angle) * dist * 0.7;

    const fallHeight = 440 + Math.random() * 120;
    const slantX = 65 + Math.random() * 35;
    const startX = destX - slantX;
    const startY = destY - fallHeight;

    const delay = i * (isEvo ? 0.018 : 0.032);
    const fallSpeed = 780 + Math.random() * 120;
    const totalDist = Math.hypot(destX - startX, destY - startY);
    const duration = totalDist / fallSpeed;

    fallingNeedles.push({
      startX: startX,
      startY: startY,
      destX: destX,
      destY: destY,
      delay: delay,
      time: 0,
      duration: duration,
      damage: ((isEvo ? 55 : 28) + player.skills.dagger_rain * 7) * player.atkMultiplier,
      splashRadius: (isEvo ? 65 : 38) + player.skills.dagger_rain * 6,
      color: isEvo ? (Math.random() < 0.5 ? '#c084fc' : '#10b981') : '#10b981',
      isEvo: isEvo
    });
  }
  sound.playDaggerRain();
}

function castPalmBlast(aimOverride) {
  triggerSkillMotion('palm', 0.38);

  // 방향: 주변 420 안에서 적이 가장 많이 몰린 쪽 (8방향). 예전엔 바라보는 좌우로만 쏴서 허공에 자주 나감
  const bins = new Array(8).fill(0);
  let any = false;
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const dx = e.x - player.x, dy = e.y - player.y;
    if (dx * dx + dy * dy > 420 * 420) continue;
    any = true;
    bins[(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8]++;
  }
  let aim = player.facing < 0 ? Math.PI : 0;
  if (any) { let bi = 0; for (let k = 1; k < 8; k++) if (bins[k] > bins[bi]) bi = k; aim = bi * Math.PI / 4; }
  if (typeof aimOverride === 'number') aim = aimOverride; // 버튼 모드: 움직이는 방향으로
  if (Math.cos(aim) < -0.15) player.facing = -1; else if (Math.cos(aim) > 0.15) player.facing = 1;

  const isBuddha = !!player.evolutions.evo_palm_blast;
  const lvl = player.skills.palm_blast;
  const w = isBuddha ? 220 : (76 + lvl * 20);    // 진행 방향 두께
  const h = isBuddha ? 280 : (100 + lvl * 20);   // 폭
  const dmg = (isBuddha ? 320 : (80 + lvl * 24)) * player.atkMultiplier;
  const speed = isBuddha ? 520 : 460;
  // 3레벨부터(초월 포함) 반대쪽으로도 한 발
  const dirs = (isBuddha || lvl >= 3) ? [aim, aim + Math.PI] : [aim];
  for (const a of dirs) {
    projectiles.push({
      type: 'palm_wave',
      isBuddhaPalm: isBuddha,
      x: player.x + Math.cos(a) * 35,
      y: player.y - 15 + Math.sin(a) * 25,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      aim: a,
      width: w,
      height: h,
      life: isBuddha ? 1.6 : 1.25,
      damage: dmg,
      penetrates: true,
      hitList: new Set()
    });
    createShockwave(player.x + Math.cos(a) * 25, player.y - 15 + Math.sin(a) * 18, isBuddha ? 70 : 42, isBuddha ? '#fbbf24' : '#38bdf8');
  }
  sound.playPalmBlast();
}

function castThunderBomb() {
  triggerSkillMotion('bomb', 0.35);
  const isEvo = !!player.evolutions.evo_thunder_bomb; // 구천뇌정
  const bombCount = isEvo ? 4 : 1 + Math.floor(player.skills.thunder_bomb / 3);
  // 던지는 거리: 화면 안쪽(BOMB_MIN~BOMB_MAX)의 적 중에서 가장 많이 몰린 곳을 노림
  // (예전: 맵 전체 아무 적 → 화면 밖 멀리 날아가 안 보이거나 헛터짐)
  const BOMB_MIN = 120, BOMB_MAX = 450;
  const inRange = [];
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const d = Math.hypot(e.x - player.x, e.y - player.y);
    if (d >= BOMB_MIN && d <= BOMB_MAX) inRange.push(e);
  }
  if (inRange.length === 0) { // 범위 안에 없으면 가장 가까운 적 (너무 멀면 제외)
    let best = null, bd = 700;
    for (const e of enemies) { if (e.hp <= 0) continue; const d = Math.hypot(e.x - player.x, e.y - player.y); if (d < bd) { bd = d; best = e; } }
    if (best) inRange.push(best);
  }
  const picked = [];
  for (let i = 0; i < bombCount; i++) {
    let target = null, bestScore = -1;
    // 후보 몇 명만 뽑아 주변 적 수로 점수 (이미 고른 곳 근처는 감점 → 여러 발이 흩어지게)
    for (let k = 0; k < Math.min(12, inRange.length); k++) {
      const c = inRange[Math.floor(Math.random() * inRange.length)];
      let score = 0;
      for (const o of inRange) if (Math.abs(o.x - c.x) < 110 && Math.abs(o.y - c.y) < 110) score++;
      for (const p of picked) if (Math.hypot(p.x - c.x, p.y - c.y) < 140) score -= 4;
      if (score > bestScore) { bestScore = score; target = c; }
    }
    if (target) picked.push(target);
    const ang = Math.random() * Math.PI * 2, rr = 200 + Math.random() * 100;
    const tx = target ? target.x + (Math.random() - 0.5) * 40 : player.x + Math.cos(ang) * rr;
    const ty = target ? target.y + (Math.random() - 0.5) * 40 : player.y + Math.sin(ang) * rr;
    const dist = Math.hypot(tx - player.x, ty - player.y);
    groundBombs.push({
      startX: player.x,
      startY: player.y - 20,
      targetX: tx,
      targetY: ty,
      progress: 0,
      duration: 0.65,
      radius: (100 + player.skills.thunder_bomb * 18) * (isEvo ? 1.7 : 1),
      damage: 80 * player.atkMultiplier * (isEvo ? 2 : 1),
      evo: isEvo,
      // 가까우면 빨리, 멀면 조금 더 오래 날아감 (0.45~0.75초)
      duration: (isEvo ? i * 0.12 : 0) + 0.45 + Math.min(1, dist / BOMB_MAX) * 0.3
    });
  }
}

// Melee Sword Slash Attack (화산 정통 근접 매화검격 & 수동/자동 일섬)
// 근거리 베기: 대상 방향 부채꼴(8방향 어디든) + 3단 콤보(내려베기 → 올려베기 → 큰 베기)
function triggerMeleeAttack(target) {
  if (player.heroId === 'tangsoyeon' && typeof tangThrow === 'function') return tangThrow(target); // 당소연: 은침 던지기 (22_tangsoyeon.js)
  const tx = target ? target.x : player.x + player.facing * 100;
  const ty = target ? target.y : player.y;
  const aim = Math.atan2(ty - player.y, tx - player.x);

  player.attackCombo = ((player.attackCombo || 0) + 1) % 3;
  player.skillPose = null; // 무공 시전 자세가 아니라 칼 베기
  const isFinisher = player.attackCombo === 2;
  const FIST = player.heroId === 'hyunwoon'; // 현운: 주먹 3단 (잽·훅·장타)
  player.isAttacking = true;
  player.attackDuration = FIST ? (isFinisher ? 0.3 : 0.22) : (isFinisher ? 0.38 : 0.3); // 베기 한 번 걸리는 시간 (11-12 사용자: 0.4초는 답답 → 약 25% 빠르게)
  player.attackTimer = player.attackDuration;
  player.attackCooldownTimer = Math.max(0.36, 0.56 - (player.level * 0.01)) * (isFinisher ? 1.3 : 1) * (FIST ? 0.72 : 1) / ((player.activeBuffs && player.activeBuffs.blood_fury > 0) ? 1.5 : 1);
  player.attackAim = aim;

  // 대상 쪽으로 몸 돌리기 (거의 위/아래면 그대로)
  if (Math.cos(aim) < -0.15) player.facing = -1;
  else if (Math.cos(aim) > 0.15) player.facing = 1;

  if (FIST) sound.playSample('wx_palm', isFinisher ? 0.5 : 0.3, isFinisher ? 1 : 1.35, 0.1, 0.04); else sound.playSwordSlash();

  // 구역 배율: 적 체력이 구역마다 1~4.6배라서 칼(주먹)도 같은 배율 (11-13 사용자: 뒤 구역에서 근거리가 너무 약함 — 5구역 보통 몹에 10~22번)
  const SEC_K = (typeof sectorScale === 'function') ? sectorScale().hp : 1;
  const range = FIST ? (isFinisher ? 175 : 140) : (isFinisher ? 205 : 180);
  const halfArc = FIST ? (isFinisher ? Math.PI * 0.5 : Math.PI * 0.3) : (isFinisher ? Math.PI * 0.75 : Math.PI * 0.39); // 칼: 140°/270°, 주먹: 108°/180°
  let hits = 0;
  const hitList = [];
  for (const e of enemies) {
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    const d = Math.hypot(dx, dy);
    if (d > range + (e.radius || 0)) continue;
    let da = Math.atan2(dy, dx) - aim;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) > halfArc && d > 45) continue; // 몸에 붙은 적은 방향 상관없이 맞음
    hits++;
    hitList.push(e);
    const dmg = (48 + player.level * 6) * player.atkMultiplier * (isFinisher ? 1.6 : 1) * (FIST ? 0.8 : 1) * SEC_K; // 주먹은 빠른 대신 한 대가 조금 약함
    dealDamage(e, dmg, true);
    e.squashT = isFinisher ? 0.2 : 0.15; // 타격감: 맞은 적이 옆으로 납작해졌다 튕기듯 돌아옴 (그리기: drawEnemyArt)
    if (e.hp <= 0) spawnInkSplash(e.x, e.y, aim, isFinisher); // 타격감: 칼(주먹)로 쓰러뜨리면 바닥에 먹물
    e.hitCooldown = 0.22; // 하얗게 번쩍이는 시간 (0.06 넘는 동안) — 예전 0.14
    // 맞은 방향으로 밀려남 (보스는 밀리지 않음, 중간보스는 큰 베기에만 조금)
    if (!e.isBoss && !(e.isMiniBoss && !isFinisher)) {
      const kb = (isFinisher ? 760 : 440) * (e.isMiniBoss ? 0.35 : 1) * (FIST ? 1.35 : 1); // 주먹은 더 멀리
      const nx = dx / (d || 1), ny = dy / (d || 1);
      e.knockbackVx = nx * kb;
      e.knockbackVy = ny * kb;
      e.stunTimer = Math.max(e.stunTimer || 0, isFinisher ? 0.38 : 0.22); // 예전 0.28 / 0.14
    }
  }

  // 베면서 대상 쪽으로 반걸음 내딛음 (칼에 몸무게가 실린 느낌). 적이 몸에 붙어 있으면 거의 안 움직임
  if (!player.isDashing) {
    const near = target ? Math.hypot(target.x - player.x, target.y - player.y) : 999;
    const step = Math.max(0, Math.min(isFinisher ? 30 : 16, near - 60));
    player.x += Math.cos(aim) * step;
    player.y += Math.sin(aim) * step;
  }

  if (hits > 0) {
    // 맞은 적마다 불꽃 (큰 베기는 더 많이), 가장 먼저 맞은 적 자리에 흰 타격 고리
    for (const e of hitList) PixelFX.spawnHitSparks(e.x, e.y - 24, isFinisher ? '#fde68a' : '#f1f5f9', isFinisher ? 10 : 5);
    createShockwave(hitList[0].x, hitList[0].y - 24, isFinisher ? 70 : 42, 'rgba(255, 255, 255, 0.85)');
    sound.playSample(isFinisher ? 'wx_slash_heavy' : 'wx_slash_hit', isFinisher ? 0.8 : 0.6, 1, 0.08, 0.08); // 묵직한 베기 타격
    // 검기 흡혈: 근거리로 싸우면 맞는 만큼 조금씩 회복 (근거리가 맞기만 한다는 의견 반영)
    const heal = Math.min(4, hits) * (isFinisher ? 2 : 1);
    if (player.hp < player.maxHp) {
      player.hp = Math.min(player.maxHp, player.hp + heal);
      updateHud();
    }
    // 맞는 순간 멈칫 (손맛). 많이 맞을수록 조금 더 — 예전 0.04 / 0.07 고정
    state.hitStop = (isFinisher ? 0.11 : 0.065) + Math.min(3, hits - 1) * 0.008;
    if (isFinisher) { const now = performance.now(); state.zoomPunchAt = now; state.slowUntil = now + 110 + 180; } // 멈칫(0.11초) 뒤 0.18초 느리게
    state.screenShake = Math.max(state.screenShake || 0, isFinisher ? 11 : 5); // 예전 7 / 3
  }
  // 칼 빛: 예전 88 / 120 → 크게
  if (FIST) { // 주먹: 칼 빛 대신 금빛 타격 고리, 장타는 앞으로 큰 충격파
    const fx = player.x + Math.cos(aim) * (isFinisher ? 80 : 60), fy = player.y - 40 + Math.sin(aim) * 40;
    createShockwave(fx, fy, isFinisher ? 95 : 38, isFinisher ? 'rgba(251, 191, 36, 0.9)' : 'rgba(253, 230, 138, 0.85)');
    if (isFinisher) PixelFX.spawnSwordSlash(fx, fy, aim, 90, '#fbbf24');
  } else PixelFX.spawnSwordSlash(player.x + Math.cos(aim) * 55, player.y - 30 + Math.sin(aim) * 44, aim, isFinisher ? 155 : 112);
}

// 타격감 3) 먹물 튀김: 큰 먹물 한 덩이 + 맞은 방향으로 튄 방울들 (바닥 자국, 2.5초에 걸쳐 옅어짐)
function spawnInkSplash(x, y, aim, big) {
  const blobs = [];
  const n = big ? 9 : 6, R = big ? 34 : 24;
  blobs.push({ x: 0, y: 0, r: R, rot: Math.random() * 3 });
  for (let i = 0; i < n; i++) {
    const a = aim + (Math.random() - 0.5) * 1.3, d = R * (0.8 + Math.random() * 1.8);
    blobs.push({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.6, r: R * (0.12 + Math.random() * 0.3), rot: Math.random() * 3 });
  }
  if (groundDecals.length > 60) groundDecals.splice(0, groundDecals.length - 60);
  groundDecals.push({ type: 'ink', x, y: y + 4, blobs, life: 2.5, maxLife: 2.5 });
  // 쓰러지는 순간 튀는 방울
  for (let i = 0; i < (big ? 12 : 7); i++) {
    const a = aim + (Math.random() - 0.5) * 1.1, sp = 160 + Math.random() * 260;
    particles.push({ x, y: y - 30, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 - 60, color: Math.random() < 0.6 ? 'rgba(150, 16, 30, 0.9)' : 'rgba(60, 6, 12, 0.9)', radius: 3 + Math.random() * 4, life: 0.35, maxLife: 0.35 });
  }
}

function findClosestEnemy(x, y, maxDist = 500) {
  let closest = null;
  let minD = maxDist;
  for (let e of enemies) {
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < minD) {
      minD = d;
      closest = e;
    }
  }
  return closest;
}

function dealDamage(target, baseDmg, canCrit = true) {
  // 이미 쓰러진 적(같은 프레임에 아직 목록에 남아 있음)은 다시 때리지 않음
  // — 예전엔 은침·독 파편이 시체를 또 '처치'해서 독 폭발이 끝없이 이어지며 게임이 멈춘 듯 느려졌음
  if (!target || target._dead || target.hp <= 0) return;
  if (player.activeBuffs && player.activeBuffs.blood_fury > 0) baseDmg *= 2; // 태을혈기신단: 공격력 2배
  sound.playSample('wx_cut', 0.16, 1.15, 0.12, 0.1); // 적이 맞는 소리 (작게, 0.1초에 한 번까지)
  let isCrit = false;
  let dmg = baseDmg;
  if (canCrit && Math.random() < player.critRate) {
    isCrit = true;
    dmg *= (player.critMultiplier || 1.8);
  }
  dmg = Math.round(dmg);
  target.hp -= dmg;
  target.hitCooldown = 0.12;

  // pixelfx: 타격 방향 십자 플레어 & 바운스 스파크 폭발 (크리티컬 시 대형 섬광!)
  const hitAngle = Math.atan2(target.y - player.y, target.x - player.x);
  PixelFX.spawnHitSpark(target.x, target.y - 12, hitAngle, isCrit);

  damageTexts.push({
    x: target.x + (Math.random() - 0.5) * 20,
    y: target.y - 30,
    text: dmg.toString(),
    color: isCrit ? '#ffd23f' : '#ffffff',
    size: isCrit ? 30 : 21, // 11-12 사용자: 더 크고 눈에 띄게 (예전 14·18)
    life: 0.8,
    maxLife: 0.8,
    dmg: true,
    crit: isCrit,
    vy: -45
  });

  if (target.hp <= 0) {
    onEnemyKilled(target);
  }
}

const POISON_SHARD_MAX = 96; // 생사부 만천화우 독 파편 동시 최대 개수 (폭발 12번 분량)
function onEnemyKilled(target) {
  if (target._dead) return; // 한 적은 한 번만 처치 (구슬·상자·독 폭발 중복 방지)
  target._dead = true;
  state.kills++;
  if (target.isBoss) state.runBossKills = (state.runBossKills || 0) + 1;          // 은자 계산용
  else if (target.isMiniBoss) state.runMiniKills = (state.runMiniKills || 0) + 1;
  document.getElementById('killText').innerText = state.kills;

  // pixelfx: 적 사망 시 픽셀 소멸 파편 & 보스 대폭발 연출!
  PixelFX.spawnEnemyDeath(target.x, target.y, target.isBoss, target.isMiniBoss);

  // 쓰러진 시체 (5초: 쓰러져 누워 있다가 마지막 1.5초 동안 먹물처럼 흩어짐)
  corpses.push({
    type: target.type || 'assassin',
    name: target.name || '',
    x: target.x,
    y: target.y,
    facing: target.facing || (Math.random() < 0.5 ? 1 : -1),
    rot: (Math.random() - 0.5) * 0.35,
    scale: target.isBoss ? 1.4 : (target.isMiniBoss ? 1.2 : 1.0),
    isBoss: !!target.isBoss,
    isMiniBoss: !!target.isMiniBoss,
    art: corpseArtOf(target), // 새 그림(보스·중간보스·몬스터)으로 쓰러짐
    life: 5.0,
    maxLife: 5.0
  });
  if (corpses.length > 30) corpses.shift(); // 60프레임 최적화 유지 (최대 30구 잔존)

  expGems.push({
    x: target.x,
    y: target.y,
    val: target.expVal || 2,
    color: target.isBoss ? '#f59e0b' : '#38bdf8',
    radius: target.isBoss ? 10 : 6
  });

  if (Math.random() < 0.06 || target.isBoss) {
    expGems.push({
      isHeal: true,
      x: target.x + 15,
      y: target.y,
      val: 40,
      radius: 8
    });
  }

  // 몬스터 처치 시 아이템 드롭 (일반몹: 5% 확률, 중간보스: 영웅 장비 100%, 구역군주: 전설 장비 100%)
  if (!target.isBoss && !target.isMiniBoss) {
    if (Math.random() < 0.05) {
      spawnItemDrop(target.x, target.y);
    }
  }

  // Mini-Boss Death: Drops Epic Item & Treasure Chest
  if (target.isMiniBoss) {
    chests.push({
      x: target.x,
      y: target.y,
      isBossChest: false
    });
    spawnItemDrop(target.x + 25, target.y, 'epic');
    damageTexts.push({
      x: target.x,
      y: target.y - 50,
      text: '★ 사파 중간보스 격파! 영웅 장비 & 비급함 드롭! ★',
      color: '#fbbf24',
      size: 18,
      life: 2.5,
      vy: -25
    });
    sound.playLevelUp();
  }

  // Sector Final Boss Death: Spawn Golden Town Portal (디아블로2 승리 포탈!) & 몬스터 리젠 완전 중단
  if (target.isBoss) {
    state.boss = null;
    state.bossDefeated = true;
    state.vacuumTimer = 4; // 남은 경험치 구슬을 한꺼번에 빨아들임
    damageTexts.push({ x: player.x, y: player.y - 170, text: '흡성 — 모든 진기를 거두다', color: '#7dd3fc', size: 16, life: 2.0, vy: -20 });
    state.spawnEnemies = false; // 보스 토벌 완료 -> 몬스터 추가 리젠 완전 차단!

    // 전장의 남은 일반 잔당들을 승리의 거대 충격파로 일소
    for (let e of enemies) {
      PixelFX.spawnEnemyDeath(e.x, e.y, false, false);
    }
    enemies.length = 0;

    const bossBar = document.getElementById('bossBarContainer');
    if (bossBar) bossBar.style.display = 'none';
    chests.push({
      x: target.x - 50,
      y: target.y,
      isBossChest: true
    });
    spawnItemDrop(target.x + 50, target.y, 'legendary');
    // 포탈은 보상(상자·아이템)과 겹치지 않게 보스 자리 위쪽으로 떨어뜨려 생김 (겹치면 아이템을 줍기 전에 포탈에 빨려 들어감)
    spawnVictoryPortal(target.x, target.y - 230);
    showPhaseBanner('🏆 군주 토벌!', '포탈로 다음 관문 진격', 'stage');
    sound.playLevelUp();
  }

  // Evolution: Poison Nova on death if poisoned
  // 독 파편이 너무 많이 날아다니면(적이 빽빽할 때 연쇄) 새 폭발은 파편 없이 그림만
  let shardCount = 0;
  if (player.evolutions.evo_dagger_rain && target.poisonTimer > 0) {
    for (const p of projectiles) if (p.type === 'poison_shard') shardCount++;
  }
  if (player.evolutions.evo_dagger_rain && target.poisonTimer > 0 && shardCount >= POISON_SHARD_MAX) {
    createShockwave(target.x, target.y, 48, 'rgba(192, 132, 252, 0.6)');
  } else if (player.evolutions.evo_dagger_rain && target.poisonTimer > 0) {
    particles.push({ fxKey: 'fx_needles', x: target.x, y: target.y - 30, vx: 0, vy: 0, size: 170, rot: Math.random() * 6.28, life: 0.4, maxLife: 0.4 });
    for (let i = 0; i < 8; i++) {
      const pAng = (i / 8) * Math.PI * 2;
      projectiles.push({
        type: 'poison_shard',
        x: target.x,
        y: target.y,
        vx: Math.cos(pAng) * 380,
        vy: Math.sin(pAng) * 380,
        life: 0.8,
        damage: 48 * player.atkMultiplier,
        color: '#c084fc'
      });
    }
    createShockwave(target.x, target.y, 48, 'rgba(192, 132, 252, 0.6)');
  }

  for (let i = 0; i < 8; i++) {
    particles.push({
      x: target.x,
      y: target.y,
      vx: (Math.random() - 0.5) * 160,
      vy: (Math.random() - 0.5) * 160,
      life: 0.45,
      maxLife: 0.45,
      color: '#94a3b8',
      size: 3 + Math.random() * 3
    });
  }
}

let pendingLevelUps = 0;

function addExp(amount) {
  player.exp += amount;
  sound.playPickup();

  while (player.exp >= player.nextExp) {
    player.exp -= player.nextExp;
    player.level++;
    player.nextExp = Math.round(player.nextExp * 1.27 + 10);
    pendingLevelUps++;
  }

  const pct = Math.min(100, (player.exp / player.nextExp) * 100);
  document.getElementById('expBar').style.width = pct + '%';
  document.getElementById('expText').innerText = `${player.exp} / ${player.nextExp}`;
  document.getElementById('tierText').innerText = getTier(player.level);

  if (pendingLevelUps > 0 && !state.isLevelingUp && !state.isGameOver) {
    showNextLevelUp();
  }
}

function onLevelUp() {
  pendingLevelUps++;
  if (!state.isLevelingUp && !state.isGameOver) {
    showNextLevelUp();
  }
}

function showNextLevelUp() {
  if (state.isGameOver) return;
  sound.playLevelUp();
  state.isLevelingUp = true;
  state.isPaused = true;

  const titleEl = document.getElementById('levelUpModalTitle') || document.querySelector('#levelUpModal .modal-title');
  const subEl = document.getElementById('levelUpModalSubtitle') || document.querySelector('#levelUpModal .modal-subtitle');
  const cardList = document.getElementById('cardList');
  const fallbackBtn = document.getElementById('fallbackLevelUpBtn');
  if (fallbackBtn) fallbackBtn.style.display = 'none';

  cardList.innerHTML = '';

  const available = [];
  // Standard upgrades
  for (let key in SKILL_DEFS) {
    const s = SKILL_DEFS[key];
    const currentLvl = player.skills[key] || 0;
    if (typeof skillAllowed === 'function' && !skillAllowed(key)) continue; // 다른 협객 전용 무공 (23_hero_skills.js)
    if (currentLvl < s.maxLevel) {
      available.push({
        id: key,
        def: s,
        nextLvl: currentLvl + 1
      });
    }
  }

  // Evolution options if base skill is maxed
  for (let key in EVO_SKILL_DEFS) {
    const evo = EVO_SKILL_DEFS[key];
    if (player.skills[key] >= 5 && !player.evolutions[evo.id]) {
      available.push({
        id: evo.id,
        isEvo: true,
        def: {
          name: `★ [초월 각성] ${evo.name}`,
          icon: evo.icon,
          img: evo.img,
          getUpgradeDesc: () => evo.desc
        },
        nextLvl: 'MAX 각성'
      });
    }
  }

  let choices = [];
  if (available.length > 0) {
    if (titleEl) titleEl.innerText = "경지 돌파 (境界突破)";
    if (subEl) subEl.innerText = "새로운 무공을 전수받거나 기존 무공을 연마하십시오.";
    available.sort(() => Math.random() - 0.5);
    const RANGED = ['flying_swords', 'dagger_rain', 'palm_blast', 'thunder_bomb'];
    const rangedOwned = RANGED.filter(k => (player.skills[k] || 0) > 0).length;
    if (rangedOwned < 3) {
      // 원거리 무공 3개를 갖출 때까지: 카드 2장은 원거리 (아직 없는 무공 먼저)
      const ranged = available.filter(c => RANGED.includes(c.id))
        .sort((p, q) => ((player.skills[p.id] || 0) > 0) - ((player.skills[q.id] || 0) > 0));
      const others = available.filter(c => !RANGED.includes(c.id));
      choices = ranged.slice(0, 2).concat(others.slice(0, 1));
      if (choices.length < 3) choices = choices.concat(ranged.slice(2, 2 + 3 - choices.length));
    } else {
      choices = available.slice(0, 3);
    }
  } else {
    // 모든 무공 대성(MAX) 달성 시: 게임이 멈추지 않고 계속 즐길 수 있도록 대성 영약 3종 제공!
    if (titleEl) titleEl.innerHTML = "🏆 경지 대성 (境地大成)";
    if (subEl) subEl.innerHTML = "모든 무공을 극한으로 연마하였습니다! 영약을 흡수하여 잠재력을 폭발시키십시오.";

    choices = [
      {
        id: 'bonus_heal',
        isBonus: true,
        def: {
          name: '💖 천원진기 (天元眞氣)',
          icon: '💖',
          getUpgradeDesc: () => '혈기(HP) 80 즉시 회복 및 최대 혈기 +25 영구 증가'
        },
        action: () => {
          player.maxHp += 25;
          player.hp = Math.min(player.maxHp, player.hp + 80);
          updateHud();
          damageTexts.push({
            x: player.x,
            y: player.y - 70,
            text: '💖 혈기 80 회복 & 최대 혈기 +25!',
            color: '#34d399',
            size: 19,
            life: 2.2,
            vy: -28
          });
        }
      },
      {
        id: 'bonus_atk',
        isBonus: true,
        def: {
          name: '⚔️ 파천신공 (破天神功)',
          icon: '⚔️',
          getUpgradeDesc: () => '전체 무공 공격력 +8% 영구 증폭'
        },
        action: () => {
          player.atkMultiplier = (player.atkMultiplier || 1) + 0.08;
          updateHud();
          damageTexts.push({
            x: player.x,
            y: player.y - 70,
            text: `⚔️ 공격력 +8% 증폭! (현재 ${Math.round(player.atkMultiplier * 100)}%)`,
            color: '#fbbf24',
            size: 19,
            life: 2.2,
            vy: -28
          });
        }
      },
      {
        id: 'bonus_spd',
        isBonus: true,
        def: {
          name: '⚡ 능파미보 (凌波微步)',
          icon: '⚡',
          getUpgradeDesc: () => '이동 속도 +10 및 치명타 확률 +3% 영구 증가'
        },
        action: () => {
          player.speed += 10;
          player.critRate = Math.min(0.75, (player.critRate || 0.1) + 0.03);
          updateHud();
          damageTexts.push({
            x: player.x,
            y: player.y - 70,
            text: `⚡ 신속 +10 & 치명타 +3%!`,
            color: '#38bdf8',
            size: 19,
            life: 2.2,
            vy: -28
          });
        }
      }
    ];
  }

  choices.forEach(c => {
    const card = document.createElement('div');
    card.className = c.isEvo ? 'skill-card evo-card' : (c.isBonus ? 'skill-card bonus-card' : 'skill-card');
    card.innerHTML = `
      <div class="skill-icon${c.def.img ? ' has-img' : ''}">${skillIconHTML(c.def)}</div>
      <div class="skill-info">
        <div class="skill-name-row">
          <span class="skill-name" style="${c.isEvo || c.isBonus ? 'color:#fbbf24;font-weight:800;' : ''}">${c.def.name}</span>
          <span class="skill-lvl" style="${c.isEvo || c.isBonus ? 'color:#f59e0b;' : ''}">${c.isEvo ? '초월' : (c.isBonus ? '대성' : 'Lv.' + c.nextLvl)}</span>
        </div>
        <div class="skill-desc">${c.def.getUpgradeDesc(c.nextLvl)}${statPreview(c)}</div>
      </div>
    `;
    card.onclick = () => {
      if (c.isBonus) {
        c.action();
        sound.playLevelUp();
      } else if (c.isEvo) {
        player.evolutions[c.id] = true;
        sound.playLevelUp();
        damageTexts.push({
          x: player.x,
          y: player.y - 70,
          text: `★ ${c.def.name} 각성! ★`,
          color: '#fbbf24',
          size: 20,
          life: 2.5,
          vy: -30
        });
      } else {
        applySkillUpgrade(c.id);
      }

      pendingLevelUps = Math.max(0, pendingLevelUps - 1);
      if (pendingLevelUps > 0) {
        showNextLevelUp();
      } else {
        document.getElementById('levelUpModal').style.display = 'none';
        state.isLevelingUp = false;
        state.isPaused = false;
      }
    };
    cardList.appendChild(card);
  });

  // Emergency fallback button
  if (fallbackBtn) {
    fallbackBtn.onclick = () => {
      pendingLevelUps = 0;
      document.getElementById('levelUpModal').style.display = 'none';
      state.isLevelingUp = false;
      state.isPaused = false;
    };
  }

  if (typeof Tutorial !== 'undefined') Tutorial.decorateLevelUp(); // 첫 판: 고르는 법 한 줄 (js/15_tutorial.js)
  document.getElementById('levelUpModal').style.display = 'flex';
}

// 레벨업 카드에 '지금 → 다음' 숫자 (보조 무공이 얼마나 좋아지는지 보이게)
function statPreview(c) {
  const id = c.id, now = player.skills[id] || 0, nx = c.nextLvl;
  const b = (a, z, label = '') => `<br><span style="color:#fde68a">${label.trim()} ${a} → ${z}</span>`;
  if (id === 'qinggong_dash') return b(Math.round(player.baseSpeed * (1 + now * 0.15)), Math.round(player.baseSpeed * (1 + nx * 0.15)), ' 이동속도');
  if (id === 'vajra_shield') return b(player.maxHp, player.maxHp + 35, ' 최대 혈기') + b(now ? 135 + now * 18 : 0, 135 + nx * 18, ' 충격파 범위');
  if (id === 'qi_magnet') return b(player.magnetRadius, 190 + nx * 50, ' 흡수 범위');
  if (id === 'flying_swords') return b(1 + now, 1 + nx, '매화검 수');
  return '';
}
function applySkillUpgrade(skillId) {
  player.skills[skillId] = (player.skills[skillId] || 0) + 1;
  const lvl = player.skills[skillId];

  if (skillId === 'qinggong_dash') {
    player.speed = player.baseSpeed * (1 + lvl * 0.15);
  } else if (skillId === 'vajra_shield') {
    player.maxHp += 35; // 기존 체력(영약 보너스 포함)에 더하기
    player.hp = Math.min(player.maxHp, player.hp + 35);
  } else if (skillId === 'qi_magnet') {
    player.magnetRadius = 190 + lvl * 50;
  }
  updateHud();
}

function updateHud() {
  const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);
  document.getElementById('hpBar').style.width = hpPct + '%';
  document.getElementById('hpText').innerText = `${Math.ceil(player.hp)} / ${player.maxHp}`;
  document.getElementById('tierText').innerText = getTier(player.level);
}

function openTreasureModal(isBossChest = false) {
  state.isPaused = true;
  sound.playLevelUp();

  let candidateEvo = null;
  for (let baseSkill in EVO_SKILL_DEFS) {
    const evoDef = EVO_SKILL_DEFS[baseSkill];
    if (player.skills[baseSkill] >= 5 && !player.evolutions[evoDef.id]) {
      candidateEvo = evoDef;
      break;
    }
  }

  const content = document.getElementById('treasureContent');
  const sub = document.getElementById('treasureSubtitle');

  if (candidateEvo) {
    player.evolutions[candidateEvo.id] = true;
    sub.innerText = "천하제일 무학의 정점에 도달하여 궁극의 초월 비급을 각성했습니다!";
    content.innerHTML = `
      <div class="evo-showcase-card">
        <div class="evo-show-icon">${skillIconHTML(candidateEvo)}</div>
        <div style="flex: 1;">
          <div class="evo-badge-pill">★ ${candidateEvo.badge} 각성 ★</div>
          <div style="font-size: 18px; font-weight: 800; color: ${candidateEvo.color}; margin-bottom: 4px;">
            ${candidateEvo.name}
          </div>
          <div style="font-size: 12px; color: #cbd5e1; line-height: 1.5;">
            ${candidateEvo.desc}
          </div>
        </div>
      </div>
    `;
    damageTexts.push({
      x: player.x,
      y: player.y - 70,
      text: `★ [초월 각성] ${candidateEvo.name} ★`,
      color: candidateEvo.color,
      size: 20,
      life: 2.5,
      vy: -30
    });
  } else {
    let unmaxed = Object.keys(SKILL_DEFS).filter(k => (player.skills[k] || 0) < SKILL_DEFS[k].maxLevel && (typeof skillAllowed !== 'function' || skillAllowed(k)));
    let upgradedSkillName = "";
    if (unmaxed.length > 0) {
      const chosen = unmaxed[Math.floor(Math.random() * unmaxed.length)];
      applySkillUpgrade(chosen);
      upgradedSkillName = ` & [${SKILL_DEFS[chosen].name}] 1단계 즉시 연마!`;
    }
    player.hp = Math.min(player.maxHp, player.hp + 40);
    state.isPaused = false; // 일반 상자는 멈추지 않음
    showMiniToast('📦', '비급함', (upgradedSkillName ? upgradedSkillName.replace(' & ', '').replace(' 1단계 즉시 연마!', ' +1') + ' · ' : '') + '혈기 +40 · 진기 +80', '#fbbf24');
    updateHud();
    addExp(80);
    return;
  }

  document.getElementById('treasureModal').style.display = 'flex';
}

function spawnVictoryPortal(x, y) {
  state.victoryPortal = {
    x: x,
    y: y,
    radius: 55, // 쉽게 탑승할 수 있도록 진입 반경 확대
    active: true,
    rot: 0,
    pulse: 0
  };
  // 포탈 자리를 막는 대나무·바위는 치움 (포탈이 소품에 가려 들어가기 어렵지 않게)
  for (let i = obstacles.length - 1; i >= 0; i--) {
    if (Math.hypot(obstacles[i].x - x, obstacles[i].y - y) < 150) {
      PixelFX.spawnHitSparks(obstacles[i].x, obstacles[i].y, '#94a3b8', 8);
      obstacles.splice(i, 1);
    }
  }
  createShockwave(x, y, 140, '#fbbf24');
  createShockwave(x, y, 90, '#38bdf8');
  PixelFX.spawnHitSparks(x, y, '#fbbf24', 20);
  state.cameraShake = Math.max(state.cameraShake, 0.45);
}

function onSectorVictory() {
  state.isGameOver = true;
  state.isPaused = true;
  markCurrentSectorCleared();
  awardSilver(true, 'vicSilver'); // 구역 돌파 은자 (js/14_progress.js)

  // 마지막(5)구역까지 모두 깨면 승리 창 대신 엔딩 크레딧이 바로 나옴 (끝에 '다시 시작' / '처음으로')
  if (currentSelectedSector >= 5) {
    sound.playLevelUp();
    playCinematic('ending', openEndingCredits); // 엔딩 컷신 → 엔딩 크레딧
    return;
  }

  const sector = SECTOR_DEFS[currentSelectedSector - 1] || SECTOR_DEFS[0];
  document.getElementById('vicSector').innerText = `제${currentSelectedSector}구역: ${sector.name.split(':')[1] || sector.name}`;
  document.getElementById('vicKills').innerText = `${state.kills}명`;
  document.getElementById('vicTime').innerText = formatTime(state.gameTime);
  document.getElementById('vicTier').innerText = getTier(player.level);

  const listEl = document.getElementById('victorySkillList');
  if (listEl) {
    listEl.innerHTML = '';
    for (let k in player.skills) {
      if (player.skills[k] > 0) {
        const s = SKILL_DEFS[k];
        const evo = EVO_SKILL_DEFS[k];
        const isEvo = evo && player.evolutions[evo.id];
        const item = document.createElement('div');
        item.className = 'owned-skill-item';
        if (isEvo) item.style.borderColor = '#fbbf24';
        item.innerHTML = `
          <div class="owned-skill-icon">${skillIconHTML(isEvo ? evo : s)}</div>
          <div class="owned-skill-info">
            <div class="owned-skill-name" style="${isEvo ? 'color:#fbbf24;font-weight:800;' : ''}">
              ${isEvo ? evo.name : s.name}
            </div>
            <div class="owned-skill-level">${isEvo ? '★ 초월 각성 ★' : `Lv.${player.skills[k]}`}</div>
          </div>
        `;
        listEl.appendChild(item);
      }
    }
  }

  const nextBtn = document.getElementById('btnVictoryNextSector');
  if (currentSelectedSector >= 5) {
    nextBtn.innerText = '🎉 전 구역 완전 제패! (강호 통일) ➔';
  } else {
    nextBtn.innerText = `🗺️ 제${currentSelectedSector + 1}구역으로 진격 ➔`;
  }

  document.getElementById('victoryModal').style.display = 'flex';
  sound.playLevelUp();
}

// --- Cheat & Testing Functions ---
function cheatLevelUp(count = 1) {
  for (let i = 0; i < count; i++) {
    player.level++;
    player.atkMultiplier += 0.15;
    player.critRate = Math.min(0.6, player.critRate + 0.02);
    player.speed += 5;
    player.maxHp += 20;
    player.hp = player.maxHp;
  }
  sound.playLevelUp();
  updateHud();
}

function cheatMaxAll() {
  for (let key in SKILL_DEFS) {
    player.skills[key] = SKILL_DEFS[key].maxLevel;
    applySkillUpgrade(key);
  }
  player.level = Math.max(player.level, 30);
  player.atkMultiplier = 3.5;
  player.critRate = 0.5;
  player.maxHp = 500;
  player.hp = 500;
  sound.playLevelUp();
  updateHud();
}

function cheatToggleGod() {
  state.isGodMode = !state.isGodMode;
  const badge = document.getElementById('godBadge');
  badge.style.display = state.isGodMode ? 'inline-block' : 'none';
  const godBtn = document.getElementById('btnGodMode');
  if (godBtn) {
    godBtn.innerText = state.isGodMode ? '🛡️ 무적 모드: ON' : '🛡️ 무적 모드: OFF';
    godBtn.style.borderColor = state.isGodMode ? '#ef4444' : '#475569';
  }
  sound.playPickup();
}

// Build Skill Cheat List in modal
function setupCheatModalUI() {
  const list = document.getElementById('skillCheatList');
  list.innerHTML = '';
  for (let key in SKILL_DEFS) {
    const s = SKILL_DEFS[key];
    const item = document.createElement('div');
    item.className = 'skill-cheat-item';
    item.innerHTML = `<span>${s.icon} ${s.name.split(' ')[1]}</span> <span id="cheatLvl_${key}">Lv.${player.skills[key] || 0}</span>`;
    item.onclick = () => {
      if ((player.skills[key] || 0) < s.maxLevel) {
        applySkillUpgrade(key);
        document.getElementById(`cheatLvl_${key}`).innerText = `Lv.${player.skills[key]}`;
        sound.playPickup();
      }
    };
    list.appendChild(item);
  }
}

// --- Main Update Loop ---
