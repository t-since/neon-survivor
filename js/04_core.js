// 캔버스, 게임 상태, 플레이어, 조작(키보드·조이스틱·마우스), 신단·장애물
const canvas = document.getElementById('gameCanvas');
const mainCtx = canvas.getContext('2d');
let ctx = mainCtx;

// --- 테스트(치트) 모드: 주소 끝에 ?debug=1 을 붙이면 켜짐 ---
// 예) https://t-since.github.io/neon-survivor/?debug=1
const DEBUG_MODE = /[?&]debug=1/.test(location.search);
document.body.classList.toggle('debug', DEBUG_MODE);

// --- 난이도 (첫 화면에서 선택, 이 브라우저에 기억) ---
// dmg: 받는 피해 배율, hp: 적 체력 배율, count: 적 숫자 배율
const DIFFICULTY = {
  easy:   { label: '쉬움',   dmg: 0.45, hp: 0.7,  count: 0.75 },
  normal: { label: '보통',   dmg: 1.0,  hp: 1.0,  count: 1.0 },
  hard:   { label: '어려움', dmg: 1.35, hp: 1.4,  count: 1.25 }
};
let difficultyKey = 'normal';
try { const d = localStorage.getItem('wuxia_difficulty'); if (DIFFICULTY[d]) difficultyKey = d; } catch (e) {}
function difficultyCfg() { return DIFFICULTY[difficultyKey] || DIFFICULTY.normal; }
function cycleDifficulty() {
  const order = ['easy', 'normal', 'hard'];
  difficultyKey = order[(order.indexOf(difficultyKey) + 1) % order.length];
  try { localStorage.setItem('wuxia_difficulty', difficultyKey); } catch (e) {}
  refreshDifficultyButton();
}
function refreshDifficultyButton() {
  const b = document.getElementById('difficultyBtn');
  if (b) b.innerText = '난이도 : ' + difficultyCfg().label + '  ▸';
}

// --- 화면 크기 맞춤 (PC·모바일 공통) ---
// gameWidth / gameHeight 는 "보이는 세상의 넓이(월드 단위)" 입니다.
// 화면의 짧은 쪽에 항상 VIEW_MIN_WORLD 만큼의 세상이 보이도록 확대/축소하므로
// 폰에서도 PC와 비슷한 범위가 보이고, 적이 화면 밖에서 갑자기 붙지 않습니다.
const VIEW_MIN_WORLD = 760;   // 짧은 쪽에 보이는 최소 월드 크기
const VIEW_MAX_SCALE = 1.0;   // 큰 모니터에서는 원래 크기 이상으로 키우지 않음
let viewScale = 1;            // 화면 1px(CSS) 당 월드 단위 배율
let renderDpr = 1;            // 선명도(고해상도 화면) 배율
let gameWidth = window.innerWidth;
let gameHeight = window.innerHeight;

function resizeGameView() {
  const cssW = window.innerWidth;
  const cssH = window.innerHeight;
  viewScale = Math.min(VIEW_MAX_SCALE, Math.min(cssW, cssH) / VIEW_MIN_WORLD);
  renderDpr = Math.min(2, window.devicePixelRatio || 1); // 폰 3배 화면은 2배로 제한 (속도)
  gameWidth = cssW / viewScale;
  gameHeight = cssH / viewScale;
  canvas.width = Math.round(cssW * renderDpr);
  canvas.height = Math.round(cssH * renderDpr);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  document.body.classList.toggle('is-touch', matchMedia('(pointer: coarse)').matches);
}
// 화면 좌표(clientX/Y) → 월드 좌표
function screenToWorld(clientX, clientY) {
  return {
    x: clientX / viewScale - (gameWidth / 2 - state.camera.x),
    y: clientY / viewScale - (gameHeight / 2 - state.camera.y)
  };
}
// 플레이어 기준 angle 방향으로, 화면 가장자리 바로 바깥까지의 거리 (적 등장 위치용)
function offscreenSpawnDist(angle, margin = 70) {
  const c = Math.abs(Math.cos(angle)) || 1e-6;
  const s = Math.abs(Math.sin(angle)) || 1e-6;
  return Math.min((gameWidth / 2) / c, (gameHeight / 2) / s) + margin;
}
resizeGameView();

