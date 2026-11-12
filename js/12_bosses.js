// =====================================================================
// 12_bosses.js — 최종보스 5명(구역마다 다른 모습·기술)과 중간보스 모습 나누기 (2026-11)
// 다른 파일 다음에 불러옴. 07_update.js / 09·10 렌더에서 아래 함수를 부름.
// =====================================================================

// 구역(1~5)별 최종보스: 그림 이름, 색, 크기(게임 속 키), 기술 2~3개
const BOSS_STYLES = [
  { art: 'boss_blood',     color: '#ef4444', h: 290, filter: null,
    skills: ['blood_dash', 'blood_rain'] },                         // 혈교 마두: 혈영섬 · 혈우강림
  { art: 'boss_dragon',    color: '#22c55e', h: 300, filter: 'hue-rotate(110deg) saturate(1.3)',
    skills: ['poison_breath', 'poison_field'] },                    // 독룡 마군: 독룡토식 · 만독장
  { art: 'boss_empress',   color: '#c084fc', h: 290, filter: 'hue-rotate(250deg) saturate(1.5) brightness(1.05)',
    skills: ['needle_spiral', 'bug_summon'] },                      // 천독마후: 만독침우 · 독충소환
  { art: 'boss_ice',       color: '#7dd3fc', h: 310, filter: 'grayscale(0.5) sepia(1) hue-rotate(165deg) saturate(2.2) brightness(1.15)',
    skills: ['ice_ring', 'ice_fall'] },                             // 빙백신군: 빙백한강 · 빙정낙하
  { art: 'boss_patriarch', color: '#dc2626', h: 340, filter: 'saturate(1.6) contrast(1.15) brightness(0.85)',
    skills: ['blood_heaven', 'blood_dash', 'blood_rain'] }          // 혈마교주: 혈마천강 · 혈영섬 · 혈우강림
];
const BOSS_SKILL_NAMES = {
  blood_dash: '혈영섬 (血影閃)', blood_rain: '혈우강림 (血雨降臨)',
  poison_breath: '독룡토식 (毒龍吐息)', poison_field: '만독장 (萬毒場)',
  needle_spiral: '만독침우 (萬毒針雨)', bug_summon: '독충소환 (毒蟲召喚)',
  ice_ring: '빙백한강 (氷魄寒罡)', ice_fall: '빙정낙하 (氷晶落下)',
  blood_heaven: '혈마천강 (血魔天罡)'
};
function bossStyle(e) { return BOSS_STYLES[Math.max(0, Math.min(4, e.bossIdx || 0))]; }

// 보스 그림(제미나이 2x2 시트에서 자른 프레임) — 파일이 있으면 쓰고, 없으면 예전 그림에 색만 바꿈
(function loadBossArt() {
  const names = BOSS_STYLES.map(s => s.art).concat(['mob_assassin', 'mob_dartman', 'mob_jiangshi']);
  for (const s of BOSS_STYLES) {
    for (const kind of ['walk', 'attack']) {
      for (let i = 0; i < 4; i++) {
        const key = `${s.art}_${kind}_${i}`;
        if (SPRITES[key]) continue;
        const img = new Image();
        img.onerror = () => { delete SPRITES[key]; };
        img.src = `assets/boss/${key}.png`;
        SPRITES[key] = img;
      }
    }
  }
  return names;
})();
function bossArtReady(e) {
  const img = SPRITES[bossStyle(e).art + '_walk_0'];
  return !!(img && img.complete && img.naturalWidth > 0);
}

// 보스 기술 피해: 구역이 높을수록 조금 더 아프게 (몸통 피해만큼 크게 오르지는 않게)
function bossDmg(x) { const sc = sectorScale(); return x * (1 + (sc.dmg - 1) * 0.6); }

// 바닥 예고 원: 시간이 다 되면 터짐 (빨강 = 피해, 초록 = 맹독, 파랑 = 둔화)
let bossHazards = [];
function addBossHazard(o) {
  bossHazards.push(Object.assign({ t: 1, max: 1, r: 80, dmg: 20, color: '#ef4444', debuff: null, linger: 0 }, o, { max: o.t || 1 }));
}

function bossCallout(e, sk) {
  const st = bossStyle(e);
  damageTexts.push({ x: e.x, y: e.y - st.h - 30, text: '『 ' + BOSS_SKILL_NAMES[sk] + ' 』', color: st.color, size: 20, life: 1.6, vy: -18 });
  e.bossAtk = e.bossAtkMax = 0.7; // 공격 그림 4장
}

