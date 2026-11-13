// ============================================================
// 협객 전용 무공 (2026-11-13 사용자: "매화검은 검술이니 서진만, 현운은 근거리·밀치기·금강불괴 위 단계,
//   당소연은 독 관련" / 벽공장 → 백보신권)
// - SKILL_DEFS 에 hero 가 적힌 무공은 그 협객의 레벨업 카드에만 나옴 (skillAllowed)
// - 협객마다 시작 무공 + 고유 무공 1 은 처음부터 1단계, 고유 무공 2 는 레벨업으로
//     서진: 매화검법 · 발도일섬(iaido) · 검막(sword_curtain)
//     현운: 백보신권(palm_blast) · 진각(jingak, 21_hyunwoon.js) · 반탄강기(reflect)
//     당소연: 만천화우(dagger_rain) · 천라지망(tianluo) · 폭독(poison_burst)
//   공용: 벽력탄 · 답설무흔 · 금강불괴 · 흡성대법
// - 수동 모드 무공 버튼(Q·E·R·F)도 협객마다 다르게 (setActiveSlotsForHero)
// - 아이콘 그림이 없는 무공은 글자 아이콘 (assets/icons/<id>.png 가 생기면 img 만 적으면 됨)
// ============================================================
SKILL_DEFS.flying_swords.hero = 'seojin';
SKILL_DEFS.palm_blast.hero = 'hyunwoon';
SKILL_DEFS.dagger_rain.hero = 'tangsoyeon';

Object.assign(SKILL_DEFS, {
  iaido: {
    id: 'iaido', hero: 'seojin', name: '발도일섬 (拔刀一閃)', icon: '⚡', maxLevel: 5,
    desc: '적이 가장 길게 늘어선 쪽으로 검기를 한 줄로 뽑아 그 길 위의 적을 모두 벱니다.',
    getUpgradeDesc: l => l === 1 ? '늘어선 적을 한 줄로 베는 검기' : `검기 길이·피해 증가, 더 자주 (Lv.${l})`
  },
  sword_curtain: {
    id: 'sword_curtain', hero: 'seojin', name: '검막 (劍幕)', icon: '🌀', maxLevel: 5,
    desc: '몸 둘레를 검기가 돌며 다가오는 적을 베고, 날아오는 암기와 화살을 막아냅니다.',
    getUpgradeDesc: l => l === 1 ? '도는 검기 2자루 · 투사체 막기' : `검기 +1자루, 피해 증가 (Lv.${l})`
  },
  jingak: {
    id: 'jingak', hero: 'hyunwoon', name: '진각 (震脚)', icon: '🦶', img: 'assets/icons/jingak.png', maxLevel: 5,
    desc: '발을 굴러 금빛 충격파로 둘레 적에게 피해를 주고 밀어내며 잠깐 기절시킵니다.',
    getUpgradeDesc: l => l === 1 ? '둘레 적 기절 충격파' : `범위·피해 증가, 더 자주 (Lv.${l})`
  },
  reflect: {
    id: 'reflect', hero: 'hyunwoon', name: '반탄강기 (反彈罡氣)', icon: '🔆', maxLevel: 5,
    desc: '금강불괴의 위 단계. 받는 피해를 줄이고, 맞을 때마다 둘레 적에게 피해를 되돌려주며 튕겨냅니다.',
    getUpgradeDesc: l => l === 1 ? '받는 피해 -6% · 맞으면 반격 충격' : `피해 감소·반격 피해 증가 (Lv.${l})`
  },
  tianluo: {
    id: 'tianluo', hero: 'tangsoyeon', name: '천라지망 (天羅地網)', icon: '🕸️', maxLevel: 5,
    desc: '둘레에 은침 그물을 펼쳐 걸린 적을 묶고 맹독에 빠뜨립니다.',
    getUpgradeDesc: l => l === 1 ? '그물로 묶기 · 맹독' : `그물 범위·독·묶는 시간 증가 (Lv.${l})`
  },
  poison_burst: {
    id: 'poison_burst', hero: 'tangsoyeon', name: '폭독 (爆毒)', icon: '☣️', maxLevel: 5,
    desc: '중독된 적이 쓰러지면 독이 터져 둘레 적에게 피해를 주고 맹독을 옮깁니다.',
    getUpgradeDesc: l => l === 1 ? '중독된 적이 터지며 독을 옮김' : `터지는 범위·피해 증가 (Lv.${l})`
  }
});
const HERO_UNIQUE = { seojin: 'iaido', hyunwoon: 'jingak', tangsoyeon: 'tianluo' };
function skillAllowed(key) {
  const d = SKILL_DEFS[key];
  return !!d && (!d.hero || d.hero === (player.heroId || 'seojin'));
}
const secK = () => (typeof sectorScale === 'function' ? sectorScale().hp : 1);
const lvOf = id => player.skills[id] || 0;

