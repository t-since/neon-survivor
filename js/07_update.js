// 게임 루프와 매 순간 계산
let lastTime = performance.now();
let contactDmgSum = 0, contactDmgMax = 0; // 몸통 피해 합산용
// ---------- 몬스터 종류별 근접 공격 (몸에 닿으면 계속 깎이던 방식 대신, 준비 → 휘두르기) ----------
// spd: 이동 속도 배율, windup: 휘두르기 준비 시간(초), cd: 다음 공격까지, mul: 한 방 피해 = e.damage × mul
// heavy: 멈춰 서서 바닥에 붉은 경고 → 범위(aoe) 안에 있으면 큰 피해 + 밀려남 (경고를 보고 피할 수 있음)
const ENEMY_MELEE = {
  assassin:        { spd: 1.12, windup: 0.16, cd: 0.50, mul: 0.6, reach: 10 },              // 빠르고 약하게
  poison_assassin: { spd: 1.12, windup: 0.16, cd: 0.50, mul: 0.6, reach: 10, poison: 3 },
  ghoul:           { spd: 1.08, windup: 0.20, cd: 0.55, mul: 0.7, reach: 8, poison: 3 },
  skeleton:        { spd: 1.00, windup: 0.36, cd: 0.85, mul: 1.1, reach: 14 },              // 보통
  barbarian:       { spd: 1.00, windup: 0.30, cd: 0.75, mul: 0.6, reach: 16, double: true }, // 쌍도: 두 번 연속
  butcher:         { spd: 0.72, windup: 0.85, cd: 1.6, mul: 2.0, reach: 40, heavy: true, aoe: 95 } // 느리고 묵직하게
};
function updateEnemySwing(e, prof, dist, dt) {
  e.swingCd = (e.swingCd === undefined ? Math.random() * prof.cd : e.swingCd) - dt;
  const reach = player.radius + e.radius * 1.2 + prof.reach;
  if (e.swingT > 0) {
    e.swingT -= dt;
    if (e.stunTimer > 0.15 && !prof.heavy) { e.swingT = 0; e.swingCd = prof.cd * 0.5; return; } // 맞아서 휘청이면 공격 끊김
    if (e.swingT <= 0) enemyStrike(e, prof);
    return;
  }
  if (e.swingHits > 0) { // 쌍도객 두 번째 칼
    e.swingHitT -= dt;
    if (e.swingHitT <= 0) { e.swingHits--; enemyStrike(e, prof, true); }
  }
  if (e.swingCd <= 0 && dist < reach && !(e.stunTimer > 0)) {
    e.swingT = prof.windup;
    e.animAtk = e.animAtkMax = prof.windup / 0.55; // 공격 그림 4장 중 3번째 장에서 내려침
    if (prof.heavy) { // 내려칠 자리를 미리 정함 (서진 쪽 앞)
      const a = Math.atan2(player.y - e.y, player.x - e.x);
      e.swingX = e.x + Math.cos(a) * (e.radius + 34);
      e.swingY = e.y + Math.sin(a) * (e.radius + 34);
      e.swingAim = a;
    }
  }
}
function enemyStrike(e, prof, second) {
  e.swingCd = prof.cd;
  if (prof.double && !second) { e.swingHits = 1; e.swingHitT = 0.14; }
  if (player.isDashing) return; // 경공 중엔 피함
  if (prof.heavy) {
    createShockwave(e.swingX, e.swingY, prof.aoe, 'rgba(239, 68, 68, 0.8)');
    PixelFX.spawnHitSparks(e.swingX, e.swingY, '#fca5a5', 10);
    state.screenShake = Math.max(state.screenShake || 0, 9);
    sound.playSample && sound.playSample('wx_slash_heavy', 0.7, 0.7, 0.05, 0.1);
    const dx = player.x - e.swingX, dy = player.y - e.swingY, d = Math.hypot(dx, dy);
    if (d > prof.aoe + player.radius) return; // 경고 밖으로 피했음
    playerTakeDamage(e.damage * prof.mul);
    const n = d || 1; // 내려친 자리 밖으로 밀려남
    player.x += dx / n * 55; player.y += dy / n * 55;
    return;
  }
  const d = Math.hypot(player.x - e.x, player.y - e.y);
  if (d > player.radius + e.radius * 1.2 + prof.reach + 18) return; // 휘두르는 사이 빠져나감
  playerTakeDamage(e.damage * prof.mul);
  if (prof.poison) applyPlayerDebuff('poison', prof.poison);
}
// 묵직한 공격 경고: 내려칠 자리에 붉은 원이 차오름 (renderGround 끝에서 그림)
function drawEnemyTelegraphs() {
  for (const e of enemies) {
    if (!(e.swingT > 0) || e.isBoss || e.isMiniBoss) continue;
    const prof = ENEMY_MELEE[e.type];
    if (!prof || !prof.heavy) continue;
    const k = 1 - e.swingT / prof.windup;
    ctx.save();
    ctx.translate(e.swingX, e.swingY);
    ctx.scale(1, 0.62);
    ctx.fillStyle = `rgba(239, 68, 68, ${0.10 + k * 0.18})`;
    ctx.beginPath(); ctx.arc(0, 0, prof.aoe, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(239, 68, 68, ${0.25 + k * 0.25})`;
    ctx.beginPath(); ctx.arc(0, 0, prof.aoe * k, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(254, 202, 202, 0.85)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, prof.aoe, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}
const ENEMY_CELL = 80;           // 몬스터 겹침 검사 칸 크기
const ENEMY_GRID = new Map();    // 칸 번호 → 그 칸의 몬스터들 (매 프레임 새로 채움)

// 서진에게 디버프 걸기 (poison: 맹독 초당 피해 / slow: 둔화). 이미 걸려 있으면 남은 시간만 늘림
function applyPlayerDebuff(kind, seconds) {
  if (state.isGodMode || (player.activeBuffs && player.activeBuffs.invincible > 0)) return;
  if (!player.debuffs) player.debuffs = { poison: 0, slow: 0 };
  const was = player.debuffs[kind] > 0;
  player.debuffs[kind] = Math.max(player.debuffs[kind] || 0, seconds);
  if (!was) {
    damageTexts.push({ x: player.x, y: player.y - 150, text: kind === 'poison' ? '☣ 중독' : '❄ 빙결 둔화', color: kind === 'poison' ? '#4ade80' : '#7dd3fc', size: 15, life: 1.0, vy: -30 });
    updateHudDebuffs();
  }
}

function pickMusicKey() {
  if (typeof Cinema !== 'undefined' && Cinema.active) return Cinema.music; // 영상이면 null → 배경음악 끔
  if (!state.isGameStarted) return 'title';
  if (state.boss) return 'boss';
  const secIdx = Math.max(0, Math.min(4, (currentSelectedSector || 1) - 1));
  const z = (ZONE_CONFIGS[secIdx] || ZONE_CONFIGS[0])[Math.max(0, Math.min(3, (state.currentZone || 1) - 1))] || {};
  return { bamboo_grove: 'bamboo', stone_fortress: 'fortress', blood_cavern: 'cavern', demon_sanctum: 'boss' }[z.theme] || 'bamboo';
}

function gameLoop(time) {
  sound.setMusic(pickMusicKey());
  const dt = Math.min(0.1, (time - lastTime) / 1000);
  lastTime = time;
  // 그리는 쪽에서 만드는 입자(흡성대법·답설무흔·흙먼지·중독·포탈)의 확률 배율:
  // 게임이 멈춰 있으면 0 (일시정지·레벨업 창 동안 쌓이지 않게), 진행 중이면 60fps 기준 (120·144Hz 모니터에서 2배로 늘지 않게)
  state.frameK = 0;

  if (state.hitStop > 0) {
    state.hitStop -= dt; // 타격 멈칫: 화면은 그리되 시간은 잠깐 멈춤
  } else if (state.isGameStarted && !state.isPaused && !state.isGameOver) {
    updateGame(dt);
  }

  renderGame();
  requestAnimationFrame(gameLoop);
}

function updateGame(dt) {
  state.frameK = dt * 60;
  state.gameTime += dt;
  updateTimerDisplay();
  updateEnvironmentWeather(dt);
  updateCorpses(dt);
  if (typeof updateTutorial === 'function') updateTutorial(dt); // 첫 판 안내 (js/15_tutorial.js)

  // 1. Player Movement & Walk Animation
  let mx = 0;
  let my = 0;
  let keyboardActive = false;
  if (keys['ArrowUp'] || keys['w'] || keys['W']) { my -= 1; keyboardActive = true; }
  if (keys['ArrowDown'] || keys['s'] || keys['S']) { my += 1; keyboardActive = true; }
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) { mx -= 1; keyboardActive = true; }
  if (keys['ArrowRight'] || keys['d'] || keys['D']) { mx += 1; keyboardActive = true; }

  if (keyboardActive) {
    mouseTarget = null; // Keyboard takes immediate precedence
  }

  if (touchActive) {
    mx = joyInputX;
    my = joyInputY;
    mouseTarget = null;
  } else if (!keyboardActive && mouseTarget) {
    const dx = mouseTarget.x - player.x;
    const dy = mouseTarget.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 15) {
      mx = dx / dist;
      my = dy / dist;
    } else {
      if (!isMouseDown) {
        mouseTarget = null; // Reached clicked destination!
      }
    }
  }

  const inputLen = Math.hypot(mx, my);
  // 빙판(4구역 얼음 바닥): 천천히 붙고 천천히 멈춤 — 살짝 미끄러지는 느낌 (renderGround 가 state.groundKey 기록)
  const onIce = state.groundKey === 'ground_new_ice' || state.groundKey === 'ground_ice_v2';
  if (inputLen > 0.1) {
    const normX = mx / (inputLen > 1 ? inputLen : 1);
    const normY = my / (inputLen > 1 ? inputLen : 1);
    if (onIce) {
      const k = Math.min(1, 4.0 * dt);
      player.vx += (normX * player.speed - player.vx) * k;
      player.vy += (normY * player.speed - player.vy) * k;
    } else {
      player.vx = normX * player.speed;
      player.vy = normY * player.speed;
    }
    player.isMoving = true;
    if (normX < -0.15) player.facing = -1;
    if (normX > 0.15) player.facing = 1;

    // Walk animation timer advances based on actual speed traveled!
    player.walkTimer += dt * (player.speed / 28);
  } else if (onIce && Math.hypot(player.vx, player.vy) > 12) {
    // 손을 떼도 얼음 위에서 조금 더 미끄러짐 (걷는 동작은 멈춤) + 얼음 가루
    const decay = Math.pow(0.12, dt);
    player.vx *= decay;
    player.vy *= decay;
    player.isMoving = false;
    player.walkTimer = 0;
    if (Math.random() < 0.25 * (state.frameK || 1)) {
      particles.push({ x: player.x + (Math.random() - 0.5) * 20, y: player.y + 4, vx: -player.vx * 0.2 + (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 20, life: 0.35, maxLife: 0.35, color: '#e0f2fe', size: 2 + Math.random() * 2 });
    }
  } else {
    player.vx = 0;
    player.vy = 0;
    player.isMoving = false;
    player.walkTimer = 0; // 가만히 서 있을 때는 보행 타이머를 0으로 고정하여 걷는 모션 완전 정지
  }

  // Handle Dashing
  if (player.isDashing) {
    player.dashElapsed += dt;
    player.x += player.dashVx * dt;
    player.y += player.dashVy * dt;
    if (player.dashElapsed >= player.dashDuration) {
      player.isDashing = false;
    }
  } else {
    player.x += player.vx * dt;
    player.y += player.vy * dt;
  }

  // Dash Cooldown
  if (player.dashTimer > 0) {
    player.dashTimer -= dt;
    dashCooldownText.innerText = player.dashTimer.toFixed(1) + 's';
    dashBtn.style.opacity = '0.55';
  } else {
    dashCooldownText.innerText = '경공';
    dashBtn.style.opacity = '1.0';
  }

  // Afterimages update
  for (let i = player.afterImages.length - 1; i >= 0; i--) {
    player.afterImages[i].alpha -= dt * 3.5;
    if (player.afterImages[i].alpha <= 0) {
      player.afterImages.splice(i, 1);
    }
  }

  // Camera smoothly centers on player
  state.camera.x += (player.x - state.camera.x) * 0.12;
  state.camera.y += (player.y - state.camera.y) * 0.12;

  // 1.5 Update Attack Timers & Auto Combat Attack
  player.attackCooldownTimer -= dt;
  if (player.attackTimer > 0) {
    player.attackTimer -= dt;
    if (player.attackTimer <= 0) {
      player.isAttacking = false;
      player.skillPose = null;
    }
  }

  // Auto Combat Strike when enemies are close
  if (player.attackCooldownTimer <= 0 && enemies.length > 0) {
    const nearbyEnemy = findClosestEnemy(player.x, player.y, 165);
    if (nearbyEnemy) {
      triggerMeleeAttack(nearbyEnemy);
    }
  }

  // 2. Update Skills & Attacks
  updateSkills(dt * ((player.activeBuffs && player.activeBuffs.blood_fury > 0) ? 1.5 : 1)); // 태을혈기: 무공 1.5배 빠르게

  // 3. Update Projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    // 여래신장 비행 황금 진기 & 지면 파동 입자
    if (p.type === 'palm_wave' && p.isBuddhaPalm && Math.random() < 0.75) {
      particles.push({
        x: p.x + (Math.random() - 0.5) * 35,
        y: p.y + (Math.random() - 0.5) * 35,
        vx: -p.vx * 0.12 + (Math.random() - 0.5) * 30,
        vy: (Math.random() - 0.5) * 45,
        color: Math.random() < 0.5 ? '#fbbf24' : '#fef08a',
        radius: 2.2 + Math.random() * 2.5,
        life: 0.4,
        maxLife: 0.4
      });
    }

    if (p.isEnemy) {
      // 幽冥 怨魂탄 비행 영혼 불꽃 입자 생성
      if (p.type === 'curse_orb' && Math.random() < 0.65) {
        particles.push({
          x: p.x + (Math.random() - 0.5) * 8,
          y: p.y + (Math.random() - 0.5) * 8,
          vx: -p.vx * 0.15 + (Math.random() - 0.5) * 20,
          vy: -p.vy * 0.15 + (Math.random() - 0.5) * 20,
          color: p.color || '#34d399',
          radius: 2.5 + Math.random() * 2,
          life: 0.35,
          maxLife: 0.35
        });
      }

      if (Math.hypot(player.x - p.x, player.y - p.y) < player.radius + (p.radius || 7)) {
        if (!player.isDashing && !state.isGodMode) {
          playerTakeDamage(p.damage);
          createHitSparks(p.x, p.y, p.color);
          // 독공: 독 표창·원혼탄 → 맹독(초당 피해) / 빙공: 서리 화살, 4구역(북해빙궁) 투사체 → 둔화
          const POISON_PROJ = { poison_shuriken: 1, curse_orb: 1 };
          if (POISON_PROJ[p.type]) applyPlayerDebuff('poison', 3.5);
          else if (p.type === 'enemy_arrow' || currentSelectedSector === 4) applyPlayerDebuff('slow', 2.2);
          if (p.type === 'curse_orb') {
            createShockwave(p.x, p.y, 45, p.color || '#10b981');
            damageTexts.push({
              x: player.x,
              y: player.y - 35,
              text: '☠ 영혼 저주!',
              color: p.color || '#34d399',
              size: 14,
              life: 0.8,
              vy: -30
            });
          }
        }
        p.life = 0;
      }
    } else if (p.type === 'golden_sword_ki') {
      for (let e of enemies) {
        if (!p.hitList.has(e) && Math.hypot(e.x - p.x, e.y - p.y) < e.radius + 20) {
          p.hitList.add(e);
          dealDamage(e, p.damage, true);
          createHitSparks(e.x, e.y, '#fbbf24');
        }
      }
    } else if (p.type === 'poison_shard') {
      for (let e of enemies) {
        if (e.hp <= 0) continue; // 이미 쓰러진 적은 통과
        if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + 12) {
          dealDamage(e, p.damage, true);
          applyPoison(e, 2.5, p.damage * 0.7);
          createHitSparks(e.x, e.y, '#c084fc');
          p.life = 0;
          break;
        }
      }
    } else if (p.type === 'dagger') {
      for (let e of enemies) {
        if (e.hp <= 0) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + 8) {
          dealDamage(e, p.damage, true);
          createHitSparks(p.x, p.y, p.color);
          p.life = 0;
          break;
        }
      }
    } else if (p.type === 'palm_wave') {
      for (let e of enemies) {
        if (!p.hitList.has(e) && Math.abs(e.x - p.x) < p.width / 2 && Math.abs(e.y - p.y) < p.height / 2) {
          p.hitList.add(e);
          dealDamage(e, p.damage, true);
          const knockbackDir = p.vx > 0 ? 1 : -1;
          const power = p.isBuddhaPalm ? 950 : (580 + player.skills.palm_blast * 95);
          e.knockbackVx = knockbackDir * power;
          e.knockbackVy = (Math.random() - 0.5) * (p.isBuddhaPalm ? 220 : 140);
          e.stunTimer = p.isBuddhaPalm ? 0.9 : (0.45 + player.skills.palm_blast * 0.08);
          createHitSparks(e.x, e.y, p.isBuddhaPalm ? '#fde047' : '#bae6fd');
          createShockwave(e.x, e.y, p.isBuddhaPalm ? 70 : 45, p.isBuddhaPalm ? 'rgba(251, 191, 36, 0.7)' : 'rgba(224, 242, 254, 0.65)');
        }
      }
    }

    if (p.life <= 0) {
      projectiles.splice(i, 1);
    }
  }

  updateBossHazards(dt); // 보스 바닥 예고 원
  // 3.5 Update Falling Needles (만천화우 은침 소나기)
  for (let i = fallingNeedles.length - 1; i >= 0; i--) {
    const fn = fallingNeedles[i];
    fn.time += dt;
    if (fn.time >= fn.delay) {
      const activeProgress = (fn.time - fn.delay) / fn.duration;
      if (activeProgress >= 1.0) {
        for (let e of enemies) {
          if (e.hp <= 0) continue; // 쓰러진 적은 건너뜀 (은침 36개가 시체를 또 때리던 문제)
          if (Math.hypot(e.x - fn.destX, e.y - fn.destY) <= fn.splashRadius) {
            dealDamage(e, fn.damage, true);
            applyPoison(e, 3.2, fn.damage * 0.65);
            createHitSparks(e.x, e.y, '#34d399');
          }
        }
        // 개별 원형 디스크 수십 개가 겹치는 대신, 하나의 유기적인 맹독 웅덩이로 자연스럽게 병합
        let merged = false;
        for (let pz of poisonZones) {
          if (Math.hypot(pz.x - fn.destX, pz.y - fn.destY) < pz.radius * 0.85) {
            pz.life = Math.max(pz.life, 3.6);
            pz.radius = Math.min(145, Math.max(pz.radius, pz.radius + 1.8));
            pz.x = pz.x * 0.92 + fn.destX * 0.08;
            pz.y = pz.y * 0.92 + fn.destY * 0.08;
            merged = true;
            break;
          }
        }
        if (!merged && poisonZones.length < 3) {
          poisonZones.push({
            isEvo: !!(typeof fn !== 'undefined' && fn && fn.isEvo),
            x: fn.destX,
            y: fn.destY,
            radius: fn.splashRadius * 1.35,
            life: 3.6,
            maxLife: 3.6,
            dps: fn.damage * 0.65,
            tickTimer: 0
          });
        }
        createShockwave(fn.destX, fn.destY, fn.splashRadius * 0.65, 'rgba(16, 185, 129, 0.45)');
        fallingNeedles.splice(i, 1);
      }
    }
  }

  // 3.8 Update Poison Zones (부글부글 끓어오르는 당문 만천화우 맹독 수렁)
  for (let i = poisonZones.length - 1; i >= 0; i--) {
    const pz = poisonZones[i];
    pz.life -= dt;
    pz.tickTimer -= dt;

    // 끓어오르는 독거품 & 산성 연무 파티클 수시 생성
    if (Math.random() < 0.45) {
      const bAng = Math.random() * Math.PI * 2;
      const bDist = Math.random() * pz.radius * 0.8;
      particles.push({
        x: pz.x + Math.cos(bAng) * bDist,
        y: pz.y + Math.sin(bAng) * bDist * 0.58,
        vx: (Math.random() - 0.5) * 14,
        vy: -15 - Math.random() * 20, // 위로 솟아오르는 기포
        color: Math.random() < 0.6 ? '#34d399' : (Math.random() < 0.5 ? '#10b981' : '#a7f3d0'),
        radius: 2.2 + Math.random() * 2.8,
        life: 0.42,
        maxLife: 0.42
      });
    }

    if (pz.tickTimer <= 0) {
      pz.tickTimer = 0.35;
      for (let e of enemies) {
        if (Math.hypot(e.x - pz.x, e.y - pz.y) <= pz.radius) {
          applyPoison(e, 2.5, pz.dps);
          // 끓는 독에 닿을 때 치이익 산성 부식 스파크
          if (Math.random() < 0.45) {
            createHitSparks(e.x, e.y, '#10b981');
          }
        }
      }
    }
    if (pz.life <= 0) {
      poisonZones.splice(i, 1);
    }
  }

  // 4. Update Ground Bombs
  for (let i = groundBombs.length - 1; i >= 0; i--) {
    const b = groundBombs[i];
    b.progress += dt / b.duration;
    if (b.progress >= 1.0) {
      createExplosion(b.targetX, b.targetY, b.radius);
      for (let e of enemies) {
        if (e.hp <= 0) continue;
        if (Math.hypot(e.x - b.targetX, e.y - b.targetY) <= b.radius) {
          dealDamage(e, b.damage, true);
        }
      }
      if (b.evo) {
        // 구천뇌정: 하늘에서 번개 + 가까운 적 3명에게 연쇄 번개 (피해 60%)
        particles.push({ bolt: true, pts: lightningPoints(b.targetX + (Math.random() - 0.5) * 40, b.targetY - 520, b.targetX, b.targetY - 10, 11, 34), x: b.targetX, y: b.targetY, vx: 0, vy: 0, life: 0.3, maxLife: 0.3 });
        particles.push({ flash: true, x: b.targetX, y: b.targetY - 20, vx: 0, vy: 0, size: b.radius * 2.4, life: 0.2, maxLife: 0.2 });
        const near = enemies.filter(e => Math.hypot(e.x - b.targetX, e.y - b.targetY) < b.radius + 260)
          .sort((p, q) => Math.hypot(p.x - b.targetX, p.y - b.targetY) - Math.hypot(q.x - b.targetX, q.y - b.targetY)).slice(0, 3);
        let fx = b.targetX, fy = b.targetY - 30;
        near.forEach(e => {
          particles.push({ arc: true, pts: lightningPoints(fx, fy, e.x, e.y - 40, 7, 18), x: e.x, y: e.y, vx: 0, vy: 0, life: 0.25, maxLife: 0.25 });
          if (e.hp > 0) dealDamage(e, b.damage * 0.6, true);
          fx = e.x; fy = e.y - 40;
        });
      }
      groundBombs.splice(i, 1);
    }
  }

  // 5. Update Enemies & Animations
  // 몸통 피해 합산 (지난 계산에서 닿은 적들): 여러 마리에 둘러싸여도 가장 센 적의 2.5배까지만
  if (contactDmgSum > 0) playerTakeDamage(Math.min(contactDmgSum, contactDmgMax * 2.5) * dt);
  contactDmgSum = 0;
  contactDmgMax = 0;
  // 몬스터 겹침 방지용 칸 나누기 (가까운 몬스터끼리만 검사 — 예전엔 목록 앞뒤 14마리라 실제로 붙은 적을 못 봄)
  ENEMY_GRID.clear();
  for (const o of enemies) {
    const k = ((o.x / ENEMY_CELL) | 0) * 100003 + ((o.y / ENEMY_CELL) | 0);
    let cell = ENEMY_GRID.get(k);
    if (!cell) ENEMY_GRID.set(k, cell = []);
    cell.push(o);
  }
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (!e._diffApplied) {
      e._diffApplied = true;
      const sc = sectorScale();
      // 보스·중간보스는 구역 배율을 절반만 (너무 길어지지 않게)
      const hpK = difficultyCfg().hp * (e.isBoss || e.isMiniBoss ? 1 + (sc.hp - 1) * 0.5 : sc.hp);
      e.hp *= hpK; e.maxHp = (e.maxHp || e.hp) * hpK;
      e.damage = (e.damage || 0) * sc.dmg;
      if (e.speed) e.speed *= sc.spd;
      e.expVal = Math.round((e.expVal || 2) * sc.exp);
      // 정예: 크고 붉게, 체력 2.5배·공격력 1.4배·경험치 3배
      if (!e.isBoss && !e.isMiniBoss && Math.random() < sc.elite) {
        e.elite = true; e.hp *= 2.5; e.maxHp *= 2.5; e.damage *= 1.4; e.expVal *= 3; e.radius = (e.radius || 18) * 1.2;
      }
    }
    if (e.hp <= 0) {
      enemies.splice(i, 1);
      continue;
    }

    // Poison status tick & slow
    const meleeProf = (!e.isBoss && !e.isMiniBoss) ? ENEMY_MELEE[e.type] : null;
    let currentSpeed = e.speed * (meleeProf ? meleeProf.spd : 1);
    if (meleeProf && e.swingT > 0) currentSpeed *= meleeProf.heavy ? 0 : 0.35; // 휘두르는 동안 멈춤(묵직) / 느려짐
    if (e.poisonTimer > 0) {
      e.poisonTimer -= dt;
      currentSpeed *= 0.75;
      e.poisonTickTimer = (e.poisonTickTimer || 0.4) - dt;
      if (e.poisonTickTimer <= 0) {
        e.poisonTickTimer = 0.4;
        const tickDmg = Math.max(1, Math.round(e.poisonDps * 0.4));
        e.hp -= tickDmg;
        e.hitCooldown = 0.08;
        damageTexts.push({
          x: e.x + (Math.random() - 0.5) * 16,
          y: e.y - 28,
          text: `☣ ${tickDmg}`,
          color: '#10b981',
          size: 13,
          life: 0.65,
          vy: -32
        });
        createPoisonBubble(e.x, e.y);
        if (e.hp <= 0) {
          onEnemyKilled(e);
          enemies.splice(i, 1);
          continue;
        }
      }
    }

    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;

    // Knockback momentum & stun physics from Formless Gale!
    let tvx = 0;
    let tvy = 0;

    if (e.stunTimer > 0) {
      e.stunTimer -= dt;
      e.knockbackVx = (e.knockbackVx || 0) * Math.pow(0.04, dt);
      e.knockbackVy = (e.knockbackVy || 0) * Math.pow(0.04, dt);
      e.vx = e.knockbackVx;
      e.vy = e.knockbackVy;
    } else {
      if (e.type === 'jiangshi') {
        // Dynamic leaping hop with smooth landing damping
        e.hopTimer = (e.hopTimer || 0) + dt * 4.5;
        const hopCycle = Math.sin(e.hopTimer);
        if (hopCycle > 0) {
          e.hopHeight = hopCycle * 28;
          tvx = (dx / dist) * currentSpeed * 2.2;
          tvy = (dy / dist) * currentSpeed * 2.2;
        } else {
          e.hopHeight = 0;
          tvx = (dx / dist) * currentSpeed * 0.15;
          tvy = (dy / dist) * currentSpeed * 0.15;
        }
      } else if (e.type === 'archer') {
        // 백골 궁수: 220~340 사거리 유지, 사격 준비 시 발을 멈추고 조준 사격 모션 진입!
        e.shootTimer = (e.shootTimer || 2.4) - dt;
        if (e.recoilTimer > 0) e.recoilTimer -= dt;

        if (e.shootTimer <= 0.85 && dist < 520) {
          // 사격 조준 시 발을 지면에 단단히 고정하고 플레이어를 향해 선회
          tvx = 0;
          tvy = 0;
          e.isAiming = true;
          e.facing = (player.x > e.x ? 1 : -1);
        } else {
          e.isAiming = false;
          if (dist < 200) {
            tvx = -(dx / dist) * currentSpeed * 0.85;
            tvy = -(dy / dist) * currentSpeed * 0.85;
          } else if (dist > 320) {
            tvx = (dx / dist) * currentSpeed;
            tvy = (dy / dist) * currentSpeed;
          } else {
            // 거리 내에서는 측면으로 부드럽게 횡이동(Strafe)
            const strafeAng = Math.atan2(dy, dx) + Math.PI * 0.5;
            tvx = Math.cos(strafeAng) * currentSpeed * 0.45;
            tvy = Math.sin(strafeAng) * currentSpeed * 0.45;
          }
        }

        if (e.shootTimer <= 0 && dist < 520) {
          e.shootTimer = 2.5 + Math.random() * 0.7;
          e.recoilTimer = 0.25;
          const aAng = Math.atan2(player.y - e.y, player.x - e.x);
          projectiles.push({
            type: 'enemy_arrow',
            isEnemy: true,
            x: e.x,
            y: e.y,
            vx: Math.cos(aAng) * 380,
            vy: Math.sin(aAng) * 380,
            life: 2.2,
            damage: 15,
            radius: 6,
            color: '#cbd5e1'
          });
          sound.playEnemyShot(); // 적 발사: 작고 낮게
        }
      } else if (e.type === 'poison_assassin') {
        // 독표창 살수: 호를 그리며 측면 기습 무빙
        const flankAng = Math.atan2(dy, dx) + 0.35;
        tvx = Math.cos(flankAng) * currentSpeed;
        tvy = Math.sin(flankAng) * currentSpeed;
        e.shootTimer = (e.shootTimer || 2.0) - dt;
        if (e.shootTimer <= 0 && dist < 450) {
          e.shootTimer = 2.2 + Math.random() * 0.8;
          const baseAng = Math.atan2(player.y - e.y, player.x - e.x);
          for (let s = -1; s <= 1; s++) {
            const shurAng = baseAng + s * 0.18;
            projectiles.push({
              type: 'poison_shuriken',
              isEnemy: true,
              debuff: 'poison',
              x: e.x,
              y: e.y,
              vx: Math.cos(shurAng) * 320,
              vy: Math.sin(shurAng) * 320,
              life: 1.8,
              damage: 11,
              radius: 6,
              color: '#10b981'
            });
          }
          sound.playEnemyShot(); // 적 발사: 작고 낮게
        }
      } else if (e.type === 'spearman') {
        // 암기 수리검 살수: 재빠른 측면 접근 및 회전 강철 수리검 2연사!
        tvx = (dx / dist) * currentSpeed;
        tvy = (dy / dist) * currentSpeed;
        e.shootTimer = (e.shootTimer || 2.4) - dt;
        if (e.shootTimer <= 0 && dist < 420) {
          e.shootTimer = 2.4 + Math.random() * 0.6;
          const spAng = Math.atan2(player.y - e.y, player.x - e.x);
          for (let s = -1; s <= 1; s += 2) {
            const shurAng = spAng + s * 0.12;
            projectiles.push({
              type: 'steel_shuriken',
              isEnemy: true,
              x: e.x,
              y: e.y,
              vx: Math.cos(shurAng) * 420,
              vy: Math.sin(shurAng) * 420,
              life: 1.6,
              damage: 16,
              radius: 7,
              color: '#e2e8f0'
            });
          }
          sound.playEnemyShot(); // 적 발사: 작고 낮게
        }
      } else if (e.type === 'curse_mage' || e.type === 'necromancer') {
        // 흑마 주술사 / 사령술사: 고요한 공중부양 비행 & 명확한 스킬 시전 예고 (뒤뚱거림 없음)
        if (e.telegraph) {
          // 스킬 주문 영창 중에는 허공에 머물며 마력을 집중함
          tvx = 0;
          tvy = 0;
        } else {
          // 거리 유지 (200~320px) 및 영공 기동
          if (dist > 300) {
            tvx = (dx / dist) * currentSpeed;
            tvy = (dy / dist) * currentSpeed;
          } else if (dist < 190) {
            tvx = -(dx / dist) * currentSpeed * 0.8;
            tvy = -(dy / dist) * currentSpeed * 0.8;
          }

          e.shootTimer = (e.shootTimer || 3.0) - dt;
          if (e.shootTimer <= 0 && dist < 580) {
            if (e.type === 'necromancer') {
              // 사령술사: 65% 확률로 幽冥 怨魂彈 (원혼탄), 35% 확률로 萬骨 召喚術 (만골 소환술)
              const doSummon = Math.random() < 0.35 && enemies.length < 80;
              if (doSummon) {
                e.shootTimer = 4.2 + Math.random() * 0.8;
                const sp1 = { x: e.x - 48, y: e.y + (Math.random() - 0.5) * 24 };
                const sp2 = { x: e.x + 48, y: e.y + (Math.random() - 0.5) * 24 };
                e.telegraph = {
                  type: 'necromancer_summon',
                  timer: 1.1,
                  maxTimer: 1.1,
                  skillName: '萬骨 召喚術 (만골 소환술)',
                  summonPoints: [sp1, sp2]
                };
              } else {
                e.shootTimer = 3.2 + Math.random() * 0.7;
                e.telegraph = {
                  type: 'necromancer_blast',
                  timer: 0.85,
                  maxTimer: 0.85,
                  skillName: '幽冥 怨魂彈 (원혼탄)',
                  targetX: player.x,
                  targetY: player.y
                };
              }
            } else {
              // 흑마 주술사 (curse_mage)
              e.shootTimer = 3.0 + Math.random() * 0.8;
              e.telegraph = {
                type: 'curse_blast',
                timer: 0.75,
                maxTimer: 0.75,
                skillName: '黑魔 呪縛術 (흑마 주박술)',
                targetX: player.x,
                targetY: player.y
              };
            }
          }
        }
      } else if (e.type === 'skeleton') {
        // 2dimg2motion 해골 백골병 4단 연속 참격 공격 모션
        e.atkCooldown = (e.atkCooldown || 1.8) - dt;
        if (e.isAttacking) {
          e.atkTimer = (e.atkTimer || 0.48) - dt;
          if (e.atkTimer <= 0) e.isAttacking = false;
        } else if (e.atkCooldown <= 0 && dist < 115) {
          e.isAttacking = true;
          e.atkTimer = 0.48;
          e.atkCooldown = 2.0 + Math.random() * 0.8;
          if (sound && sound.playSlash) sound.playSlash();
        }
        tvx = (dx / dist) * currentSpeed;
        tvy = (dy / dist) * currentSpeed;
      } else if (e.type === 'ghoul') {
        // 사파 부패시귀: 낮은 포복 질주, 200px 접근 시 도약 쇄도
        e.lungeTimer = (e.lungeTimer || 2.5) - dt;
        let gSpeed = currentSpeed;
        if (e.lungeTimer <= 0 && dist < 220) {
          gSpeed *= 1.7;
          if (e.lungeTimer <= -0.45) e.lungeTimer = 2.8 + Math.random();
        }
        tvx = (dx / dist) * gSpeed;
        tvy = (dy / dist) * gSpeed;
      } else if (e.type === 'butcher') {
        // 혈마 도살마인: 묵직한 거구의 쇄도, 돌격 시 속도 급증
        e.chargeTimer = (e.chargeTimer || 3.5) - dt;
        let bSpeed = currentSpeed;
        if (e.chargeTimer <= 0 && dist < 250) {
          bSpeed *= 1.5;
          if (e.chargeTimer <= -0.6) e.chargeTimer = 3.8 + Math.random();
        }
        tvx = (dx / dist) * bSpeed;
        tvy = (dy / dist) * bSpeed;
      } else if (e.type === 'barbarian') {
        // 광폭 쌍도객: 빠른 질주 접근
        e.whirlTimer = (e.whirlTimer || 3.5) - dt;
        let barSpeed = currentSpeed;
        if (e.whirlTimer <= 0 && dist < 200) {
          barSpeed *= 1.35;
          if (e.whirlTimer <= -0.8) e.whirlTimer = 3.5;
        }
        tvx = (dx / dist) * barSpeed;
        tvy = (dy / dist) * barSpeed;
      } else if (e.type === 'sorceress') {
        // 혈선 주술녀: 유도성 혈염구 발사
        if (dist > 280) {
          tvx = (dx / dist) * currentSpeed;
          tvy = (dy / dist) * currentSpeed;
        } else if (dist < 180) {
          tvx = -(dx / dist) * currentSpeed * 0.8;
          tvy = -(dy / dist) * currentSpeed * 0.8;
        }
        e.shootTimer = (e.shootTimer || 2.8) - dt;
        if (e.shootTimer <= 0 && dist < 500) {
          e.shootTimer = 2.8 + Math.random() * 0.8;
          const sAng = Math.atan2(player.y - e.y, player.x - e.x);
          projectiles.push({
            type: 'enemy_fire',
            isEnemy: true,
            x: e.x,
            y: e.y,
            vx: Math.cos(sAng) * 260,
            vy: Math.sin(sAng) * 260,
            life: 2.2,
            damage: 15,
            radius: 8,
            color: '#f43f5e'
          });
          sound.playPalmBlast();
        }
      } else {
        // Shadow Assassin & Skeleton: 빠른 돌진 추적
        tvx = (dx / dist) * currentSpeed;
        tvy = (dy / dist) * currentSpeed;
      }

      // 군집 분산 힘 (Soft crowd separation: 적들이 겹치지 않고 자연스럽게 부드러운 진형을 형성)
      let sepX = 0, sepY = 0;
      const gcx = (e.x / ENEMY_CELL) | 0, gcy = (e.y / ENEMY_CELL) | 0;
      let seen = 0;
      for (let ox = -1; ox <= 1 && seen < 24; ox++) for (let oy = -1; oy <= 1 && seen < 24; oy++) {
        const cell = ENEMY_GRID.get((gcx + ox) * 100003 + (gcy + oy));
        if (!cell) continue;
        for (const o of cell) {
          if (o === e) continue;
          const odx = e.x - o.x;
          const ody = e.y - o.y;
          const d2 = odx * odx + ody * ody;
          const minD = (e.radius + o.radius) * 1.45; // 그림이 몸통 반지름보다 훨씬 커서 넉넉히 띄움
          if (d2 < minD * minD) {
            seen++;
            const d = Math.sqrt(d2) || 0.5;
            const nx = d2 > 0.04 ? odx / d : Math.cos(i), ny = d2 > 0.04 ? ody / d : Math.sin(i); // 완전히 같은 자리면 아무 방향으로
            const push = (minD - d) / minD;
            sepX += nx * push * 260;
            sepY += ny * push * 260;
          }
        }
      }

      // 부드러운 가속도 & 관성 보간 (Smooth acceleration with inertia)
      const accel = e.isBoss ? 4.5 : (e.isMiniBoss ? 6.5 : 8.5);
      e.vx = (e.vx || 0) + ((tvx + sepX) - (e.vx || 0)) * Math.min(1, accel * dt);
      e.vy = (e.vy || 0) + ((tvy + sepY) - (e.vy || 0)) * Math.min(1, accel * dt);
    }

    // 최종보스 쿵쿵 걸음: 발을 드는 동안 앞으로 나아가고, 디딜 때는 거의 멈춤 (평균 속도는 그대로)
    let gaitMul = 1;
    if (e.isBoss) {
      const spd = Math.hypot(e.vx || 0, e.vy || 0);
      if (spd > 15) {
        const prev = e.gait || 0;
        e.gait = prev + dt / 0.8; // 0.8초에 한 걸음
        gaitMul = 0.2 + 1.25 * Math.sin(Math.PI * (e.gait % 1));
        if (Math.floor(e.gait) !== Math.floor(prev)) bossFootstep(e);
      }
      e.gaitPhase = (e.gait || 0) % 1;
    }
    e.x += (e.vx || 0) * gaitMul * dt;
    e.y += (e.vy || 0) * gaitMul * dt;

    // 캐릭터 몸 안으로 파고들지 않게 밀어냄 (보스·뛰어오르는 강시 제외).
    // 멈추는 거리(bodyMin) < 몸통 피해 거리(bodyMin + 10) 라서 붙어 있으면 피해는 그대로 들어옴
    if (!e.isBoss && !(e.hopHeight > 4)) {
      const bdx = e.x - player.x, bdy = e.y - player.y;
      const bd = Math.hypot(bdx, bdy);
      const bodyMin = player.radius + e.radius * 1.2;
      if (bd < bodyMin) {
        const nx = bd > 0.5 ? bdx / bd : (e.facing || 1), ny = bd > 0.5 ? bdy / bd : 0;
        e.x = player.x + nx * bodyMin;
        e.y = player.y + ny * bodyMin;
      }
    }

    // 자연스러운 보행 애니메이션 진행 타이머
    const actualSpeed = Math.hypot(e.vx || 0, e.vy || 0);
    e.runTimer = (e.runTimer || 0) + dt * (actualSpeed > 20 ? 6.8 : 2.2);

    // 1프레임 깜빡임 없는 안정적인 방향 전환 (Facing Hysteresis)
    if (!e.facing) e.facing = 1;
    if ((e.vx || 0) > 8) e.facing = 1;
    else if ((e.vx || 0) < -8) e.facing = -1;
    else if (Math.abs(dx) > 16) e.facing = dx > 0 ? 1 : -1;

    // Mini-boss martial arts skill rotation (흑풍삼단참, 천라지망, 지열혈파)
    if (e.isMiniBoss) {
      e.skillCooldown = (e.skillCooldown || 3.0) - dt;
      if (e.skillCooldown <= 0) {
        e.skillCooldown = 3.8 + Math.random();
        const randSkill = pickMiniBossSkill(e); // 모습에 맞는 기술
        if (randSkill === 0) {
          // Skill 1: 흑풍삼단참 (돌진 베기)
          e.telegraph = { type: 'dash_slash', timer: 0.6, maxTimer: 0.6, targetX: player.x, targetY: player.y };
        } else if (randSkill === 1) {
          // Skill 2: 천라지망 (12방향 암기 폭풍)
          e.telegraph = { type: 'needle_burst', timer: 0.7, maxTimer: 0.7, radius: 180 };
        } else {
          // Skill 3: 지열혈파 (광역 혈풍 강타)
          e.telegraph = { type: 'blood_quake', timer: 0.8, maxTimer: 0.8, targetX: player.x, targetY: player.y, radius: 95 };
        }
      }
    }

    // Common telegraph resolution for all enemies (중간보스, 사령술사, 흑마주술사)
    if (e.telegraph) {
      e.telegraph.timer -= dt;
      if (e.telegraph.timer <= 0) {
        const t = e.telegraph;
        if (t.type === 'dash_slash') {
          sound.playSwordSlash();
          const dashAng = Math.atan2(t.targetY - e.y, t.targetX - e.x);
          const startX = e.x;
          const startY = e.y;
          const dashDist = 190;
          e.x += Math.cos(dashAng) * dashDist;
          e.y += Math.sin(dashAng) * dashDist;

          // 1. 흑철 참마도장 잔상 3연참 (Shadow afterimages)
          const mbImg = SPRITES['miniboss_run_0'] || SPRITES.miniboss;
          for (let step = 1; step <= 3; step++) {
            const frac = step / 4;
            particles.push({
              isMbAfterimage: true,
              x: startX + (e.x - startX) * frac,
              y: startY + (e.y - startY) * frac,
              sprite: mbImg,
              mw: 192,
              mh: 312,
              facing: e.facing,
              life: 0.45 - step * 0.08,
              maxLife: 0.45
            });
          }

          // 2. 종점 전방 거대 흑풍 혈참 검기파 (Colossal Crimson Crescent Slash Wave)
          particles.push({
            isMbSlashWave: true,
            x: e.x,
            y: e.y,
            angle: dashAng,
            radius: 145,
            life: 0.38,
            maxLife: 0.38
          });

          createShockwave(e.x, e.y, 110, '#ef4444');
          createShockwave(startX, startY, 70, 'rgba(239, 68, 68, 0.5)');
          PixelFX.spawnHitSparks(e.x, e.y, '#ef4444', 16);
          state.cameraShake = Math.max(state.cameraShake, 0.45);

          if (Math.hypot(player.x - e.x, player.y - e.y) < player.radius + 60) {
            playerTakeDamage(28);
          }
        } else if (t.type === 'needle_burst') {
          sound.playPalmBlast();
          createShockwave(e.x, e.y, 140, '#a855f7');
          createShockwave(e.x, e.y, 85, '#10b981');
          PixelFX.spawnHitSparks(e.x, e.y, '#c084fc', 18);
          state.cameraShake = Math.max(state.cameraShake, 0.35);

          for (let n = 0; n < 12; n++) {
            const nAng = (n / 12) * Math.PI * 2;
            projectiles.push({
              type: 'poison_shuriken',
              isEnemy: true,
              isMiniBossStar: true,
              debuff: 'poison',
              x: e.x,
              y: e.y,
              vx: Math.cos(nAng) * 280,
              vy: Math.sin(nAng) * 280,
              life: 2.2,
              damage: 16,
              radius: 12,
              color: '#a855f7'
            });
          }
        } else if (t.type === 'blood_quake') {
          sound.playPalmBlast();
          // 지열혈파 (地裂血波) 대폭발 & 지면 균열 혈암 융기 이펙트!
          // 1. 지속형 지면 암석 균열 데칼 (2.2초 잔존)
          groundDecals.push({
            type: 'blood_fissure',
            x: t.targetX,
            y: t.targetY,
            radius: 110,
            life: 2.2,
            maxLife: 2.2,
            seed: Math.random() * 100
          });

          // 2. 솟구치는 9개의 뾰족한 혈암 바위 가시 (Towering Erupting Blood & Obsidian Rock Spikes)
          for (let s = 0; s < 9; s++) {
            const sAng = (s / 9) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
            const sDist = Math.random() * 70 + 12;
            particles.push({
              isBloodSpike: true,
              x: t.targetX + Math.cos(sAng) * sDist,
              y: t.targetY + Math.sin(sAng) * (sDist * 0.58),
              height: 0,
              maxHeight: 55 + Math.random() * 45,
              width: 16 + Math.random() * 12,
              angle: (Math.random() - 0.5) * 0.35,
              life: 1.0 + Math.random() * 0.3,
              maxLife: 1.2,
              color: Math.random() < 0.5 ? '#991b1b' : '#dc2626'
            });
          }

          // 3. 다중 혈풍 충격파 및 화약/혈석 파편 폭발
          createShockwave(t.targetX, t.targetY, 110, '#ef4444');
          createShockwave(t.targetX, t.targetY, 160, 'rgba(239, 68, 68, 0.5)');
          PixelFX.spawnThunderBombExplosion(t.targetX, t.targetY, 110);
          PixelFX.spawnHitSparks(t.targetX, t.targetY, '#ef4444', 24);

          state.cameraShake = Math.max(state.cameraShake, 0.75);
          state.screenShake = Math.max(state.screenShake, 24);

          if (Math.hypot(player.x - t.targetX, player.y - t.targetY) < 105) {
            playerTakeDamage(32);
          }
        } else if (t.type === 'necromancer_blast' || t.type === 'curse_blast') {
          // 幽冥 怨魂彈 (원혼탄) 거대 영혼 두개골 발사!
          sound.playPalmBlast();
          const isCurse = t.type === 'curse_blast';
          const cAng = Math.atan2(t.targetY - e.y, t.targetX - e.x);
          projectiles.push({
            type: 'curse_orb',
            isEnemy: true,
            isCurseMage: isCurse,
            debuff: 'slow',
            x: e.x,
            y: e.y,
            vx: Math.cos(cAng) * 230,
            vy: Math.sin(cAng) * 230,
            life: 3.0,
            damage: 20,
            radius: 16,
            color: isCurse ? '#c084fc' : '#10b981'
          });
          createShockwave(e.x, e.y, 35, isCurse ? '#c084fc' : '#10b981');
        } else if (t.type === 'necromancer_summon') {
          // 萬骨 召喚術 (만골 소환술) 지면 폭발과 함께 백골병 2체 출현!
          sound.playPalmBlast();
          if (t.summonPoints) {
            t.summonPoints.forEach(sp => {
              createShockwave(sp.x, sp.y, 42, '#34d399');
              if (enemies.length < 88) {
                enemies.push({
                  type: 'skeleton',
                  name: '소환된 백골병',
                  x: sp.x,
                  y: sp.y,
                  hp: 32 + state.gameTime * 0.9,
                  maxHp: 32 + state.gameTime * 0.9,
                  speed: 115,
                  radius: 18,
                  damage: 12,
                  hitCooldown: 0,
                  expVal: 1
                });
              }
            });
            damageTexts.push({
              x: e.x,
              y: e.y - 55,
              text: '☠ 백골 소환!',
              color: '#34d399',
              size: 15,
              life: 1.0,
              vy: -35
            });
          }
        }
        e.telegraph = null;
      }
    }

    const prof = (!e.isBoss && !e.isMiniBoss) ? ENEMY_MELEE[e.type] : null;
    if (prof) {
      updateEnemySwing(e, prof, dist, dt); // 종류별 휘두르기 (빠르고 약하게 / 느리고 묵직하게)
    } else
    // 몸통 피해 거리: 몬스터는 bodyMin(player.radius + e.radius*1.2)에서 멈추므로 그보다 조금 넓게
    if (dist < player.radius + (e.isBoss ? e.radius : e.radius * 1.2 + 10) && !player.isDashing) {
      // 바로 깎지 않고 모아 두었다가 다음 계산 때 한 번에 (아래 '몸통 피해 합산' 참고)
      contactDmgSum += e.damage;
      contactDmgMax = Math.max(contactDmgMax, e.damage);
      // 독공 몸통 공격: 부패시귀·혈강시·독살수에 닿으면 맹독
      if (e.type === 'ghoul' || e.type === 'jiangshi' || e.type === 'poison_assassin') applyPlayerDebuff('poison', 3);
    }

    // 공격 동작 신호 (새 몬스터 그림의 공격 4장을 재생하는 시간)
    if (e.animAtk > 0) e.animAtk -= dt;
    if (!(e.animAtk > 0) && !prof) { // 휘두르기가 정해진 종류는 updateEnemySwing 이 동작을 정함
      if (dist < player.radius + e.radius + 30) { e.animAtk = e.animAtkMax = 0.5; }       // 붙어서 휘두름
      else if (e.isAttacking) { e.animAtk = e.animAtkMax = 0.5; }
    }
    if (e.shootTimer !== undefined) {
      const prev = (e._prevShoot === undefined) ? 9 : e._prevShoot;
      if (prev > 0.45 && e.shootTimer <= 0.45 && e.shootTimer > 0) { e.animAtk = e.animAtkMax = 0.6; } // 쏘기 직전부터
      e._prevShoot = e.shootTimer;
    }

    if (e.hitCooldown > 0) {
      e.hitCooldown -= dt;
    }

    // Boss special attack (혈교 8방향 혈기 탄환 방출 & 돌진)
    if (e.isBoss) {
      updateBossSkills(e, dt); // 구역마다 다른 기술 (12_bosses.js)
      e.attackTimer += dt;
      if (e.attackTimer >= (e.enraged ? 4.2 : 5.5) && !e.dash) {
        e.bossAtk = e.bossAtkMax = 0.6;
        e.attackTimer = 0;
        sound.playPalmBlast();
        for (let b = 0; b < 8; b++) {
          const ang = (b / 8) * Math.PI * 2 + Math.sin(state.gameTime * 2);
          projectiles.push({
            type: 'blood_bullet',
            isEnemy: true,
            x: e.x,
            y: e.y,
            vx: Math.cos(ang) * 270,
            vy: Math.sin(ang) * 270,
            life: 2.6,
            damage: bossDmg(20),
            color: bossStyle(e).color,
            radius: 8
          });
        }
      }
      const bossPct = Math.max(0, (e.hp / e.maxHp) * 100);
      const hpFill = document.getElementById('bossHpFill');
      if (hpFill) hpFill.style.width = bossPct + '%';
    }
  }

  // 5.5 Obstacle Soft Collisions (지형지물 입체 장애물 충돌)
  for (let obs of obstacles) {
    const ox = player.x - obs.x;
    const oy = player.y - obs.y;
    const oDist = Math.hypot(ox, oy);
    const minD = obs.radius + player.radius;
    if (oDist < minD && oDist > 0) {
      const push = minD - oDist;
      player.x += (ox / oDist) * push;
      player.y += (oy / oDist) * push;
    }
  }

  // 5.8 Update Diablo-Style Shrines (신단 / 기연 비석 상호작용)
  for (let s of shrines) {
    s.pulse = (s.pulse || 0) + dt * 3.5;
    if (!s.active) {
      // 40초 뒤 다시 기운이 차오름
      s.respawn = (s.respawn === undefined ? 40 : s.respawn) - dt;
      if (s.respawn <= 0) {
        s.active = true; s.respawn = undefined;
        createShockwave(s.x, s.y, 90, s.color);
        PixelFX.spawnPickupSparkle(s.x, s.y, 'chest');
      }
    }
    if (s.active && Math.hypot(player.x - s.x, player.y - s.y) < player.radius + 48) {
      s.active = false;
      s.respawn = 40;
      player.activeBuffs[s.type] = s.duration;
      sound.playShrine();
      createShockwave(s.x, s.y, 75, s.color);
      createShockwave(player.x, player.y, 160, s.color);
      setTimeout(() => createShockwave(player.x, player.y, 240, s.color), 120);
      state.screenShake = Math.max(state.screenShake || 0, 8);
      PixelFX.spawnPickupSparkle(s.x, s.y, 'chest');
      // 화면 가운데 큰 배너 대신, 머리 위 짧은 글씨 + 위쪽 버프 표시로만 알림
      damageTexts.push({
        x: player.x,
        y: player.y - 150,
        text: `${s.icon} ${s.desc.split('!')[0]}`,
        color: s.color,
        size: 16,
        life: 1.8,
        vy: -30
      });
      updateHudDebuffs();
    }
  }

  // 5.9 Update Dropped Items (장비 드롭 습득 & 룩변)
  for (let i = droppedItems.length - 1; i >= 0; i--) {
    const item = droppedItems[i];
    item.bobTimer = (item.bobTimer || 0) + dt * 4;
    const iDist = Math.hypot(player.x - item.x, player.y - item.y);

    // Magnet to player if within range
    if (iDist < player.magnetRadius) {
      const spd = 380 + (1 - iDist / player.magnetRadius) * 350;
      item.x += ((player.x - item.x) / iDist) * spd * dt;
      item.y += ((player.y - item.y) / iDist) * spd * dt;
    }

    if (iDist < player.radius + 25) {
      // Equip item!
      player.equipped[item.type] = item;
      applyEquipmentStats();
      triggerEquipToast(item);
      sound.playLevelUp();
      PixelFX.spawnPickupSparkle(item.x, item.y, 'chest');
      createShockwave(item.x, item.y, 50, item.color);
      droppedItems.splice(i, 1);
    }
  }

  // 5.95 Player Debuffs & Shrine Buffs Tick
  if (player.debuffs.poison > 0) {
    player.debuffs.poison -= dt;
    player.poisonTickTimer = (player.poisonTickTimer || 0.45) - dt;
    if (player.poisonTickTimer <= 0) {
      player.poisonTickTimer = 0.45;
      const pDmg = 8;
      player.hp = Math.max(1, player.hp - pDmg);
      createPoisonBubble(player.x, player.y);
      damageTexts.push({
        x: player.x + (Math.random() - 0.5) * 16,
        y: player.y - 30,
        text: `☣ -${pDmg}`,
        color: '#10b981',
        size: 15,
        life: 0.65,
        vy: -30
      });
      updateHud();
    }
    updateHudDebuffs();
  }
  if (player.debuffs.slow > 0) {
    player.debuffs.slow -= dt;
    updateHudDebuffs();
  }
  for (let k in player.activeBuffs) {
    player.activeBuffs[k] -= dt;
    if (player.activeBuffs[k] <= 0) {
      delete player.activeBuffs[k];
    }
    updateHudDebuffs();
  }

  // Speed Calculation taking Qinggong, Speed buffs, Shrine Wind God & Debuff Slow into account
  let baseSpd = player.baseSpeed * (1 + (player.skills.qinggong_dash || 0) * 0.15);
  if (player.speedBuffTimer > 0) baseSpd *= 1.35;
  if (player.activeBuffs.wind_god > 0) baseSpd *= 1.6;
  if (player.debuffs.slow > 0) baseSpd *= 0.55;
  player.speed = baseSpd;

  // Hit flash timer countdown
  if (player.hitFlashTimer > 0) {
    player.hitFlashTimer = Math.max(0, player.hitFlashTimer - dt);
  }

  // Screen shake decay
  if (state.screenShake > 0) {
    state.screenShake = Math.max(0, state.screenShake - dt * 25);
  }

  // 6. Update Exp Gems & Magnet (60FPS Gem Compression)
  if (expGems.length > 60) {
    for (let i = expGems.length - 1; i > 0; i -= 2) {
      const g1 = expGems[i];
      const g2 = expGems[i - 1];
      if (g1 && g2 && !g1.isHeal && !g2.isHeal) {
        g2.val = (g2.val || 2) + (g1.val || 2);
        g2.radius = Math.min(13, g2.radius + 1.2);
        g2.color = '#f59e0b';
        expGems.splice(i, 1);
        if (expGems.length <= 45) break;
      }
    }
  }

  if (state.vacuumTimer > 0) state.vacuumTimer -= dt;
  for (let i = expGems.length - 1; i >= 0; i--) {
    const gem = expGems[i];
    const dx = player.x - gem.x;
    const dy = player.y - gem.y;
    const dist = Math.hypot(dx, dy);

    const vacuum = state.vacuumTimer > 0; // 최종보스 처치: 맵의 모든 구슬 흡수
    if (dist <= player.magnetRadius || vacuum) {
      const spd = vacuum ? Math.max(900, dist * 2.2) : 420 + (1 - dist / player.magnetRadius) * 480;
      gem.x += (dx / dist) * spd * dt;
      gem.y += (dy / dist) * spd * dt;
    }

    if (dist < player.radius + 15) {
      if (gem.isHeal) {
        player.hp = Math.min(player.maxHp, player.hp + gem.val);
        sound.playPickup();
        damageTexts.push({
          x: player.x,
          y: player.y - 25,
          text: `+${gem.val} HP`,
          color: '#34d399',
          size: 15,
          life: 0.8,
          vy: -35
        });
        updateHud();
      } else {
        addExp(gem.val);
        if (player.skills.qi_magnet > 0) {
          player.hp = Math.min(player.maxHp, player.hp + 2);
          updateHud();
        }
      }
      expGems.splice(i, 1);
    }
  }

  // 6.2 Update Herbs (천년 영약)
  for (let i = herbs.length - 1; i >= 0; i--) {
    const h = herbs[i];
    h.pulse = (h.pulse || 0) + dt * 4;
    const dist = Math.hypot(player.x - h.x, player.y - h.y);
    if (dist <= player.radius + 24) {
      player.hp = Math.min(player.maxHp, player.hp + h.val);
      player.speedBuffTimer = 6.0;
      sound.playPickup();
      damageTexts.push({
        x: player.x,
        y: player.y - 35,
        text: `+${h.val} HP 🌿 ${h.type} 습득! (쾌속 보법 발동)`,
        color: '#34d399',
        size: 16,
        life: 1.4,
        vy: -35
      });
      createShockwave(h.x, h.y, 45, '#34d399');
      // pixelfx: 영약 치유 픽셀 스파클 솟구침
      PixelFX.spawnPickupSparkle(player.x, player.y, 'herb');
      updateHud();
      herbs.splice(i, 1);
    }
  }

  // 6.5 Update Speed Buff Timer (약초 쾌속 보법)
  // 이동속도는 위쪽 'Speed Calculation'에서 한 번에 계산함 (약초 1.35배·풍신선풍 1.6배·빙공 둔화 0.55배)
  // 예전에는 여기서 속도를 다시 덮어써서 풍신선풍과 둔화가 지워졌음 → 시간만 줄임
  if (player.speedBuffTimer > 0) {
    player.speedBuffTimer -= dt;
  }

  // 6.8 Update Chests (무림 비급 상자)
  for (let i = chests.length - 1; i >= 0; i--) {
    const c = chests[i];
    const dist = Math.hypot(player.x - c.x, player.y - c.y);
    if (dist <= player.radius + 28) {
      // pixelfx: 비급함 황금 보석 픽셀 폭죽
      PixelFX.spawnPickupSparkle(c.x, c.y, 'chest');
      chests.splice(i, 1);
      openTreasureModal(c.isBossChest);
      break;
    }
  }

  // 6.9 Update Victory Town Portal (디아블로2 승리 관문)
  if (state.victoryPortal && state.victoryPortal.active) {
    state.victoryPortal.rot = (state.victoryPortal.rot || 0) + dt * 1.8;
    state.victoryPortal.pulse = (state.victoryPortal.pulse || 0) + dt * 3.5;
    const pDist = Math.hypot(player.x - state.victoryPortal.x, player.y - state.victoryPortal.y);
    if (pDist <= player.radius + state.victoryPortal.radius) {
      state.victoryPortal.active = false;
      sound.playLevelUp();
      createShockwave(state.victoryPortal.x, state.victoryPortal.y, 120, '#fbbf24');
      damageTexts.push({
        x: player.x,
        y: player.y - 70,
        text: '🌀 차원 관문 돌파! 다음 스테이지로 진격! 🌀',
        color: '#fbbf24',
        size: 20,
        life: 2.5,
        vy: -30
      });
      setTimeout(() => {
        onSectorVictory();
      }, 400);
    }
  }

  // 6.95 Update Zone Transition Timer (화면 전환 페이드)
  if (state.zoneTransitionTimer > 0) {
    state.zoneTransitionTimer = Math.max(0, state.zoneTransitionTimer - dt);
  }

  // 6.96 Update Ground Decals (지면 균열 및 잔존 마법진)
  for (let i = groundDecals.length - 1; i >= 0; i--) {
    const gd = groundDecals[i];
    gd.life -= dt;
    if (gd.life <= 0) {
      groundDecals.splice(i, 1);
    }
  }

  // 7. Update Particles (with PixelFX Physics) - 60FPS Hard Cap
  if (particles.length > 200) { // 매화 꽃잎·매화검우 몫까지 늘림 (예전 130 → 160 → 200)
    particles.splice(0, particles.length - 200);
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    if (p.petal) { // 매화 꽃잎: 점점 느려지며 살랑살랑 내려앉음
      p.vx *= 1 - 2.2 * dt; p.vy = p.vy * (1 - 2.2 * dt) + 38 * dt;
      p.x += Math.sin(p.life * 6 + p.rot) * 12 * dt;
      p.rot += p.spin * dt;
    }
    if (p.gravity) p.vy += p.gravity * dt;
    p.x += (p.vx || 0) * dt;
    p.y += (p.vy || 0) * dt;
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }

  // 8. Update Damage Texts - 60FPS Hard Cap
  if (damageTexts.length > 32) {
    damageTexts.splice(0, damageTexts.length - 32);
  }
  for (let i = damageTexts.length - 1; i >= 0; i--) {
    const d = damageTexts[i];
    d.y += d.vy * dt;
    d.life -= dt;
    if (d.life <= 0) {
      damageTexts.splice(i, 1);
    }
  }

  // 8.5 Update Click Markers
  for (let i = clickMarkers.length - 1; i >= 0; i--) {
    clickMarkers[i].life -= dt;
    if (clickMarkers[i].life <= 0) {
      clickMarkers.splice(i, 1);
    }
  }

  // 9. Update Environment Petals
  environmentPetals.forEach(p => {
    p.x += p.speedX * dt;
    p.y += p.speedY * dt;
    p.rot += p.rotSpeed * dt;
    if (p.x > player.x + 1200) p.x -= 2400;
    if (p.y > player.y + 1200) p.y -= 2400;
  });

  updateEnemySpawning(dt);
}

// 최종보스가 발을 디딜 때: 흙먼지 + 바닥 울림 + 가까우면 화면 흔들림
function bossFootstep(e) {
  e.stepSide = -(e.stepSide || 1); // 왼발/오른발 번갈아
  const footX = e.x + e.stepSide * 22;
  const footY = e.y + 4;
  for (let k = 0; k < 10; k++) {
    const a = Math.PI + Math.random() * Math.PI; // 위쪽 반원으로 퍼짐
    const sp = 40 + Math.random() * 70;
    particles.push({
      x: footX + (Math.random() - 0.5) * 30,
      y: footY,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp * 0.35,
      color: Math.random() < 0.5 ? 'rgba(120, 104, 86, 0.75)' : 'rgba(80, 70, 60, 0.7)',
      radius: 3 + Math.random() * 4,
      life: 0.55,
      maxLife: 0.55
    });
  }
  createShockwave(footX, footY, 46, '#57534e');
  sound.playSample('wx_step', 0.5 * Math.max(0.3, 1 - Math.hypot(player.x - e.x, player.y - e.y) / 900), 1, 0.05, 0.3);
  const d = Math.hypot(player.x - e.x, player.y - e.y);
  if (d < 700) state.screenShake = Math.max(state.screenShake || 0, 6 * (1 - d / 700) + 1.5);
}

function playerTakeDamage(amount) {
  if (state.isGodMode || (player.activeBuffs && player.activeBuffs.invincible > 0)) return;

  const reduction = player.dmgReduction || 0;
  let actualDmg = amount * (1 - reduction) * difficultyCfg().dmg;
  if (player.isAttacking) actualDmg *= 0.7; // 베는 동안 호신강기: 피해 30% 감소
  actualDmg = Math.max(1, actualDmg);

  player.hp -= actualDmg;
  // 맞는 순간 아주 잠깐 멈칫 (0.35초에 한 번까지) — 맞는 느낌
  if (!player._hurtFxAt || state.gameTime - player._hurtFxAt > 0.35 || player._hurtFxAt > state.gameTime) {
    player._hurtFxAt = state.gameTime;
    state.hitStop = Math.max(state.hitStop || 0, 0.05);
  }
  player.hitFlashTimer = 0.35; // 피격 플래시 & 경직 모션
  state.screenShake = Math.min(16, (state.screenShake || 0) + 7); // 강렬한 화면 피격 진동

  sound.playHit();
  updateHud();

  // 강렬한 방사형 혈흔 비네트 플래시
  const overlay = document.getElementById('damageOverlay');
  if (overlay) {
    overlay.style.opacity = '0.9';
    setTimeout(() => { if (overlay) overlay.style.opacity = '0'; }, 180);
  }

  // 플레이어 머리 위 선명한 붉은색 피격 수치
  damageTexts.push({
    x: player.x + (Math.random() - 0.5) * 16,
    y: player.y - 45,
    text: `-${Math.round(actualDmg)}`,
    color: '#ef4444',
    size: 21,
    life: 0.85,
    vy: -40
  });

  if (player.hp <= 0) {
    onGameOver();
  }
}

function onGameOver() {
  state.isGameOver = true;
  document.getElementById('goTier').innerText = getTier(player.level);
  document.getElementById('goKills').innerText = `${state.kills}명`;
  document.getElementById('goTime').innerText = formatTime(state.gameTime);
  document.getElementById('goLevel').innerText = player.level;
  awardSilver(false, 'goSilver'); // 쓰러져도 은자는 남음 (js/14_progress.js)
  document.getElementById('gameOverModal').style.display = 'flex';
}

function updateTimerDisplay() {
  document.getElementById('timeText').innerText = formatTime(state.gameTime);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ==========================================================================
// PIXELFX VISUAL ENGINE (Integrated from patch-gg/pixelfx)
// 244종의 코드 기반 픽셀 아트 VFX 핵심 모듈 이식
// ==========================================================================