// Pixel Art Downscaler Canvas (16-bit Retro Mode)
const pixelBufferCanvas = document.createElement('canvas');
const pixelBufferCtx = pixelBufferCanvas.getContext('2d');

window.addEventListener('resize', resizeGameView);
window.addEventListener('orientationchange', () => setTimeout(resizeGameView, 200));

const state = {
  isGameStarted: false,
  isPaused: false,
  isGameOver: false,
  isLevelingUp: false,
  isGodMode: false,
  isPixelArtMode: false, // 픽셀 모드는 기본 OFF (고해상도 원본 및 부드러운 애니메이션 유지)
  pixelScale: 2.2,
  gameTime: 0,
  kills: 0,
  camera: { x: 0, y: 0 },
  screenShake: 0,
  spawnEnemies: true,
  bossDefeated: false,
  boss: null,
  currentPhase: 1,
  currentZone: 1,
  zoneTime: 0,
  zoneTransitionTimer: 0,
  zoneMiniBossSpawned: [false, false, false, false],
  victoryPortal: null,
  phase2Triggered: false,
  phase3Triggered: false,
  phase4Triggered: false,
  bossWaveCount: 0
};

// World Entities for Shrines, Obstacles, and Dropped Items
const shrines = [];
const obstacles = [];
const droppedItems = [];

function togglePixelArtMode() {
  state.isPixelArtMode = !state.isPixelArtMode;
  const btn = document.getElementById('pixelModeBtn');
  if (btn) {
    btn.innerHTML = state.isPixelArtMode ? '👾 픽셀: ON' : '🖼️ 픽셀: OFF';
    btn.style.color = state.isPixelArtMode ? '#38bdf8' : '#94a3b8';
    btn.style.borderColor = state.isPixelArtMode ? '#0284c7' : '#64748b';
  }
  showPhaseBanner(
    state.isPixelArtMode ? '👾 픽셀 모드' : '🖼️ 고화질 모드',
    ''
  );
}

// --- Player Object ---
const player = {
  heroId: 'seojin',
  dmgReduction: 0.0,
  critMultiplier: 2.1,
  bonusProjectile: 0,
  poisonDmgMult: 1.0,
  knockbackMult: 1.0,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  radius: 20,
  maxHp: 100,
  hp: 100,
  level: 1,
  exp: 0,
  nextExp: 20,
  baseSpeed: 195,
  speed: 195,
  speedBuffTimer: 0,
  hitFlashTimer: 0, // 피격 시 번쩍임 및 피격 넉백
  debuffs: { poison: 0, slow: 0 }, // 적 스킬 디버프
  activeBuffs: {}, // 디아블로식 신단 버프
  equipped: { weapon: null, robe: null }, // 장비 및 룩변 외형
  facing: 1, // 1: right, -1: left
  walkTimer: 0,
  isMoving: false,
  critRate: 0.25,
  atkMultiplier: 1.0,
  magnetRadius: 190,

  // Dash (경공)
  dashCooldown: 2.2,
  dashTimer: 0,
  isDashing: false,
  dashDuration: 0.22,
  dashElapsed: 0,
  dashVx: 0,
  dashVy: 0,
  dashSpeed: 550,

  // Skills & Evolutions
  skills: {
    flying_swords: 1,
    dagger_rain: 0,
    palm_blast: 0,
    thunder_bomb: 0,
    qinggong_dash: 0,
    vajra_shield: 0,
    qi_magnet: 0
  },
  evolutions: {}, // e.g. { evo_flying_swords: true }

  // Timers for attacks
  timers: {
    flying_swords: 0,
    dagger_rain: 0,
    palm_blast: 0,
    thunder_bomb: 0,
    vajra_shield: 0
  },
  evoTimer: {
    flying_swords: 0,
    vajra_shield: 0
  },

  // Combat Attack Animation States
  isAttacking: false,
  skillPose: null,
  attackTimer: 0,
  attackDuration: 0.32,
  attackCooldownTimer: 0,
  attackCombo: 0,

  afterImages: []
};

