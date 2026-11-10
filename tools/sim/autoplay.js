// 난이도 점검용 자동 플레이 (게임 화면 없이 시간을 빨리 돌림)
// 브라우저 콘솔(또는 헤드리스)에서: 이 파일을 불러온 뒤 runSim(구역번호, {difficulty:'normal'})
// 봇: 가까운 적을 피해 다니고(가까울수록 강하게), 적이 멀면 진기를 주우러 감, 붙으면 경공. 레벨업은 맨 앞 카드.
// 결과: 클리어/사망, 걸린 시간, 레벨, 처치 수, 관문별 최저 체력 등
function simBotInput() {
  let rx = 0, ry = 0, nearest = 1e9;
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const dx = player.x - e.x, dy = player.y - e.y;
    const d2 = dx * dx + dy * dy;
    const d = Math.sqrt(d2) || 1;
    if (d < nearest) nearest = d;
    if (d > 300) continue;
    const w = (e.isBoss || e.isMiniBoss ? 3 : 1) / Math.max(400, d2);
    rx += dx / d * w * 1e4; ry += dy / d * w * 1e4;
  }
  // 적이 멀면 가까운 진기 쪽으로
  if (nearest > 140 && expGems.length) {
    let g = null, gd = 350;
    for (const q of expGems) { const d = Math.hypot(q.x - player.x, q.y - player.y); if (d < gd) { gd = d; g = q; } }
    if (g) { rx += (g.x - player.x) / gd * 0.6; ry += (g.y - player.y) / gd * 0.6; }
  }
  // 시작 지점에서 너무 멀어지지 않게 (맵 끝 없음, 그냥 원 안에서 맴돌기)
  const hd = Math.hypot(player.x, player.y);
  if (hd > 900) { rx -= player.x / hd * 0.5; ry -= player.y / hd * 0.5; }
  const len = Math.hypot(rx, ry);
  if (len > 0.05) { joyInputX = rx / len; joyInputY = ry / len; touchActive = true; }
  else { touchActive = false; joyInputX = 0; joyInputY = 0; }
  if (nearest < 55 && player.dashTimer <= 0 && !player.isDashing) triggerDash();
}
function simResolvePause() {
  const lv = document.getElementById('levelUpModal');
  if (lv && lv.style.display === 'flex') { const c = lv.querySelector('.skill-card'); if (c) { c.click(); return true; } }
  const tr = document.getElementById('treasureModal');
  if (tr && tr.style.display === 'flex') { const b = tr.querySelector('button'); if (b) { b.click(); return true; } }
  return false;
}
// 결과를 글자로 (오류가 나면 오류 내용과 위치)
function runSimJSON(sector, opt) {
  try { return JSON.stringify(runSim(sector, opt || { difficulty: 'normal' })); }
  catch (e) { return 'ERR ' + e.message + ' @ ' + String(e.stack || '').split(String.fromCharCode(10)).slice(0, 4).join(' | '); }
}
function runSim(sector, opt = {}) {
  try { localStorage.setItem('wuxia_tutorial_v1', 'done'); } catch (e) {}
  if (opt.difficulty) difficultyKey = opt.difficulty;
  unlockedSectors = [1, 2, 3, 4, 5];
  selectSector(sector);
  confirmStartGame();
  if (opt.noTraining) { /* 문파 수련 없이 (기본값: 저장된 수련 그대로) */ }
  const DT = 1 / 30, maxT = opt.maxT || 900;
  const log = { sector, zones: {}, levelAt: {} };
  let lastZone = 0, minHp = 1e9, tookDmg = 0, prevHp = player.hp;
  const t0 = performance.now();
  while (state.gameTime < maxT) {
    if (state.isGameOver) break;
    if (state.isPaused) { if (!simResolvePause()) { state.isPaused = false; state.isLevelingUp = false; } continue; }
    if (state.hitStop > 0) state.hitStop = 0;
    simBotInput();
    updateGame(DT);
    if (player.hp < prevHp) tookDmg += prevHp - player.hp;
    prevHp = player.hp;
    const z = state.currentZone || 1;
    if (z !== lastZone) { if (lastZone) log.zones[lastZone] = { minHpPct: Math.round(minHp / player.maxHp * 100), dmgTaken: Math.round(tookDmg) }; lastZone = z; minHp = 1e9; tookDmg = 0; log.levelAt[z] = player.level; }
    minHp = Math.min(minHp, player.hp);
    if (state.bossDefeated) break;
  }
  log.zones[lastZone] = { minHpPct: Math.round(minHp / player.maxHp * 100), dmgTaken: Math.round(tookDmg) };
  log.result = state.bossDefeated ? '클리어' : (player.hp <= 0 ? '사망' : '시간초과');
  log.time = Math.round(state.gameTime);
  log.zoneAtEnd = state.currentZone;
  log.level = player.level;
  log.kills = state.kills;
  log.enemiesAlive = enemies.length;
  log.cpuMs = Math.round(performance.now() - t0);
  touchActive = false; joyInputX = 0; joyInputY = 0;
  return log;
}