// 매 프레임: 기술 차례 세기 + 돌진 처리 (07_update.js 보스 부분에서 부름)
function updateBossSkills(e, dt) {
  if (e.bossAtk > 0) e.bossAtk -= dt;
  const st = bossStyle(e);
  // 체력 절반 아래: 광폭 — 기술이 더 자주
  if (!e.enraged && e.hp < e.maxHp * 0.5) {
    e.enraged = true;
    damageTexts.push({ x: e.x, y: e.y - st.h - 60, text: '광폭(狂暴) — 마기가 폭주한다!', color: '#fca5a5', size: 18, life: 2.0, vy: -15 });
    createShockwave(e.x, e.y, 220, st.color);
    state.cameraShake = Math.max(state.cameraShake, 0.6);
  }
  // 돌진 중 (혈영섬)
  if (e.dash) {
    const d = e.dash;
    if (d.wait > 0) { d.wait -= dt; e.vx = 0; e.vy = 0; return; }
    const step = 1250 * dt;
    e.x += Math.cos(d.ang) * step; e.y += Math.sin(d.ang) * step; e.vx = 0; e.vy = 0;
    d.left -= step;
    if (Math.random() < 0.6) particles.push({ x: e.x, y: e.y - 60, vx: 0, vy: 0, color: st.color, radius: 10, life: 0.35, maxLife: 0.35 });
    if (!d.hit && Math.hypot(player.x - e.x, player.y - e.y) < e.radius + player.radius + 20 && !player.isDashing) {
      d.hit = true; playerTakeDamage(bossDmg(30));
    }
    if (d.left <= 0) {
      e.dash = null;
      createShockwave(e.x, e.y, 150, st.color);
      state.cameraShake = Math.max(state.cameraShake, 0.5);
      if (d.count > 1) { // 혈마교주는 연속 돌진
        e.dash = { wait: 0.35, ang: Math.atan2(player.y - e.y, player.x - e.x), left: 380, count: d.count - 1, hit: false };
        bossHazards.push({ line: true, x: e.x, y: e.y, ang: e.dash.ang, len: 380, t: 0.35, max: 0.35, r: 40, dmg: 0, color: st.color });
      }
    }
    return;
  }
  e.skillTimer = (e.skillTimer === undefined ? 3.0 : e.skillTimer) - dt;
  if (e.skillTimer > 0) return;
  e.skillIdx = ((e.skillIdx === undefined ? -1 : e.skillIdx) + 1) % st.skills.length;
  const sk = st.skills[e.skillIdx];
  e.skillTimer = e.enraged ? 3.4 : 4.8;
  bossCallout(e, sk);
  castBossSkill(e, sk, st);
}

