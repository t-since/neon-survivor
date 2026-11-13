// 타이틀·협객·구역 화면, 게임 시작
let titleCanvas = null;
let titleCtx = null;
let titleParticles = [];
let titleAnimFrame = null;

function initTitleParticles() {
  titleCanvas = document.getElementById('titleParticlesCanvas');
  if (!titleCanvas || !titleCanvas.getContext) return;
  titleCanvas.width = window.innerWidth || 1280;
  titleCanvas.height = window.innerHeight || 720;
  titleCtx = titleCanvas.getContext('2d');
  if (!titleCtx) return;

  titleParticles = [];
  const count = 38;
  for (let i = 0; i < count; i++) {
    titleParticles.push({
      x: Math.random() * titleCanvas.width,
      y: Math.random() * titleCanvas.height,
      vx: (Math.random() - 0.5) * 18,
      vy: -22 - Math.random() * 32,
      size: 1.2 + Math.random() * 2.5,
      alpha: 0.25 + Math.random() * 0.65,
      pulseSpeed: 1.2 + Math.random() * 1.8,
      pulsePhase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.35 ? 'rgba(251, 191, 36,' : 'rgba(239, 68, 68,'
    });
  }
}

function updateTitleParticles(dt = 0.016) {
  if (currentGatewayScreen !== 'title' || !titleCtx || !titleCanvas) return;
  titleCtx.clearRect(0, 0, titleCanvas.width, titleCanvas.height);

  const now = performance.now() * 0.001;
  titleParticles.forEach(p => {
    p.y += p.vy * dt;
    p.x += (p.vx + Math.sin(now + p.pulsePhase) * 14) * dt;

    if (p.y < -12) {
      p.y = titleCanvas.height + 12;
      p.x = Math.random() * titleCanvas.width;
    }
    if (p.x < -12) p.x = titleCanvas.width + 12;
    if (p.x > titleCanvas.width + 12) p.x = -12;

    const curAlpha = p.alpha * (0.65 + 0.35 * Math.sin(now * p.pulseSpeed + p.pulsePhase));
    titleCtx.fillStyle = p.color + curAlpha + ')';
    titleCtx.shadowColor = p.color + '0.9)';
    titleCtx.shadowBlur = 7;
    titleCtx.beginPath();
    titleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    titleCtx.fill();
  });
  if (titleCtx.shadowBlur) titleCtx.shadowBlur = 0;

  if (currentGatewayScreen === 'title') {
    titleAnimFrame = requestAnimationFrame(() => updateTitleParticles(0.016));
  }
}

function startTitleParticles() {
  if (titleAnimFrame) cancelAnimationFrame(titleAnimFrame);
  initTitleParticles();
  if (titleCanvas && titleCtx) {
    updateTitleParticles(0.016);
  }
}

function stopTitleParticles() {
  if (titleAnimFrame) {
    cancelAnimationFrame(titleAnimFrame);
    titleAnimFrame = null;
  }
}

window.addEventListener('resize', () => {
  if (titleCanvas) {
    titleCanvas.width = window.innerWidth;
    titleCanvas.height = window.innerHeight;
  }
});

function navScreen(screenName) {
  currentGatewayScreen = screenName;
  ['title', 'hero', 'stage'].forEach(name => {
    const el = document.getElementById(name + 'Screen');
    if (el) el.style.display = (name === screenName) ? 'flex' : 'none';
  });

  if (screenName === 'title') {
    refreshQuickEnterLabel();
    refreshDifficultyButton();
    startTitleParticles();
  } else {
    stopTitleParticles();
  }

  if (screenName === 'stage') {
    const hero = HERO_DEFS[currentSelectedHero];
    const pillImg = document.getElementById('stageHeroPillImg');
    const pillName = document.getElementById('stageHeroPillName');
    if (pillImg) pillImg.src = hero.portrait;
    if (pillName) pillName.innerText = `${hero.name} 출전 대기`;
    renderSectorList();
    selectSector(currentSelectedSector);
  }
  sound.playPickup();
}

