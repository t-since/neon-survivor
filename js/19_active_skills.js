// ============================================================
// 무공 버튼 (설정 '🎯 무공 사용' : 자동 / 버튼)
// - 자동: 예전처럼 때가 되면 저절로 나감
// - 버튼: 벽공장·벽력탄·만천화우·금강불괴 4개는 버튼(PC는 Q·E·R·F 또는 1·2·3·4 키)을 누를 때만 나감
//   (W·A·S·D 는 이동이라 W 대신 F. 왼손은 WASD 위에 그대로)
//         매화검법·칼 베기·늘 켜진 무공은 그대로 자동
// - 버튼 모드 대기 시간: 강한 무공일수록 길게 (MANUAL_CD, 2026-11-12 사용자 요청)
//   대신 한 방이 셈: 위력 = 자동일 때 같은 시간 동안 나갈 몫을 한 번에 + 20% (직접 쓰는 보상)
// ============================================================
const ACTIVE_SLOTS = [
  { id: 'palm_blast', key: 'Q', keys: ['q', '1'] },
  { id: 'thunder_bomb', key: 'E', keys: ['e', '2'] },
  { id: 'dagger_rain', key: 'R', keys: ['r', '3'] },
  { id: 'vajra_shield', key: 'F', keys: ['f', '4'] }
];
const MANUAL_POWER = 1.2;
// 버튼 모드 대기 시간(초): [1레벨, 5레벨, 초월]. 그 사이 레벨은 고르게
const MANUAL_CD = {
  palm_blast:   [4, 3, 6],     // 벽공장 → 여래신장
  thunder_bomb: [6, 4.5, 9],   // 벽력탄 → 구천뇌정
  dagger_rain:  [8, 6, 12],    // 만천화우 → 생사부 만천화우
  vajra_shield: [10, 8, 15]    // 금강불괴 → 천지무적신공
};
function manualCd(id) {
  const t = MANUAL_CD[id], lv = Math.max(1, Math.min(5, player.skills[id] || 1));
  if (player.evolutions && player.evolutions['evo_' + id]) return t[2];
  return t[0] + (t[1] - t[0]) * (lv - 1) / 4;
}

function skillManual() { return typeof gameSettings !== 'undefined' && gameSettings.skillMode === 'manual'; }

// 06_skills_combat 에서 매 프레임 부름: 버튼 모드면 대기 시간만 채우고 true (저절로 쓰지 않음)
function activeSkillTick(id, interval, dt) {
  if (!skillManual()) return false;
  if (!player.activeCd) player.activeCd = {};
  if (!player.autoCd) player.autoCd = {};
  player.autoCd[id] = interval; // 자동일 때 간격 (위력 계산용)
  const cd = manualCd(id);
  player.activeCd[id] = cd;
  player.timers[id] = Math.min(cd, (player.timers[id] || 0) + dt);
  return true;
}

function activeSkillReady(id) {
  const cd = player.activeCd && player.activeCd[id];
  return player.skills[id] > 0 && cd > 0 && player.timers[id] >= cd;
}

function useActiveSkill(slot) {
  const s = ACTIVE_SLOTS[slot];
  if (!s || !skillManual()) return false;
  if (!state.isGameStarted || state.isPaused || state.isGameOver) return false;
  if (typeof Cinema !== 'undefined' && Cinema.active) return false;
  if (!activeSkillReady(s.id)) { flashSkillBtn(slot, 'no'); return false; }
  player.timers[s.id] = 0;
  const base = player.atkMultiplier;
  const ratio = Math.max(1, player.activeCd[s.id] / ((player.autoCd && player.autoCd[s.id]) || player.activeCd[s.id]));
  player.atkMultiplier = base * MANUAL_POWER * ratio;
  try {
    if (s.id === 'palm_blast') {
      // 움직이는 중이면 그 방향으로, 서 있으면 적이 몰린 쪽으로
      const sp = Math.hypot(player.vx || 0, player.vy || 0);
      castPalmBlast(sp > 20 ? Math.atan2(player.vy, player.vx) : undefined);
    } else if (s.id === 'thunder_bomb') castThunderBomb();
    else if (s.id === 'dagger_rain') castDaggerRain();
    else if (s.id === 'vajra_shield') castVajraPulse();
  } finally { player.atkMultiplier = base; }
  flashSkillBtn(slot, 'go');
  return true;
}

