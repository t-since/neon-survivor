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
        // 날아가는 매화검 뒤로 꽃잎이 흩어짐
        if (Math.random() < 0.35 * (state.frameK || 1)) spawnPetals(sw.x, sw.y, 1, 0.3);

        for (let e of enemies) {
          if (e.hp <= 0) continue;
          if (Math.hypot(e.x - sw.x, e.y - sw.y) < e.radius + 16) {
            dealDamage(e, (isEvo ? 85 : 42) * player.atkMultiplier, true);
            createHitSparks(sw.x, sw.y, isEvo ? '#fb7185' : '#f9a8d4');
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

    // 초월 '매화만개'의 매화나무는 updatePlumTrees() 에서
  }

  // 2. Dagger Rain (만천화우)
  if (player.skills.dagger_rain > 0) {
    player.timers.dagger_rain += dt;
    const interval = Math.max(1.0, 3.0 - player.skills.dagger_rain * 0.4);
    if (player.timers.dagger_rain >= interval) {
      player.timers.dagger_rain = 0;
      castDaggerRain();
    }
  }

  // 3. Palm Blast (벽공장 / 여래신장)
  if (player.skills.palm_blast > 0) {
    player.timers.palm_blast += dt;
    const interval = Math.max(1.5, 3.8 - player.skills.palm_blast * 0.5);
    if (player.timers.palm_blast >= interval) {
      player.timers.palm_blast = 0;
      castPalmBlast();
    }
  }

  // 4. Thunder Bomb (벽력탄)
  if (player.skills.thunder_bomb > 0) {
    player.timers.thunder_bomb += dt;
    const interval = Math.max(1.2, 3.5 - player.skills.thunder_bomb * 0.4);
    if (player.timers.thunder_bomb >= interval) {
      player.timers.thunder_bomb = 0;
      castThunderBomb();
    }
  }

  updatePlumTrees(dt);

  // 5. Vajra Shield pulse (금강불괴 / 무적신공)
  if (player.skills.vajra_shield > 0) {
    player.timers.vajra_shield += dt;
    if (player.timers.vajra_shield >= 3.0) {
      player.timers.vajra_shield = 0;
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
      sound.playPalmBlast();
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

// 매화만개(초월): 3초마다 적이 가장 많이 몰린 곳에 매화나무가 솟아 꽃잎으로 거듭 벰
const PLUM_TREE = { every: 3.0, life: 2.6, grow: 0.45, tick: 0.3, radius: 190, dmg: 70, max: 3 };
function spawnPlumTree() {
  // 서진 주변 520 안의 적 중, 160 안에 이웃이 가장 많은 적 자리 (적이 많으면 40마리만 견줌)
  const near = enemies.filter(e => e.hp > 0 && Math.hypot(e.x - player.x, e.y - player.y) < 520);
  if (!near.length) return;
  const sample = near.length > 40 ? near.sort(() => Math.random() - 0.5).slice(0, 40) : near;
  let best = sample[0], bestN = -1;
  for (const a of sample) {
    let n = 0;
    for (const b of near) if (Math.abs(a.x - b.x) < 160 && Math.abs(a.y - b.y) < 160) n++;
    if (n > bestN) { bestN = n; best = a; }
  }
  if (plumTrees.length >= PLUM_TREE.max) plumTrees.shift();
  plumTrees.push({ x: best.x, y: best.y + 30, t: 0, nextTick: PLUM_TREE.grow, seed: Math.random() * 1000 });
  triggerSkillMotion('sword', 0.4);
  sound.playSwordSlash();
  createShockwave(best.x, best.y + 30, 70, 'rgba(249, 168, 212, 0.7)');
}
function updatePlumTrees(dt) {
  if (player.evolutions.evo_flying_swords) {
    player.evoTimer.flying_swords = (player.evoTimer.flying_swords || 0) + dt;
    if (player.evoTimer.flying_swords >= PLUM_TREE.every) { player.evoTimer.flying_swords = 0; spawnPlumTree(); }
  }
  for (let i = plumTrees.length - 1; i >= 0; i--) {
    const tr = plumTrees[i];
    tr.t += dt;
    // 꽃이 핀 뒤 0.3초마다: 나무 아래 적에게 피해 + 꽃잎이 흩날려 떨어짐
    if (tr.t >= tr.nextTick && tr.t < PLUM_TREE.life - 0.3) {
      tr.nextTick += PLUM_TREE.tick;
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const dx = e.x - tr.x, dy = (e.y - tr.y) / 0.6;
        if (dx * dx + dy * dy <= PLUM_TREE.radius * PLUM_TREE.radius) dealDamage(e, PLUM_TREE.dmg * player.atkMultiplier, true);
      }
      for (let k = 0; k < 7; k++) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * PLUM_TREE.radius * 0.9;
        spawnPetals(tr.x + Math.cos(a) * r * 0.8, tr.y - 250 + Math.sin(a) * r * 0.45, 1, 0.5); // 나무 꽃가지 높이에서
      }
    }
    if (tr.t >= PLUM_TREE.life) plumTrees.splice(i, 1);
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

function castPalmBlast() {
  triggerSkillMotion('palm', 0.38);

  const dir = player.facing;
  const isBuddha = !!player.evolutions.evo_palm_blast;
  const w = isBuddha ? 220 : (76 + player.skills.palm_blast * 20);
  const h = isBuddha ? 280 : (100 + player.skills.palm_blast * 20);
  const dmg = (isBuddha ? 320 : (80 + player.skills.palm_blast * 24)) * player.atkMultiplier;

  projectiles.push({
    type: 'palm_wave',
    isBuddhaPalm: isBuddha,
    x: player.x + dir * 35,
    y: player.y - 15,
    vx: dir * (isBuddha ? 520 : 460),
    vy: 0,
    width: w,
    height: h,
    life: isBuddha ? 1.6 : 1.25,
    damage: dmg,
    penetrates: true,
    hitList: new Set()
  });
  sound.playPalmBlast();
  createShockwave(player.x + dir * 25, player.y - 15, isBuddha ? 70 : 42, isBuddha ? '#fbbf24' : '#38bdf8');
}

function castThunderBomb() {
  triggerSkillMotion('bomb', 0.35);
  const isEvo = !!player.evolutions.evo_thunder_bomb; // 구천뇌정
  const bombCount = isEvo ? 4 : 1 + Math.floor(player.skills.thunder_bomb / 3);
  for (let i = 0; i < bombCount; i++) {
    const target = enemies.length > 0 ? enemies[Math.floor(Math.random() * enemies.length)] : null;
    const tx = target ? target.x + (Math.random() - 0.5) * 40 : player.x + (Math.random() - 0.5) * 300;
    const ty = target ? target.y + (Math.random() - 0.5) * 40 : player.y + (Math.random() - 0.5) * 300;
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
      duration: isEvo ? 0.5 + i * 0.12 : 0.65
    });
  }
}

// Melee Sword Slash Attack (화산 정통 근접 매화검격 & 수동/자동 일섬)
// 근거리 베기: 대상 방향 부채꼴(8방향 어디든) + 3단 콤보(내려베기 → 올려베기 → 큰 베기)
function triggerMeleeAttack(target) {
  const tx = target ? target.x : player.x + player.facing * 100;
  const ty = target ? target.y : player.y;
  const aim = Math.atan2(ty - player.y, tx - player.x);

  player.attackCombo = ((player.attackCombo || 0) + 1) % 3;
  player.skillPose = null; // 무공 시전 자세가 아니라 칼 베기
  const isFinisher = player.attackCombo === 2;
  player.isAttacking = true;
  player.attackDuration = isFinisher ? 0.5 : 0.4; // 베기 한 번 걸리는 시간 (사용자: 조금 빠름 → 늘림)
  player.attackTimer = player.attackDuration;
  player.attackCooldownTimer = Math.max(0.42, 0.68 - (player.level * 0.01)) * (isFinisher ? 1.3 : 1) / ((player.activeBuffs && player.activeBuffs.blood_fury > 0) ? 1.5 : 1);
  player.attackAim = aim;

  // 대상 쪽으로 몸 돌리기 (거의 위/아래면 그대로)
  if (Math.cos(aim) < -0.15) player.facing = -1;
  else if (Math.cos(aim) > 0.15) player.facing = 1;

  sound.playSwordSlash();

  const range = isFinisher ? 205 : 180;
  const halfArc = isFinisher ? Math.PI * 0.75 : Math.PI * 0.39; // 보통 140°, 큰 베기 270°
  let hits = 0;
  for (const e of enemies) {
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    const d = Math.hypot(dx, dy);
    if (d > range + (e.radius || 0)) continue;
    let da = Math.atan2(dy, dx) - aim;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) > halfArc && d > 45) continue; // 몸에 붙은 적은 방향 상관없이 맞음
    hits++;
    const dmg = (48 + player.level * 6) * player.atkMultiplier * (isFinisher ? 1.6 : 1);
    dealDamage(e, dmg, true);
    e.hitCooldown = 0.14;
    // 맞은 방향으로 밀려남 (보스는 밀리지 않음, 중간보스는 큰 베기에만 조금)
    if (!e.isBoss && !(e.isMiniBoss && !isFinisher)) {
      const kb = (isFinisher ? 560 : 320) * (e.isMiniBoss ? 0.35 : 1);
      const nx = dx / (d || 1), ny = dy / (d || 1);
      e.knockbackVx = nx * kb;
      e.knockbackVy = ny * kb;
      e.stunTimer = Math.max(e.stunTimer || 0, isFinisher ? 0.28 : 0.14);
    }
  }

  if (hits > 0) {
    sound.playSample(isFinisher ? 'wx_slash_heavy' : 'wx_slash_hit', isFinisher ? 0.8 : 0.6, 1, 0.08, 0.08); // 묵직한 베기 타격
    // 검기 흡혈: 근거리로 싸우면 맞는 만큼 조금씩 회복 (근거리가 맞기만 한다는 의견 반영)
    const heal = Math.min(4, hits) * (isFinisher ? 2 : 1);
    if (player.hp < player.maxHp) {
      player.hp = Math.min(player.maxHp, player.hp + heal);
      updateHud();
    }
    state.hitStop = isFinisher ? 0.07 : 0.04;          // 맞는 순간 아주 잠깐 멈칫 (손맛)
    state.screenShake = Math.max(state.screenShake || 0, isFinisher ? 7 : 3);
  }
  PixelFX.spawnSwordSlash(player.x + Math.cos(aim) * 50, player.y - 30 + Math.sin(aim) * 40, aim, isFinisher ? 120 : 88);
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
    color: isCrit ? '#f59e0b' : '#ffffff',
    size: isCrit ? 18 : 14,
    life: 0.65,
    vy: -40
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
      x: target.x - 35,
      y: target.y,
      isBossChest: true
    });
    spawnItemDrop(target.x + 35, target.y, 'legendary');
    spawnVictoryPortal(target.x, target.y);
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
      <div class="skill-icon">${c.def.icon}</div>
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
        <div style="font-size: 38px;">${candidateEvo.icon}</div>
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
    let unmaxed = Object.keys(SKILL_DEFS).filter(k => (player.skills[k] || 0) < SKILL_DEFS[k].maxLevel);
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
  createShockwave(x, y, 140, '#fbbf24');
  createShockwave(x, y, 90, '#38bdf8');
  PixelFX.spawnHitSparks(x, y, '#fbbf24', 20);
  state.cameraShake = Math.max(state.cameraShake, 0.45);
}

function onSectorVictory() {
  state.isGameOver = true;
  state.isPaused = true;
  markCurrentSectorCleared();

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
          <div class="owned-skill-icon">${isEvo ? evo.icon : s.icon}</div>
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
