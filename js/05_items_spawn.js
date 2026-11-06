// 장비 아이템, 적 등장, 보스
const ITEM_POOL = [
  // Weapons (비검 룩변 & 특수 옵션)
  {
    name: '빙백신검 (氷魄神劍)',
    type: 'weapon',
    tier: 'rare',
    color: '#38bdf8',
    icon: '❄️🗡️',
    desc: '공격력 +35% · 타격 시 적 40% 둔화',
    atkBonus: 0.35,
    slowBonus: 0.40,
    lookEffect: 'frost_blade',
    lookDesc: '비검이 차가운 만년빙설의 서리 검기로 발광합니다!'
  },
  {
    name: '천마혈검 (天魔血劍)',
    type: 'weapon',
    tier: 'epic',
    color: '#ef4444',
    icon: '🩸🗡️',
    desc: '공격력 +55% · 치명타율 +15%',
    atkBonus: 0.55,
    critBonus: 0.15,
    lookEffect: 'blood_blade',
    lookDesc: '비검이 붉은 핏빛 마교 화염으로 타오릅니다!'
  },
  {
    name: '자하신검 (紫霞神劍)',
    type: 'weapon',
    tier: 'legendary',
    color: '#a855f7',
    icon: '⚡🗡️',
    desc: '비검 투사체 +2 · 공격력 +40%',
    bonusProj: 2,
    atkBonus: 0.40,
    lookEffect: 'thunder_blade',
    lookDesc: '비검이 자색 전격 뇌광을 내뿜으며 회전합니다!'
  },
  // Robes (외형 룩변 & 방어 옵션)
  {
    name: '청운유포 (靑雲儒袍)',
    type: 'robe',
    tier: 'rare',
    color: '#34d399',
    icon: '🥋',
    desc: '이동속도 +25% · 대시 쿨타임 -0.5초',
    speedBonus: 0.25,
    dashCdBonus: 0.5,
    lookEffect: 'jade_robe',
    lookDesc: '청운의 기운을 담은 비취빛 신선 도포를 착용합니다!'
  },
  {
    name: '흑풍야행의 (黑風夜行衣)',
    type: 'robe',
    tier: 'rare',
    color: '#94a3b8',
    icon: '🥷',
    desc: '치명타 피해 +40% · 이동속도 +15%',
    critDmgBonus: 0.40,
    speedBonus: 0.15,
    lookEffect: 'shadow_robe',
    lookDesc: '그림자 묵향을 머금은 칠흑 야행의를 착용합니다!'
  },
  {
    name: '금강불괴갑 (金剛不壞甲)',
    type: 'robe',
    tier: 'epic',
    color: '#fbbf24',
    icon: '🛡️🥋',
    desc: '최대 체력 +150 · 받는 피해 -20%',
    hpBonus: 150,
    dmgRedBonus: 0.20,
    lookEffect: 'vajra_armor',
    lookDesc: '눈부신 황금빛 금강 호신 강기를 몸에 두릅니다!'
  },
  {
    name: '혈마도포 (血魔道袍)',
    type: 'robe',
    tier: 'legendary',
    color: '#f43f5e',
    icon: '👑🥋',
    desc: '공격력 +30% · 타격 시 흡혈 4%',
    atkBonus: 0.30,
    vampBonus: 0.04,
    lookEffect: 'blood_robe',
    lookDesc: '마교 군주의 진홍빛 혈마 외투를 착용합니다!'
  }
];

function spawnItemDrop(x, y, forceTier) {
  // 사용자의 요청으로 버벅임 최적화 및 쾌적한 플레이를 위해 아이템 드롭 임시 비활성화
  return;
}

function applyEquipmentStats() {
  const hero = HERO_DEFS[currentSelectedHero] || HERO_DEFS.seojin;
  let bonusAtk = 0;
  let bonusCrit = 0;
  let bonusSpeed = 0;
  let bonusHp = 0;
  let bonusDmgRed = 0;
  let bonusProj = 0;

  if (player.equipped.weapon) {
    const w = player.equipped.weapon;
    bonusAtk += w.atkBonus || 0;
    bonusCrit += w.critBonus || 0;
    bonusProj += w.bonusProj || 0;
  }
  if (player.equipped.robe) {
    const r = player.equipped.robe;
    bonusSpeed += r.speedBonus || 0;
    bonusHp += r.hpBonus || 0;
    bonusDmgRed += r.dmgRedBonus || 0;
    bonusAtk += r.atkBonus || 0;
  }

  player.maxHp = hero.baseHp + bonusHp;
  player.dmgReduction = (hero.dmgReduction || 0) + bonusDmgRed;
  player.bonusProjectile = (hero.bonusProjectile || 0) + bonusProj;
  player.critRate = (hero.critRate || 0.25) + bonusCrit;
  player.baseSpeed = hero.baseSpeed * (1 + bonusSpeed);
  player.atkMultiplier = 1.0 + bonusAtk;
  updateHud();
}