function castBossSkill(e, sk, st) {
  const px = player.x, py = player.y;
  if (sk === 'blood_dash') {
    // 혈영섬: 0.7초 동안 붉은 선으로 예고 → 순식간에 돌진
    const ang = Math.atan2(py - e.y, px - e.x);
    const count = e.bossIdx === 4 ? (e.enraged ? 3 : 2) : 1;
    e.dash = { wait: 0.7, ang, left: 420, count, hit: false };
    bossHazards.push({ line: true, x: e.x, y: e.y, ang, len: 420, t: 0.7, max: 0.7, r: 40, dmg: 0, color: st.color });
    sound.playSwordSlash && sound.playSwordSlash();
  } else if (sk === 'blood_rain') {
    // 혈우강림: 주인공 둘레에 핏빛 원 6~8개 → 차례로 터짐
    const n = e.enraged ? 8 : 6;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = i === 0 ? 0 : 60 + Math.random() * 200;
      addBossHazard({ x: px + Math.cos(a) * r, y: py + Math.sin(a) * r * 0.75, r: 70, t: 0.9 + i * 0.12, dmg: bossDmg(24), color: st.color, fx: 'fx_bloodslash' });
    }
  } else if (sk === 'poison_breath') {
    // 독룡토식: 주인공 쪽 부채꼴로 독 표창 3겹
    const base = Math.atan2(py - e.y, px - e.x);
    [220, 290, 360].forEach((spd, w) => {
      for (let i = -4; i <= 4; i++) {
        const a = base + i * 0.12 + (w % 2) * 0.06;
        projectiles.push({ type: 'poison_shuriken', isEnemy: true, debuff: 'poison', x: e.x, y: e.y - 40, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 2.6, damage: bossDmg(14), radius: 11, color: '#22c55e' });
      }
    });
    createShockwave(e.x, e.y, 90, '#22c55e');
    sound.playPalmBlast();
  } else if (sk === 'poison_field') {
    // 만독장: 독 원 3개 → 터진 뒤 3초간 독 웅덩이 (들어가면 맹독)
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2, r = i === 0 ? 0 : 140 + Math.random() * 80;
      addBossHazard({ x: px + Math.cos(a) * r, y: py + Math.sin(a) * r * 0.75, r: 110, t: 1.1, dmg: bossDmg(18), color: '#22c55e', debuff: 'poison', linger: 3.5, fx: 'fx_poison' });
    }
  } else if (sk === 'needle_spiral') {
    // 만독침우: 소용돌이처럼 도는 보라 독침 3겹
    for (let ring = 0; ring < 3; ring++) {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + ring * 0.22;
        const spd = 170 + ring * 60;
        projectiles.push({ type: 'poison_shuriken', isEnemy: true, debuff: 'poison', x: e.x, y: e.y - 50, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 3.0, damage: bossDmg(13), radius: 10, color: '#c084fc' });
      }
    }
    particles.push({ fxKey: 'fx_needles', x: e.x, y: e.y - 60, vx: 0, vy: 0, size: 340, rot: Math.random() * 6.28, life: 0.5, maxLife: 0.5, tint: 'hue-rotate(60deg)' });
    sound.playPalmBlast();
  } else if (sk === 'bug_summon') {
    // 독충소환: 보스 둘레 땅에서 부패시귀 5~7마리
    const n = e.enraged ? 7 : 5;
    for (let i = 0; i < n && enemies.length < 90; i++) {
      const a = (i / n) * Math.PI * 2, x = e.x + Math.cos(a) * 130, y = e.y + Math.sin(a) * 90;
      createShockwave(x, y, 46, '#a855f7');
      enemies.push({ type: 'ghoul', name: '만독 독충', x, y, hp: 60 + state.gameTime * 0.8, maxHp: 60 + state.gameTime * 0.8, speed: 165, radius: 18, damage: 13, lungeTimer: 1.5, hitCooldown: 0, expVal: 1 });
    }
    sound.playPalmBlast();
  } else if (sk === 'ice_ring') {
    // 빙백한강: 보스 주변 큰 냉기 원 (멀리 피하면 안전) + 얼음 구슬 12발
    addBossHazard({ x: e.x, y: e.y, r: 270, t: 1.2, dmg: bossDmg(30), color: '#7dd3fc', debuff: 'slow', fx: 'fx_shield', fxTint: 'hue-rotate(160deg) brightness(1.2)' });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      projectiles.push({ type: 'curse_orb', isEnemy: true, debuff: 'slow', x: e.x, y: e.y - 50, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, life: 2.6, damage: bossDmg(14), radius: 13, color: '#7dd3fc' });
    }
  } else if (sk === 'ice_fall') {
    // 빙정낙하: 주인공 둘레에 얼음 결정 8~10개가 떨어짐 (맞으면 둔화)
    const n = e.enraged ? 10 : 8;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = i === 0 ? 0 : 50 + Math.random() * 240;
      addBossHazard({ x: px + Math.cos(a) * r, y: py + Math.sin(a) * r * 0.75, r: 62, t: 0.8 + i * 0.1, dmg: bossDmg(20), color: '#bae6fd', debuff: 'slow', fx: 'fx_thunder', fxTint: 'hue-rotate(180deg) saturate(0.6) brightness(1.3)', shard: true });
    }
  } else if (sk === 'blood_heaven') {
    // 혈마천강: 핏빛 탄환 2겹 + 주인공 자리 큰 원
    for (let ring = 0; ring < 2; ring++) {
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2 + ring * 0.16;
        projectiles.push({ type: 'blood_bullet', isEnemy: true, x: e.x, y: e.y - 50, vx: Math.cos(a) * (230 + ring * 80), vy: Math.sin(a) * (230 + ring * 80), life: 2.8, damage: bossDmg(20), color: '#dc2626', radius: 9 });
      }
    }
    addBossHazard({ x: px, y: py, r: 150, t: 1.3, dmg: bossDmg(34), color: '#dc2626', fx: 'fx_bloodslash' });
    createShockwave(e.x, e.y, 200, '#dc2626');
    state.cameraShake = Math.max(state.cameraShake, 0.5);
    sound.playPalmBlast();
  }
}