// ── 판 시작: 고유 무공 1단계 + 수동 버튼 ──
if (typeof confirmStartGame === 'function') {
  const _cs = confirmStartGame;
  confirmStartGame = function () {
    const r = _cs.apply(this, arguments);
    const u = HERO_UNIQUE[player.heroId || 'seojin'];
    if (u) player.skills[u] = Math.max(1, player.skills[u] || 0);
    player.timers = player.timers || {};
    for (const k of ['iaido', 'tianluo']) player.timers[k] = 0;
    heroFx.length = 0; curtainAngle = 0;
    if (typeof setActiveSlotsForHero === 'function') setActiveSlotsForHero(player.heroId || 'seojin');
    return r;
  };
}

const heroFx = []; // 그리기용 잠깐 효과 (일섬 선, 그물)
let curtainAngle = 0, curtainTick = 0;

// ── 발도일섬: 적이 가장 많이 늘어선 방향으로 한 줄 ──
function castIaido() {
  const lv = Math.max(1, lvOf('iaido'));
  const len = 360 + lv * 40, width = 46;
  let best = null, bestN = 0;
  for (let k = 0; k < 16; k++) {
    const a = k * Math.PI / 8, cx = Math.cos(a), cy = Math.sin(a);
    let n = 0;
    for (const e of enemies) { if (e.hp <= 0) continue; const dx = e.x - player.x, dy = e.y - player.y, t = dx * cx + dy * cy; if (t > 0 && t < len && Math.abs(dx * cy - dy * cx) < width) n++; }
    if (n > bestN) { bestN = n; best = a; }
  }
  if (best === null) best = player.facing < 0 ? Math.PI : 0;
  const cx = Math.cos(best), cy = Math.sin(best);
  const dmg = (90 + lv * 35 + player.level * 4) * player.atkMultiplier * secK();
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const dx = e.x - player.x, dy = e.y - player.y, t = dx * cx + dy * cy;
    if (t > 0 && t < len && Math.abs(dx * cy - dy * cx) < width + (e.radius || 0)) {
      dealDamage(e, dmg, true); e.squashT = 0.2;
      if (e.hp <= 0 && typeof spawnInkSplash === 'function') spawnInkSplash(e.x, e.y, best, true);
    }
  }
  if (Math.cos(best) < -0.15) player.facing = -1; else if (Math.cos(best) > 0.15) player.facing = 1;
  triggerSkillMotion('sword', 0.35);
  heroFx.push({ type: 'slash', x: player.x, y: player.y - 40, a: best, len, life: 0.3, max: 0.3 });
  state.hitStop = Math.max(state.hitStop || 0, 0.06);
  state.screenShake = Math.max(state.screenShake || 0, 7);
  try { sound.playSample('wx_slash_heavy', 0.6, 1.15, 0.05, 0.1); } catch (e) {}
}

