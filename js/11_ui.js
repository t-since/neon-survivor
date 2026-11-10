// 엔딩, 일시정지, 치트 창, 시작 실행
let creditsAnimId = null;
let creditsScrollPos = 0;

function openEndingCredits() {
  const modal = document.getElementById('endingCreditsModal');
  if (!modal) return;
  modal.style.display = 'flex';

  const contentEl = document.getElementById('creditsScrollContent');
  const containerEl = document.getElementById('creditsScrollContainer');
  if (!contentEl || !containerEl) return;

  const startY = containerEl.clientHeight;
  creditsScrollPos = startY;
  contentEl.style.transform = `translateY(${creditsScrollPos}px)`;

  let lastTime = performance.now();
  const scrollSpeed = 48; // 초당 48px 부드러운 스크롤

  if (creditsAnimId) cancelAnimationFrame(creditsAnimId);

  function stepCredits(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    creditsScrollPos -= scrollSpeed * dt;
    const maxScroll = -(contentEl.clientHeight - 80);
    if (creditsScrollPos < maxScroll) {
      creditsScrollPos = maxScroll; // 끝에서 정지하여 버튼 노출 유지
    } else {
      creditsAnimId = requestAnimationFrame(stepCredits);
    }
    contentEl.style.transform = `translateY(${creditsScrollPos}px)`;
  }

  creditsAnimId = requestAnimationFrame(stepCredits);
}

function closeEndingCredits() {
  if (creditsAnimId) cancelAnimationFrame(creditsAnimId);
  const modal = document.getElementById('endingCreditsModal');
  if (modal) modal.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  const btnOpenCredits = document.getElementById('btnOpenEndingCredits');
  if (btnOpenCredits) btnOpenCredits.onclick = openEndingCredits;

  const btnCloseCredits = document.getElementById('btnCloseEndingCredits');
  if (btnCloseCredits) btnCloseCredits.onclick = closeEndingCredits;

  const btnCreditsReturn = document.getElementById('btnCreditsReturn');
  if (btnCreditsReturn) {
    btnCreditsReturn.onclick = () => {
      closeEndingCredits();
      endingReturnToTitle();
    };
  }

  const btnCreditsRestart = document.getElementById('btnCreditsRestart');
  if (btnCreditsRestart) {
    btnCreditsRestart.onclick = () => {
      closeEndingCredits();
      endingRestart();
    };
  }
});

// 첫 터치/클릭/키 입력 때 소리 켜기 (브라우저는 사용자가 누르기 전엔 소리를 막음)
['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, () => sound.init(), { once: false, passive: true }));

// --- Pause & Modals ---
const pauseBtn = document.getElementById('pauseBtn');
const pauseModal = document.getElementById('pauseModal');
const resumeBtn = document.getElementById('resumeBtn');
const soundBtn = document.getElementById('soundBtn');

const cheatBtn = document.getElementById('cheatBtn');
const cheatModal = document.getElementById('cheatModal');
const closeCheatBtn = document.getElementById('closeCheatBtn');

pauseBtn.onclick = () => togglePause();
resumeBtn.onclick = () => togglePause();

cheatBtn.onclick = () => toggleCheatModal();
closeCheatBtn.onclick = () => toggleCheatModal();

soundBtn.onclick = () => {
  sound.init();
  sound.enabled = !sound.enabled;
  sound.applyEnabled();
  soundBtn.innerText = sound.enabled ? '🔊' : '🔇';
};

function togglePause() {
  if (state.isLevelingUp || state.isGameOver) return;
  state.isPaused = !state.isPaused;
  if (state.isPaused) {
    updatePauseModalStats();
    pauseModal.style.display = 'flex';
  } else {
    pauseModal.style.display = 'none';
  }
}

function toggleCheatModal() {
  if (state.isLevelingUp || state.isGameOver) return;
  const isOpening = cheatModal.style.display !== 'flex';
  if (isOpening) {
    setupCheatModalUI();
    cheatModal.style.display = 'flex';
    state.isPaused = true;
  } else {
    cheatModal.style.display = 'none';
    state.isPaused = false;
  }
}

// Cheat button handlers
document.getElementById('btnMaxAll').onclick = () => {
  cheatMaxAll();
  setupCheatModalUI();
};
document.getElementById('btnLevelUp5').onclick = () => {
  cheatLevelUp(5);
  setupCheatModalUI();
};
document.getElementById('btnForward30s').onclick = () => {
  state.gameTime += 30;
  damageTexts.push({
    x: player.x,
    y: player.y - 45,
    text: '⏩ 30초 시간 도약!',
    color: '#38bdf8',
    size: 16,
    life: 1.4,
    vy: -25
  });
};
document.getElementById('btnSpawnMiniBoss').onclick = () => {
  const sectorDef = SECTOR_DEFS[currentSelectedSector - 1] || SECTOR_DEFS[0];
  spawnMiniBoss(sectorDef.miniBossName || '사파 중간보스');
  toggleCheatModal();
};
document.getElementById('btnNextZone').onclick = () => {
  transitionToNextZone();
  toggleCheatModal();
};
document.getElementById('btnSpawnPortal').onclick = () => {
  spawnVictoryPortal(player.x + 50, player.y);
  showPhaseBanner('🌀 포탈 열림', '');
  toggleCheatModal();
};
document.getElementById('btnSpawnBoss').onclick = () => {
  const sectorDef = SECTOR_DEFS[currentSelectedSector - 1] || SECTOR_DEFS[0];
  spawnSectorBoss(sectorDef.bossName);
  toggleCheatModal();
};
document.getElementById('btnSpawnChest').onclick = () => {
  chests.push({ x: player.x + 40, y: player.y, isBossChest: false });
  toggleCheatModal();
};
document.getElementById('btnSpawnHerb').onclick = () => {
  herbs.push({ x: player.x - 40, y: player.y, type: '천년영지 (靈芝)', val: 50 });
  toggleCheatModal();
};
const btnCsBoss = document.getElementById('btnCsBoss');
if (btnCsBoss) btnCsBoss.onclick = () => {
  toggleCheatModal();
  ThreeCutsceneEngine.playBossIntro();
};
const btnCsSword = document.getElementById('btnCsSword');
if (btnCsSword) btnCsSword.onclick = () => {
  toggleCheatModal();
  ThreeCutsceneEngine.playUltimateSword();
};
const btnCsBreakthrough = document.getElementById('btnCsBreakthrough');
if (btnCsBreakthrough) btnCsBreakthrough.onclick = () => {
  toggleCheatModal();
  ThreeCutsceneEngine.playBreakthrough();
};
const pixelModeBtn = document.getElementById('pixelModeBtn');
if (pixelModeBtn) pixelModeBtn.onclick = () => togglePixelArtMode();
const btnTogglePixel = document.getElementById('btnTogglePixel');
if (btnTogglePixel) btnTogglePixel.onclick = () => {
  toggleCheatModal();
  togglePixelArtMode();
};
document.getElementById('btnGodMode').onclick = () => {
  cheatToggleGod();
};
document.getElementById('btnToggleAllSectors').onclick = () => {
  if (unlockedSectors.length >= 5) {
    unlockedSectors = [1];
    clearedSectors = [];
    alert('작전 구역 해금 상태가 초기화되었습니다 (1구역만 오픈, 2~5구역 잠김).');
  } else {
    unlockedSectors = [1, 2, 3, 4, 5];
    clearedSectors = [1, 2, 3, 4, 5];
    alert('무림 5대 전 작전 구역이 모두 해금되었습니다! (자유 재도전 가능)');
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('wuxia_unlocked_sectors', JSON.stringify(unlockedSectors));
      localStorage.setItem('wuxia_cleared_sectors', JSON.stringify(clearedSectors));
    }
  } catch (e) {}
  renderSectorList();
  selectSector(currentSelectedSector);
};
document.getElementById('btnClearCurrentSector').onclick = () => {
  markCurrentSectorCleared();
  renderSectorList();
  selectSector(currentSelectedSector);
  onSectorVictory();
};

