// ============================================================
// 현운(권사) 고유 무공 — 진각(震脚) (2026-11-13)
// - 현운으로 출전하면 처음부터 저절로: 둘레에 적이 있으면 발을 굴러 금빛 충격파
// - 둘레 적에게 피해 + 바깥으로 밀어냄 + 잠깐 기절 (보스는 피해만)
// - 대기 시간은 레벨이 오를수록 조금씩 짧아짐 (6초 → 최소 3.5초)
// - 매 프레임 부르는 곳: 06_skills_combat.js 의 updatePlumTrees 를 감싸서 (updateSkills 안에서 불림)
// ============================================================
const JINGAK = { base: 6, min: 3.5, perLevel: 0.08, radius: 175, push: 380, stun: 0.9 };
function jingakInterval() { return Math.max(JINGAK.min, JINGAK.base - (player.level || 1) * JINGAK.perLevel); }

function castJingak() {
  const R = JINGAK.radius;
  let hits = 0;
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const dx = e.x - player.x, dy = e.y - player.y, d = Math.hypot(dx, dy);
    if (d > R + (e.radius || 0)) continue;
    hits++;
    dealDamage(e, (70 + (player.level || 1) * 8) * player.atkMultiplier, true);
    if (!e.isBoss) {
      const k = e.isMiniBoss ? 0.35 : 1, a = Math.atan2(dy, dx);
      e.knockbackVx = Math.cos(a) * JINGAK.push * k * (player.knockbackMult || 1);
      e.knockbackVy = Math.sin(a) * JINGAK.push * k * (player.knockbackMult || 1);
      e.stunTimer = Math.max(e.stunTimer || 0, e.isMiniBoss ? JINGAK.stun * 0.4 : JINGAK.stun);
    }
  }
  // 발 구르는 자세 + 금빛 고리 두 겹 + 흙먼지
  triggerSkillMotion('jingak', 0.45);
  createShockwave(player.x, player.y, R, 'rgba(251, 191, 36, 0.9)');
  createShockwave(player.x, player.y, R * 0.6, 'rgba(253, 230, 138, 0.8)');
  const k = state.frameK || 1;
  for (let i = 0; i < Math.round(26 * k); i++) {
    const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 220;
    particles.push({ x: player.x + Math.cos(a) * 20, y: player.y + Math.sin(a) * 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 - 30, color: Math.random() < 0.5 ? 'rgba(214, 180, 120, 0.7)' : 'rgba(251, 191, 36, 0.75)', radius: 4 + Math.random() * 5, life: 0.5, maxLife: 0.5 });
  }
  state.screenShake = Math.max(state.screenShake || 0, 9);
  try { sound.playSample('wx_heavy', 0.6, 1, 0.05, 0.2); } catch (e) {}
  damageTexts.push({ x: player.x, y: player.y - 110, text: '진각 (震脚)!', color: '#fbbf24', size: 18, life: 0.9, vy: -30 });
  return hits;
}

function updateJingak(dt) {
  if (player.heroId !== 'hyunwoon' || !state.isGameStarted) return;
  player.jingakTimer = (player.jingakTimer || 0) + dt;
  if (player.jingakTimer < jingakInterval()) return;
  // 둘레에 적이 있을 때만 (헛발질하지 않게)
  const R = JINGAK.radius;
  const any = enemies.some(e => e.hp > 0 && Math.abs(e.x - player.x) < R && Math.abs(e.y - player.y) < R && Math.hypot(e.x - player.x, e.y - player.y) < R + (e.radius || 0));
  if (!any) { player.jingakTimer = jingakInterval(); return; }
  player.jingakTimer = 0;
  castJingak();
}

if (typeof updatePlumTrees === 'function') {
  const _upt = updatePlumTrees;
  updatePlumTrees = function (dt) { _upt(dt); updateJingak(dt); };
}
