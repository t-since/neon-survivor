// =====================================================================
// 14_progress.js — 영구 성장: 은자(銀子) + 문파 수련 (2026-11-10)
// - 판이 끝나면(쓰러짐·구역 돌파) 은자를 받음. 죽어도 받은 은자는 남음
// - 첫 화면 [문파 수련]에서 은자로 영구 강화 4종을 올림 → 다음 판부터 적용
// - 저장: localStorage 'wuxia_progress_v1' = { silver, total, train: { hp, atk, spd, crit } }
// =====================================================================

const PROGRESS_KEY = 'wuxia_progress_v1';
// 영구 강화(문파 수련): 값은 단계(lvl)당, 비용은 base × 1.6^lvl
const TRAININGS = [
  { id: 'hp',   name: '혈기 단련', hanja: '血氣', icon: '❤️', max: 10, base: 40, per: 10,   unit: '',  label: '시작 최대 혈기',
    apply: (p, l) => { p.maxHp += l * 10; p.hp = p.maxHp; } },
  { id: 'atk',  name: '검기 단련', hanja: '劍氣', icon: '⚔️', max: 10, base: 60, per: 5,    unit: '%', label: '모든 무공 피해',
    apply: (p, l) => { p.atkMultiplier *= 1 + l * 0.05; } },
  { id: 'spd',  name: '경공 단련', hanja: '輕功', icon: '💨', max: 5,  base: 50, per: 3,    unit: '%', label: '이동 속도',
    apply: (p, l) => { p.baseSpeed *= 1 + l * 0.03; p.speed = p.baseSpeed; } },
  { id: 'crit', name: '안목 단련', hanja: '眼目', icon: '🎯', max: 5,  base: 70, per: 2,    unit: '%', label: '치명타 확률',
    apply: (p, l) => { p.critRate = Math.min(0.9, (p.critRate || 0) + l * 0.02); } }
];
// 은자 계산: 처치·버틴 시간·중간보스·보스·구역 돌파, 난이도 배율
const SILVER_RULES = { perKill: 0.4, perSecond: 0.25, perMiniBoss: 20, perBoss: 60, clearBase: 40, clearPerSector: 20 };
const SILVER_DIFF = { easy: 0.7, normal: 1.0, hard: 1.4 };

let progress = { silver: 0, total: 0, train: {} };
try { const s = JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null'); if (s) progress = { silver: s.silver | 0, total: s.total | 0, train: s.train || {}, heroes: s.heroes || {}, looks: s.looks || { owned: {}, robe: '', blade: '' } }; } catch (e) {}
function saveProgress() { try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch (e) {} }
const trainLevel = id => Math.max(0, Math.min((TRAININGS.find(t => t.id === id) || {}).max || 0, progress.train[id] | 0));
const trainCost = (t, lvl) => Math.round(t.base * Math.pow(1.6, lvl));

// 판 시작 때 (영웅 기본 능력치를 넣은 직후) 부름
function applyTrainings(p) {
  for (const t of TRAININGS) { const l = trainLevel(t.id); if (l > 0) t.apply(p, l); }
  state.runBossKills = 0; state.runMiniKills = 0; state.silverAwarded = false;
}

// 이번 판(이번 구역) 은자 계산
function calcRunSilver(victory) {
  const R = SILVER_RULES;
  const parts = {
    kills: Math.floor((state.kills || 0) * R.perKill),
    time: Math.floor((state.gameTime || 0) * R.perSecond),
    mini: (state.runMiniKills || 0) * R.perMiniBoss,
    boss: (state.runBossKills || 0) * R.perBoss,
    clear: victory ? R.clearBase + R.clearPerSector * (currentSelectedSector || 1) : 0
  };
  const mult = SILVER_DIFF[difficultyKey] || 1;
  const total = Math.round((parts.kills + parts.time + parts.mini + parts.boss + parts.clear) * mult);
  return { parts, mult, total };
}
// 판이 끝날 때 한 번만 지급하고, 결과 창에 내역을 씀
function awardSilver(victory, targetId) {
  if (state.silverAwarded) return null;
  state.silverAwarded = true;
  const r = calcRunSilver(victory);
  progress.silver += r.total; progress.total += r.total; saveProgress();
  const el = document.getElementById(targetId);
  if (el) {
    const p = r.parts, bits = [`처치 ${p.kills}`, `생존 ${p.time}`];
    if (p.mini) bits.push(`중간보스 ${p.mini}`);
    if (p.boss) bits.push(`보스 ${p.boss}`);
    if (p.clear) bits.push(`돌파 ${p.clear}`);
    el.innerHTML = `<div class="silver-gain">💰 은자 <b>+${r.total}</b> <span>(${bits.join(' · ')}${r.mult !== 1 ? ` · 난이도 ×${r.mult}` : ''})</span></div>
      <div class="silver-total">보유 은자 ${progress.silver} — 첫 화면 <b>문파 수련</b>에서 영구 강화</div>`;
  }
  refreshSilverLabels();
  return r;
}
// 중간에 그만둘 때(구역 이탈 등)도 받은 만큼은 남김
function awardSilverOnQuit() { if (state.isGameStarted && !state.silverAwarded) awardSilver(false, null); }

function refreshSilverLabels() {
  document.querySelectorAll('.silver-count').forEach(e => e.textContent = progress.silver);
}

// ---------- 문파 수련 창 ----------
function openTraining() {
  renderTraining();
  document.getElementById('trainingModal').style.display = 'flex';
}
function closeTraining() { document.getElementById('trainingModal').style.display = 'none'; }
function renderTraining() {
  const list = document.getElementById('trainingList');
  if (!list) return;
  refreshSilverLabels();
  list.innerHTML = TRAININGS.map(t => {
    const l = trainLevel(t.id), maxed = l >= t.max, cost = trainCost(t, l);
    const pips = Array.from({ length: t.max }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('');
    const now = l * t.per, next = (l + 1) * t.per;
    return `<div class="train-card ${maxed ? 'maxed' : ''}">
      <div class="train-icon">${t.icon}</div>
      <div class="train-info">
        <div class="train-name">${t.name} <span>(${t.hanja})</span></div>
        <div class="train-desc">${t.label} +${now}${t.unit}${maxed ? '' : ` → <b>+${next}${t.unit}</b>`}</div>
        <div class="train-pips">${pips}</div>
      </div>
      <button class="btn-action train-buy" data-train="${t.id}" ${maxed || progress.silver < cost ? 'disabled' : ''}>${maxed ? '완성' : `💰 ${cost}`}</button>
    </div>`;
  }).join('');
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-train]');
  if (!b || b.disabled) return;
  const t = TRAININGS.find(x => x.id === b.dataset.train);
  const l = trainLevel(t.id), cost = trainCost(t, l);
  if (l >= t.max || progress.silver < cost) return;
  progress.silver -= cost; progress.train[t.id] = l + 1; saveProgress();
  try { sound.init(); sound.playLevelUp(); } catch (err) {}
  renderTraining();
});
document.addEventListener('DOMContentLoaded', refreshSilverLabels);
setTimeout(refreshSilverLabels, 0);
