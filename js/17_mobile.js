// ============================================================
// 폰 대응: 앱을 내리면 자동 일시정지·소리 멈춤 / 게임 중 화면 꺼짐 방지 / 느린 기기는 효과 자동으로 줄임
// ============================================================
function gameIsRunning() {
  return state.isGameStarted && !state.isGameOver && !state.isPaused && !(typeof Cinema !== 'undefined' && Cinema.active);
}

// 1. 앱을 내리거나 다른 탭으로 가면: 일시정지 창을 열고 소리를 멈춤. 돌아오면 소리만 다시 (게임은 직접 '재개')
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (gameIsRunning() && typeof togglePause === 'function') togglePause();
    if (typeof sound !== 'undefined') {
      if (sound.music) sound.music.pause();
      if (sound.ctx && sound.ctx.state === 'running') sound.ctx.suspend().catch(() => {});
    }
  } else if (typeof sound !== 'undefined') {
    if (sound.ctx && sound.ctx.state === 'suspended' && sound.unlocked) sound.ctx.resume().catch(() => {});
    if (sound.music && sound.enabled) sound.music.play().catch(() => {});
  }
});

// 2. 게임하는 동안 화면이 꺼지지 않게 (지원하는 브라우저만). 일시정지·끝나면 풀어 줌
let screenLock = null;
setInterval(() => {
  const want = gameIsRunning() && !document.hidden;
  if (want && !screenLock && navigator.wakeLock) {
    navigator.wakeLock.request('screen').then(l => { screenLock = l; l.addEventListener('release', () => { screenLock = null; }); }).catch(() => {});
  } else if (!want && screenLock) {
    screenLock.release().catch(() => {});
    screenLock = null;
  }
}, 1000);

// 3. 느린 기기: 게임 중 4초 평균이 초당 38장 아래로 두 번 연속 떨어지면 '효과 양: 적게'로 (한 번만, 사용자가 직접 고른 적 없을 때)
(function watchFps() {
  let frames = 0, t0 = performance.now(), slow = 0, done = false;
  function tick(now) {
    if (!done) requestAnimationFrame(tick);
    if (!gameIsRunning()) { frames = 0; t0 = now; return; }
    frames++;
    if (now - t0 >= 4000) {
      const fps = frames * 1000 / (now - t0);
      frames = 0; t0 = now;
      slow = fps < 38 ? slow + 1 : 0;
      if (slow >= 2 && typeof gameSettings !== 'undefined' && gameSettings.effects === 'high' && !gameSettings.effectsChosen) {
        gameSettings.effects = 'low';
        saveSettings();
        done = true;
        if (typeof showMiniToast === 'function') showMiniToast('⚙', '효과 줄임', '기기에 맞춰 효과를 줄였어요 (설정에서 바꿀 수 있어요)', '#94a3b8');
      }
    }
  }
  requestAnimationFrame(tick);
})();