// 협객 개방 (2026-11-13 사용자 결정: 현운 = 5구역 돌파 + 은자 5,000)
const HERO_UNLOCK = { hyunwoon: { sector: 5, silver: 5000 } };
function heroUnlocked(id) { return id === 'seojin' || !!(progress.heroes && progress.heroes[id]); }
function renderHeroCards() {
  const id = 'hyunwoon', el = document.getElementById('card_' + id), u = HERO_UNLOCK[id];
  if (!el || !u) return;
  const spec = el.querySelector('.hero-card-spec'), badge = el.querySelector('.hero-card-lock-badge');
  const own = heroUnlocked(id), cleared = clearedSectors.includes(u.sector), enough = progress.silver >= u.silver;
  el.classList.toggle('disabled', !own);
  el.title = own ? '' : '5구역 돌파 · 은자 5,000';
  el.onclick = () => selectHero(id);
  if (spec) { spec.removeAttribute('style'); spec.textContent = own ? '권법 & 넉백 (탱커)' : (cleared ? (enough ? '💰 은자 5,000 으로 개방' : '은자가 모자랍니다 (5,000)') : '🔒 5구역 돌파 · 은자 5,000'); }
  if (badge) badge.style.display = own ? 'none' : '';
  if (badge && !own) badge.textContent = cleared ? '💰 5,000' : '🔒 5구역 돌파';
}
function selectHero(heroId) {
  if (heroId !== 'seojin' && !heroUnlocked(heroId)) {
    const u = HERO_UNLOCK[heroId];
    if (!u) return; // 당소연: 아직 준비 중
    if (!clearedSectors.includes(u.sector) || progress.silver < u.silver) { sound.playHit(); return; }
    if (!confirm('은자 ' + u.silver.toLocaleString() + ' 을(를) 내고 ' + HERO_DEFS[heroId].name + ' 을(를) 개방할까요?')) return;
    progress.silver -= u.silver; progress.heroes = progress.heroes || {}; progress.heroes[heroId] = true;
    saveProgress(); if (typeof refreshSilverLabels === 'function') refreshSilverLabels();
    sound.playLevelUp();
  }
  currentSelectedHero = heroId;
  try { localStorage.setItem('wuxia_hero', heroId); } catch (e) {}
  renderHeroCards();
  const def = HERO_DEFS[heroId];
  if (!def) return;

  ['seojin', 'hyunwoon', 'tangsoyeon'].forEach(id => {
    const el = document.getElementById(`card_${id}`);
    if (el) el.classList.toggle('selected', id === heroId);
  });

  const nameEl = document.getElementById('heroDetailName');
  const roleEl = document.getElementById('heroDetailRole');
  const loreEl = document.getElementById('heroDetailLore');
  const traitsEl = document.getElementById('heroDetailTraits');

  if (nameEl) nameEl.innerHTML = `${def.title} ${def.name} - <span style="color: ${def.color};">[${SKILL_DEFS[def.startingSkill].name.split(' ')[1]} 기본 장착]</span>`;
  if (roleEl) roleEl.innerText = `${def.role} | 체력 ${def.baseHp} | 속도 ${Math.round((def.baseSpeed / 175) * 100)}%`;
  if (loreEl) loreEl.innerText = `"${def.lore}"`;
  if (traitsEl) {
    traitsEl.innerHTML = def.passives.map(p => `<div class="trait-badge"><span>✓</span> ${p}</div>`).join('');
  }
  sound.playPickup();
}

function renderSectorList() {
  const container = document.getElementById('sectorList');
  if (!container) return;
  container.innerHTML = '';

  SECTOR_DEFS.forEach(s => {
    const isUnlocked = unlockedSectors.includes(s.id);
    const isCleared = clearedSectors.includes(s.id);
    const isSelected = (currentSelectedSector === s.id);

    const card = document.createElement('div');
    card.className = `sector-card ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`;
    // 2026-11-12 사용자: 카드를 누르면 바로 출진 (아래 출진 버튼도 그대로). PC는 마우스만 올려도 오른쪽 설명이 바뀜
    card.dataset.sector = s.id;
    card.onclick = () => { selectSector(s.id); if (isUnlocked) launchExpedition(); };
    card.onmouseenter = () => { if (window.matchMedia && matchMedia('(hover: hover)').matches && currentSelectedSector !== s.id) selectSector(s.id, true); };
    if (isUnlocked) card.title = '눌러서 바로 출진';

    let badgeHtml = '';
    if (isCleared) {
      badgeHtml = `<span class="sector-status-badge badge-cleared">★ 클리어 (재도전 가능)</span>`;
    } else if (isUnlocked) {
      badgeHtml = `<span class="sector-status-badge badge-available">⚔️ 진입 가능</span>`;
    } else {
      badgeHtml = `<span class="sector-status-badge badge-locked">🔒 잠김</span>`;
    }

    card.innerHTML = `
      <div class="sector-left">
        <div class="sector-name">${s.name}</div>
        <div class="sector-sub">${s.sub} · ${s.difficulty}</div>
      </div>
      <div>${badgeHtml}</div>
    `;
    container.appendChild(card);
  });
}