// ── 천라지망: 둘레 그물 — 묶고 맹독 ──
function castTianluo() {
  const lv = Math.max(1, lvOf('tianluo'));
  const R = 160 + lv * 16;
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const d = Math.hypot(e.x - player.x, e.y - player.y);
    if (d > R + (e.radius || 0)) continue;
    if (!e.isBoss) e.stunTimer = Math.max(e.stunTimer || 0, (e.isMiniBoss ? 0.5 : 1.1) + lv * 0.12);
    applyPoison(e, 3 + lv * 0.4, (12 + lv * 7 + player.level) * player.atkMultiplier * secK() * (player.poisonDmgMult || 1));
    dealDamage(e, (20 + lv * 10) * player.atkMultiplier * secK(), false);
  }
  triggerSkillMotion('rain', 0.4);
  heroFx.push({ type: 'net', x: player.x, y: player.y, r: R, life: 0.7, max: 0.7 });
  try { sound.playSample('wx_swing', 0.5, 0.8, 0.1, 0.1); } catch (e) {}
}

// ── 매 프레임 ──
function updateHeroSkills(dt) {
  if (!state.isGameStarted) return;
  for (let i = heroFx.length - 1; i >= 0; i--) { heroFx[i].life -= dt; if (heroFx[i].life <= 0) heroFx.splice(i, 1); }
  // 발도일섬 (수동 모드면 버튼으로)
  if (lvOf('iaido') > 0) {
    const iv = Math.max(3.2, 7 - lvOf('iaido') * 0.6);
    if (!(typeof activeSkillTick === 'function' && activeSkillTick('iaido', iv, dt))) {
      player.timers.iaido = (player.timers.iaido || 0) + dt;
      if (player.timers.iaido >= iv && enemies.some(e => e.hp > 0 && Math.hypot(e.x - player.x, e.y - player.y) < 420)) { player.timers.iaido = 0; castIaido(); }
    }
  }
  // 천라지망
  if (lvOf('tianluo') > 0) {
    const iv = Math.max(3.8, 7.5 - lvOf('tianluo') * 0.6);
    if (!(typeof activeSkillTick === 'function' && activeSkillTick('tianluo', iv, dt))) {
      player.timers.tianluo = (player.timers.tianluo || 0) + dt;
      const R = 160 + lvOf('tianluo') * 16;
      if (player.timers.tianluo >= iv && enemies.some(e => e.hp > 0 && Math.hypot(e.x - player.x, e.y - player.y) < R)) { player.timers.tianluo = 0; castTianluo(); }
    }
  }
  // 검막: 늘 도는 검기
  const cl = lvOf('sword_curtain');
  if (cl > 0) {
    curtainAngle += dt * 3.2;
    curtainTick -= dt;
    const R = 95, n = cl + 1;
    if (curtainTick <= 0) {
      curtainTick = 0.25;
      const dmg = (18 + cl * 9 + player.level * 1.5) * player.atkMultiplier * secK();
      for (const e of enemies) { if (e.hp <= 0) continue; const d = Math.hypot(e.x - player.x, e.y - player.y); if (d < R + 30 + (e.radius || 0) && d > R - 45) { dealDamage(e, dmg, false); e.squashT = 0.1; } }
    }
    // 날아오는 적 투사체 막기 (검기 수에 따라 0.25초마다 몇 개)
    let blocks = n;
    for (let i = projectiles.length - 1; i >= 0 && blocks > 0; i--) {
      const p = projectiles[i];
      if (!p.isEnemy) continue;
      const d = Math.hypot(p.x - player.x, p.y - player.y);
      if (d < R + 15) { PixelFX.spawnHitSparks(p.x, p.y, '#93c5fd', 5); projectiles.splice(i, 1); blocks--; }
    }
  }
}

