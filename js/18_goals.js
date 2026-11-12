// ============================================================
// 오늘의 과제(하루 3개, 날짜가 바뀌면 새로) + 업적(한 번만) — 이루면 은자를 바로 줌
// 판이 끝날 때(은자 지급 직후) 이번 판 기록으로 진행을 더하고, 결과 창에 '달성!' 줄을 붙임
// 저장: localStorage 'wuxia_goals_v1' = { day, daily:[{id,goal,reward,prog,done}], stats:{...}, ach:{id:true} }
// ============================================================
const GOALS_KEY = 'wuxia_goals_v1';

// 업적: test(통계) → 달성 여부, prog(통계) → 지금 값 (진행 막대용)
const ACHIEVEMENTS = [
  { id: 'clear1', icon: '🎋', name: '죽림을 넘어', desc: '제1구역 돌파', goal: 1, prog: s => s.clears[1] ? 1 : 0, reward: 50 },
  { id: 'clear2', icon: '🏮', name: '하오문 정벌', desc: '제2구역 돌파', goal: 1, prog: s => s.clears[2] ? 1 : 0, reward: 100 },
  { id: 'clear3', icon: '🐍', name: '만독을 이기다', desc: '제3구역 돌파', goal: 1, prog: s => s.clears[3] ? 1 : 0, reward: 150 },
  { id: 'clear4', icon: '❄️', name: '빙궁을 깨다', desc: '제4구역 돌파', goal: 1, prog: s => s.clears[4] ? 1 : 0, reward: 200 },
  { id: 'clear5', icon: '🩸', name: '천하제일검', desc: '제5구역 돌파 (혈마교주 격파)', goal: 1, prog: s => s.clears[5] ? 1 : 0, reward: 400 },
  { id: 'kills1', icon: '⚔️', name: '백인참', desc: '누적 1,000명 토벌', goal: 1000, prog: s => s.kills, reward: 60 },
  { id: 'kills2', icon: '⚔️', name: '천인참', desc: '누적 5,000명 토벌', goal: 5000, prog: s => s.kills, reward: 150 },
  { id: 'kills3', icon: '⚔️', name: '만인적', desc: '누적 20,000명 토벌', goal: 20000, prog: s => s.kills, reward: 400 },
  { id: 'mini10', icon: '👹', name: '고수 사냥꾼', desc: '중간보스 누적 10명 처치', goal: 10, prog: s => s.mini, reward: 100 },
  { id: 'boss5', icon: '☠️', name: '군주 토벌', desc: '구역 군주 누적 5명 처치', goal: 5, prog: s => s.boss, reward: 150 },
  { id: 'evo1', icon: '🌸', name: '초월', desc: '처음으로 초월 각성', goal: 1, prog: s => s.evo, reward: 80 },
  { id: 'lv30', icon: '🧘', name: '절정고수', desc: '한 판에 경지 Lv.30 달성', goal: 30, prog: s => s.bestLevel, reward: 150 },
  { id: 'hard1', icon: '🔥', name: '지옥을 걷는 자', desc: '어려움 난이도로 구역 돌파', goal: 1, prog: s => s.hardClears, reward: 200 }
];
// 오늘의 과제 후보: make(seed) → {goal, reward, text}. 판이 끝날 때 add(run) 만큼 진행
const DAILY_POOL = [
  { id: 'kills', make: r => { const g = [300, 500, 800][r % 3]; return { goal: g, reward: 30 + g / 10, text: `적 ${g}명 토벌` }; }, add: run => run.kills },
  { id: 'mini', make: r => { const g = 1 + r % 3; return { goal: g, reward: 30 + g * 20, text: `중간보스 ${g}명 처치` }; }, add: run => run.mini },
  { id: 'clear', make: r => { const g = 1 + r % 2; return { goal: g, reward: 60 + g * 30, text: `아무 구역이나 ${g}번 돌파` }; }, add: run => run.victory ? 1 : 0 },
  { id: 'runs', make: r => { const g = [3, 5][r % 2]; return { goal: g, reward: 20 + g * 10, text: `${g}판 출전` }; }, add: () => 1 },
  { id: 'level', make: r => { const g = [15, 20][r % 2]; return { goal: g, reward: g * 3, text: `한 판에 경지 Lv.${g} 달성`, best: true }; }, add: run => run.level },
  { id: 'evo', make: () => ({ goal: 1, reward: 70, text: '초월 각성 1번' }), add: run => run.evo },
  { id: 'hard', make: () => ({ goal: 1, reward: 60, text: '어려움 난이도로 1판 (2분 이상 버티기)' }), add: run => (run.difficulty === 'hard' && run.time >= 120) ? 1 : 0 }
];