function selectSector(sectorId, quiet) {
  const isUnlocked = unlockedSectors.includes(sectorId);
  currentSelectedSector = sectorId;
  if (quiet) { // 마우스를 올렸을 때: 목록은 다시 만들지 않고 표시만 옮김
    document.querySelectorAll('#sectorList .sector-card').forEach(c => c.classList.toggle('selected', +c.dataset.sector === sectorId));
  } else renderSectorList();
  updateSectorDetails();

  const launchBtn = document.getElementById('btnLaunchExpedition');
  if (launchBtn) {
    if (!isUnlocked) {
      launchBtn.disabled = true;
      launchBtn.innerHTML = `<span>🔒 이전 구역을 먼저 돌파하십시오</span>`;
    } else {
      launchBtn.disabled = false;
      launchBtn.innerHTML = `<span class="btn-sword-icon">⚔️</span> 제${sectorId}구역 출진 (작전 개시) <span class="btn-kbd-pill">ENTER / SPACE</span>`;
    }
  }
  if (!quiet) sound.playPickup();
}

function updateSectorDetails() {
  const container = document.getElementById('sectorDetailContent');
  if (!container) return;
  const s = SECTOR_DEFS.find(item => item.id === currentSelectedSector) || SECTOR_DEFS[0];
  const isUnlocked = unlockedSectors.includes(s.id);
  const isCleared = clearedSectors.includes(s.id);

  let statusText = isCleared ? '<span style="color:#34d399; font-weight:bold;">★ 완료됨 (언제든 재도전 가능)</span>' : (isUnlocked ? '<span style="color:#38bdf8; font-weight:bold;">⚔️ 출전 가능</span>' : '<span style="color:#ef4444; font-weight:bold;">🔒 잠김 (이전 구역 클리어 필요)</span>');

  let enemiesHtml = s.enemies.map(e => `
    <div class="enemy-intel-card ${e.isBoss ? 'boss-intel' : ''}">
      <img src="${e.img}" class="enemy-thumb-img ${e.isBoss ? 'boss-thumb' : ''}" alt="${e.name}">
      <div class="enemy-info-col">
        <div class="enemy-title-row">
          <span class="enemy-name ${e.isBoss ? 'boss-name-highlight' : ''}">${e.name} <span class="hanja-sub">(${e.hanja})</span></span>
          <span class="threat-stars ${e.isBoss ? 'red-stars' : ''}">${e.stars}</span>
        </div>
        <div class="enemy-desc">${e.desc}</div>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="mission-brief-card" style="margin-bottom: 10px;">
      <div class="brief-item">
        <span class="brief-label">구역 상태</span>
        <span class="brief-val">${statusText}</span>
      </div>
      <div class="brief-item">
        <span class="brief-label">생존 목표</span>
        <span class="brief-val gold-highlight">${s.targetTime}</span>
      </div>
      <div class="brief-item">
        <span class="brief-label">출현 군주</span>
        <span class="brief-val">${s.bossName}</span>
      </div>
      <div class="brief-item">
        <span class="brief-label">전투 난이도</span>
        <span class="brief-val cyan-highlight">${s.difficulty}</span>
      </div>
    </div>
    <div style="font-size: 11.5px; color: #cbd5e1; line-height: 1.5; font-style: italic; margin-bottom: 10px; background: rgba(11,15,23,0.7); padding: 8px 12px; border-radius: 6px; border: 1px solid #334155;">
      "${s.desc}"
    </div>
    <div class="enemy-intel-list">
      ${enemiesHtml}
    </div>
  `;
}

// 타이틀의 [강호 입장] 버튼: 고를 것이 없으면 바로 게임 시작
// - 협객 선택 화면은 협객이 2명 이상 풀릴 때까지 건너뜀
// - 열린 구역이 1개뿐이면 구역 선택도 건너뛰고 바로 출전
function startTitleAudio(ev) {
  if (ev) ev.stopPropagation();
  sound.init();
  sound.setMusic('title');
  const t = document.getElementById('tapToStart');
  if (t) t.remove();
}
function quickEnter() {
  if (document.getElementById('tapToStart')) { startTitleAudio(); return; } // 첫 입력은 소리 켜기
  if (unlockedSectors.length <= 1) {
    selectSector(unlockedSectors[0] || 1);
    launchExpedition();
  } else {
    navScreen('stage');
  }
}
function refreshQuickEnterLabel() {
  const el = document.getElementById('quickEnterLabel');
  if (el) el.innerText = unlockedSectors.length <= 1 ? '강호 입장' : '강호 입장 (구역 선택)';
}

function launchExpedition() {
  if (!unlockedSectors.includes(currentSelectedSector)) {
    sound.playHit();
    alert('해당 작전 구역은 아직 잠겨 있습니다! 이전 구역을 먼저 돌파하십시오.');
    return;
  }
  // 시네마틱 (js/13_cinematics.js): 1구역은 오프닝, 구역 선택으로 2~5구역에 바로 들어가면 그 구역 진입 컷신
  playCinematic(currentSelectedSector === 1 ? 'opening' : 'sector' + currentSelectedSector, confirmStartGame);
}

function markCurrentSectorCleared() {
  if (!clearedSectors.includes(currentSelectedSector)) {
    clearedSectors.push(currentSelectedSector);
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('wuxia_cleared_sectors', JSON.stringify(clearedSectors)); } catch (e) {}
  }
  const nextSector = currentSelectedSector + 1;
  if (nextSector <= 5 && !unlockedSectors.includes(nextSector)) {
    unlockedSectors.push(nextSector);
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('wuxia_unlocked_sectors', JSON.stringify(unlockedSectors)); } catch (e) {}
  }
  damageTexts.push({
    x: player.x,
    y: player.y - 60,
    text: `★ 제${currentSelectedSector}구역 돌파 완료! 다음 구역 해금 ★`,
    color: '#fbbf24',
    life: 3.0,
    maxLife: 3.0,
    vy: -25
  });
}