// 바닥 예고 원 처리 (07_update.js 에서 매 프레임)
function updateBossHazards(dt) {
  for (let i = bossHazards.length - 1; i >= 0; i--) {
    const h = bossHazards[i];
    if (h.lingering) {
      // 남은 독 웅덩이: 안에 있으면 0.5초마다 피해 + 맹독
      h.life -= dt; h.tick = (h.tick || 0) - dt;
      if (h.tick <= 0 && Math.hypot(player.x - h.x, (player.y - h.y) / 0.75) < h.r) {
        h.tick = 0.5; playerTakeDamage(h.dmg * 0.25); if (h.debuff) applyPlayerDebuff(h.debuff, 2.5);
      }
      if (h.life <= 0) bossHazards.splice(i, 1);
      continue;
    }
    h.t -= dt;
    if (h.t > 0) continue;
    if (!h.line) {
      if (Math.hypot(player.x - h.x, (player.y - h.y) / 0.75) < h.r + player.radius * 0.5 && !player.isDashing) {
        playerTakeDamage(h.dmg);
        if (h.debuff) applyPlayerDebuff(h.debuff, 3);
      }
      createShockwave(h.x, h.y, h.r, h.color);
      if (h.fx) particles.push({ fxKey: h.fx, x: h.x, y: h.y - (h.shard ? 30 : 10), vx: 0, vy: 0, size: h.r * 2.6, rot: h.shard ? 0 : Math.random() * 6.28, life: 0.45, maxLife: 0.45, tint: h.fxTint || null });
      if (h.r > 100) state.cameraShake = Math.max(state.cameraShake, 0.35);
    }
    if (h.linger) { h.lingering = true; h.life = h.linger; h.maxLife = h.linger; h.tick = 0.3; }
    else bossHazards.splice(i, 1);
  }
}