const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
let goals = (() => {
  let g = null;
  try { g = JSON.parse(localStorage.getItem(GOALS_KEY) || 'null'); } catch (e) {}
  g = g || {};
  g.stats = Object.assign({ kills: 0, mini: 0, boss: 0, evo: 0, bestLevel: 0, hardClears: 0, clears: {} }, g.stats || {});
  g.ach = g.ach || {};
  // 2026-11-12 사용자: 이루면 알림만, 창에서 직접 [받기]. 예전 저장(바로 지급)은 모두 받은 것으로
  if (!g.got) {
    g.got = {};
    for (const k of Object.keys(g.ach)) g.got[k] = true;
    if (Array.isArray(g.daily)) for (const d of g.daily) if (d.done) d.claimed = true;
  }
  return g;
})();
function saveGoals() { try { localStorage.setItem(GOALS_KEY, JSON.stringify(goals)); } catch (e) {} }
// 날짜가 바뀌면 오늘의 과제 3개를 새로 뽑음 (날짜로 정해지는 난수라 같은 날엔 같은 과제)
function ensureDaily() {
  const day = todayKey();
  if (goals.day === day && Array.isArray(goals.daily)) return;
  if (Array.isArray(goals.daily)) {
    const left = goals.daily.filter(d => d.done && !d.claimed).reduce((t, d) => t + d.reward, 0);
    if (left && typeof progress !== 'undefined') { progress.silver += left; progress.total += left; saveProgress(); }
  }
  let seed = 0; for (const c of day) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed >>> 8; };
  const pool = DAILY_POOL.slice();
  goals.daily = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    const def = pool.splice(rnd() % pool.length, 1)[0];
    const m = def.make(rnd());
    goals.daily.push({ id: def.id, goal: m.goal, reward: Math.round(m.reward), text: m.text, best: !!m.best, prog: 0, done: false });
  }
  goals.day = day;
  saveGoals();
}

// 판이 끝날 때 (awardSilver 직후) — 진행을 더하고 이룬 것의 은자를 줌. 결과 창에 줄을 붙임
function goalsOnRunEnd(victory, targetId) {
  ensureDaily();
  const run = {
    victory, kills: state.kills || 0, mini: state.runMiniKills || 0, boss: state.runBossKills || 0,
    level: player.level || 1, evo: Object.keys(player.evolutions || {}).length, time: state.gameTime || 0,
    difficulty: difficultyKey, sector: currentSelectedSector || 1
  };
  const s = goals.stats;
  s.kills += run.kills; s.mini += run.mini; s.boss += run.boss; s.evo += run.evo;
  s.bestLevel = Math.max(s.bestLevel, run.level);
  if (victory) { s.clears[run.sector] = true; if (run.difficulty === 'hard') s.hardClears++; }
  const got = [];
  for (const d of goals.daily) {
    if (d.done) continue;
    const def = DAILY_POOL.find(x => x.id === d.id);
    const v = def ? def.add(run) : 0;
    d.prog = d.best ? Math.max(d.prog, v) : d.prog + v;
    if (d.prog >= d.goal) { d.done = true; got.push({ icon: '📜', text: '오늘의 과제: ' + d.text, reward: d.reward }); }
  }
  for (const a of ACHIEVEMENTS) {
    if (goals.ach[a.id]) continue;
    if (a.prog(s) >= a.goal) { goals.ach[a.id] = true; got.push({ icon: a.icon, text: '업적: ' + a.name, reward: a.reward }); }
  }
  saveGoals();
  const el = targetId && document.getElementById(targetId);
  if (el && got.length) {
    el.insertAdjacentHTML('beforeend', `<div class="goal-gain">${got.map(g => `<div>${g.icon} ${g.text} 달성! <b>💰 ${g.reward}</b></div>`).join('')}<div class="goal-gain-hint">첫 화면 📜 과제 · 업적에서 받으세요</div></div>`);
  }
  refreshGoalBadge();
  return got;
}
// awardSilver 를 감싸서 판이 끝날 때 자동으로 부름
const _awardSilverBase = awardSilver;
awardSilver = function (victory, targetId) {
  const r = _awardSilverBase(victory, targetId);
  if (r) goalsOnRunEnd(victory, targetId);
  return r;
};