function confirmStartGame() {
  const hero = HERO_DEFS[currentSelectedHero] || HERO_DEFS.seojin;
  player.heroId = hero.id;
  player.maxHp = hero.baseHp;
  player.hp = hero.baseHp;
  player.baseSpeed = hero.baseSpeed;
  player.speed = hero.baseSpeed;
  player.critRate = hero.critRate;
  player.critMultiplier = hero.critMultiplier;
  player.dmgReduction = hero.dmgReduction;
  player.bonusProjectile = hero.bonusProjectile;
  player.poisonDmgMult = hero.poisonDmgMult;
  player.knockbackMult = hero.knockbackMult;

  player.x = 0;
  player.y = 0;
  player.vx = 0;
  player.vy = 0;
  player.level = 1;
  player.exp = 0;
  player.nextExp = 20; // 첫 레벨업에 필요한 진기 (예전 10: 너무 잦음 / 50: 너무 느림 / 25: 테스터 '느리다')
  player.atkMultiplier = 1.0;
  player.speedBuffTimer = 0;
  player.evolutions = {};
  player.evoTimer = { flying_swords: 0, vajra_shield: 0 };
  player.dashTimer = 0;
  player.isDashing = false;
  player.afterImages = [];
  applyTrainings(player); // 문파 수련(영구 강화) 적용 + 이번 판 은자 기록 초기화 (js/14_progress.js)
  if (typeof startTutorial === 'function') startTutorial(); // 첫 판 안내 (js/15_tutorial.js)

  // Reset skills and assign starting skill!
  for (let k in player.skills) {
    player.skills[k] = 0;
  }
  player.skills[hero.startingSkill] = 1;

  // Clear all game entity arrays
  enemies.length = 0;
  projectiles.length = 0;
  flyingSwords.length = 0;
  expGems.length = 0;
  particles.length = 0;
  damageTexts.length = 0;
  groundBombs.length = 0;
  fallingNeedles.length = 0;
  poisonZones.length = 0;
  if (typeof bossHazards !== 'undefined') bossHazards.length = 0;
  plumTrees.length = 0;
  groundDecals.length = 0;
  corpses.length = 0;
  herbs.length = 0;
  chests.length = 0;
  droppedItems.length = 0;

  // Reset state
  state.isGameStarted = true;
  state.isPaused = false;
  state.isGameOver = false;
  state.isLevelingUp = false;
  state.spawnEnemies = true;
  state.bossDefeated = false;
  state.screenShake = 0;
  player.hitFlashTimer = 0;
  player.debuffs = { poison: 0, slow: 0 };
  player.activeBuffs = {};
  player.equipped = { weapon: null, robe: null };
  state.gameTime = 0;
  pendingLevelUps = 0;
  state.kills = 0;
  state.boss = null;
  state.currentPhase = 1;
  state.currentZone = 1;
  state.zoneTime = 0;
  state.zoneTransitionTimer = 0;
  state.zoneMiniBossSpawned = [false, false, false, false];
  state.victoryPortal = null;
  state.phase2Triggered = false;
  state.phase3Triggered = false;
  state.phase4Triggered = false;

  // Hide boss bar
  const bossBar = document.getElementById('bossBarContainer');
  if (bossBar) bossBar.style.display = 'none';

  // Hide all modals and gateway screens
  ['levelUpModal', 'pauseModal', 'cheatModal', 'victoryModal', 'gameOverModal', 'treasureModal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  ['title', 'hero', 'stage'].forEach(name => {
    const el = document.getElementById(name + 'Screen');
    if (el) el.style.display = 'none';
  });
  stopTitleParticles();

  const hudPortrait = document.getElementById('hudHeroPortraitImg');
  if (hudPortrait) hudPortrait.src = hero.portrait;

  initShrines();
  initObstacles();
  showPhaseBanner(
    `제${currentSelectedSector}구역 · ${shortPlaceName(SECTOR_DEFS[currentSelectedSector-1]?.name) || '혈투의 장'}`,
    '',
    'stage'
  );

  updateHud();
  updateHudDebuffs();
  // 시작 포위 14마리 (화면 테두리에서 걸어 들어옴)
  spawnEnemySwarm(14);
  sound.playLevelUp();
}