// 바닥 예고 원 그리기 (09_render_world.js, 독 웅덩이 다음)
function renderBossHazards() {
  for (const h of bossHazards) {
    ctx.save();
    if (h.lingering) {
      const a = Math.min(1, h.life / 0.6, (h.maxLife - h.life) / 0.3);
      drawFxImage('fx_poison', h.x, h.y, h.r * 2.4, 0.8 * a, 0, 0.75, 'hue-rotate(-20deg) saturate(1.3)');
      ctx.restore();
      continue;
    }
    const p = 1 - Math.max(0, h.t) / h.max; // 0 → 1 (터지는 순간)
    if (h.line) {
      // 돌진 예고: 앞으로 뻗는 붉은 띠
      ctx.translate(h.x, h.y); ctx.rotate(h.ang);
      ctx.globalAlpha = 0.18 + p * 0.25; ctx.fillStyle = h.color;
      ctx.fillRect(0, -h.r, h.len, h.r * 2);
      ctx.globalAlpha = 0.7; ctx.strokeStyle = h.color; ctx.lineWidth = 2;
      ctx.strokeRect(0, -h.r, h.len * p, h.r * 2);
    } else {
      ctx.translate(h.x, h.y); ctx.scale(1, 0.75);
      ctx.globalAlpha = 0.6; ctx.strokeStyle = h.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, h.r, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.12 + p * 0.3; ctx.fillStyle = h.color;
      ctx.beginPath(); ctx.arc(0, 0, h.r * p, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

// 최종보스 그리기 (10_render_actors.js 보스 부분에서 부름). 발 기준 좌표계에서 호출됨. 키(h)를 돌려줌
function drawBossBody(e, isMoving) {
  const st = bossStyle(e);
  const hit = e.hitCooldown > 0.06 ? 'brightness(2.0) saturate(0.4)' : null;
  if (bossArtReady(e)) {
    let key;
    if (e.bossAtk > 0 || (e.dash && e.dash.wait <= 0)) {
      const prog = e.dash ? 0.4 : 1 - e.bossAtk / (e.bossAtkMax || 0.7);
      key = st.art + '_attack_' + Math.max(0, Math.min(3, Math.floor(prog * 4)));
    } else if (isMoving) {
      key = st.art + '_walk_' + (Math.floor((e.gait || 0) * 2) % 4);
    } else key = st.art + '_walk_1';
    const img = SPRITES[key] && SPRITES[key].complete && SPRITES[key].naturalWidth ? SPRITES[key] : SPRITES[st.art + '_walk_0'];
    const k = st.h / 300;
    ctx.drawImage(tinted(img, hit), -220 * k, -320 * k + 4, 440 * k, 340 * k);
  } else {
    const img = SPRITES.boss_demon;
    const bh = st.h, bw = bh * 0.75;
    if (img && img.complete) ctx.drawImage(tinted(img, hit || st.filter), -bw / 2, -bh + 20, bw, bh);
  }
  return st.h;
}

// 중간보스 모습: 관문마다 그림 종류 + 구역 색이 달라짐
const MB_SECTOR_TINT = [null, 'hue-rotate(160deg) saturate(1.2)', 'hue-rotate(90deg) saturate(1.4)', 'grayscale(0.4) sepia(0.8) hue-rotate(170deg) saturate(1.8) brightness(1.1)', 'saturate(1.6) hue-rotate(-15deg) brightness(0.9)'];
function miniBossLook(e) {
  if (e._look) return e._look;
  const n = e.name || '';
  // 이름별 그림 (2026-11-10: 새 몬스터 그림 7종이 생겨 중간보스마다 어울리는 그림으로)
  const BY_NAME = {
    '흑호 정찰대장': 'mob_assassin', '흑풍 돌격도두': 'mob_barbarian', '마교 혈호사자': 'mob_assassin',
    '하오문 척후조장': 'mob_assassin', '녹혈 독술장로': 'mob_necromancer', '중장 철갑마인': 'mob_butcher',
    '독충 조련사': 'mob_curse_mage', '천년 강시왕': 'mob_jiangshi', '만독 괴마인': 'mob_ghoul',
    '서리 살수장': 'mob_ice_sword', '설산 백발마인': 'mob_ice_mage', '빙백 수호수': 'mob_yeti',
    '정예 혈기사장': 'mob_skeleton', '마교 우호법': 'mob_barbarian', '삼천혈해 사자': 'mob_sorceress'
  };
  let art = BY_NAME[n] || null;
  if (!art) { // 목록에 없는 이름은 글자로 짐작
    if (/살수|척후|정찰|사자|기사/.test(n)) art = 'mob_assassin';
    else if (/독술|주술|조련|수호|괴마/.test(n)) art = 'mob_dartman';
    else if (/강시/.test(n)) art = 'mob_jiangshi';
  }
  if (art && !SPRITES[art + '_walk_0']) art = null; // 그림을 못 불러왔으면 예전 그림
  const sec = Math.max(0, Math.min(4, (currentSelectedSector || 1) - 1));
  const H = { mob_butcher: 250, mob_ghoul: 190, mob_yeti: 310 };
  const own = art && /^mob_(ice_|yeti)/.test(art); // 빙궁 전용 그림은 색 바꾸지 않음
  e._look = { art, filter: own ? null : MB_SECTOR_TINT[sec], h: art ? (H[art] || 215) : 0 };
  return e._look;
}
// 중간보스 기술 고르기: 모습에 맞게 (0 돌진 베기 / 1 암기 폭풍 / 2 혈파 강타)
// 살수·쌍도형: 돌진 위주 / 술사형: 암기·혈파 / 중장·시체형: 혈파·돌진
function pickMiniBossSkill(e) {
  const art = miniBossLook(e).art;
  const r = Math.random();
  if (art === 'mob_assassin' || art === 'mob_barbarian') return r < 0.6 ? 0 : 1;
  if (art === 'mob_dartman' || art === 'mob_necromancer' || art === 'mob_curse_mage' || art === 'mob_sorceress') return r < 0.6 ? 1 : 2;
  if (art === 'mob_jiangshi' || art === 'mob_butcher' || art === 'mob_ghoul' || art === 'mob_skeleton') return r < 0.6 ? 2 : 0;
  return r < 0.45 ? 2 : (r < 0.8 ? 0 : 1);
}

// 보스 만들 때 구역 번호·크기 붙이기 (05_items_spawn.js 의 spawnSectorBoss 를 감쌈)
const _spawnSectorBossBase = spawnSectorBoss;
spawnSectorBoss = function (bossName) {
  _spawnSectorBossBase(bossName);
  const b = state.boss;
  if (!b) return;
  b.bossIdx = Math.max(0, Math.min(4, (currentSelectedSector || 1) - 1));
  b.radius = b.bossIdx === 4 ? 70 : 62;
  b.skillTimer = 3.0;
  bossHazards.length = 0;
};