// ---------- 과제·업적 창 ----------
// 받을 수 있는 것: 이뤘는데 아직 [받기]를 안 누른 것
function claimableGoals() {
  ensureDaily();
  const list = [];
  goals.daily.forEach((d, i) => { if (d.done && !d.claimed) list.push({ kind: 'd', i, reward: d.reward }); });
  for (const a of ACHIEVEMENTS) if (goals.ach[a.id] && !goals.got[a.id]) list.push({ kind: 'a', id: a.id, reward: a.reward });
  return list;
}
function claimGoal(kind, key) {
  let reward = 0;
  if (kind === 'd') { const d = goals.daily[key]; if (!d || !d.done || d.claimed) return; d.claimed = true; reward = d.reward; }
  else { const a = ACHIEVEMENTS.find(x => x.id === key); if (!a || !goals.ach[key] || goals.got[key]) return; goals.got[key] = true; reward = a.reward; }
  progress.silver += reward; progress.total += reward; saveProgress(); saveGoals();
  if (typeof refreshSilverLabels === 'function') refreshSilverLabels();
  if (typeof sound !== 'undefined') { sound.init(); sound.playPickup(); }
  renderGoals(); refreshGoalBadge();
}
function claimAllGoals() {
  const list = claimableGoals();
  for (const c of list) { if (c.kind === 'd') goals.daily[c.i].claimed = true; else goals.got[c.id] = true; progress.silver += c.reward; progress.total += c.reward; }
  if (!list.length) return;
  saveProgress(); saveGoals();
  if (typeof refreshSilverLabels === 'function') refreshSilverLabels();
  if (typeof sound !== 'undefined') { sound.init(); sound.playLevelUp(); }
  renderGoals(); refreshGoalBadge();
}
// 알림 숫자 = 받을 수 있는 것 개수 (없으면 숨김)
function refreshGoalBadge() {
  const n = claimableGoals().length;
  document.querySelectorAll('.goal-left').forEach(e => { e.textContent = n ? `${n}` : ''; e.style.display = n ? '' : 'none'; });
}
function openGoals() { renderGoals(); document.getElementById('goalsModal').style.display = 'flex'; }
function closeGoals() { document.getElementById('goalsModal').style.display = 'none'; }
function renderGoals() {
  ensureDaily();
  const bar = (v, g) => `<div class="goal-bar"><i style="width:${Math.min(100, Math.round(v / g * 100))}%"></i></div>`;
  const daily = goals.daily.map((d, i) => `<div class="goal-card ${d.claimed ? 'done' : d.done ? 'ready' : ''}">
      <div class="goal-icon">📜</div>
      <div class="goal-info"><div class="goal-name">${d.text}</div>${bar(d.prog, d.goal)}<div class="goal-num">${Math.min(d.prog, d.goal)} / ${d.goal}</div></div>
      <div class="goal-reward">${d.claimed ? '완료' : d.done ? `<button class="goal-claim" onclick="claimGoal('d', ${i})">받기 💰 ${d.reward}</button>` : `💰 ${d.reward}`}</div></div>`).join('');
  const ach = ACHIEVEMENTS.map(a => { const v = a.prog(goals.stats), done = !!goals.ach[a.id], got = !!goals.got[a.id]; return `<div class="goal-card ${got ? 'done' : done ? 'ready' : ''}">
      <div class="goal-icon">${a.icon}</div>
      <div class="goal-info"><div class="goal-name">${a.name} <span>${a.desc}</span></div>${a.goal > 1 ? bar(v, a.goal) + `<div class="goal-num">${Math.min(v, a.goal).toLocaleString()} / ${a.goal.toLocaleString()}</div>` : ''}</div>
      <div class="goal-reward">${got ? '완료' : done ? `<button class="goal-claim" onclick="claimGoal('a', '${a.id}')">받기 💰 ${a.reward}</button>` : `💰 ${a.reward}`}</div></div>`; }).join('');
  const cl = claimableGoals();
  const all = cl.length > 1 ? `<button class="goal-claim goal-claim-all" onclick="claimAllGoals()">모두 받기 💰 ${cl.reduce((t, c) => t + c.reward, 0)}</button>` : '';
  document.getElementById('goalsList').innerHTML = all +
    `<div class="goal-head">오늘의 과제 <span>(매일 0시에 바뀜 · 판이 끝날 때 반영)</span></div>${daily}
     <div class="goal-head">업적 <span>${Object.keys(goals.ach).length} / ${ACHIEVEMENTS.length}</span></div>${ach}`;
}
document.addEventListener('DOMContentLoaded', refreshGoalBadge);
setTimeout(refreshGoalBadge, 0);