// ── 반탄강기: 받는 피해 줄이기 + 맞을 때 반격 충격 ──
if (typeof playerTakeDamage === 'function') {
  const _pt = playerTakeDamage;
  playerTakeDamage = function (amount) {
    const lv = lvOf('reflect');
    if (lv <= 0 || state.isGodMode) return _pt(amount);
    _pt(amount * (1 - 0.06 * lv));
    if (player._reflectAt && state.gameTime - player._reflectAt < 0.6 && player._reflectAt <= state.gameTime) return;
    player._reflectAt = state.gameTime;
    const R = 120 + lv * 10, dmg = (amount * 2 + 30 + lv * 18) * player.atkMultiplier * secK();
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      const dx = e.x - player.x, dy = e.y - player.y, d = Math.hypot(dx, dy);
      if (d > R + (e.radius || 0)) continue;
      dealDamage(e, dmg, false);
      if (!e.isBoss) { const k = e.isMiniBoss ? 0.3 : 1; e.knockbackVx = dx / (d || 1) * 420 * k; e.knockbackVy = dy / (d || 1) * 420 * k; e.stunTimer = Math.max(e.stunTimer || 0, 0.25); }
    }
    createShockwave(player.x, player.y - 30, R, 'rgba(250, 204, 21, 0.85)');
  };
}

// ── 폭독: 중독된 채 쓰러지면 터짐 (한 프레임에 너무 많이 터지지 않게) ──
let burstBudget = 0, burstFrame = -1;
if (typeof onEnemyKilled === 'function') {
  const _ok = onEnemyKilled;
  onEnemyKilled = function (target) {
    const was = target && !target._dead && target.poisonTimer > 0;
    const r = _ok.apply(this, arguments);
    const lv = lvOf('poison_burst');
    if (was && lv > 0) {
      if (burstFrame !== state.gameTime) { burstFrame = state.gameTime; burstBudget = 8; }
      if (burstBudget-- > 0) {
        const R = 85 + lv * 12, dmg = (28 + lv * 14 + player.level * 1.5) * player.atkMultiplier * secK() * (player.poisonDmgMult || 1);
        for (const e of enemies) {
          if (e === target || e.hp <= 0 || e._dead) continue;
          if (Math.hypot(e.x - target.x, e.y - target.y) > R + (e.radius || 0)) continue;
          dealDamage(e, dmg, false);
          applyPoison(e, 2.5, dmg * 0.35);
        }
        createShockwave(target.x, target.y - 20, R, 'rgba(74, 222, 128, 0.85)');
      }
    }
    return r;
  };
}

// ── 그리기 ──
function drawHeroSkills() {
  ctx.save();
  for (const f of heroFx) {
    const k = f.life / f.max;
    if (f.type === 'slash') {
      ctx.save();
      ctx.translate(f.x, f.y); ctx.rotate(f.a);
      ctx.globalAlpha = k;
      ctx.fillStyle = 'rgba(186, 230, 253, 0.35)'; ctx.fillRect(0, -18 * k, f.len, 36 * k);
      ctx.strokeStyle = '#e0f2fe'; ctx.lineWidth = 4 * k + 1;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(f.len, 0); ctx.stroke();
      ctx.restore();
    } else if (f.type === 'net') {
      ctx.globalAlpha = k * 0.9;
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.85)'; ctx.lineWidth = 1.5;
      const R = f.r * (1.15 - 0.15 * k);
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + Math.cos(a) * R, f.y + Math.sin(a) * R * 0.7); ctx.stroke(); }
      for (const q of [0.35, 0.65, 1]) { ctx.beginPath(); ctx.ellipse(f.x, f.y, R * q, R * q * 0.7, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.6)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(f.x, f.y, R, R * 0.7, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  const cl = lvOf('sword_curtain');
  if (cl > 0 && state.isGameStarted) {
    const n = cl + 1, R = 95;
    for (let i = 0; i < n; i++) {
      const a = curtainAngle + i * Math.PI * 2 / n;
      const x = player.x + Math.cos(a) * R, y = player.y - 30 + Math.sin(a) * R * 0.6;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = 'rgba(147, 197, 253, 0.85)'; ctx.strokeStyle = '#1e3a8a'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(4, 10); ctx.lineTo(0, 14); ctx.lineTo(-4, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}

if (typeof updatePlumTrees === 'function') {
  const _u = updatePlumTrees;
  updatePlumTrees = function (dt) { _u(dt); updateHeroSkills(dt); };
}
if (typeof drawPlumTrees === 'function') {
  const _d = drawPlumTrees;
  drawPlumTrees = function () { _d(); drawHeroSkills(); };
}