let flyingSwords = [];
let projectiles = [];
let groundBombs = [];
let fallingNeedles = [];
let poisonZones = [];
let groundDecals = []; // 지열혈파 지면 대지 균열 및 지속 마법진 데칼
let corpses = []; // 몬스터 사망 시 일정 시간 잔존하는 시체 및 백골 잔해
let enemies = [];
let particles = [];
let damageTexts = [];
let expGems = [];
let plumTrees = []; // 매화만개(이십사수매화검법 초월): 솟아난 매화나무
let herbs = [];
let chests = [];
let environmentPetals = [];

// Initialize Environment Plum Blossoms (매화 꽃잎 배경 파티클)
for (let i = 0; i < 45; i++) {
  environmentPetals.push({
    x: (Math.random() - 0.5) * 3000,
    y: (Math.random() - 0.5) * 3000,
    speedX: 25 + Math.random() * 30,
    speedY: 40 + Math.random() * 40,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 2,
    size: 4 + Math.random() * 4,
    opacity: 0.3 + Math.random() * 0.4
  });
}

// --- Controls Handling ---
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;

  // 시네마틱 중이면 다른 키 처리 막음 (js/13_cinematics.js)
  if (typeof Cinema !== 'undefined' && Cinema.handleKey(e)) return;

  // Three.js Cutscene active: Skip with Escape, Space, or Enter
  if (typeof ThreeCutsceneEngine !== 'undefined' && ThreeCutsceneEngine.active) {
    if (e.key === 'Escape' || e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
      e.preventDefault();
      ThreeCutsceneEngine.skip();
      return;
    }
  }

  // Title / Gateway Screen Key Controls (3-Step Navigation)
  if (!state.isGameStarted) {
    if (currentGatewayScreen === 'title') {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        sound.init();
        quickEnter();
        return;
      }
    } else if (currentGatewayScreen === 'hero') {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        navScreen('stage');
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        navScreen('title');
        return;
      }
      if (e.key === '1') { selectHero('seojin'); return; }
      if (e.key === '2' || e.key === '3') {
        // 배포판 준비 중 협객
        return;
      }
    } else if (currentGatewayScreen === 'stage') {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        launchExpedition();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        navScreen('title');
        return;
      }
      if (e.key >= '1' && e.key <= '5') {
        selectSector(parseInt(e.key));
        return;
      }
    }
    return;
  }

  if (e.key === ' ' || e.key === 'Shift') {
    triggerDash();
  }
  if (e.key === 'Escape') {
    togglePause();
  } else if (e.key === 'p' || e.key === 'P') {
    togglePixelArtMode();
  }
  // Debug / Test Hotkeys (주소 끝에 ?debug=1 을 붙였을 때만 작동)
  if (!DEBUG_MODE) return;
  if (e.key === '1') {
    cheatLevelUp(1);
  } else if (e.key === '5') {
    cheatLevelUp(5);
  } else if (e.key === '9') {
    cheatMaxAll();
  } else if (e.key === '0') {
    cheatToggleGod();
  } else if (e.key === 'b' || e.key === 'B') {
    spawnBossDemon();
  } else if (e.key === 'm' || e.key === 'M') {
    spawnEnemySwarm(20);
  }
});
window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

// Joystick
const joystickZone = document.getElementById('joystickZone');
const joystickBase = document.getElementById('joystickBase');
const joystickStick = document.getElementById('joystickStick');
const dashBtn = document.getElementById('dashBtn');
const dashCooldownText = document.getElementById('dashCooldownText');

let touchActive = false;
let touchId = null;
let joyOriginX = 0;
let joyOriginY = 0;
let joyInputX = 0;
let joyInputY = 0;

