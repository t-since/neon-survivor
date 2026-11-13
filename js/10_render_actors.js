// 화면 그리기: 주인공, 적, 투사체, 입자
function renderPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  // 1. Realistic Soft Martial Shadow beneath feet
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 28, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Diablo-style Shrine Buff Auras (태을혈기, 풍신선풍, 금강불괴, 만천비검)
  if (player.activeBuffs) {
    const pulse = 1 + Math.sin(state.gameTime * 5) * 0.08;
    if (player.activeBuffs.invincible > 0 && SPRITES.fx_shield && SPRITES.fx_shield.width) {
      // 금강불괴: 금빛 보호막 (그림, 숨쉬듯 커졌다 작아짐)
      ctx.save();
      ctx.shadowBlur = 0;
      drawFxImage('fx_shield', 0, -62, 170 * pulse, 0.6 + Math.sin(state.gameTime * 4) * 0.1);
      ctx.restore();
    } else if (player.activeBuffs.invincible > 0) {
      // 황금 종형 금강불괴 무적 결계
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.ellipse(0, -56, 44 * pulse, 64 * pulse, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (player.activeBuffs.blood_fury > 0) {
      // 붉은 화염 회전 혈기 링
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.ellipse(0, 2, 34 * pulse, 14 * pulse, state.gameTime * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (player.activeBuffs.wind_god > 0) {
      // 청록빛 선풍 회오리
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#059669';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.ellipse(0, -30, 36 * pulse, 18 * pulse, -state.gameTime * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 3. Vajra Shield - Golden Body Halo (기존 호신강기)
  if (player.skills.vajra_shield > 0 && !(player.activeBuffs && player.activeBuffs.invincible > 0) && SPRITES.fx_shield && SPRITES.fx_shield.width) {
    // 금강불괴 보호막: 평소엔 옅은 금빛 결계, 충격파 순간(_vajraFlash) 크게 번쩍
    const lvl = player.skills.vajra_shield;
    const fl = Math.max(0, player._vajraFlash || 0) / 0.35; // 1 → 0
    const breathe = 1 + Math.sin(state.gameTime * 3) * 0.04;
    ctx.save();
    ctx.shadowBlur = 0;
    drawFxImage('fx_shield', 0, -62, (128 + lvl * 6) * breathe * (1 + fl * 0.22), 0.1 + lvl * 0.035 + fl * 0.55);
    ctx.restore();
  } else if (player.skills.vajra_shield > 0) {
    const lvl = player.skills.vajra_shield;
    const baseAlpha = 0.12 + (lvl / 5) * 0.42;
    const pulse = 1 + Math.sin(state.gameTime * 3) * 0.06;

    const auraGrad = ctx.createRadialGradient(0, -56, 10, 0, -56, 52 * pulse);
    auraGrad.addColorStop(0, `rgba(251, 191, 36, ${baseAlpha})`);
    auraGrad.addColorStop(0.6, `rgba(245, 158, 11, ${baseAlpha * 0.45})`);
    auraGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.ellipse(0, -56, 38 * pulse, 58 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 보조 무공 표시
  // 금강불괴: 발밑 금빛 고리 (레벨이 높을수록 진하게)
  const vlv = player.skills.vajra_shield || 0;
  if (vlv > 0) {
    ctx.save();
    ctx.globalAlpha = 0.12 + vlv * 0.08;
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 4, 40, 15, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.rotate(state.gameTime * 0.8);
    ctx.globalAlpha = 0.08 + vlv * 0.05; ctx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * 30, Math.sin(a) * 11 + 4, 3, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }
  // 흡성대법: 구슬 끌어오는 범위 (은은한 원)
  const mlv = player.skills.qi_magnet || 0;
  if (mlv > 0) {
    ctx.save();
    ctx.globalAlpha = 0.06 + mlv * 0.025;
    ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 0, player.magnetRadius, player.magnetRadius * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    if (Math.random() < 0.05 * mlv * (state.frameK || 0)) {
      const a = Math.random() * Math.PI * 2, r = player.magnetRadius;
      particles.push({ x: player.x + Math.cos(a) * r, y: player.y + Math.sin(a) * r * 0.6, vx: -Math.cos(a) * r * 1.6, vy: -Math.sin(a) * r * 0.96, color: '#bae6fd', radius: 2, life: 0.6, maxLife: 0.6 });
    }
  }
  // 답설무흔: 걸을 때 발밑 바람 자국
  const qlv = player.skills.qinggong_dash || 0;
  if (qlv > 0 && player.isMoving && Math.random() < 0.12 * qlv * (state.frameK || 0)) {
    particles.push({ x: player.x + (Math.random() - 0.5) * 30, y: player.y + 2, vx: -player.facing * (40 + Math.random() * 40), vy: -10 - Math.random() * 15, color: 'rgba(226, 232, 240, 0.7)', radius: 3 + Math.random() * 3, life: 0.45, maxLife: 0.45 });
  }

  // 4. Hit Flinch & Knockback Recoil Displacement
  if (player.hitFlashTimer > 0) {
    const recoil = Math.sin(player.hitFlashTimer * 38) * 4.5;
    ctx.translate(-recoil * player.facing, 0);
  }

  // 5. 움직임: 제미나이로 한 장 안에 그린 4동작 시트에서 자른 프레임 사용 (assets/hero/seojin_*.png)
  //    프레임 크기 440x340, 발 기준점 (220, 320), 인물 키 약 300px
  const t = state.gameTime;
  const HP = (player.heroId === 'hyunwoon' && SPRITES['hyunwoon_walk_0']) ? 'hyunwoon' : ((typeof heroSheetPrefix === 'function' && heroSheetPrefix()) || 'seojin'); // 영웅별 그림 (현운: 권사, 서진 새 옷: 흑룡포)
  let frameKey = HP + '_walk_1'; // 서 있기 = 다리를 모은 걷기 2번
  let lean = 0, sy = 1, forward = 0, glow = null;
  // 시전 그림 번호: 서진(장풍·비침·검·폭탄) / 현운(기 모으기·쌍장·진각·올려치기)
  const CAST_FRAME = HP === 'hyunwoon' ? { palm: 1, rain: 0, sword: 3, bomb: 0, jingak: 2 } : { palm: 0, rain: 1, sword: 2, bomb: 3 };
  if (player.isAttacking && player.skillPose && CAST_FRAME[player.skillPose] !== undefined && SPRITES[HP + '_cast_0']) {
    // 무공 시전: 무공마다 다른 자세 (칼 베기와 구분)
    const prog = Math.min(1, Math.max(0, 1 - (player.attackTimer / (player.attackDuration || 0.35))));
    frameKey = HP + '_cast_' + CAST_FRAME[player.skillPose];
    forward = Math.sin(Math.min(1, prog * 2) * Math.PI / 2) * 5; // 내지르며 살짝 앞으로
    glow = player.skillPose === 'sword' ? '#38bdf8' : (player.skillPose === 'palm' ? '#67e8f9' : null);
  } else if (player.isAttacking) {
    const prog = Math.min(1, Math.max(0, 1 - (player.attackTimer / (player.attackDuration || 0.32))));
    // 들어 올리기 → 내리치기 → 찌르기 → 회복
    const idx = prog < 0.22 ? 0 : prog < 0.45 ? 1 : prog < 0.75 ? 2 : 3;
    frameKey = HP + '_attack_' + idx;
    forward = idx === 2 ? 6 : 0;
    if ((player.attackCombo || 0) === 2 && idx >= 1 && idx <= 2) glow = '#fde047'; // 3타 큰 베기는 금빛
  } else if (player.isMoving) {
    const running = player.speed > (player.baseSpeed || 195) * 1.3; // 답설무흔·풍신선풍으로 빨라지면 달리기
    const f = Math.floor(player.walkTimer * (running ? 0.62 : 0.55)) % 4; // 걸음 박자 (빨리 달리면 빨라짐)
    frameKey = HP + '_walk_' + f;
    lean = running ? 0.14 : 0.04;                      // 달릴 때는 몸을 앞으로 크게 숙임
    if (running) {
      forward = 3;
      sy = 1 - Math.abs(Math.sin(player.walkTimer * 0.62 * Math.PI / 2)) * 0.04; // 뛰는 반동
      if (f % 2 === 0 && Math.random() < 0.5 * (state.frameK || 0)) { // 발 디딜 때 흙먼지
        particles.push({ x: player.x - player.facing * 18, y: player.y + 2, vx: -player.facing * (60 + Math.random() * 50), vy: -20 - Math.random() * 25, color: 'rgba(168, 148, 120, 0.55)', radius: 4 + Math.random() * 4, life: 0.4, maxLife: 0.4 });
      }
      player._runGhostT = (player._runGhostT || 0) + 1;
    }
  } else {
    sy = 1 + Math.sin(t * 2.2) * 0.012;                // 숨쉬기
  }
  const sprite = SPRITES[frameKey] || SPRITES.hero_0;
  const FRAME_K = 0.44;                                // 그림 1px = 월드 0.44 (인물 키 약 132)

  ctx.scale(player.facing, 1);   // 여기부터 +x 가 '앞쪽'
  ctx.translate(forward, 0);
  ctx.rotate(lean);              // 발을 축으로 기울기
  ctx.scale(1, sy);

  // 6. Visual Look Change Auras (장비 착용 룩변)
  if (player.equipped && player.equipped.robe) {
    const robe = player.equipped.robe;
    ctx.shadowColor = robe.color;
    ctx.shadowBlur = 14;
  } else if (player.skills.vajra_shield > 0) {
    const lvl = player.skills.vajra_shield;
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 4 + lvl * 2;
  }

  // 7. Hit Red/White Flashing Filter on taking damage & Debuff Auras
  let heroTint = null; // 색 바꾸기 (미리 만든 그림 사용 — 성능)
  if (player.hitFlashTimer > 0.2) {
    heroTint = 'brightness(1.45) sepia(0.7) hue-rotate(-50deg) saturate(2.4)'; // 피격: 살짝 붉게 (예전보다 약하게·짧게)
  } else if (player.debuffs && player.debuffs.poison > 0) {
    heroTint = 'sepia(0.6) hue-rotate(65deg) saturate(2.6)'; // 맹독: 초록
    if (Math.random() < 0.15 * (state.frameK || 0)) particles.push({ x: player.x + (Math.random() - 0.5) * 40, y: player.y - 40 - Math.random() * 70, vx: 0, vy: -40, color: '#4ade80', radius: 3 + Math.random() * 2, life: 0.6, maxLife: 0.6 });
  } else if (player.debuffs && player.debuffs.slow > 0) {
    heroTint = 'grayscale(0.4) sepia(1) hue-rotate(165deg) saturate(2.6) brightness(1.12)'; // 둔화: 파랑
    if (Math.random() < 0.12 * (state.frameK || 0)) particles.push({ x: player.x + (Math.random() - 0.5) * 50, y: player.y - 20 - Math.random() * 100, vx: 0, vy: 25, color: '#e0f2fe', radius: 2 + Math.random() * 2, life: 0.7, maxLife: 0.7 });
  }

  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 18; }
  const isCanvas = (typeof HTMLCanvasElement !== 'undefined' && sprite instanceof HTMLCanvasElement);
  if (sprite && (isCanvas || sprite.complete || (sprite.width > 0))) {
    if (sprite === SPRITES[frameKey]) {
      ctx.drawImage(tinted(HP === 'seojin' && typeof heroSkinImg === 'function' ? heroSkinImg(sprite) : sprite, heroTint), -220 * FRAME_K, -320 * FRAME_K + 4, 440 * FRAME_K, 340 * FRAME_K); // heroSkinImg: 외형 옷 색 (20_looks.js)
    } else {
      ctx.drawImage(sprite, -44, -130, 88, 144); // 새 프레임을 못 불러왔을 때 예전 그림
    }
  } else {
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(-15, -60, 30, 60);
  }
  ctx.filter = 'none';
  ctx.shadowBlur = 0;

  ctx.restore();
}

// 몬스터 종류별 새 그림 (key: assets/mobs 이름, h: 게임 속 키(월드 단위), filter: 색 바꾸기)
const ENEMY_ART = {
  assassin: { key: 'mob_assassin', h: 140 },
  poison_assassin: { key: 'mob_assassin', h: 140, filter: 'hue-rotate(110deg) saturate(1.6)' },
  archer: { key: 'mob_archer', h: 145 },          // 죽림 암살궁수 (예전: 해골 궁수 그림)
  spearman: { key: 'mob_dartman', h: 140 },       // 청죽 암기살수 (표창)
  jiangshi: { key: 'mob_jiangshi', h: 150, hop: true }, // 혈강시: 걷기 대신 뛰기 4동작
  skeleton: { key: 'mob_skeleton', h: 145 },      // 백골병
  barbarian: { key: 'mob_barbarian', h: 150 },    // 쌍도객
  butcher: { key: 'mob_butcher', h: 175 },        // 도살마인 (덩치 큼)
  ghoul: { key: 'mob_ghoul', h: 125 },            // 부패시귀 (웅크림)
  necromancer: { key: 'mob_necromancer', h: 150 }, // 사령술사
  sorceress: { key: 'mob_sorceress', h: 150 },     // 혈선녀
  curse_mage: { key: 'mob_curse_mage', h: 150 }    // 저주술사
};
// 몹 목록(05 getThemeEnemyPool)에 art 를 적은 몹: 움직임은 type 그대로, 그림만 이것 (2026-11-12 빙궁 몹·괴수형)
const SKIN_ART = {
  mob_ice_sword: { key: 'mob_ice_sword', h: 145 },
  mob_ice_jiangshi: { key: 'mob_ice_jiangshi', h: 150, hop: true },
  mob_ice_mage: { key: 'mob_ice_mage', h: 150 },
  mob_yeti: { key: 'mob_yeti', h: 262 }, // 몽둥이를 들어도 안 잘리게 작게 잘라서(210px) 키를 크게
  mob_white_tiger: { key: 'mob_white_tiger', h: 150 }, // 옆으로 긴 그림이라 작게 잘라서(180px) 키를 크게
  mob_ice_spider: { key: 'mob_ice_spider', h: 170 },
  mob_poison_spider: { key: 'mob_poison_spider', h: 170 },
  mob_blood_wolf: { key: 'mob_blood_wolf', h: 165 },  // 5구역 혈랑 (2026-11-13)
  mob_blood_bat: { key: 'mob_blood_bat', h: 225, fly: true, filter: 'brightness(1.45) saturate(1.3)' }, // 5구역 흡혈 박쥐 (떠서 남, 붉은 바닥에서 보이게 밝게)
  mob_black_wolf: { key: 'mob_black_wolf', h: 150 } // 백호 걷기·늑대 공격·거미 2종은 ChatGPT 그림 (11-12)
};
function enemyArt(e) {
  if (e.art) {
    const a = SKIN_ART[e.art];
    if (a && SPRITES[a.key + '_walk_0']) return a;
  }
  return ENEMY_ART[e.type];
}
function enemyHasArt(e) {
  const art = enemyArt(e);
  return !!(art && !e.isBoss && !e.isMiniBoss && SPRITES[art.key + '_walk_0']);
}
// 새 그림 몬스터 그리기: 공격 중이면 공격 4장, 걸으면 걷기 4장, 서 있으면 걷기 2번(다리 모음)
// 프레임 크기 440x340, 발 기준점 (220,320), 인물 키 300px
function drawEnemyArt(e, art, facing, isMoving, runTimer) {
  ctx.scale(facing, 1);
  let key, tremble = 0;
  const heavyProf = (typeof ENEMY_MELEE !== 'undefined' && ENEMY_MELEE[e.type] && ENEMY_MELEE[e.type].heavy) ? ENEMY_MELEE[e.type] : null;
  if (heavyProf && e.swingT > 0 && SPRITES[art.key + '_attack_1']) {
    // 묵직한 공격: 잠깐 준비(0번) → 칼을 높이 든 장면(1번)에서 멈춰 힘을 모음 → 내려칠 때 2·3번
    const k = 1 - e.swingT / heavyProf.windup;
    key = art.key + '_attack_' + (k < 0.18 ? 0 : 1);
    if (k > 0.55) tremble = (Math.random() - 0.5) * 3 * k; // 힘 모으며 부르르
  } else if (heavyProf && e.animAtk > 0 && SPRITES[art.key + '_attack_2']) {
    key = art.key + '_attack_' + (e.animAtk > 0.15 ? 2 : 3); // 내려친 장면 0.2초 → 거두기
  } else if (e.animAtk > 0 && SPRITES[art.key + '_attack_0']) {
    const prog = 1 - e.animAtk / (e.animAtkMax || 0.5);
    key = art.key + '_attack_' + Math.max(0, Math.min(3, Math.floor(prog * 4)));
  } else if (art.hop) {
    const ph = (((e.hopTimer || 0) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2);
    const f = ph < 0.12 ? 1 : ph < 0.38 ? 2 : ph < 0.5 ? 3 : 0;
    key = art.key + '_walk_' + f;
  } else if (isMoving) {
    key = art.key + '_walk_' + (Math.floor(runTimer * 0.9 + (e.seed || 0)) % 4);
  } else {
    key = art.key + '_walk_1';
  }
  const img = SPRITES[key] || SPRITES[art.key + '_walk_0'];
  const k = art.h / 300;
  const hop = e.type === 'jiangshi' ? -(e.hopHeight || 0) : (art.fly ? -42 + Math.sin(((e.seed || 0) + (state.gameTime || 0)) * 5) * 5 : 0); // 박쥐: 바닥에서 떠서 출렁
  const look = (e.hitCooldown > 0.06) ? 'brightness(2.4) saturate(0.3)' : (e.elite ? ((art.filter ? art.filter + ' ' : '') + 'sepia(0.35) saturate(1.8) hue-rotate(-25deg) brightness(0.95)') : art.filter); // 맞은 순간 하얗게 / 정예 붉게 / 종류별 색
  if (e.squashT > 0) { const s = Math.sin(Math.min(1, e.squashT / 0.2) * Math.PI); ctx.scale(1 + 0.22 * s, 1 - 0.18 * s); } // 타격감 1) 찌그러짐
  ctx.drawImage(tinted(img, look), -220 * k + tremble, -320 * k + 4 + hop, 440 * k, 340 * k);
}

// 적이 많을 때(25마리 넘게)는 그림자 번짐(shadowBlur)을 끔 — 큰 PC 화면에서 매우 느려서 렉의 원인
function renderEnemies() {
  const many = enemies.length > 25;
  if (many) Object.defineProperty(ctx, 'shadowBlur', { set() {}, get() { return 0; }, configurable: true });
  try { renderEnemiesInner(); } finally { if (many) delete ctx.shadowBlur; ctx.shadowBlur = 0; }
}
function renderEnemiesInner() {
  const camX = state.camera.x;
  const camY = state.camera.y;
  const cullW = gameWidth / 2 + 130;
  const cullH = gameHeight / 2 + 130;

  enemies.forEach(e => {
    if (!e.isBoss && !e.isMiniBoss) {
      if (Math.abs(e.x - camX) > cullW || Math.abs(e.y - camY) > cullH) return;
    }
    ctx.save();
    ctx.translate(e.x, e.y);

    // 0. Mini-boss Skill Telegraph Indicator (장판 및 돌진 궤적 예고선)
    if (e.telegraph) {
      // 적 기술 예고 (모두 같은 모양): 바닥에 은은한 색 영역 + 안쪽이 차오름 + 가는 빛 테두리, 점선 없음
      const t = e.telegraph;
      const progress = Math.min(1, Math.max(0, 1 - (t.timer / t.maxTimer)));
      const COLOR = {
        dash_slash: [239, 68, 68], needle_burst: [168, 85, 247], blood_quake: [249, 115, 22],
        necromancer_blast: [52, 211, 153], curse_blast: [192, 132, 252], necromancer_summon: [52, 211, 153]
      }[t.type] || [239, 68, 68];
      const NAME = {
        dash_slash: '흑풍삼단참', needle_burst: '천라지망', blood_quake: '지열혈파',
        necromancer_blast: '원혼탄', curse_blast: '흑마 주박술', necromancer_summon: '만골 소환술'
      }[t.type];
      const rgba = a => `rgba(${COLOR[0]}, ${COLOR[1]}, ${COLOR[2]}, ${a})`;
      const zone = (drawPath) => {
        ctx.save();
        drawPath(1);                       // 전체 영역
        ctx.fillStyle = rgba(0.10 + progress * 0.08);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = rgba(0.55 + progress * 0.35);
        ctx.shadowColor = rgba(0.9);
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
        drawPath(Math.max(0.05, progress)); // 차오르는 안쪽
        ctx.fillStyle = rgba(0.18 + progress * 0.22);
        ctx.fill();
        ctx.restore();
      };
      ctx.save();
      if (t.type === 'dash_slash') {
        const dx = t.targetX - e.x, dy = t.targetY - e.y;
        const ang = Math.atan2(dy, dx), dist = Math.hypot(dx, dy);
        ctx.rotate(ang);
        zone(k => { ctx.beginPath(); ctx.roundRect(0, -24, Math.max(10, dist * k), 48, 24); });
      } else if (t.type === 'blood_quake') {
        const r = (t.radius || 95) * 1.25;
        ctx.translate(t.targetX - e.x, t.targetY - e.y);
        zone(k => { ctx.beginPath(); ctx.ellipse(0, 0, r * k, r * 0.6 * k, 0, 0, Math.PI * 2); });
      } else if (t.type === 'necromancer_blast' || t.type === 'curse_blast') {
        if (t.targetX !== undefined) {
          const dx = t.targetX - e.x, dy = t.targetY - e.y;
          const ang = Math.atan2(dy, dx), dist = Math.min(520, Math.hypot(dx, dy));
          ctx.rotate(ang);
          zone(k => { ctx.beginPath(); ctx.roundRect(0, -16, Math.max(10, dist * k), 32, 16); });
        }
      } else if (t.type === 'necromancer_summon') {
        (t.summonPoints || []).forEach(sp => {
          ctx.save();
          ctx.translate(sp.x - e.x, sp.y - e.y);
          zone(k => { ctx.beginPath(); ctx.ellipse(0, 0, 70 * k, 42 * k, 0, 0, Math.PI * 2); });
          ctx.restore();
        });
      } else {
        const r = t.radius || 180;
        zone(k => { ctx.beginPath(); ctx.ellipse(0, 0, r * k, r * 0.6 * k, 0, 0, Math.PI * 2); });
      }
      ctx.restore();
      if (NAME) {
        // 기술 이름: 머리 위 작은 한 줄
        ctx.save();
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.strokeText(NAME, 0, -(e.isMiniBoss ? 200 : 160));
        ctx.fillStyle = rgba(1);
        ctx.fillText(NAME, 0, -(e.isMiniBoss ? 200 : 160));
        ctx.restore();
      }
    }

    // Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 4, e.radius * 1.15, e.radius * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();

    // 1프레임 깜빡임 없는 안정적인 방향 전환
    const facing = e.facing || (e.x > player.x ? -1 : 1);

    // 지면에 발을 딛고 자연스럽게 전진하는 보행 모션 (퉁퉁 튀어오르는 고무공 바운스 완전 제거)
    const runTimer = e.runTimer || 0;
    const speedMag = Math.hypot(e.vx || 0, e.vy || 0);
    const isMoving = speedMag > 20;
    // 퉁퉁거리는 Math.abs 바운스를 없애고, 잔잔한 지면 보행 진동(1.2px)과 어깨 흔들림(0.025 rad)으로 변경
    if (e.hitCooldown > 0) {
      const flinch = Math.sin(e.hitCooldown * 35) * 4.5;
      ctx.translate(-facing * flinch, 0);
    }

    if (e.elite) {
      // 정예: 발밑 붉은 기운 + 1.2배
      ctx.save();
      ctx.globalAlpha = 0.45 + Math.sin(state.gameTime * 5 + (e.seed || 0)) * 0.15;
      ctx.fillStyle = '#dc2626';
      ctx.beginPath(); ctx.ellipse(0, 4, e.radius * 1.5, e.radius * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.scale(1.2, 1.2);
    }
    // 일반 몬스터 공통 걸음 연출 (종류별 성격): 걸음마다 살짝 튀고, 가는 방향으로 숙이고, 좌우로 흔들림
    // (보스·중간보스는 각자 연출, 강시는 콩콩 뛰기가 따로 있음)
    if (!e.isBoss && !e.isMiniBoss && e.type !== 'jiangshi') {
      if (e.seed === undefined) e.seed = Math.random() * Math.PI * 2; // 모두 같은 박자로 움직이지 않게
      const MOTION = {
        assassin: [0.13, 0.03, 3.5], poison_assassin: [0.13, 0.03, 3.5], spearman: [0.08, 0.03, 3],
        skeleton: [0.05, 0.07, 3], archer: [0.04, 0.05, 2.5], ghoul: [0.11, 0.05, 4],
        butcher: [0.04, 0.05, 2], barbarian: [0.06, 0.06, 2.5], necromancer: [0.02, 0.02, 1.5], sorceress: [0.02, 0.02, 1.5]
      };
      const [leanAmt, wobble, hop] = MOTION[e.type] || [0.07, 0.03, 3];
      if (isMoving && enemyHasArt(e)) {
        ctx.rotate(facing * leanAmt * 0.3);
      } else if (isMoving) {
        const ph = runTimer * 1.35 + e.seed;
        ctx.translate(0, -Math.abs(Math.sin(ph)) * hop);
        ctx.rotate(facing * leanAmt + Math.sin(ph) * wobble);
      } else {
        ctx.scale(1, 1 + Math.sin(state.gameTime * 2.4 + e.seed) * 0.015); // 숨쉬기
      }
    }

    if (e.isBoss) {
      // --- Final Sector Boss (구역 군주) ---
      // 인위적인 선형식 회전선 제거 -> 바닥에 스며드는 묵직한 혈마 진기 안개
      // 쿵쿵 걸음 연출 (걸음 박자는 07_update.js 의 e.gaitPhase: 0=발 디딤 → 1=다음 발 디딤)
      const ph = e.gaitPhase || 0;
      const walking = isMoving;
      const lift = walking ? Math.sin(Math.PI * ph) * 8 : 0;            // 걸음 중간에 몸이 살짝 올라감
      const land = walking ? Math.max(0, 1 - ph / 0.2) : 0;              // 디딘 직후 눌림
      const rock = walking ? Math.sin(Math.PI * ph) * 0.05 * (e.stepSide || 1) : 0; // 좌우로 기우뚱
      const breathe = walking ? 0 : Math.sin(state.gameTime * 1.8) * 0.012;

      // 발밑 그림자 + 혈기 안개 (몸이 올라가면 그림자가 작아짐)
      ctx.save();
      const shadowK = 1 - lift / 40;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 80 * shadowK, 26 * shadowK, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = bossStyle(e).color;
      ctx.beginPath();
      ctx.ellipse(0, 4, 104, 40, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.translate(0, -lift);
      ctx.rotate(rock);
      ctx.scale(facing * (1 + land * 0.04), 1 - land * 0.05 + breathe); // 발 기준으로 눌렸다 펴짐
      // 60FPS Hit Flash: Handled via lightweight GPU blend

      const bh = drawBossBody(e, walking); // 구역마다 다른 보스 그림 (12_bosses.js)

      // Overhead Boss Title & HP Bar (Unflip facing for clear text)
      ctx.scale(facing, 1);
      ctx.filter = 'none';

      // (머리 위 이름표는 뺌 — 화면 위쪽 보스 체력바에 이름이 이미 나옴)
      // HP Bar
      const hpPct = Math.max(0, e.hp / e.maxHp);
      const barW = 140;
      const barH = 9;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(-barW / 2, -bh + 8, barW, barH);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-barW / 2 + 1, -bh + 9, (barW - 2) * hpPct, barH - 2);
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1;
      ctx.strokeRect(-barW / 2, -bh + 8, barW, barH);

    } else if (e.isMiniBoss) {
      // --- Intermediate Mini-Boss (흑철 참마도장 전용 렌더링 - 1.3배 거대화 & 묵직한 중장 전진 & 자연스러운 지면 기운) ---
      ctx.save();
      const pulse = 1.0 + Math.sin(state.gameTime * 4) * 0.06;
      ctx.fillStyle = 'rgba(217, 119, 6, 0.26)';
      ctx.shadowColor = '#d97706';
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.ellipse(0, 6, 73 * pulse, 34 * pulse, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 둥둥 뜨는 인공 바운스 완전 제거: 지면 접지 기반 묵직한 중장 보행 진동
      const heavyBounce = isMoving ? Math.sin(runTimer * 2.5) * 2.2 : 0;
      ctx.translate(0, heavyBounce);
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend

      // 2. 흑철 참마도장 전용 4단 전진/질주 스프라이트 애니메이션! (1.3배: 192x312 px - 거대한 위압감)
      const mbFrame = isMoving ? (Math.floor(runTimer * 1.25) % 4) : 0;
      const mbImg = SPRITES['miniboss_run_' + mbFrame] || SPRITES.miniboss_run_0 || SPRITES[e.customSprite] || SPRITES.assassin;
      const look = miniBossLook(e); // 관문마다 다른 모습·구역 색 (12_bosses.js)
      const mw = 192;
      const mh = look.art ? look.h : 312;
      const mbTint = e.hitCooldown > 0.06 ? 'brightness(2.0) saturate(0.4)' : look.filter;

      if (look.art && SPRITES[look.art + '_walk_0']) {
        ctx.scale(facing, 1); // drawEnemyArt 가 다시 뒤집으므로 되돌림
        drawEnemyArt(e, { key: look.art, h: look.h, filter: mbTint, hop: false }, facing, isMoving, runTimer);
      } else if (mbImg && mbImg.complete) {
        ctx.drawImage(tinted(mbImg, mbTint), -mw / 2, -mh + 22, mw, mh);
      } else {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, -80, 68, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. 머리 위 황금 칭호 뱃지 & 상시 체력바 (Unflip facing)
      ctx.scale(facing, 1);
      ctx.filter = 'none';

      // Title badge (1.3배 거대 보스의 뿔투구 위에 안정적으로 위치)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = '#d97706';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(-95, -mh - 22, 190, 24, 6);
      } else {
        ctx.rect(-95, -mh - 22, 190, 24);
      }
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`👹 [중간보스] ${e.name}`, 0, -mh - 10);

      // HP Bar
      const hpPct = Math.max(0, e.hp / e.maxHp);
      const barW = 140;
      const barH = 8;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(-barW / 2, -mh + 8, barW, barH);
      ctx.fillStyle = hpPct > 0.35 ? '#ef4444' : '#dc2626';
      ctx.fillRect(-barW / 2 + 1, -mh + 9, (barW - 2) * hpPct, barH - 2);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-barW / 2, -mh + 8, barW, barH);

    } else if (enemyHasArt(e)) {
      drawEnemyArt(e, enemyArt(e), facing, isMoving, runTimer);
    } else if (e.type === 'jiangshi') {
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend

      // 강시 전용 4단 도약 스프라이트: 지면도약준비(0) -> 공중상승(1) -> 정점비상(2) -> 착지흡수(3)!
      let jFrame = 0;
      if (e.hopHeight > 16) jFrame = 2; // 정점 활공
      else if (e.hopHeight > 4) {
        jFrame = Math.sin(e.hopTimer) > 0 ? 1 : 3; // 상승 vs 하강
      } else {
        jFrame = 0; // 지면 웅크림
      }

      const jImg = SPRITES['jiangshi_leap_' + jFrame] || SPRITES.jiangshi;
      const jw = 120;
      const jh = 160;
      const hopY = -e.hopHeight;

      if (jImg && jImg.complete) {
        ctx.drawImage(jImg, -jw / 2, -jh + 18 + hopY, jw, jh);
      } else {
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.arc(0, -32 + hopY, 26, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (e.type === 'skeleton') {
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend

      if (e.isAttacking) {
        // 2dimg2motion 해골 백골병 4단 참격 모션: 치켜들기(0) -> 내리찍기(1) -> 바닥강타(2) -> 수검(3)
        const prog = Math.min(1, Math.max(0, 1 - (e.atkTimer / 0.48)));
        const fIdx = Math.min(3, Math.floor(prog * 4));
        const sImg = SPRITES['skeleton_atk_' + fIdx] || SPRITES.skeleton;

        const lunge = Math.sin(prog * Math.PI) * 14;
        ctx.translate(lunge, -Math.sin(prog * Math.PI) * 6);

        const sw = 120, sh = 140;
        if (sImg && sImg.complete) {
          ctx.drawImage(sImg, -sw / 2, -sh + 24, sw, sh);
        } else {
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.arc(0, -32, 24, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // 실제 다리가 번갈아 뻗어나가며 진격하는 4단 달리기 애니메이션 (캐릭터보다 늠름한 96x156!)
        const runFrame = isMoving ? (Math.floor(runTimer * 1.35) % 4) : 0;
        const sImg = SPRITES['skeleton_run_' + runFrame] || SPRITES.skeleton;

        const sw = 96, sh = 156;
        const sprintBounce = isMoving ? Math.sin(runTimer * 2.7) * 2.0 : 0;
        ctx.translate(0, sprintBounce);

        if (sImg && sImg.complete) {
          ctx.drawImage(sImg, -sw / 2, -sh + 15, sw, sh);
        } else {
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.arc(0, -28, 22, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (e.type === 'ghoul') {
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend

      // 부패시귀 전용 4단 포복 맹수 질주 스프라이트! (접지 -> 코일 -> 맹수도약 -> 전방착지)
      const runFrame = isMoving ? (Math.floor(runTimer * 1.5) % 4) : 0;
      const gImg = SPRITES['ghoul_run_' + runFrame] || SPRITES.ghoul;
      const gw = 116, gh = 116;
      const gBounce = isMoving ? Math.sin(runTimer * 3.0) * 2.0 : 0;
      ctx.translate(0, gBounce);

      if (gImg && gImg.complete) {
        ctx.drawImage(gImg, -gw / 2, -gh + 18, gw, gh);
      } else {
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(0, -26, 24, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (e.type === 'necromancer') {
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend

      // 1. 고요하고 장엄한 순수 수직 공중부양 (뒤뚱거리는 회전 흔들림 완전히 제거!)
      const floatY = 16 + Math.sin(state.gameTime * 2.2 + ((e.seed || e.x) % 7)) * 5.0;
      ctx.translate(0, -floatY);
      // 회전(ctx.rotate)을 일체 넣지 않아 전혀 뒤뚱거리지 않고 공중에 단정히 떠있음

      // 2. 도포 자락 아래로 흘러내리는 짙은 명계 영혼화염 & 도깨비불 이펙트
      ctx.save();
      const soulP1 = Math.sin(state.gameTime * 4.5) * 4;
      const soulP2 = Math.cos(state.gameTime * 3.8) * 4;
      ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.ellipse(-12 + soulP1, 10, 8, 14, 0.15, 0, Math.PI * 2);
      ctx.ellipse(12 + soulP2, 10, 8, 14, -0.15, 0, Math.PI * 2);
      ctx.ellipse(0, 14, 12, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3. 녹색 영혼 보호 결계
      ctx.save();
      const nPulse = 1.0 + Math.sin(state.gameTime * 4.2) * 0.08;
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 16 * nPulse;
      ctx.beginPath();
      ctx.ellipse(0, -56, 36 * nPulse, 52 * nPulse, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 4. 사령술사 본체 스프라이트 (114x162)
      const nImg = SPRITES.necromancer;
      const nw = 114, nh = 162;
      if (nImg && nImg.complete) {
        ctx.drawImage(nImg, -nw / 2, -nh + 22, nw, nh);
      } else {
        ctx.fillStyle = '#065f46';
        ctx.beginPath();
        ctx.arc(0, -34, 24, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. 지팡이 해골 두개골의 영혼 화염 발광 (시전 중이면 더욱 거대하게 증폭!)
      const isCasting = !!e.telegraph;
      const staffGlow = isCasting ? (1.5 + Math.sin(state.gameTime * 12) * 0.4) : (1.0 + Math.sin(state.gameTime * 4) * 0.15);
      ctx.save();
      ctx.fillStyle = isCasting ? '#a7f3d0' : '#34d399';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = isCasting ? 28 : 14;
      ctx.beginPath();
      ctx.arc(36, -nh + 44, 9 * staffGlow, 0, Math.PI * 2);
      ctx.fill();
      // 안구 영혼화염
      ctx.fillStyle = '#ecfdf5';
      ctx.beginPath();
      ctx.arc(34, -nh + 43, 2.5, 0, Math.PI * 2);
      ctx.arc(39, -nh + 43, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (e.type === 'butcher') {
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend

      // 혈마 도살마인 전용 4단 중장 강타 돌진 스프라이트! (155x185 거구)
      const runFrame = isMoving ? (Math.floor(runTimer * 1.15) % 4) : 0;
      const bImg = SPRITES['butcher_run_' + runFrame] || SPRITES.butcher;
      const bw = 155, bh = 185;
      const heavyStomp = isMoving ? Math.sin(runTimer * 2.3) * 2.8 : 0;
      ctx.translate(0, heavyStomp);

      if (bImg && bImg.complete) {
        ctx.drawImage(bImg, -bw / 2, -bh + 24, bw, bh);
      } else {
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.arc(0, -45, 34, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (e.type === 'barbarian') {
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend

      // 광폭 쌍도객 전용 4단 쌍도 돌진 스프라이트! (108x172)
      const runFrame = isMoving ? (Math.floor(runTimer * 1.35) % 4) : 0;
      const barImg = SPRITES['barbarian_run_' + runFrame] || SPRITES.barbarian;
      const barW = 108, barH = 172;
      const sprintBounce = isMoving ? Math.sin(runTimer * 2.7) * 2.0 : 0;
      ctx.translate(0, sprintBounce);

      if (barImg && barImg.complete) {
        ctx.drawImage(barImg, -barW / 2, -barH + 16, barW, barH);
      } else {
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.arc(0, -34, 25, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (e.type === 'sorceress') {
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend
      // 순수 수직 공중부양 (뒤뚱거리는 회전 흔들림 완전 제거)
      const floatY = 14 + Math.sin(state.gameTime * 2.2 + ((e.seed || e.x) % 7)) * 5.0;
      ctx.translate(0, -floatY);

      // Crimson silk aura
      ctx.save();
      const sPulse = 1.0 + Math.sin(state.gameTime * 5.5) * 0.1;
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
      ctx.lineWidth = 2.0;
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 12 * sPulse;
      ctx.beginPath();
      ctx.ellipse(0, -48, 28 * sPulse, 42 * sPulse, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const sorcImg = SPRITES.sorceress;
      const sw2 = 105, sh2 = 148;
      if (sorcImg && sorcImg.complete) {
        ctx.drawImage(sorcImg, -sw2 / 2, -sh2 + 20, sw2, sh2);
      } else {
        ctx.fillStyle = '#9f1239';
        ctx.beginPath();
        ctx.arc(0, -32, 22, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (e.type === 'archer') {
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend
      const aw = 96, ah = 156;

      if (e.isAiming || e.shootTimer <= 0.85 || e.recoilTimer > 0) {
        // 실제 전용 4단 활쏘기 모션: 화살 장전(0) -> 시위 당김(1) -> 만작 조준(2) -> 격발 반동(3)!
        let shotFrame = 0;
        if (e.recoilTimer > 0) shotFrame = 3; // 방사 및 활 반동
        else if (e.shootTimer <= 0.25) shotFrame = 2; // 만작(Full Draw) 조준
        else if (e.shootTimer <= 0.6) shotFrame = 1; // 시위 당김(Draw)
        else shotFrame = 0; // 화살 장전(Nock)

        const aImg = SPRITES['archer_shoot_' + shotFrame] || SPRITES['skeleton_run_0'];
        if (aImg && aImg.complete) {
          ctx.drawImage(aImg, -aw / 2, -ah + 15, aw, ah);
        } else {
          ctx.fillStyle = '#059669';
          ctx.beginPath();
          ctx.arc(0, -30, 22, 0, Math.PI * 2);
          ctx.fill();
        }

        // 만작 조준 시 화살촉에 번뜩이는 날카로운 조준 섬광!
        if (shotFrame === 2) {
          ctx.fillStyle = '#fbbf24';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(22, -42, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      } else {
        // 이동 중: 궁수 그림 그대로 (예전엔 해골 병사 달리기 그림을 써서 활 쏠 때와 모습이 바뀌었음)
        const aImg = SPRITES['archer_shoot_0'] || SPRITES.skeleton;
        const sprintBounce = isMoving ? Math.sin(runTimer * 2.7) * 2.0 : 0;
        ctx.translate(0, sprintBounce);

        if (aImg && aImg.complete) {
          ctx.drawImage(aImg, -aw / 2, -ah + 15, aw, ah);
        } else {
          ctx.fillStyle = '#059669';
          ctx.beginPath();
          ctx.arc(0, -30, 22, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (e.type === 'poison_assassin') {
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend
      const runFrame = isMoving ? (Math.floor(runTimer * 1.35) % 4) : 0;
      const aImg = SPRITES['assassin_run_' + runFrame] || SPRITES.assassin;
      const aw = 96, ah = 156;
      const sprintBounce = isMoving ? Math.sin(runTimer * 2.7) * 1.8 : 0;
      ctx.translate(0, sprintBounce);

      if (aImg && aImg.complete) {
        ctx.drawImage(tinted(aImg, 'hue-rotate(90deg) saturate(1.4)'), -aw / 2, -ah + 15, aw, ah);
      } else {
        ctx.fillStyle = '#065f46';
        ctx.beginPath();
        ctx.arc(0, -30, 22, 0, Math.PI * 2);
        ctx.fill();
      }
      // Venomous glowing daggers swaying with sprint
      const daggerBob = Math.sin(runTimer * 2.7) * 3;
      ctx.fillStyle = '#10b981';
      ctx.fillRect(18, -26 + daggerBob, 12, 3.5);
    } else if (e.type === 'spearman') {
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend
      const runFrame = isMoving ? (Math.floor(runTimer * 1.35) % 4) : 0;
      const aImg = SPRITES['assassin_run_' + runFrame] || SPRITES.assassin;
      const aw = 96, ah = 156;
      const sprintBounce = isMoving ? Math.sin(runTimer * 2.7) * 1.8 : 0;
      ctx.translate(0, sprintBounce);

      if (aImg && aImg.complete) {
        ctx.drawImage(tinted(aImg, 'sepia(0.35) saturate(1.5)'), -aw / 2, -ah + 15, aw, ah);
      } else {
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.arc(0, -30, 22, 0, Math.PI * 2);
        ctx.fill();
      }
      // 양손에 쥔 회전 은빛 강철 수리검 (어색한 붙어있는 창 완전 제거!)
      const shurRot = state.gameTime * 18;
      ctx.save();
      ctx.translate(22, -34);
      ctx.rotate(shurRot);
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = '#cbd5e1';
      ctx.shadowBlur = 6;
      ctx.fillRect(-6, -6, 12, 12);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    } else if (e.type === 'curse_mage') {
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend
      // 1. 고요하고 장엄한 순수 수직 공중부양 (뒤뚱거리는 회전 흔들림 완전히 제거!)
      const floatY = 14 + Math.sin(state.gameTime * 2.2 + ((e.seed || e.x) % 7)) * 5.0;
      ctx.translate(0, -floatY);
      // 회전(ctx.rotate) 완전 제거

      // 2. 도포 자락 아래로 피어오르는 흑자색 명계 안개
      ctx.save();
      const soulP1 = Math.sin(state.gameTime * 4.2) * 3;
      ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
      ctx.shadowColor = '#9333ea';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(soulP1, 10, 10, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const aImg = SPRITES.necromancer || SPRITES.assassin;
      if (aImg && aImg.complete) {
        ctx.drawImage(tinted(aImg, 'hue-rotate(240deg) saturate(1.8)'), -52, -145, 104, 150);
      } else {
        ctx.fillStyle = '#581c87';
        ctx.beginPath();
        ctx.arc(0, -30, 22, 0, Math.PI * 2);
        ctx.fill();
      }
      // Floating occult staff with pulsating orb
      const staffPulse = 1.0 + Math.sin(state.gameTime * 6) * 0.15;
      ctx.strokeStyle = '#3b0764';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(22, 2);
      ctx.lineTo(22, -64);
      ctx.stroke();
      ctx.fillStyle = '#c084fc';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(22, -68, 9 * staffPulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend

      // 흑풍 살수: 캐릭터보다 크고 늠름한 4단 전력 질주 애니메이션! (96x156)
      const runFrame = isMoving ? (Math.floor(runTimer * 1.35) % 4) : 0;
      const aImg = SPRITES['assassin_run_' + runFrame] || SPRITES.assassin;
      const aw = 96;
      const ah = 156;
      const sprintBounce = isMoving ? Math.sin(runTimer * 2.7) * 1.8 : 0;
      ctx.translate(0, sprintBounce);

      if (aImg && aImg.complete) {
        ctx.drawImage(aImg, -aw / 2, -ah + 15, aw, ah);
      } else {
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(0, -30, 22, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 60FPS Hardware Hit-Flash (기존 무거운 ctx.filter 소프트웨어 래스터라이저 완전 대체)
    if (e.hitCooldown > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = e.isBoss ? 'rgba(239, 68, 68, 0.5)' : (e.isMiniBoss ? 'rgba(245, 158, 11, 0.5)' : 'rgba(255, 255, 255, 0.45)');
      ctx.beginPath();
      ctx.arc(0, -e.radius, e.radius * 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  });
}

// 매화검우: 부채꼴로 퍼져 나가는 꽃잎 물결 (앞머리가 밝고 뒤로 옅어짐). 꽃잎 입자는 renderParticles 에서
function drawPlumTrees() {
  if (!plumTrees.length) return;
  plumTrees.forEach(w => {
    const R = PLUM_WAVE.range, ha = PLUM_WAVE.halfArc;
    const front = Math.min(w.r, R), back = Math.max(0, front - 220);
    const fade = Math.max(0, Math.min(1, (R + 60 - w.r) / 120));
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.scale(1, 0.8); // 바닥에 깔린 느낌 (쿼터뷰)
    ctx.globalAlpha = fade;
    const g = ctx.createRadialGradient(0, 0, back, 0, 0, Math.max(back + 1, front));
    g.addColorStop(0, 'rgba(249, 168, 212, 0)');
    g.addColorStop(0.6, 'rgba(249, 168, 212, 0.38)');
    g.addColorStop(1, 'rgba(255, 228, 236, 0.75)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, front, w.aim - ha, w.aim + ha);
    ctx.arc(0, 0, back, w.aim + ha, w.aim - ha, true);
    ctx.closePath();
    ctx.fill();
    // 앞머리 검기 선
    ctx.strokeStyle = 'rgba(251, 113, 133, 0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, front, w.aim - ha, w.aim + ha); ctx.stroke();
    ctx.restore();
  });
}

// 매화만개(초월) 어검술: 칼 대신 빙글빙글 도는 매화 꽃송이(매화검기)
function drawPlumBlossom(x, y, r, spin, glow) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  if (glow) { ctx.shadowColor = '#fb7185'; ctx.shadowBlur = 10; }
  for (let k = 0; k < 5; k++) {
    const a = k * Math.PI * 2 / 5;
    ctx.fillStyle = k % 2 ? '#fbcfe8' : '#f9a8d4';
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.58, r * 0.42, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#be185d';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fde68a'; // 꽃술
  for (let k = 0; k < 5; k++) { const a = k * 1.2566 + 0.6; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, r * 0.08, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function renderProjectiles() {
  drawPlumTrees(); // 매화만개 매화검우 (검·투사체 아래)
  // 1. Eastern Long Flying Swords (이십사수매화검법 매화검)
  flyingSwords.forEach(sw => {
    // 매화검: 검이 날아가고 그 뒤로 꽃잎이 흩날림 (꽃잎은 06 의 spawnPetals). 초월(매화만개)은 손잡이에 매화 한 송이
    ctx.save();
    ctx.translate(sw.x, sw.y);

    let angle = sw.isLaunching ? Math.atan2(sw.vy, sw.vx) : sw.angle + Math.PI / 2;
    ctx.rotate(angle);

    ctx.scale(sw.isEvo ? 0.85 : 0.72, sw.isEvo ? 0.85 : 0.72);

    const look = (player.equipped && player.equipped.weapon) ? player.equipped.weapon.lookEffect : (typeof skinBladeLook === 'function' ? skinBladeLook() : null); // 주운 장비가 없으면 외형 검기
    let mainColor = sw.isEvo ? '#fb7185' : '#f9a8d4'; // 이십사수매화검법: 매화빛 검
    if (look === 'frost_blade') mainColor = '#38bdf8';
    else if (look === 'blood_blade') mainColor = '#ef4444';
    else if (look === 'thunder_blade') mainColor = '#c084fc';

    // Glowing Sword Qi Aura (60FPS 최적화된 블러)
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = sw.isLaunching ? 6 : 0;

    if (sw.isLaunching) {
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = sw.isEvo ? 3.5 : 2.5;
      ctx.beginPath();
      ctx.moveTo(-15, 0);
      ctx.lineTo(-46, 0);
      ctx.stroke();
    }

    // A. Blade Gradient (장비 룩변 or 황금 만검귀종 or 청운 비취검)
    const bladeGrad = ctx.createLinearGradient(0, -3, 0, 3);
    if (look === 'frost_blade') {
      bladeGrad.addColorStop(0, '#f0f9ff');
      bladeGrad.addColorStop(0.35, '#ffffff');
      bladeGrad.addColorStop(0.7, '#bae6fd');
      bladeGrad.addColorStop(1, '#0284c7');
    } else if (look === 'blood_blade') {
      bladeGrad.addColorStop(0, '#fee2e2');
      bladeGrad.addColorStop(0.35, '#ffffff');
      bladeGrad.addColorStop(0.7, '#f87171');
      bladeGrad.addColorStop(1, '#b91c1c');
    } else if (look === 'thunder_blade') {
      bladeGrad.addColorStop(0, '#faf5ff');
      bladeGrad.addColorStop(0.35, '#ffffff');
      bladeGrad.addColorStop(0.7, '#d8b4fe');
      bladeGrad.addColorStop(1, '#7e22ce');
    } else if (sw.isEvo) { // 매화만개: 짙은 매화빛
      bladeGrad.addColorStop(0, '#ffe4e6');
      bladeGrad.addColorStop(0.35, '#ffffff');
      bladeGrad.addColorStop(0.7, '#fda4af');
      bladeGrad.addColorStop(1, '#e11d48');
    } else { // 이십사수매화검법: 연분홍 매화검
      bladeGrad.addColorStop(0, '#fce7f3');
      bladeGrad.addColorStop(0.35, '#ffffff');
      bladeGrad.addColorStop(0.7, '#f9a8d4');
      bladeGrad.addColorStop(1, '#db2777');
    }
    ctx.fillStyle = bladeGrad;

    ctx.beginPath();
    ctx.moveTo(52, 0);       // Sharpened sword tip
    ctx.lineTo(38, -3.0);
    ctx.lineTo(-10, -2.6);
    ctx.lineTo(-10, 2.6);
    ctx.lineTo(38, 3.0);
    ctx.closePath();
    ctx.fill();

    // Central Fuller & Qi Core
    ctx.strokeStyle = sw.isEvo ? '#9f1239' : '#be185d';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(42, 0);
    ctx.lineTo(-8, 0);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(40, 0);
    ctx.lineTo(-5, 0);
    ctx.stroke();

    // B. Golden Crossguard
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(-13, -7, 3, 14);
    ctx.fill();
    ctx.stroke();

    // C. Long Hilt
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-23, -2, 10, 4);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 0.8;
    for (let hx = -21; hx <= -15; hx += 2.2) {
      ctx.beginPath();
      ctx.moveTo(hx, -2);
      ctx.lineTo(hx + 1, 2);
      ctx.stroke();
    }

    // D. Pommel Ring
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(-25, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // E. Red/Gold Silk Tassel
    ctx.strokeStyle = sw.isEvo ? '#fb7185' : '#f472b6'; // 매화빛 술
    ctx.lineWidth = 1.6;
    const wave = Math.sin(state.gameTime * 14 + sw.x * 0.05) * 3.5;
    const wave2 = Math.cos(state.gameTime * 12 + sw.y * 0.05) * 2.5;
    ctx.beginPath();
    ctx.moveTo(-28, 0);
    ctx.quadraticCurveTo(-38, wave, -50, wave * 1.5 + wave2);
    ctx.stroke();

    ctx.restore();
    if (sw.isEvo) { // 초월: 손잡이 끝에 매화 한 송이
      drawPlumBlossom(sw.x + Math.cos(angle) * -22, sw.y + Math.sin(angle) * -22, 8, state.gameTime * 4 + sw.angle, false);
    }
  });

  // 2. Projectiles (Formless Gale, Buddha Palm, Golden Ki, Blood Bullets, Poison Shards)
  const pCamX = state.camera.x;
  const pCamY = state.camera.y;
  const pCullW = gameWidth / 2 + 100;
  const pCullH = gameHeight / 2 + 100;

  projectiles.forEach(p => {
    if (Math.abs(p.x - pCamX) > pCullW || Math.abs(p.y - pCamY) > pCullH) return;
    ctx.save();
    ctx.translate(p.x, p.y);

    if (p.type === 'golden_sword_ki') {
      const angle = Math.atan2(p.vy, p.vx);
      ctx.rotate(angle);
      ctx.fillStyle = '#fffbeb';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(45, 0);
      ctx.lineTo(-25, -7);
      ctx.lineTo(-15, 0);
      ctx.lineTo(-25, 7);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(35, 0);
      ctx.lineTo(-50, 0);
      ctx.stroke();
    } else if (p.type === 'blood_bullet') {
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#991b1b';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius || 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.arc(-2, -2, (p.radius || 8) * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'poison_shard') {
      const angle = Math.atan2(p.vy, p.vx);
      ctx.rotate(angle);
      ctx.fillStyle = '#c084fc';
      ctx.shadowColor = '#7e22ce';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(0, -4);
      ctx.lineTo(-12, 0);
      ctx.lineTo(0, 4);
      ctx.closePath();
      ctx.fill();
    } else if (p.type === 'dagger') {
      const angle = Math.atan2(p.vy, p.vx);
      ctx.rotate(angle);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-6, -3);
      ctx.lineTo(-6, 3);
      ctx.closePath();
      ctx.fill();
    } else if (p.type === 'palm_wave' && !p.isBuddhaPalm && SPRITES.fx_wind && SPRITES.fx_wind.width) {
      // 바람 칼날 그림: 날아가는 방향으로 돌리고, 사라질 때 흐려짐 (예전: 회색 연기 반원)
      const pAngle = Math.atan2(p.vy, p.vx);
      const size = Math.max(150, (p.width || 200) * 1.1);
      const lifeK = p.maxLife ? Math.min(1, p.life / (p.maxLife * 0.3)) : 1;
      ctx.restore();
      drawFxImage('fx_wind', p.x, p.y - 20, size, 0.95 * lifeK, pAngle);
      ctx.save();
    } else if (p.type === 'palm_wave' && p.isBuddhaPalm && SPRITES.fx_buddha_palm && SPRITES.fx_buddha_palm.width) {
      const dir = p.vx >= 0 ? 1 : -1;
      const sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp; // 날아가는 방향 (8방향)
      const size = Math.max(230, (p.width || 220) * 1.25);
      const lifeK = Math.min(1, p.life / 0.35);
      const pulse = 1 + Math.sin(state.gameTime * 14) * 0.04;
      ctx.restore();
      // 잔상 2개 (뒤쪽으로 흐려지며)
      drawFxImage('fx_buddha_palm', p.x - ux * 150, p.y - 40 - uy * 150, size * 0.8, 0.12 * lifeK, dir * 0.12);
      drawFxImage('fx_buddha_palm', p.x - ux * 80, p.y - 40 - uy * 80, size * 0.9, 0.2 * lifeK, dir * 0.12);
      drawFxImage('fx_buddha_palm', p.x, p.y - 40, size * pulse, 0.78 * lifeK, dir * 0.12);
      ctx.save();
    } else if (p.type === 'palm_wave') {
      const pAngle = Math.atan2(p.vy, p.vx);
      ctx.rotate(pAngle);

      if (p.isBuddhaPalm) {
        // --- 萬佛朝宗 : 佛光 金剛 卍字印 (Tathagata Sacred Golden Swastika Divine Seal) ---
        // 어색한 장갑 형태 대신, 장엄하게 회전하며 뻗어나가는 거대한 황금 卍자 신성 만다라 투사체
        const size = Math.max(140, (p.width || 220) * 0.72);
        const rot = state.gameTime * 4.2;

        ctx.save();

        // 1. 후방 금빛 풍압 충격파 및 진기 꼬리 (Golden Ki Shockwave Trail)
        const trailGrad = ctx.createLinearGradient(-size * 1.1, 0, 0, 0);
        trailGrad.addColorStop(0, 'rgba(245, 158, 11, 0)');
        trailGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.22)');
        trailGrad.addColorStop(1, 'rgba(254, 240, 138, 0.45)');
        ctx.fillStyle = trailGrad;
        ctx.beginPath();
        ctx.ellipse(-size * 0.35, 0, size * 0.75, size * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. 외곽 회전 금강법륜 & 만다라 링 (Rotating Dharma Wheel)
        ctx.save();
        ctx.rotate(rot);

        // 외곽 2중 신성 금륜
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.9)';
        ctx.lineWidth = 3.6;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 32;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.62, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.74, 0, Math.PI * 2);
        ctx.stroke();

        // 8방향 신성 금빛 광선 (8 Celestial Light Rays)
        for (let r = 0; r < 8; r++) {
          const rAng = (r * Math.PI) / 4;
          const rx1 = Math.cos(rAng) * (size * 0.48);
          const ry1 = Math.sin(rAng) * (size * 0.48);
          const rx2 = Math.cos(rAng) * (size * 0.76);
          const ry2 = Math.sin(rAng) * (size * 0.76);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.lineWidth = (r % 2 === 0) ? 3.0 : 1.8;
          ctx.beginPath();
          ctx.moveTo(rx1, ry1);
          ctx.lineTo(rx2, ry2);
          ctx.stroke();
        }

        // 3. 중심 불광 코로나 화염 (Golden Flame Radial Core)
        const flamePulse = 1.0 + Math.sin(state.gameTime * 10) * 0.08;
        const flameGrad = ctx.createRadialGradient(0, 0, size * 0.1, 0, 0, size * 0.64);
        flameGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        flameGrad.addColorStop(0.35, 'rgba(254, 240, 138, 0.75)');
        flameGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.45)');
        flameGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.62 * flamePulse, 0, Math.PI * 2);
        ctx.fill();

        // 4. 거대한 불광 卍 자 (Sacred Golden "卍" Core Glyph)
        ctx.shadowColor = '#d97706';
        ctx.shadowBlur = 24;
        ctx.font = `bold ${Math.round(size * 0.88)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 금빛 외곽선
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 10;
        ctx.strokeText('卍', 0, 0);

        // 선명한 황금색
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 5;
        ctx.strokeText('卍', 0, 0);

        // 눈부신 백금광 중심부
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#fef08a';
        ctx.shadowBlur = 14;
        ctx.fillText('卍', 0, 0);

        ctx.restore();
        ctx.restore();
      } else {
        // Authentic Eastern Formless Vacuum Gale
        const scale = (p.width || 76) / 76;
        ctx.scale(scale, scale);

        const windGrad = ctx.createRadialGradient(16, 0, 6, 0, 0, 52);
        windGrad.addColorStop(0, 'rgba(255, 255, 255, 0.32)');
        windGrad.addColorStop(0.35, 'rgba(224, 242, 254, 0.18)');
        windGrad.addColorStop(0.7, 'rgba(186, 230, 253, 0.06)');
        windGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = windGrad;

        ctx.beginPath();
        ctx.moveTo(38, 0);
        ctx.quadraticCurveTo(24, -28, -25, -34);
        ctx.quadraticCurveTo(-45, 0, -25, 34);
        ctx.quadraticCurveTo(24, 28, 38, 0);
        ctx.closePath();
        ctx.fill();

        const vortexGrad = ctx.createRadialGradient(8, 0, 2, 8, 0, 26);
        vortexGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        vortexGrad.addColorStop(0.5, 'rgba(224, 242, 254, 0.14)');
        vortexGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = vortexGrad;
        ctx.beginPath();
        ctx.ellipse(8, 0, 24, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
        ctx.lineWidth = 1.6;
        ctx.shadowColor = '#bae6fd';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(4, 0, 36, -Math.PI * 0.36, Math.PI * 0.36);
        ctx.stroke();
      }
    } else if (p.type === 'enemy_arrow') {
      // 1. Archer Arrow (원거리 화살)
      const angle = Math.atan2(p.vy, p.vx);
      ctx.rotate(angle);
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(14, 0);
      ctx.stroke();
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(10, -4);
      ctx.lineTo(10, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(-20, -5);
      ctx.lineTo(-16, 0);
      ctx.lineTo(-20, 5);
      ctx.closePath();
      ctx.fill();
    } else if (p.type === 'poison_shuriken') {
      // 2. Poison Assassin Shuriken / Mini-Boss Demonic Star (독표창 / 천라지망 마교 암기)
      const isMB = !!p.isMiniBossStar;
      const rot = state.gameTime * (isMB ? 32 : 24) + p.x;
      ctx.rotate(rot);

      if (isMB) {
        // 천라지망 8각 마기 비도 (Demonic 8-Point Star Blade)
        const sz = 16;
        ctx.fillStyle = '#a855f7';
        ctx.shadowColor = '#7e22ce';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const ka = (k / 8) * Math.PI * 2;
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(ka - 0.15) * (sz * 0.35), Math.sin(ka - 0.15) * (sz * 0.35));
          ctx.lineTo(Math.cos(ka) * sz, Math.sin(ka) * sz);
          ctx.lineTo(Math.cos(ka + 0.15) * (sz * 0.35), Math.sin(ka + 0.15) * (sz * 0.35));
        }
        ctx.closePath();
        ctx.fill();

        // 중심 독기 코어
        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#15803d';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        for (let k = 0; k < 4; k++) {
          const ka = (k / 4) * Math.PI * 2;
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(ka - 0.2) * 5, Math.sin(ka - 0.2) * 5);
          ctx.lineTo(Math.cos(ka) * 14, Math.sin(ka) * 14);
          ctx.lineTo(Math.cos(ka + 0.2) * 5, Math.sin(ka + 0.2) * 5);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (p.type === 'steel_shuriken' || p.type === 'enemy_javelin') {
      // 3. Shuriken Assassin - High-Speed Rotating Steel 8-Point Shuriken (고속 회전 강철 8각 수리검)
      const rot = state.gameTime * 28 + p.x;
      ctx.rotate(rot);
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.shadowColor = '#cbd5e1';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const ka = (k / 8) * Math.PI * 2;
        const r = (k % 2 === 0) ? 14 : 6;
        const px = Math.cos(ka) * r;
        const py = Math.sin(ka) * r;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(17, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'curse_orb') {
      // 4. Ethereal Nether Soul Skull Projectile (幽冥 怨魂탄 - 거대 비행 원혼 두개골)
      const ang = Math.atan2(p.vy, p.vx);
      ctx.rotate(ang);

      const isCurseMage = p.isCurseMage;
      const mainCol = isCurseMage ? '#c084fc' : '#34d399';
      const coreCol = isCurseMage ? '#581c87' : '#064e3b';
      const glowCol = isCurseMage ? '#a855f7' : '#10b981';
      const eyeCol = isCurseMage ? '#f43f5e' : '#ecfdf5';

      const pulse = 1.0 + Math.sin(state.gameTime * 14) * 0.12;

      // 1. 유령 영혼화염 꼬리 (Soul Flame Tail)
      ctx.save();
      ctx.fillStyle = isCurseMage ? 'rgba(168, 85, 247, 0.45)' : 'rgba(16, 185, 129, 0.45)';
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-32 * pulse, -12);
      ctx.lineTo(-24, 0);
      ctx.lineTo(-32 * pulse, 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 2. 광채 코로나 (Glow Corona) 및 두개골 외형
      ctx.save();
      ctx.shadowColor = glowCol;
      ctx.shadowBlur = 24 * pulse;
      ctx.fillStyle = coreCol;
      ctx.strokeStyle = mainCol;
      ctx.lineWidth = 2.8;

      // 두개골 형상 (Skull shape)
      ctx.beginPath();
      ctx.arc(2, 0, 16 * pulse, -Math.PI * 0.65, Math.PI * 0.65);
      ctx.lineTo(-6, 8 * pulse);
      ctx.lineTo(-6, -8 * pulse);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 두개골 발광 안구 (Burning Eyes)
      ctx.fillStyle = eyeCol;
      ctx.shadowColor = eyeCol;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(6, -5, 3.5, 0, Math.PI * 2);
      ctx.arc(6, 5, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // 이빨/턱 격자선
      ctx.strokeStyle = mainCol;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-1, -4);
      ctx.lineTo(-1, 4);
      ctx.moveTo(-4, -3);
      ctx.lineTo(-4, 3);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  });

  // 3. Falling Needles (당문 만천화우 은침 소나기)
  renderFallingNeedles();
}

function renderFallingNeedles() {
  fallingNeedles.forEach(fn => {
    if (fn.time >= fn.delay) {
      const prog = (fn.time - fn.delay) / fn.duration;
      if (prog >= 0 && prog <= 1) {
        const currX = fn.startX + (fn.destX - fn.startX) * prog;
        const currY = fn.startY + (fn.destY - fn.startY) * prog;
        const angle = Math.atan2(fn.destY - fn.startY, fn.destX - fn.startX);

        ctx.save();
        ctx.translate(currX, currY);
        ctx.rotate(angle);

        // Glowing needle rain streak
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(0, 0);
        ctx.stroke();

        // Silver-jade sharp needle
        ctx.fillStyle = '#f8fafc';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-14, -1.5);
        ctx.lineTo(-14, 1.5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    }
  });
}

function renderParticles() {
  const camX = state.camera.x;
  const camY = state.camera.y;
  const cullW = gameWidth / 2 + 90;
  const cullH = gameHeight / 2 + 90;

  particles.forEach(p => {
    // 60FPS Frustum Culling
    if (Math.abs(p.x - camX) > cullW || Math.abs(p.y - camY) > cullH) return;

    if (p.flash) {
      const t = 1 - p.life / p.maxLife;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * (0.6 + t * 0.4));
      g.addColorStop(0, `rgba(255, 255, 240, ${0.95 * (1 - t)})`);
      g.addColorStop(0.35, `rgba(253, 224, 71, ${0.6 * (1 - t)})`);
      g.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    if (p.petal) {
      // 매화 꽃잎 (이십사수매화검법): 꽃잎 5장, 사라질 때 옅어짐
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life / 0.35) * 0.95;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      const r = p.size;
      for (let k = 0; k < 5; k++) {
        const a = k * 1.2566;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.55, r * 0.36, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fde68a';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }
    if (p.fxKey) {
      const t = 1 - p.life / p.maxLife;
      drawFxImage(p.fxKey, p.x, p.y, p.size * (0.75 + t * 0.4), (1 - t) * 1.2, p.rot || 0, p.sy || 1, p.tint || null);
      return;
    }
    if (p.bolt || p.arc) {
      // 번개: 하늘에서 내리꽂는 줄기(bolt) / 적 사이를 튀는 연쇄(arc) — 미리 만든 꺾인 점들을 빛으로 그림
      const k = p.life / p.maxLife;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineJoin = 'round';
      [[9, 'rgba(56, 189, 248, ' + (0.35 * k) + ')'], [3.5, 'rgba(224, 242, 254, ' + (0.95 * k) + ')']].forEach(([wd, col]) => {
        ctx.strokeStyle = col; ctx.lineWidth = wd * (p.bolt ? 1.4 : 1);
        ctx.beginPath(); p.pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke();
      });
      ctx.restore();
      return;
    }
    ctx.save();
    if (p.isPixelCross) {
      // 십자 다이아몬드 코어 플레어 (pixelfx/impacts/hit-spark)
      const prog = 1 - p.life / p.maxLife;
      const sz = p.size * (1 - prog * 0.4);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      // 다이아몬드 중심 코어
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -sz * 0.38);
      ctx.lineTo(sz * 0.38, 0);
      ctx.lineTo(0, sz * 0.38);
      ctx.lineTo(-sz * 0.38, 0);
      ctx.closePath();
      ctx.fill();
      // 긴 수평/수직 도트 광선
      ctx.fillStyle = p.glowColor;
      ctx.fillRect(-sz, -1.2, sz * 2, 2.4);
      ctx.fillRect(-1.2, -sz * 0.55, 2.4, sz * 1.1);

    } else if (p.isPixelSlash) {
      // 픽셀 검기 궤적 (pixelfx/melee/sword-slash)
      const prog = 1 - p.life / p.maxLife;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 4.5 * (1 - prog);
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, -0.65, 0.65);
      ctx.stroke();

    } else if (p.isPixelSpark || p.isPixelDissolve || p.isPixelSparkle) {
      // 도트 픽셀 파티클 (pixelfx 사각형 픽셀)
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);

    } else if (p.isPixelDust) {
      // 신법 대시 흙먼지 픽셀 (pixelfx/moves/dust-dash)
      const prog = 1 - p.life / p.maxLife;
      const sz = p.size * (1 + prog * 0.7);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = (1 - prog) * 0.75;
      ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);

    } else if (p.isSlashArc) {
      ctx.translate(p.x, p.y);
      ctx.scale(p.facing, 1);
      const prog = 1 - p.life / p.maxLife;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 6 * (1 - prog);
      ctx.globalAlpha = 1 - prog;

      ctx.beginPath();
      ctx.arc(0, 0, 62, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5 * (1 - prog);
      ctx.stroke();

    } else if (p.isBloodSpike) {
      // 지열혈파 (地裂血波) 솟구치는 거대 혈암 바위 가시 (Towering Erupting Blood & Obsidian Rock Spikes)
      const prog = 1 - p.life / p.maxLife;
      let currentH = 0;
      if (prog < 0.16) {
        currentH = (prog / 0.16) * p.maxHeight;
      } else if (prog < 0.68) {
        currentH = p.maxHeight + Math.sin(prog * 35) * 2;
      } else {
        currentH = p.maxHeight * (1 - (prog - 0.68) / 0.32);
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      const alpha = Math.min(1.0, p.life / 0.25);
      ctx.globalAlpha = alpha;

      // 접지면 타원 그림자
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 2, p.width * 0.75, p.width * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // 뾰족한 삼각 혈암 바위 기둥 (음영 분할 입체 표현)
      const halfW = p.width / 2;
      ctx.fillStyle = '#1e1b4b'; // 어두운 흑요석 면
      ctx.beginPath();
      ctx.moveTo(0, -currentH);
      ctx.lineTo(-halfW, 0);
      ctx.lineTo(0, 3);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = p.color; // 붉은 혈석 발광면
      ctx.beginPath();
      ctx.moveTo(0, -currentH);
      ctx.lineTo(halfW, 0);
      ctx.lineTo(0, 3);
      ctx.closePath();
      ctx.fill();

      // 기둥 중심 핏빛 균열 맥
      ctx.strokeStyle = '#fca5a5';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, -currentH);
      ctx.lineTo(2, -currentH * 0.5);
      ctx.lineTo(0, 0);
      ctx.stroke();

      ctx.restore();

    } else if (p.isMbAfterimage) {
      // 흑풍삼단참 돌진 붉은 잔상 (Mini-Boss Dash Afterimage)
      const alpha = (p.life / p.maxLife) * 0.65;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(p.facing, 1);
      ctx.globalAlpha = alpha;
      // Zero-cost hardware additive flash (무거운 ctx.filter 제거로 60FPS 보장)
      if (p.sprite && (p.sprite.complete || p.sprite.width > 0)) {
        ctx.drawImage(p.sprite, -p.mw / 2, -p.mh + 22, p.mw, p.mh);
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
        ctx.fillRect(-p.mw / 2, -p.mh + 22, p.mw, p.mh);
      }
      ctx.restore();

    } else if (p.isMbSlashWave) {
      // 흑풍삼단참 종점 거대 혈풍 초승달 검기파 (Colossal Crimson Crescent Slash Wave)
      const prog = 1 - p.life / p.maxLife;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      const alpha = Math.min(1.0, (1 - prog) * 1.6);
      ctx.globalAlpha = alpha;

      // 외곽 거대 혈풍 초승달 검기호
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 15 * (1 - prog * 0.5);
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 26;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius * (0.8 + prog * 0.3), -Math.PI * 0.55, Math.PI * 0.55);
      ctx.stroke();

      // 내부 백열 절단 광인
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4 * (1 - prog * 0.5);
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius * (0.8 + prog * 0.3), -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();

      ctx.restore();

    } else if (p.isRing) {
      const progress = 1 - p.life / p.maxLife;
      const currentR = p.r + (p.maxR - p.r) * progress;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3 * (1 - progress);
      ctx.globalAlpha = 1 - progress;
      ctx.beginPath();
      ctx.arc(p.x, p.y, currentR, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });

  const showNums = (typeof gameSettings === 'undefined') || gameSettings.damageNumbers; // 설정: 피해 숫자 숨기기
  damageTexts.forEach(d => {
    if (!showNums && /^\d+$/.test(String(d.text))) return; // 숫자만 숨기고 '백골 소환!' 같은 글은 그대로
    ctx.save();
    if (d.dmg) {
      // 피해 숫자: 처음 0.1초 크게 튀어나왔다가 제자리, 굵은 테두리 (치명타는 금색·붉은 테두리)
      const t = 1 - d.life / (d.maxLife || 0.8);
      const pop = t < 0.12 ? 1.7 - (t / 0.12) * 0.7 : 1;
      ctx.translate(d.x, d.y);
      ctx.scale(pop, pop);
      ctx.font = `900 ${d.size}px -apple-system, 'Segoe UI', sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = Math.min(1, d.life * 3);
      ctx.strokeStyle = d.crit ? '#7f1d1d' : '#000000';
      ctx.lineWidth = d.crit ? 6 : 4.5;
      ctx.strokeText(d.text, 0, 0);
      ctx.fillStyle = d.color;
      ctx.fillText(d.text, 0, 0);
      ctx.restore();
      return;
    }
    ctx.font = `bold ${d.size}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.globalAlpha = Math.min(1, d.life * 2);
    // 60FPS Crisp Text Outline (무거운 shadowBlur 래스터라이저 제거)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.strokeText(d.text, d.x, d.y);
    ctx.fillStyle = d.color;
    ctx.fillText(d.text, d.x, d.y);
    ctx.restore();
  });
}

function renderPlumBlossoms() {
  environmentPetals.forEach(p => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = 'rgba(251, 113, 133, ' + p.opacity + ')';
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function renderHerbs() {
  herbs.forEach(h => {
    ctx.save();
    ctx.translate(h.x, h.y);
    const pulse = Math.sin(state.gameTime * 4 + h.x) * 3;
    const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, 26 + pulse);
    grad.addColorStop(0, 'rgba(52, 211, 153, 0.7)');
    grad.addColorStop(1, 'rgba(52, 211, 153, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 26 + pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🌿', 0, 0);

    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#6ee7b7';
    ctx.shadowColor = '#065f46';
    ctx.shadowBlur = 6;
    ctx.fillText(h.type.split(' ')[0], 0, -18);
    ctx.restore();
  });
}

function renderChests() {
  chests.forEach(c => {
    ctx.save();
    ctx.translate(c.x, c.y);
    const bounce = Math.sin(state.gameTime * 5 + c.x) * 3;
    const grad = ctx.createRadialGradient(0, bounce, 6, 0, bounce, 30);
    grad.addColorStop(0, 'rgba(251, 191, 36, 0.8)');
    grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, bounce, 30, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📦', 0, bounce);

    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#fde68a';
    ctx.shadowColor = '#b45309';
    ctx.shadowBlur = 8;
    ctx.fillText(c.isBossChest ? '★ 대첩 비급함 ★' : '황금 비급함', 0, bounce - 22);
    ctx.restore();
  });
}

function renderOffscreenGuides() {
  const halfW = gameWidth / 2 - 55;
  const halfH = gameHeight / 2 - 55;

  const targets = [];
  // 1. 중간보스 & 구역 보스 상시 나침반 레이더 (최우선 순위 가이드!)
  enemies.forEach(e => {
    if (e.isMiniBoss) {
      targets.push({ x: e.x, y: e.y, tag: `👹 [중간보스] ${e.name}`, color: '#f59e0b', isPriority: true });
    } else if (e.isBoss) {
      targets.push({ x: e.x, y: e.y, tag: `☠️ [구역군주] ${e.name}`, color: '#ef4444', isPriority: true });
    }
  });

  // 2. 포탈, 영약, 비급함, 기연 신단, 드롭 장비
  if (state.victoryPortal && state.victoryPortal.active) {
    targets.push({ x: state.victoryPortal.x, y: state.victoryPortal.y, tag: '🌀 [다음 관문] 진격 포탈', color: '#fbbf24', isPriority: true, isPortal: true });
  }
  herbs.forEach(h => targets.push({ x: h.x, y: h.y, tag: '🌿 영약', color: '#34d399' }));
  chests.forEach(c => targets.push({ x: c.x, y: c.y, tag: '📦 비급함', color: '#fbbf24' }));
  shrines.forEach(s => {
    if (s.active) targets.push({ x: s.x, y: s.y, tag: `${s.icon} ${s.name}`, color: s.color, isPriority: true });
  });
  // droppedItems radar markers removed for smooth performance

  // 화면 가장자리 길안내: 긴 글씨 띠 대신 작은 동그라미 아이콘 + 방향 화살표 + 거리
  targets.forEach(t => {
    const relX = t.x - state.camera.x;
    const relY = t.y - state.camera.y;
    const dist = Math.hypot(relX, relY);
    if (Math.abs(relX) <= halfW && Math.abs(relY) <= halfH) return;

    const angle = Math.atan2(relY, relX);
    // 화면 사각형 테두리에 붙이기 (위쪽은 정보창 자리를 피해서 조금 더 안쪽)
    const topPad = 70;
    const c = Math.cos(angle), s = Math.sin(angle);
    const limX = halfW - 6, limY = halfH - 6;
    const k = Math.min(limX / Math.max(Math.abs(c), 1e-6), (s < 0 ? limY - topPad : limY) / Math.max(Math.abs(s), 1e-6));
    const ex = c * k, ey = s * k;
    const icon = (t.tag.match(/^\S+/) || ['•'])[0];
    const r = t.isPriority ? 19 : 15;

    ctx.save();
    ctx.translate(state.camera.x + ex, state.camera.y + ey);
    const pulse = t.isPortal || t.isPriority ? 1 + Math.sin(state.gameTime * 6) * 0.06 : 1;
    ctx.scale(pulse, pulse);
    // 방향 화살표
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.moveTo(r + 9, 0);
    ctx.lineTo(r + 1, -6);
    ctx.lineTo(r + 1, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // 동그라미
    ctx.fillStyle = 'rgba(10, 14, 22, 0.88)';
    ctx.strokeStyle = t.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = `${t.isPriority ? 17 : 14}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 0, 1);
    // 거리 (중요 표시만)
    if (t.isPriority) {
      ctx.font = 'bold 10px sans-serif';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      const label = `${Math.round(dist / 10)}m`;
      ctx.strokeText(label, 0, r + 10);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(label, 0, r + 10);
    }
    ctx.restore();
  });

}


// --- Wuxia Ending Epilogue Credits Controller ---