// Modals interaction handlers
document.getElementById('closeTreasureBtn').onclick = () => {
  document.getElementById('treasureModal').style.display = 'none';
  state.isPaused = false;
};
document.getElementById('btnVictoryNextSector').onclick = () => {
  // 마지막(5)구역을 깼으면 같은 구역을 다시 돌지 않고 엔딩 크레딧으로
  if (currentSelectedSector >= 5) { playCinematic('ending', openEndingCredits); return; }
  // 다음 구역 진입 컷신을 본 뒤 출발
  document.getElementById('victoryModal').style.display = 'none';
  playCinematic('sector' + (currentSelectedSector + 1), continueToNextSector);
};
// 엔딩 뒤: 처음 화면으로 / 1구역부터 다시
function endingReturnToTitle() {
  ['victoryModal', 'gameOverModal'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  state.isGameStarted = false;
  state.isPaused = false;
  state.isGameOver = false;
  navScreen('title');
}
function endingRestart() {
  ['victoryModal', 'gameOverModal'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  selectSector(1);
  confirmStartGame();
}
document.getElementById('btnVictoryReturnHQ').onclick = () => {
  document.getElementById('victoryModal').style.display = 'none';
  state.isGameStarted = false;
  state.isPaused = false;
  state.isGameOver = false;
  navScreen('stage');
};
document.getElementById('btnDefeatReturnHQ').onclick = () => {
  document.getElementById('gameOverModal').style.display = 'none';
  state.isGameStarted = false;
  state.isPaused = false;
  state.isGameOver = false;
  navScreen('stage');
};

function updatePauseModalStats() {
  document.getElementById('statMaxHp').innerText = player.maxHp;
  document.getElementById('statAtk').innerText = `${Math.round(player.atkMultiplier * 100)}%`;
  document.getElementById('statSpd').innerText = `${Math.round((player.speed / player.baseSpeed) * 100)}%`;
  document.getElementById('statCrit').innerText = `${Math.round(player.critRate * 100)}%`;
  document.getElementById('statMagnet').innerText = player.magnetRadius;
  const dashCd = Math.max(0.8, player.dashCooldown - player.skills.qinggong_dash * 0.35);
  document.getElementById('statDashCd').innerText = `${dashCd.toFixed(1)}초`;

  const pauseSkillList = document.getElementById('pauseSkillList');
  pauseSkillList.innerHTML = '';
  for (let key in player.skills) {
    const lvl = player.skills[key];
    if (lvl > 0) {
      const def = SKILL_DEFS[key];
      const evo = EVO_SKILL_DEFS[key];
      const isEvo = evo && player.evolutions[evo.id];
      const badge = document.createElement('div');
      badge.className = 'owned-badge';
      if (isEvo) badge.style.borderColor = '#fbbf24';
      badge.innerHTML = `${isEvo ? evo.icon : def.icon} ${isEvo ? evo.name : def.name} <span>${isEvo ? '★각성' : 'Lv.' + lvl}</span>`;
      pauseSkillList.appendChild(badge);
    }
  }
}

// Restart Game
document.getElementById('restartBtn').onclick = () => {
  document.getElementById('gameOverModal').style.display = 'none';
  confirmStartGame();
};

// --- Initialization ---
loadAllSprites(() => {
  const loading = document.getElementById('loadingScreen');
  loading.style.display = 'none';
  selectHero('seojin');
  selectSector(1);
  navScreen('title');
  updateHud();
  requestAnimationFrame(gameLoop);
});