let lastTouchTime = 0;
function handleTouchStart(e) {
  sound.init();
  lastTouchTime = performance.now();
  if (!state.isGameStarted || state.isPaused) return;
  // 버튼·창 위를 누른 경우는 조이스틱으로 쓰지 않음
  if (e.target && e.target.closest && e.target.closest('button, .ctrl-btn, .modal-box, .skill-card, input')) return;
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    // 화면 왼쪽 60% 어디든 엄지를 대면 그 자리에 조이스틱이 생김 (떠다니는 조이스틱)
    if (t.clientX < window.innerWidth * 0.6 && !touchActive) {
      touchActive = true;
      touchId = t.identifier;
      joyOriginX = t.clientX;
      joyOriginY = t.clientY;
      const zr = joystickZone.getBoundingClientRect();
      joystickBase.style.left = (t.clientX - zr.left - joystickBase.offsetWidth / 2) + 'px';
      joystickBase.style.top = (t.clientY - zr.top - joystickBase.offsetHeight / 2) + 'px';
      joystickZone.classList.add('active');
      updateJoystick(t.clientX, t.clientY);
      if (e.cancelable) e.preventDefault();
    }
  }
}
function handleTouchMove(e) {
  if (!touchActive) return;
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.identifier === touchId) {
      updateJoystick(t.clientX, t.clientY);
    }
  }
}
function handleTouchEnd(e) {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.identifier === touchId) {
      touchActive = false;
      touchId = null;
      joyInputX = 0;
      joyInputY = 0;
      joystickStick.style.transform = `translate(0px, 0px)`;
      joystickBase.style.left = '';
      joystickBase.style.top = '';
      joystickZone.classList.remove('active');
    }
  }
}
function updateJoystick(cx, cy) {
  const dx = cx - joyOriginX;
  const dy = cy - joyOriginY;
  const dist = Math.hypot(dx, dy);
  const maxR = 45;
  const angle = Math.atan2(dy, dx);
  const clampedDist = Math.min(dist, maxR);
  const stickX = Math.cos(angle) * clampedDist;
  const stickY = Math.sin(angle) * clampedDist;
  joystickStick.style.transform = `translate(${stickX}px, ${stickY}px)`;
  joyInputX = stickX / maxR;
  joyInputY = stickY / maxR;
}

window.addEventListener('touchstart', handleTouchStart, { passive: false });
window.addEventListener('touchmove', handleTouchMove, { passive: false });
window.addEventListener('touchend', handleTouchEnd, { passive: false });
window.addEventListener('touchcancel', handleTouchEnd, { passive: false });

// Mouse Controls (클릭 이동 / 드래그 이동 / 우클릭 경공 대시)
let isMouseDown = false;
let mouseTarget = null;
let clickMarkers = [];

window.addEventListener('mousedown', (e) => {
  if (e.target.closest('.ctrl-btn, .modal-box, #mobileControls, .skill-card, button, input')) return;
  if (performance.now() - lastTouchTime < 800) return; // 터치 뒤 따라오는 가짜 마우스 클릭 무시
  sound.init();
  if (e.button === 0) {
    isMouseDown = true;
    const { x: worldX, y: worldY } = screenToWorld(e.clientX, e.clientY);

    // 마우스 좌클릭 시 목표 지점으로 이동 설정 (지면 클릭 마커 생성)
    setMouseTarget(e.clientX, e.clientY, true);

    // 클릭 지점 주변(120px 이내)에 적이 있다면 검격 공격도 즉시 연계 발동
    const nearbyEnemy = findClosestEnemy(worldX, worldY, 120);
    if (nearbyEnemy) {
      triggerMeleeAttack(nearbyEnemy);
    }
  } else if (e.button === 2) {
    e.preventDefault();
    const { x: worldX, y: worldY } = screenToWorld(e.clientX, e.clientY);
    const dx = worldX - player.x;
    const dy = worldY - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    player.vx = (dx / dist) * player.speed;
    player.vy = (dy / dist) * player.speed;
    triggerDash();
  }
});

window.addEventListener('mousemove', (e) => {
  if (isMouseDown) {
    // 마우스 좌클릭을 누른 채로 드래그하면 커서 방향으로 계속 부드럽게 이동
    setMouseTarget(e.clientX, e.clientY, false);
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) {
    isMouseDown = false;
  }
});

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

function setMouseTarget(screenX, screenY, spawnMarker = true) {
  const { x: worldX, y: worldY } = screenToWorld(screenX, screenY);
  mouseTarget = { x: worldX, y: worldY };

  if (spawnMarker) {
    clickMarkers.push({
      x: worldX,
      y: worldY,
      r: 6,
      maxR: 24,
      life: 0.45,
      maxLife: 0.45
    });
  }
}