// 이전 구역의 스탯, 스킬, 장비를 완벽히 계승하여 다음 구역으로 진격
function continueToNextSector() {
  if (currentSelectedSector < 5) {
    currentSelectedSector++;
  }

  // 플레이어의 기존 레벨, 스킬, 획득 장비, 진화 무공을 온전히 보존한 채 생명력 완충
  player.hp = player.maxHp;
  player.x = 0;
  player.y = 0;
  player.vx = 0;
  player.vy = 0;
  player.hitFlashTimer = 0;
  player.debuffs = { poison: 0, slow: 0 };
  state.camera.x = 0;
  state.camera.y = 0;

  // 필드 엔티티 정리
  enemies.length = 0;
  projectiles.length = 0;
  flyingSwords.length = 0;
  expGems.length = 0;
  particles.length = 0;
  damageTexts.length = 0;
  groundBombs.length = 0;
  fallingNeedles.length = 0;
  poisonZones.length = 0;
  if (typeof bossHazards !== 'undefined') bossHazards.length = 0;
  plumTrees.length = 0;
  groundDecals.length = 0;
  corpses.length = 0;
  herbs.length = 0;
  chests.length = 0;
  droppedItems.length = 0;

  // 신규 구역 진행 상태 초기화
  state.runBossKills = 0; state.runMiniKills = 0; state.silverAwarded = false; // 은자는 구역마다 따로 계산
  state.isGameStarted = true;
  state.isPaused = false;
  state.isGameOver = false;
  state.isLevelingUp = false;
  state.spawnEnemies = true;
  state.bossDefeated = false;
  state.screenShake = 0;
  state.gameTime = 0;
  pendingLevelUps = 0;
  state.kills = 0;
  state.boss = null;
  state.currentPhase = 1;
  state.currentZone = 1;
  state.zoneTime = 0;
  state.zoneTransitionTimer = 0;
  state.zoneMiniBossSpawned = [false, false, false, false];
  state.victoryPortal = null;
  state.phase2Triggered = false;
  state.phase3Triggered = false;
  state.phase4Triggered = false;

  const bossBar = document.getElementById('bossBarContainer');
  if (bossBar) bossBar.style.display = 'none';

  ['levelUpModal', 'pauseModal', 'cheatModal', 'victoryModal', 'gameOverModal', 'treasureModal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  initShrines();
  initObstacles();

  const sectorInfo = SECTOR_DEFS[currentSelectedSector - 1];
  showPhaseBanner(
    `제${currentSelectedSector}구역 · ${sectorInfo ? shortPlaceName(sectorInfo.name) : '신비의 무림 관문'}`,
    '무공·장비 계승',
    'stage'
  );

  updateHud();
  updateHudDebuffs();
  spawnEnemySwarm(16);
  sound.playLevelUp();
}

// --- Game State & Real-time Retro Pixel Art Engine ---

// 2026-11-13: 고른 협객 기억, 구역 선택 화면 오른쪽 위 협객 표시를 누르면 협객 선택 화면
(function () {
  const init = () => { // progress(14_progress.js)가 읽힌 뒤에
    try { const h = localStorage.getItem('wuxia_hero'); if (h && HERO_DEFS[h] && heroUnlocked(h)) currentSelectedHero = h; } catch (e) {}
    const pill = document.getElementById('stageHeroPill');
    if (pill) { pill.style.cursor = 'pointer'; pill.title = '협객 바꾸기'; pill.addEventListener('click', () => { sound.init(); renderHeroCards(); selectHero(currentSelectedHero); navScreen('hero'); }); }
    renderHeroCards();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
