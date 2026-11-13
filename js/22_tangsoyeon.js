// ============================================================
// 당소연(서천 당문 소가주) — 암기·독 원거리 협객 (2026-11-13)
// - 기본 공격: 칼 베기 대신 은침 던지기 3단 (1·2타: 은침 3발, 3타: 독침 7발 부채꼴)
//   맞으면 피해 + 맹독(초당 피해, 당소연은 독 1.5배). 근거리와 같은 구역 배율
// - 06_skills_combat.js 의 triggerMeleeAttack 맨 앞에서 tangThrow 로 넘어옴
// - 날아가는 침: updatePlumTrees(매 프레임) · drawPlumTrees(세상 그리기)를 감싸서 움직이고 그림
// - 개방: 5구역 돌파 + 은자 8,000 (03_menu.js HERO_UNLOCK)
// ============================================================
const tangNeedles = [];
const TANG = { speed: 950, life: 0.42, range: 300 };

function tangThrow(target) {
  const tx = target ? target.x : player.x + player.facing * 100;
  const ty = target ? target.y : player.y;
  const aim = Math.atan2(ty - player.y, tx - player.x);
  player.attackCombo = ((player.attackCombo || 0) + 1) % 3;
  player.skillPose = null;
  const fin = player.attackCombo === 2;
  player.isAttacking = true;
  player.attackDuration = fin ? 0.32 : 0.24;
  player.attackTimer = player.attackDuration;
  player.attackCooldownTimer = Math.max(0.36, 0.56 - player.level * 0.01) * (fin ? 1.25 : 0.9);
  player.attackAim = aim;
  if (Math.cos(aim) < -0.15) player.facing = -1; else if (Math.cos(aim) > 0.15) player.facing = 1;

  const SEC_K = (typeof sectorScale === 'function') ? sectorScale().hp : 1;
  const n = (fin ? 7 : 3) + (player.bonusProjectile || 0);
  const spread = fin ? 0.9 : 0.22;
  const dmg = (26 + player.level * 3.2) * player.atkMultiplier * SEC_K * (fin ? 0.9 : 1); // 한 발은 약하지만 여러 발 + 독
  const sx = player.x + Math.cos(aim) * 26, sy = player.y - 46;
  for (let i = 0; i < n; i++) {
    const a = aim + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0) + (Math.random() - 0.5) * 0.04;
    tangNeedles.push({ x: sx, y: sy, vx: Math.cos(a) * TANG.speed, vy: Math.sin(a) * TANG.speed, life: TANG.life, dmg, poison: fin, a });
  }
  try { sound.playSample('wx_swing', fin ? 0.4 : 0.25, fin ? 0.9 : 1.4, 0.15, 0.04); } catch (e) {}
}

function updateTangNeedles(dt) {
  for (let i = tangNeedles.length - 1; i >= 0; i--) {
    const p = tangNeedles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    let hit = null;
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      const r = (e.radius || 18) + 6;
      if (Math.abs(e.x - p.x) < r && Math.abs(e.y - 30 - p.y) < r + 20 && Math.hypot(e.x - p.x, (e.y - 30) - p.y) < r + 14) { hit = e; break; }
    }
    if (hit) {
      dealDamage(hit, p.dmg, true);
      hit.squashT = 0.12;
      // 맹독: 3타 독침은 강하게, 1·2타도 약하게 (당소연 독 배율)
      applyPoison(hit, p.poison ? 3 : 2, p.dmg * (p.poison ? 0.5 : 0.2) * (player.poisonDmgMult || 1));
      if (hit.hp <= 0 && typeof spawnInkSplash === 'function') spawnInkSplash(hit.x, hit.y, p.a, p.poison);
      if (!hit.isBoss) { hit.knockbackVx = Math.cos(p.a) * 120; hit.knockbackVy = Math.sin(p.a) * 120; }
      tangNeedles.splice(i, 1);
      continue;
    }
    if (p.life <= 0) tangNeedles.splice(i, 1);
  }
}

function drawTangNeedles() {
  if (!tangNeedles.length) return;
  ctx.save();
  ctx.lineCap = 'round';
  for (const p of tangNeedles) {
    const tail = 26;
    ctx.strokeStyle = p.poison ? 'rgba(74, 222, 128, 0.5)' : 'rgba(226, 232, 240, 0.45)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(p.x - Math.cos(p.a) * tail, p.y - Math.sin(p.a) * tail); ctx.lineTo(p.x, p.y); ctx.stroke();
    ctx.strokeStyle = p.poison ? '#86efac' : '#f8fafc';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p.x - Math.cos(p.a) * 12, p.y - Math.sin(p.a) * 12); ctx.lineTo(p.x, p.y); ctx.stroke();
  }
  ctx.restore();
}

if (typeof updatePlumTrees === 'function') {
  const _u = updatePlumTrees;
  updatePlumTrees = function (dt) { _u(dt); updateTangNeedles(dt); };
}
if (typeof drawPlumTrees === 'function') {
  const _d = drawPlumTrees;
  drawPlumTrees = function () { _d(); drawTangNeedles(); };
}