dashBtn.addEventListener('click', (e) => {
  e.preventDefault();
  sound.init();
  triggerDash();
});
dashBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  sound.init();
  triggerDash();
});

function triggerDash() {
  if (player.dashTimer > 0 || player.isDashing || state.isPaused || state.isGameOver) return;
  player.isDashing = true;
  player.dashElapsed = 0;
  player.dashTimer = Math.max(0.8, player.dashCooldown - player.skills.qinggong_dash * 0.35) * ((player.activeBuffs && player.activeBuffs.wind_god > 0) ? 0.5 : 1);

  let dirX = player.vx;
  let dirY = player.vy;
  if (Math.hypot(dirX, dirY) < 0.1) {
    dirX = player.facing;
    dirY = 0;
  }
  const len = Math.hypot(dirX, dirY);
  player.dashVx = (dirX / len) * player.dashSpeed;
  player.dashVy = (dirY / len) * player.dashSpeed;

  sound.playDash();
  createInkDashEffect();
  // pixelfx: 지면 흙먼지 픽셀 폭발 (dust-dash)
  PixelFX.spawnDashDust(player.x, player.y, player.dashVx, player.dashVy);
}

function createInkDashEffect() {
  for (let i = 0; i < 4; i++) {
    player.afterImages.push({
      x: player.x - player.dashVx * (i * 0.04),
      y: player.y - player.dashVy * (i * 0.04),
      facing: player.facing,
      frame: Math.floor(player.walkTimer) % 4,
      alpha: 0.6 - i * 0.12,
      scale: 1.0 - i * 0.05
    });
  }
}

// --- Cinematic Phase, Stage & Boss Banner System ---
let phaseBannerTimeout = null;
// 이름에서 '제N구역:' 머리말과 (한자) 꼬리를 떼어 짧게
function shortPlaceName(name) {
  return String(name || '').replace(/^제\s*\d+\s*(구역|관문)\s*:\s*/, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
}
// 안내 배너: 한 줄 짧은 제목 + (있으면) 아주 짧은 부제, 2.4초만 표시
function showPhaseBanner(title, sub, type = 'normal') {
  const el = document.getElementById('phaseBanner');
  if (!el) return;
  el.classList.remove('stage-entry', 'boss-alert');
  if (type === 'stage') el.classList.add('stage-entry');
  if (type === 'boss') {
    el.classList.add('boss-alert');
    state.screenShake = 6;
    triggerScreenFlash('rgba(185, 28, 28, 0.22)');
  }
  document.getElementById('phaseBannerTitle').innerText = title;
  const subEl = document.getElementById('phaseBannerSub');
  subEl.innerText = sub || '';
  subEl.style.display = sub ? '' : 'none';
  el.classList.add('visible');
  if (phaseBannerTimeout) clearTimeout(phaseBannerTimeout);
  phaseBannerTimeout = setTimeout(() => {
    el.classList.remove('visible', 'stage-entry', 'boss-alert');
  }, type === 'boss' ? 3000 : 2400);
  sound.playLevelUp();
}

// --- Diablo-style Shrines (신단 / 기연 비석) ---
function initShrines() {
  shrines.length = 0;
  const shrineDefs = [
    { type: 'blood_fury', name: '태을혈기신단 (太乙血氣壇)', icon: '🔥', desc: '25초간 공격력 2배 & 공격속도 1.5배!', color: '#ef4444', duration: 25 },
    { type: 'wind_god', name: '풍신선풍신단 (風神旋風壇)', icon: '🌪️', desc: '25초간 이동속도 +60% & 대시 쿨타임 -50%!', color: '#10b981', duration: 25 },
    { type: 'invincible', name: '금강불괴신단 (金剛不壞壇)', icon: '🛡️', desc: '12초간 완전 무적 & 접근 적 충격파!', color: '#f59e0b', duration: 12 },
    { type: 'infinite_blades', name: '만천비검신단 (萬天飛劍壇)', icon: '🗡️', desc: '25초간 비검 투사체 +3 & 발사속도 대폭 증가!', color: '#38bdf8', duration: 25 }
  ];

  // 신단 4개를 동서남북으로 고르게 흩어 놓음 (시작 지점에서 650~1150 떨어진 곳, 서로 최소 90도 간격)
  const baseRot = Math.random() * Math.PI * 2;
  const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5); // 방향마다 어떤 신단이 올지 섞기
  for (let i = 0; i < 4; i++) {
    const ang = baseRot + (i / 4) * Math.PI * 2 + (Math.random() - 0.5) * 0.7;
    const dist = 650 + Math.random() * 500;
    const def = shrineDefs[order[i]];
    shrines.push({
      id: 'shrine_' + i,
      x: player.x + Math.cos(ang) * dist,
      y: player.y + Math.sin(ang) * dist,
      type: def.type,
      name: def.name,
      icon: def.icon,
      desc: def.desc,
      color: def.color,
      duration: def.duration,
      active: true,
      pulse: Math.random() * Math.PI
    });
  }
}