// ── 버튼 그리기 ──
let skillBox = null;
const skillBtnEls = [];
function buildSkillButtons() {
  skillBox = document.createElement('div');
  skillBox.id = 'skillBtns';
  ACTIVE_SLOTS.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sk-btn';
    b.dataset.slot = i;
    b.innerHTML = '<img class="sk-img" alt="" draggable="false"><span class="sk-ico"></span><span class="sk-cd"></span><span class="sk-key">' + s.key + '</span>';
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (typeof sound !== 'undefined') sound.init(); useActiveSkill(i); });
    b.addEventListener('click', e => e.preventDefault());
    skillBox.appendChild(b);
    skillBtnEls.push({ el: b, img: b.querySelector('.sk-img'), ico: b.querySelector('.sk-ico'), cd: b.querySelector('.sk-cd'), last: '' });
  });
  document.body.appendChild(skillBox);
}
function flashSkillBtn(i, kind) {
  const b = skillBtnEls[i];
  if (!b) return;
  b.el.classList.remove('sk-go', 'sk-no');
  void b.el.offsetWidth; // 애니메이션 다시 시작
  b.el.classList.add(kind === 'go' ? 'sk-go' : 'sk-no');
}

let skillHintShown = false;
function refreshSkillButtons() {
  requestAnimationFrame(refreshSkillButtons);
  if (!skillBox) return;
  const show = skillManual() && state.isGameStarted && !state.isGameOver && !(typeof Cinema !== 'undefined' && Cinema.active);
  skillBox.style.display = show ? 'block' : 'none';
  if (!show) return;
  let anyLearned = false;
  ACTIVE_SLOTS.forEach((s, i) => {
    const b = skillBtnEls[i];
    const lv = player.skills[s.id] || 0;
    const evo = player.evolutions && player.evolutions['evo_' + s.id];
    const cdMax = (player.activeCd && player.activeCd[s.id]) || 1;
    const left = lv > 0 ? Math.max(0, cdMax - (player.timers[s.id] || 0)) : 0;
    const ready = lv > 0 && left <= 0;
    if (lv > 0) anyLearned = true;
    const key = lv + '|' + (evo ? 1 : 0) + '|' + left.toFixed(1) + '|' + ready;
    if (key === b.last) return;
    const wasReady = b.last.endsWith('|true');
    b.last = key;
    if (lv <= 0) {
      b.el.className = 'sk-btn sk-empty';
      b.ico.textContent = '';
      b.img.removeAttribute('src');
      b.cd.textContent = '';
      b.el.style.setProperty('--cd', 0);
      b.el.removeAttribute('title');
      return;
    }
    const def = evo ? EVO_SKILL_DEFS[s.id] : SKILL_DEFS[s.id];
    // 그림 글자 하나만 (초월은 '⚡💣'처럼 둘이라 앞의 것, 🛡️ 의 꾸밈 글자 FE0F 는 살림)
    const ic = (def.icon || '').match(/\p{Extended_Pictographic}️?/u);
    if (def.img) { if (b.img.getAttribute('src') !== def.img) b.img.src = def.img; b.ico.textContent = ''; }
    else { b.img.removeAttribute('src'); b.ico.textContent = ic ? ic[0] : ''; }
    b.el.title = def.name;
    b.el.classList.remove('sk-empty');
    b.el.classList.toggle('sk-ready', ready);
    b.el.classList.toggle('sk-evo', !!evo);
    b.el.style.setProperty('--cd', ready ? 0 : (left / cdMax).toFixed(3));
    b.cd.textContent = ready ? '' : (left >= 1 ? Math.ceil(left) : left.toFixed(1));
    if (ready && !wasReady) flashSkillBtn(i, 'up');
  });
  if (anyLearned && !skillHintShown && typeof showMiniToast === 'function') {
    skillHintShown = true;
    const touch = document.body.classList.contains('is-touch');
    showMiniToast('🎯', '무공 버튼', touch ? '오른쪽 아래 버튼을 눌러 무공을 펼치세요' : 'Q·E·R·F 키(또는 1·2·3·4)로 무공을 펼치세요', '#38bdf8');
  }
}

// PC: Q·E·R·F 또는 1·2·3·4 키 (한글 자판 상태여도 e.code 로 잡음)
window.addEventListener('keydown', e => {
  if (!skillManual() || e.repeat) return;
  const k = (e.code && /^Key[A-Z]$/.test(e.code)) ? e.code.slice(3).toLowerCase() : (e.code && /^Digit[0-9]$/.test(e.code)) ? e.code.slice(5) : (e.key || '').toLowerCase();
  const i = ACTIVE_SLOTS.findIndex(s => s.keys.includes(k));
  if (i >= 0 && state.isGameStarted) useActiveSkill(i);
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { buildSkillButtons(); refreshSkillButtons(); });
else { buildSkillButtons(); refreshSkillButtons(); }
// 무공 그림 아이콘 미리 불러 두기 (레벨업 창이 처음 뜰 때 빈칸 없이)
for (const d of [...Object.values(SKILL_DEFS), ...Object.values(EVO_SKILL_DEFS)]) if (d.img) { const im = new Image(); im.src = d.img; }