function triggerEquipToast(item) {
  const container = document.getElementById('equipToastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'equip-toast';
  toast.style.borderColor = item.color;
  toast.innerHTML = `
    <div class="toast-icon">${item.icon}</div>
    <div class="toast-info">
      <div class="toast-title" style="color: ${item.color};">✨ [${item.tier.toUpperCase()}] ${item.name} 장착!</div>
      <div class="toast-desc">${item.desc}</div>
      <div class="toast-look">🎨 [룩변] ${item.lookDesc}</div>
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = 'all 0.4s ease';
    setTimeout(() => toast.remove(), 400);
  }, 4500);
}

function updateHudDebuffs() {
  const debuffBox = document.getElementById('hudDebuffs');
  if (!debuffBox) return;
  let html = '';
  if (player.debuffs.poison > 0) {
    html += `<div class="hud-buff-badge badge-debuff-poison">☣️ 맹독 (${player.debuffs.poison.toFixed(1)}초)</div>`;
  }
  if (player.debuffs.slow > 0) {
    html += `<div class="hud-buff-badge badge-debuff-slow">❄️ 둔화 (${player.debuffs.slow.toFixed(1)}초)</div>`;
  }
  for (let k in player.activeBuffs) {
    const dur = player.activeBuffs[k];
    if (dur > 0) {
      const nameMap = {
        blood_fury: '🔥 태을혈기 (공격력 2배)',
        wind_god: '🌪️ 풍신선풍 (이속+60%)',
        invincible: '🛡️ 금강불괴 (무적)',
        infinite_blades: '🗡️ 만천비검 (투사체+3)'
      };
      html += `<div class="hud-buff-badge badge-buff-shrine">${nameMap[k] || k} (${dur.toFixed(1)}초)</div>`;
    }
  }
  debuffBox.innerHTML = html;
}

// --- 4-Phase Wave & Boss Spawning System ---
let enemySpawnTimer = 0;
let herbSpawnTimer = 0;

function updateEnemySpawning(dt) {
  // If boss is defeated or spawning halted, do not spawn regular enemies
  if (!state.spawnEnemies || state.bossDefeated) return;

  const sectorDef = SECTOR_DEFS[currentSelectedSector - 1] || SECTOR_DEFS[0];
  const maxTime = sectorDef.durationSec || 180;
  const zoneDuration = maxTime / 4;

  state.zoneTime = (state.zoneTime || 0) + dt;

  // 1. Check Automatic Zone Transition (시간이 지나면 자동으로 화면 및 관문 전환)
  if (state.currentZone < 4 && state.zoneTime >= zoneDuration) {
    transitionToNextZone();
  }

  const curZone = state.currentZone || 1;
  state.currentPhase = curZone;

  const secIdx = Math.max(0, Math.min(4, (currentSelectedSector || 1) - 1));
  const zoneCfg = ZONE_CONFIGS[secIdx][curZone - 1];

  // Update HUD sector & zone tag
  const hudSecTag = document.getElementById('hudSectorTag');
  if (hudSecTag) {
    hudSecTag.innerText = `${currentSelectedSector}-${curZone} ${shortPlaceName(zoneCfg.name)}`;
  }

  // 2. Intermediate Mini-Boss in each zone (at half zone duration)
  if (curZone <= 3 && state.zoneTime >= (zoneDuration * 0.5) && !state.zoneMiniBossSpawned[curZone - 1]) {
    state.zoneMiniBossSpawned[curZone - 1] = true;
    const mbName = zoneCfg.miniBoss || '사파 중간보스';
    showPhaseBanner(`⚠️ 중간보스 · ${mbName}`, '', 'boss');
    spawnMiniBoss(mbName);
    spawnEnemySwarm(14);
  }

  // 3. Zone 4 Final Boss Descent (at start of Zone 4)
  if (curZone === 4 && !state.phase4Triggered) {
    state.phase4Triggered = true;
    const bName = zoneCfg.boss || sectorDef.bossName || '혈교 마두';
    showPhaseBanner(`☠️ 구역 군주 · ${bName}`, '', 'boss');
    spawnSectorBoss(bName);
    // 게임 분위기를 해치는 선형식 3D 와이어프레임 연출 제거
  }

  // Regular Mob Spawning with diversified archetypes
  enemySpawnTimer += dt;
  const targetEnemyCount = Math.min(220, 24 + Math.floor(state.gameTime * 2.6) + (curZone - 1) * 25);
  const spawnInterval = Math.max(0.18, 0.72 - state.gameTime * 0.005);

  if (enemySpawnTimer >= spawnInterval && enemies.length < targetEnemyCount) {
    enemySpawnTimer = 0;
    spawnEnemyPack();
  }

  // Periodic Herb Spawning
  herbSpawnTimer += dt;
  if (herbSpawnTimer >= 22 && herbs.length < 3) {
    herbSpawnTimer = 0;
    const hAngle = Math.random() * Math.PI * 2;
    const hDist = 340 + Math.random() * 260;
    herbs.push({
      x: player.x + Math.cos(hAngle) * hDist,
      y: player.y + Math.sin(hAngle) * hDist,
      type: Math.random() < 0.5 ? '천년설삼 (雪蔘)' : '천년영지 (靈芝)',
      val: 50,
      pulse: 0
    });
  }
}

function transitionToNextZone() {
  if (state.currentZone >= 4) return;
  state.currentZone++;
  state.currentPhase = state.currentZone;
  state.zoneTime = 0;
  state.zoneTransitionTimer = 1.0;

  const secIdx = Math.max(0, Math.min(4, (currentSelectedSector || 1) - 1));
  const nextCfg = ZONE_CONFIGS[secIdx][state.currentZone - 1];

  // Grand Stage Entry Announcement Banner
  showPhaseBanner(`제${state.currentZone}관문 · ${shortPlaceName(nextCfg.name)}`, '', 'stage');
  sound.playLevelUp();

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (!e.isBoss && !e.isMiniBoss && Math.hypot(e.x - player.x, e.y - player.y) > 460) {
      enemies.splice(i, 1);
    }
  }

  spawnEnemySwarm(22);
}

// 9가지 개성 넘치는 적 군단 스폰 (해골병, 부패시귀, 사령술사, 도살마인, 쌍도객, 주술녀, 궁수, 투창병, 강시, 살수)
// --- Stage-Matched Thematic Enemy Pools (관문 및 스테이지별 테마 몬스터 시스템) ---
function getStageEnemyDistribution() {
  const secIdx = Math.max(0, Math.min(4, (currentSelectedSector || 1) - 1));
  const curZone = Math.max(0, Math.min(3, (state.currentZone || 1) - 1));
  const zoneCfg = (ZONE_CONFIGS[secIdx] && ZONE_CONFIGS[secIdx][curZone]) ? ZONE_CONFIGS[secIdx][curZone] : ZONE_CONFIGS[0][0];
  const theme = zoneCfg.theme || 'bamboo_grove';

  // 1. 대나무 숲 테마 (취죽림 숲길, 만독림 외곽 등) -> 살수, 궁수, 투창병, 강시
  if (theme === 'bamboo_grove') {
    return [
      { type: 'assassin', name: '취죽림 흑풍살수', weight: 35 },
      { type: 'archer', name: '죽림 암살궁수', weight: 30 },
      { type: 'spearman', name: '청죽 암기살수', weight: 20 },
      { type: 'jiangshi', name: '취죽 혈강시', weight: 15 }
    ];
  }
  // 2. 석벽 성채/요새 테마 (흑풍채 성벽 요새, 하오문 참호 등) -> 백골병, 철갑 투창병, 쌍도객, 도살마인
  if (theme === 'stone_fortress') {
    return [
      { type: 'skeleton', name: '요새 백골병', weight: 32 },
      { type: 'spearman', name: '철갑 수리검살수', weight: 28 },
      { type: 'barbarian', name: '흑풍 쌍도객', weight: 24 },
      { type: 'butcher', name: '성채 도살마인', weight: 16 }
    ];
  }
  // 3. 지하 동굴/혈지/빙굴 테마 (혈풍 동굴, 만독혈지 등) -> 부패시귀, 독비수 살수, 사령술사, 혈강시
  if (theme === 'blood_cavern') {
    return [
      { type: 'ghoul', name: '동굴 부패시귀', weight: 35 },
      { type: 'poison_assassin', name: '독혈 암살자', weight: 25 },
      { type: 'necromancer', name: '흑마 사령술사', weight: 25 },
      { type: 'jiangshi', name: '천년 혈강시', weight: 15 }
    ];
  }
  // 4. 마교 본단/의식 제단 결전장 (천마전 대전당, 천마 궁극전 등) -> 혈선녀, 사령술사, 도살마인, 광혈 전사, 극독 살수
  if (theme === 'demon_sanctum') {
    return [
      { type: 'sorceress', name: '천마 혈선녀', weight: 28 },
      { type: 'necromancer', name: '심연 사령술사', weight: 24 },
      { type: 'butcher', name: '혈마 도살마인', weight: 20 },
      { type: 'barbarian', name: '광혈 전사', weight: 16 },
      { type: 'poison_assassin', name: '극독 비수살수', weight: 12 }
    ];
  }

  return [
    { type: 'assassin', name: '흑풍 살수', weight: 40 },
    { type: 'archer', name: '흑의 궁수', weight: 30 },
    { type: 'skeleton', name: '해골 백골병', weight: 30 }
  ];
}

function spawnEnemyPack() {
  const angle = Math.random() * Math.PI * 2;
  // 화면 가장자리 바로 바깥에서 등장 (화면 안에서 갑자기 생기지 않도록)
  const dist = offscreenSpawnDist(angle, 60) + Math.random() * 80;
  const spawnX = player.x + Math.cos(angle) * dist;
  const spawnY = player.y + Math.sin(angle) * dist;

  // 스테이지 및 관문 테마에 완전히 일치하는 몬스터 선정
  const pool = getStageEnemyDistribution();
  const totalWeight = pool.reduce((acc, p) => acc + p.weight, 0);
  let roll = Math.random() * totalWeight;
  let chosen = pool[0];
  for (let p of pool) {
    if (roll < p.weight) {
      chosen = p;
      break;
    }
    roll -= p.weight;
  }
  const enemyType = chosen.type;
  const stageName = chosen.name;

  const isSolo = (enemyType === 'butcher' || enemyType === 'necromancer' || enemyType === 'barbarian');
  const count = isSolo ? 1 : (2 + Math.floor(Math.random() * 2));

  for (let i = 0; i < count; i++) {
    const ox = (Math.random() - 0.5) * 55;
    const oy = (Math.random() - 0.5) * 55;
    const eX = spawnX + ox;
    const eY = spawnY + oy;

    if (enemyType === 'skeleton') {
      enemies.push({
        type: 'skeleton',
        name: (stageName || '해골 백골병'),
        x: eX, y: eY,
        hp: 42 + state.gameTime * 1.4,
        maxHp: 42 + state.gameTime * 1.4,
        speed: 115,
        radius: 19,
        damage: 13,
        hitCooldown: 0,
        expVal: 3
      });
    } else if (enemyType === 'ghoul') {
      enemies.push({
        type: 'ghoul',
        name: (stageName || '사파 부패시귀'),
        x: eX, y: eY,
        hp: 38 + state.gameTime * 1.4,
        maxHp: 38 + state.gameTime * 1.4,
        speed: 155,
        radius: 18,
        damage: 14,
        lungeTimer: 2.0 + Math.random() * 1.5,
        hitCooldown: 0,
        expVal: 3
      });
    } else if (enemyType === 'necromancer') {
      enemies.push({
        type: 'necromancer',
        name: (stageName || '흑마 사령술사'),
        x: eX, y: eY,
        hp: 68 + state.gameTime * 2.2,
        maxHp: 68 + state.gameTime * 2.2,
        speed: 90,
        radius: 21,
        damage: 17,
        shootTimer: 2.5 + Math.random() * 1.2,
        hitCooldown: 0,
        expVal: 5
      });
    } else if (enemyType === 'butcher') {
      enemies.push({
        type: 'butcher',
        name: (stageName || '혈마 도살마인'),
        x: eX, y: eY,
        hp: 145 + state.gameTime * 3.6,
        maxHp: 145 + state.gameTime * 3.6,
        speed: 105,
        radius: 28,
        damage: 24,
        chargeTimer: 3.5 + Math.random() * 2.0,
        hitCooldown: 0,
        expVal: 6
      });
    } else if (enemyType === 'barbarian') {
      enemies.push({
        type: 'barbarian',
        name: '광폭 쌍도객',
        x: eX, y: eY,
        hp: 75 + state.gameTime * 2.2,
        maxHp: 75 + state.gameTime * 2.2,
        speed: 145,
        radius: 21,
        damage: 18,
        whirlTimer: 4.0 + Math.random() * 2.0,
        hitCooldown: 0,
        expVal: 5
      });
    } else if (enemyType === 'sorceress') {
      enemies.push({
        type: 'sorceress',
        name: '혈선 주술녀',
        x: eX, y: eY,
        hp: 52 + state.gameTime * 1.6,
        maxHp: 52 + state.gameTime * 1.6,
        speed: 115,
        radius: 19,
        damage: 15,
        shootTimer: 2.6 + Math.random() * 1.2,
        hitCooldown: 0,
        expVal: 4
      });
    } else if (enemyType === 'archer') {
      enemies.push({
        type: 'archer',
        name: (stageName || '흑의 궁수'),
        x: eX, y: eY,
        hp: 35 + state.gameTime * 1.3,
        maxHp: 35 + state.gameTime * 1.3,
        speed: 120,
        radius: 18,
        damage: 12,
        shootTimer: 1.2 + Math.random() * 1.5,
        hitCooldown: 0,
        expVal: 3
      });
    } else if (enemyType === 'poison_assassin') {
      enemies.push({
        type: 'poison_assassin',
        name: (stageName || '독표창 살수'),
        x: eX, y: eY,
        hp: 38 + state.gameTime * 1.4,
        maxHp: 38 + state.gameTime * 1.4,
        speed: 165,
        radius: 18,
        damage: 14,
        shootTimer: 1.8 + Math.random() * 1.8,
        hitCooldown: 0,
        expVal: 4
      });
    } else if (enemyType === 'spearman') {
      enemies.push({
        type: 'spearman',
        name: (stageName || '철갑 수리검살수'),
        x: eX, y: eY,
        hp: 55 + state.gameTime * 1.8,
        maxHp: 55 + state.gameTime * 1.8,
        speed: 130,
        radius: 20,
        damage: 16,
        shootTimer: 2.2 + Math.random() * 1.5,
        hitCooldown: 0,
        expVal: 4
      });
    } else if (enemyType === 'jiangshi') {
      enemies.push({
        type: 'jiangshi',
        name: (stageName || '혈강시'),
        x: eX, y: eY,
        hp: 75 + state.gameTime * 2.4,
        maxHp: 75 + state.gameTime * 2.4,
        speed: 80,
        radius: 22,
        damage: 16,
        hopTimer: Math.random() * Math.PI * 2,
        hopHeight: 0,
        hitCooldown: 0,
        expVal: 5
      });
    } else {
      enemies.push({
        type: 'assassin',
        name: (stageName || '흑풍 살수'),
        x: eX, y: eY,
        hp: 30 + state.gameTime * 1.2,
        maxHp: 30 + state.gameTime * 1.2,
        speed: 160 + Math.random() * 30,
        radius: 18,
        damage: 11,
        runTimer: Math.random() * 10,
        hitCooldown: 0,
        expVal: 2
      });
    }
  }
}

function spawnEnemySwarm(count = 20) {
  const pool = getStageEnemyDistribution();
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.2;
    const dist = offscreenSpawnDist(angle, 10) + Math.random() * 60; // 화면 테두리에서 포위해 들어옴
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    const sType = chosen.type;
    const sName = chosen.name;
    const eX = player.x + Math.cos(angle) * dist;
    const eY = player.y + Math.sin(angle) * dist;

    if (sType === 'jiangshi') {
      enemies.push({
        type: 'jiangshi',
        name: sName,
        x: eX, y: eY,
        hp: 70 + state.gameTime * 2.2,
        maxHp: 70 + state.gameTime * 2.2,
        speed: 75,
        radius: 22,
        damage: 15,
        hopTimer: Math.random() * Math.PI * 2,
        hopHeight: 0,
        hitCooldown: 0,
        expVal: 4
      });
    } else if (sType === 'skeleton') {
      enemies.push({
        type: 'skeleton',
        name: sName,
        x: eX, y: eY,
        hp: 38 + state.gameTime * 1.3,
        maxHp: 38 + state.gameTime * 1.3,
        speed: 110,
        radius: 19,
        damage: 12,
        hitCooldown: 0,
        expVal: 2
      });
    } else if (sType === 'ghoul') {
      enemies.push({
        type: 'ghoul',
        name: sName,
        x: eX, y: eY,
        hp: 35 + state.gameTime * 1.3,
        maxHp: 35 + state.gameTime * 1.3,
        speed: 150,
        radius: 18,
        damage: 13,
        lungeTimer: 2.0,
        hitCooldown: 0,
        expVal: 2
      });
    } else {
      enemies.push({
        type: 'assassin',
        name: sName,
        x: eX, y: eY,
        hp: 28 + state.gameTime * 1.2,
        maxHp: 28 + state.gameTime * 1.2,
        speed: 160 + Math.random() * 30,
        radius: 18,
        damage: 10,
        runTimer: Math.random() * 10,
        hitCooldown: 0,
        expVal: 2
      });
    }
  }
}

function triggerScreenFlash(color) {
  const overlay = document.getElementById('damageOverlay');
  if (overlay) {
    overlay.style.opacity = '0.9';
    setTimeout(() => {
      if (overlay) overlay.style.opacity = '0';
    }, 280);
  }
}

// 중간보스 무협 전용 스킬 시스템 (흑풍삼단참, 천라지망, 지열혈파)
function spawnMiniBoss(name) {
  const angle = Math.random() * Math.PI * 2;
  const dist = 320;
  const secIdx = Math.max(0, Math.min(4, (currentSelectedSector || 1) - 1));
  const curZone = state.currentZone || 1;
  const zoneCfg = (ZONE_CONFIGS[secIdx] && ZONE_CONFIGS[secIdx][curZone - 1]) ? ZONE_CONFIGS[secIdx][curZone - 1] : ZONE_CONFIGS[0][0];

  const mbSprite = 'miniboss';
  const miniBoss = {
    type: 'miniboss',
    customSprite: mbSprite,
    isMiniBoss: true,
    name: name || zoneCfg.miniBoss || '사파 중간보스: 흑철 참마도장',
    x: player.x + Math.cos(angle) * dist,
    y: player.y + Math.sin(angle) * dist,
    hp: 1400 + state.gameTime * 18,
    maxHp: 1400 + state.gameTime * 18,
    speed: 135,
    radius: 62, // 1.3배 크기 확대
    damage: 26,
    runTimer: 0,
    hitCooldown: 0,
    expVal: 85,
    skillCooldown: 2.5,
    telegraph: null
  };
  enemies.push(miniBoss);

  state.cameraShake = 0.65;
  if (sound && sound.playHit) sound.playHit();
}

function spawnSectorBoss(bossName) {
  const angle = Math.random() * Math.PI * 2;
  const dist = 380;
  const boss = {
    type: 'boss_demon',
    isBoss: true,
    name: bossName || '혈교 마두 (Blood Cult Grandmaster)',
    x: player.x + Math.cos(angle) * dist,
    y: player.y + Math.sin(angle) * dist,
    hp: 1800 + state.gameTime * 25,
    maxHp: 1800 + state.gameTime * 25,
    speed: 110,
    radius: 48,
    damage: 26,
    attackTimer: 0,
    hitCooldown: 0,
    expVal: 100
  };
  state.boss = boss;
  enemies.push(boss);

  const bossBar = document.getElementById('bossBarContainer');
  if (bossBar) bossBar.style.display = 'flex';
  const nameEl = document.getElementById('bossName');
  if (nameEl) nameEl.innerText = `★ ${boss.name} ★`;
  const hpFill = document.getElementById('bossHpFill');
  if (hpFill) hpFill.style.width = '100%';
}

function spawnBossDemon() {
  const sectorDef = SECTOR_DEFS[currentSelectedSector - 1] || SECTOR_DEFS[0];
  spawnSectorBoss(sectorDef.bossName);
}

// --- Player Skills Implementation ---