// --- 2.5D Isometric Obstacles (쿼터뷰 지형지물 & 입체감) ---
function initObstacles() {
  obstacles.length = 0;
  obstacleChunks.clear();
  obstaclePropSet = null;
  const secIdx = Math.max(0, Math.min(4, (currentSelectedSector || 1) - 1));
  const curZone = state.currentZone || 1;
  const zoneCfg = (ZONE_CONFIGS[secIdx] && ZONE_CONFIGS[secIdx][curZone - 1]) ? ZONE_CONFIGS[secIdx][curZone - 1] : ZONE_CONFIGS[0][0];

  // 마교 본단/의식 제단 (demon_sanctum / altar)에서는 부자연스러운 대나무나 목책 프랍 완전 배제!
  if (zoneCfg.theme === 'demon_sanctum' || zoneCfg.propType === 'altar') {
    // 결전장 중앙 의식 제단(반경 550)을 깨끗하게 유지하고, 외곽(반경 680)에만 고풍 석등 8개 정렬
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      obstacles.push({
        x: Math.cos(ang) * 680,
        y: Math.sin(ang) * 680,
        type: 'lantern',
        radius: 20
      });
    }
    return;
  }

  // 테마별 소품 구성 [종류, 비중]
  if (zoneCfg.theme === 'bamboo_grove' || zoneCfg.propType === 'bamboo') {
    obstaclePropSet = [['bamboo', 6], ['rock_small', 2], ['rock_big', 1], ['lantern', 1]];
  } else if (zoneCfg.theme === 'blood_cavern') {
    obstaclePropSet = [['rock_big', 3], ['rock_small', 3], ['lantern', 1]];
  } else { // stone_fortress 등
    obstaclePropSet = [['lantern', 3], ['rock_big', 2], ['rock_small', 2], ['fence', 1]];
  }
  // 구역별 소품 (그림을 불러왔을 때만): 3구역 독 밀림·늪, 4구역 빙궁·설원
  const SECTOR_PROPS = {
    1: [['wine_barrels', 3], ['cargo_crates', 3], ['broken_cart', 1], ['lantern_post', 2]],
    4: [['blood_brazier', 2], ['demon_statue', 2], ['skull_heap', 2], ['rune_stele', 2]],
    2: [['swamp_reeds', 3], ['poison_mushroom', 3], ['vine_stump', 2], ['bone_pile', 1], ['bamboo', 1]],
    3: [['snow_rock', 3], ['ice_crystal', 3], ['icicle_rock', 2], ['ice_pillar', 1]]
  };
  const sp = SECTOR_PROPS[secIdx];
  if (sp && SPRITES['prop_' + sp[0][0]] && SPRITES['prop_' + sp[0][0]].width) obstaclePropSet = sp;
  obstacleSafeCenter = { x: player.x, y: player.y };
  obstacleSeed = (Math.random() * 1e9) | 0;
  ensureObstacleChunks();
}

