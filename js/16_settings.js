// ============================================================
// 설정: 배경음·효과음 크기, 화면 흔들림, 피해 숫자, 진동, 효과 양 (폰에서 가볍게)
// 저장: localStorage 'wuxia_settings_v1'. 첫 화면·일시정지 창의 '⚙ 설정' 버튼으로 엶
// ============================================================
const SETTINGS_KEY = 'wuxia_settings_v1';
const SETTINGS_DEFAULT = { music: 0.8, sfx: 0.8, shake: 1, damageNumbers: true, vibration: true, effects: 'high' };
let gameSettings = (() => {
  try { return Object.assign({}, SETTINGS_DEFAULT, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); }
  catch (e) { return Object.assign({}, SETTINGS_DEFAULT); }
})();
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(gameSettings)); } catch (e) {}
  applySettings();
}
// 효과 양: 낮음이면 입자 수 상한을 줄임 (07_update 의 입자 정리에서 씀)
function particleCap() { return gameSettings.effects === 'low' ? 90 : 200; }
function applySettings() {
  if (typeof sound !== 'undefined') {
    if (sound.out) sound.out.gain.value = gameSettings.sfx;
    if (sound.music) sound.music.volume = BGM_VOLUME * gameSettings.music;
  }
}
// 맞았을 때 폰 진동 (0.4초에 한 번까지)
let _lastVibe = 0;
function vibrateHit(ms) {
  if (!gameSettings.vibration || !navigator.vibrate) return;
  const now = performance.now();
  if (now - _lastVibe < 400) return;
  _lastVibe = now;
  try { navigator.vibrate(ms || 40); } catch (e) {}
}

function openSettings() {
  renderSettings();
  document.getElementById('settingsModal').style.display = 'flex';
}
function closeSettings() { document.getElementById('settingsModal').style.display = 'none'; }
function renderSettings() {
  const box = document.getElementById('settingsList');
  if (!box) return;
  const s = gameSettings;
  const seg = (key, opts) => `<div class="set-seg">${opts.map(([v, label]) => `<button type="button" data-set="${key}" data-val="${v}" class="${String(s[key]) === String(v) ? 'on' : ''}">${label}</button>`).join('')}</div>`;
  box.innerHTML = `
    <div class="set-row"><span>🎵 배경음악</span><input type="range" min="0" max="1" step="0.05" value="${s.music}" data-range="music"><b>${Math.round(s.music * 100)}</b></div>
    <div class="set-row"><span>🔔 효과음</span><input type="range" min="0" max="1" step="0.05" value="${s.sfx}" data-range="sfx"><b>${Math.round(s.sfx * 100)}</b></div>
    <div class="set-row"><span>📳 화면 흔들림</span>${seg('shake', [[0, '끄기'], [0.5, '약하게'], [1, '보통']])}</div>
    <div class="set-row"><span>🔢 피해 숫자</span>${seg('damageNumbers', [[true, '보기'], [false, '숨기기']])}</div>
    <div class="set-row"><span>📱 진동 (폰)</span>${seg('vibration', [[true, '켜기'], [false, '끄기']])}</div>
    <div class="set-row"><span>✨ 효과 양</span>${seg('effects', [['high', '많이'], ['low', '적게 (가벼움)']])}</div>
    <div class="set-row set-small"><button type="button" id="resetTutorialBtn">첫 판 안내 다시 보기</button></div>`;
}
document.addEventListener('input', (e) => {
  const k = e.target && e.target.dataset && e.target.dataset.range;
  if (!k) return;
  gameSettings[k] = +e.target.value;
  const b = e.target.parentElement.querySelector('b');
  if (b) b.textContent = Math.round(gameSettings[k] * 100);
  saveSettings();
});
document.addEventListener('click', (e) => {
  const btn = e.target && e.target.closest && e.target.closest('[data-set]');
  if (btn) {
    const k = btn.dataset.set, raw = btn.dataset.val;
    gameSettings[k] = raw === 'true' ? true : raw === 'false' ? false : (isNaN(+raw) ? raw : +raw);
    if (k === 'effects') gameSettings.effectsChosen = true; // 직접 고르면 자동으로 바꾸지 않음 (17_mobile)
    saveSettings();
    renderSettings();
    if (k === 'shake' && gameSettings.shake > 0) state.screenShake = 8 * gameSettings.shake; // 미리 느껴 보기
    return;
  }
  if (e.target && e.target.id === 'resetTutorialBtn') {
    if (typeof resetTutorial === 'function') resetTutorial();
    e.target.textContent = '다음 판에 안내가 다시 나와요 ✓';
  }
});
window.addEventListener('load', applySettings);