// --- 소품을 맵 전체에 고르게 깔기 ---
// 맵을 OBSTACLE_CHUNK 크기의 칸으로 나누고, 화면 근처 칸에 처음 들어갈 때 그 칸의 소품을 만듦.
// 같은 칸은 늘 같은 모양(씨앗값 고정)이라 되돌아가도 소품이 바뀌지 않음.
const OBSTACLE_CHUNK = 520;
const OBSTACLE_RADIUS = { bamboo: 30, rock_big: 46, rock_small: 24, lantern: 20, fence: 26, boulder: 46,
  poison_mushroom: 30, swamp_reeds: 22, vine_stump: 34, bone_pile: 28, ice_crystal: 30, snow_rock: 44, ice_pillar: 24, icicle_rock: 44,
  wine_barrels: 38, cargo_crates: 42, broken_cart: 46, lantern_post: 16, blood_brazier: 26, demon_statue: 32, skull_heap: 36, rune_stele: 28 };
// 그림 크기 기준 간격 반경: 두 소품 사이는 (내 값 + 상대 값) 이상 떨어짐
const PROP_GAP = { bamboo: 95, rock_big: 80, rock_small: 45, lantern: 40, fence: 60, boulder: 80,
  poison_mushroom: 70, swamp_reeds: 60, vine_stump: 75, bone_pile: 60, ice_crystal: 70, snow_rock: 75, ice_pillar: 55, icicle_rock: 75,
  wine_barrels: 70, cargo_crates: 75, broken_cart: 85, lantern_post: 50, blood_brazier: 60, demon_statue: 65, skull_heap: 70, rune_stele: 60 };
const obstacleChunks = new Set();
let obstaclePropSet = null;
let obstacleSafeCenter = { x: 0, y: 0 };
let obstacleSeed = 1;

function chunkRandom(cx, cy) {
  let s = (Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663) ^ obstacleSeed) >>> 0;
  if (s === 0) s = 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function pickPropType(rand) {
  const total = obstaclePropSet.reduce((a, p) => a + p[1], 0);
  let r = rand() * total;
  for (const [t, w] of obstaclePropSet) { if (r < w) return t; r -= w; }
  return obstaclePropSet[0][0];
}
function ensureObstacleChunks() {
  if (!obstaclePropSet) return;
  const m = 260;
  const x0 = Math.floor((state.camera.x - gameWidth / 2 - m) / OBSTACLE_CHUNK);
  const x1 = Math.floor((state.camera.x + gameWidth / 2 + m) / OBSTACLE_CHUNK);
  const y0 = Math.floor((state.camera.y - gameHeight / 2 - m) / OBSTACLE_CHUNK);
  const y1 = Math.floor((state.camera.y + gameHeight / 2 + m) / OBSTACLE_CHUNK);
  for (let cx = x0; cx <= x1; cx++) {
    for (let cy = y0; cy <= y1; cy++) {
      const key = cx + ',' + cy;
      if (obstacleChunks.has(key)) continue;
      obstacleChunks.add(key);
      const rand = chunkRandom(cx, cy);
      // 한 칸을 2x2 작은 칸으로 나눠 각 자리에 45% 확률로 소품 하나 (뭉치지 않게)
      for (let gx = 0; gx < 2; gx++) for (let gy = 0; gy < 2; gy++) {
        if (rand() > 0.45) continue;
        const half = OBSTACLE_CHUNK / 2;
        const x = cx * OBSTACLE_CHUNK + gx * half + half * (0.2 + rand() * 0.6);
        const y = cy * OBSTACLE_CHUNK + gy * half + half * (0.2 + rand() * 0.6);
        // 시작 지점·신단 주변은 비워 둠 (신단 그림이 커서 넉넉히)
        if (Math.hypot(x - obstacleSafeCenter.x, y - obstacleSafeCenter.y) < 300) continue;
        if (shrines.some(s => Math.hypot(x - s.x, y - s.y) < 300)) continue;
        const type = pickPropType(rand);
        // 소품끼리 그림이 겹치지 않게 최소 간격 (옆 칸 소품과 붙는 문제)
        const gap = PROP_GAP[type] || 60;
        if (obstacles.some(o => Math.abs(o.x - x) < 260 && Math.abs(o.y - y) < 260 && Math.hypot(o.x - x, o.y - y) < gap + (PROP_GAP[o.type] || 60))) continue;
        obstacles.push({ x, y, type, radius: OBSTACLE_RADIUS[type] || 26, flip: rand() < 0.5, scale: 0.85 + rand() * 0.3 });
      }
    }
  }
}

// --- Item Drops & Visual Look Change (장비 옵션 및 룩변) ---
