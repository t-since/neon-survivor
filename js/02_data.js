// 그림 불러오기, 경지·무공·협객·구역 데이터
const sound = new SoundManager();

// --- Sprites Loader ---
const SPRITE_URLS = {
  hero_0: 'assets/hero_walk_0.png',
  hero_1: 'assets/hero_walk_1.png',
  hero_2: 'assets/hero_walk_2.png',
  hero_3: 'assets/hero_walk_3.png',
  assassin: 'assets/assassin.png',
  assassin_run_0: 'assets/assassin_run_0.png',
  assassin_run_1: 'assets/assassin_run_1.png',
  assassin_run_2: 'assets/assassin_run_2.png',
  assassin_run_3: 'assets/assassin_run_3.png',
  jiangshi: 'assets/jiangshi.png',
  skeleton: 'assets/skeleton.png',
  skeleton_run_0: 'assets/skeleton_run_0.png',
  skeleton_run_1: 'assets/skeleton_run_1.png',
  skeleton_run_2: 'assets/skeleton_run_2.png',
  skeleton_run_3: 'assets/skeleton_run_3.png',
  skeleton_atk_0: 'assets/skeleton_attack_0.png',
  skeleton_atk_1: 'assets/skeleton_attack_1.png',
  skeleton_atk_2: 'assets/skeleton_attack_2.png',
  skeleton_atk_3: 'assets/skeleton_attack_3.png',
  ghoul: 'assets/ghoul.png',
  necromancer: 'assets/necromancer.png',
  butcher: 'assets/butcher.png',
  barbarian: 'assets/barbarian.png',
  sorceress: 'assets/sorceress.png',
  boss_demon: 'assets/boss_demon.png',
  miniboss_run_0: 'assets/miniboss_run_0.png',
  miniboss_run_1: 'assets/miniboss_run_1.png',
  miniboss_run_2: 'assets/miniboss_run_2.png',
  miniboss_run_3: 'assets/miniboss_run_3.png',
  archer_shoot_0: 'assets/archer_shoot_0.png',
  archer_shoot_1: 'assets/archer_shoot_1.png',
  archer_shoot_2: 'assets/archer_shoot_2.png',
  archer_shoot_3: 'assets/archer_shoot_3.png',
  barbarian_run_0: 'assets/barbarian_run_0.png',
  barbarian_run_1: 'assets/barbarian_run_1.png',
  barbarian_run_2: 'assets/barbarian_run_2.png',
  barbarian_run_3: 'assets/barbarian_run_3.png',
  butcher_run_0: 'assets/butcher_run_0.png',
  butcher_run_1: 'assets/butcher_run_1.png',
  butcher_run_2: 'assets/butcher_run_2.png',
  butcher_run_3: 'assets/butcher_run_3.png',
  ghoul_run_0: 'assets/ghoul_run_0.png',
  ghoul_run_1: 'assets/ghoul_run_1.png',
  ghoul_run_2: 'assets/ghoul_run_2.png',
  ghoul_run_3: 'assets/ghoul_run_3.png',
  jiangshi_leap_0: 'assets/jiangshi_leap_0.png',
  jiangshi_leap_1: 'assets/jiangshi_leap_1.png',
  jiangshi_leap_2: 'assets/jiangshi_leap_2.png',
  jiangshi_leap_3: 'assets/jiangshi_leap_3.png',
  ground: 'assets/ground_tile.jpg',
  ground_stone_iso: 'assets/ground_stone_iso.jpg',
  ground_cavern: 'assets/ground_cavern.jpg',
  ground_sanctum: 'assets/ground_sanctum.jpg',
  title_bg: 'assets/title_bg.jpg',
  portrait_seojin: 'assets/portrait_seojin.jpg',
  portrait_hyunwoon: 'assets/portrait_hyunwoon.jpg',
  portrait_tangsoyeon: 'assets/portrait_tangsoyeon.jpg',
  portrait_enemy_assassin: 'assets/portrait_enemy_assassin.jpg',
  portrait_enemy_jiangshi: 'assets/portrait_enemy_jiangshi.jpg',
  portrait_enemy_boss: 'assets/portrait_enemy_boss.jpg',

  // 배경 소품 (제미나이로 서진과 같은 그림체로 생성, 2026-11)
  prop_bamboo: 'assets/props/bamboo.png',
  prop_rock_big: 'assets/props/rock_big.png',
  prop_rock_small: 'assets/props/rock_small.png',
  prop_lantern: 'assets/props/lantern.png',
  prop_brazier: 'assets/props/brazier.png',
  prop_stalagmite: 'assets/props/stalagmite.png',
  // 구역별 소품 (2026-11-11, 2x2 시트를 tools/split_props.mjs 로 자름): 3구역 독 밀림·늪 / 4구역 빙궁
  prop_poison_mushroom: 'assets/props/poison_mushroom.png',
  prop_swamp_reeds: 'assets/props/swamp_reeds.png',
  prop_vine_stump: 'assets/props/vine_stump.png',
  prop_bone_pile: 'assets/props/bone_pile.png',
  prop_ice_crystal: 'assets/props/ice_crystal.png',
  prop_snow_rock: 'assets/props/snow_rock.png',
  prop_ice_pillar: 'assets/props/ice_pillar.png',
  prop_icicle_rock: 'assets/props/icicle_rock.png',
  // 2구역 하오문 뒷골목 / 5구역 마교
  prop_wine_barrels: 'assets/props/wine_barrels.png',
  prop_cargo_crates: 'assets/props/cargo_crates.png',
  prop_broken_cart: 'assets/props/broken_cart.png',
  prop_lantern_post: 'assets/props/lantern_post.png',
  prop_blood_brazier: 'assets/props/blood_brazier.png',
  prop_demon_statue: 'assets/props/demon_statue.png',
  prop_skull_heap: 'assets/props/skull_heap.png',
  prop_rune_stele: 'assets/props/rune_stele.png',
  prop_incense: 'assets/props/incense.png',
  prop_barricade: 'assets/props/barricade.png',
  shrine_blood_fury: 'assets/props/shrine_blood_fury.png',
  shrine_wind_god: 'assets/props/shrine_wind_god.png',
  shrine_invincible: 'assets/props/shrine_invincible.png',
  shrine_infinite_blades: 'assets/props/shrine_infinite_blades.png',

  // 서진 동작 프레임 (제미나이 2x2 시트에서 자름: 걷기 4장, 공격 4장)
  seojin_walk_0: 'assets/hero/seojin_walk_0.png',
  seojin_walk_1: 'assets/hero/seojin_walk_1.png',
  seojin_walk_2: 'assets/hero/seojin_walk_2.png',
  seojin_walk_3: 'assets/hero/seojin_walk_3.png',
  seojin_attack_0: 'assets/hero/seojin_attack_0.png',
  seojin_attack_1: 'assets/hero/seojin_attack_1.png',
  seojin_attack_2: 'assets/hero/seojin_attack_2.png',
  seojin_attack_3: 'assets/hero/seojin_attack_3.png',

  // 이펙트 (제미나이, 검은 배경 → 'lighter' 합성으로 빛만 보임)
  fx_portal: 'assets/fx/fx_portal.jpg',
  fx_wind: 'assets/fx/fx_wind.jpg',
  fx_thunder: 'assets/fx/fx_thunder.jpg',
  fx_poison: 'assets/fx/fx_poison.jpg',
  fx_fissure: 'assets/fx/fx_fissure.png',      // 지열혈파 갈라진 바닥 (보통 합성)
  fx_shield: 'assets/fx/fx_shield.jpg',        // 금강불괴 보호막
  fx_needles: 'assets/fx/fx_needles.jpg',      // 독침 폭발 (다음에 사용)
  fx_bloodslash: 'assets/fx/fx_bloodslash.jpg', // 혈검 베기 (다음에 사용)
  fx_buddha_palm: 'assets/fx/fx_buddha_palm.jpg', // 여래신장 금빛 손바닥
  // 서진 무공 시전 4동작: 0 장풍, 1 은침, 2 검결지(어검술), 3 벽력탄 던지기
  seojin_cast_0: 'assets/hero/seojin_cast_0.png',
  seojin_cast_1: 'assets/hero/seojin_cast_1.png',
  seojin_cast_2: 'assets/hero/seojin_cast_2.png',
  seojin_cast_3: 'assets/hero/seojin_cast_3.png',

  // 관문 테마별 바닥 (이음새 없이 이어지도록 처리됨)
  ground_new_bamboo: 'assets/ground/bamboo.jpg',
  ground_new_fortress: 'assets/ground/fortress.jpg',
  ground_new_cavern: 'assets/ground/cavern.jpg',
  // 구역별 바닥 (임시: 기존 바닥 색 바꿈 — 제미나이 그림이 생기면 같은 이름으로 교체)
  ground_new_alley: 'assets/ground/alley.jpg',
  ground_new_jungle: 'assets/ground/jungle.jpg',
  ground_new_swamp: 'assets/ground/swamp.jpg',
  ground_new_snow: 'assets/ground/snow.jpg',
  ground_new_ice: 'assets/ground/ice.jpg',
  ground_new_bloodpalace: 'assets/ground/bloodpalace.jpg',
  // 2차 바닥 (구역마다 재질이 다른 새 그림, 2026-11-10~). 있으면 위 바닥 대신 씀 (09_render_world.js)
  ground_ice_v2: 'assets/ground/ice_v2.jpg',
  ground_snow_v2: 'assets/ground/snow_v2.jpg',
  ground_swamp_v2: 'assets/ground/swamp_v2.jpg',
  ground_bamboo_v2: 'assets/ground/bamboo_v2.jpg',
  ground_alley_v2: 'assets/ground/alley_v2.jpg',
  ground_fortress_v2: 'assets/ground/fortress_v2.jpg',
  ground_jungle_v2: 'assets/ground/jungle_v2.jpg',
  ground_cavern_v2: 'assets/ground/cavern_v2.jpg',
  ground_bloodpalace_v2: 'assets/ground/bloodpalace_v2.jpg'
};
// 새 몬스터 그림 (제미나이 2x2 시트에서 자름, assets/mobs). 새로 만든 몬스터는 이 목록에 이름만 추가
const MOB_ART_NAMES = ['mob_assassin', 'mob_archer', 'mob_dartman', 'mob_jiangshi',
  'mob_skeleton', 'mob_barbarian', 'mob_butcher', 'mob_ghoul', // 2026-11-10 추가
  'mob_necromancer', 'mob_sorceress', 'mob_curse_mage', // 이 셋의 그림 일부는 안티그래비티로 만듦
  'mob_ice_sword', 'mob_ice_jiangshi', 'mob_ice_mage', 'mob_yeti', // 2026-11-12 4구역 빙궁 전용
  'mob_white_tiger', 'mob_ice_spider', 'mob_poison_spider', 'mob_black_wolf']; // 2026-11-12 괴수형
for (const n of MOB_ART_NAMES) {
  for (const kind of ['walk', 'attack']) {
    for (let i = 0; i < 4; i++) SPRITE_URLS[`${n}_${kind}_${i}`] = `assets/mobs/${n}_${kind}_${i}.png`;
  }
}
const SPRITES = {};
let loadedImagesCount = 0;
const totalImages = Object.keys(SPRITE_URLS).length;

function loadAllSprites(callback) {
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    try { generateAllSeamlessGrounds(); } catch (e) { console.warn(e); }
    callback();
  };

  // 안전 타임아웃 (로딩 멈춤 방지)
  setTimeout(finish, 1200);

  for (let key in SPRITE_URLS) {
    const img = new Image();
    img.src = SPRITE_URLS[key];
    img.onload = () => {
      SPRITES[key] = img;
      loadedImagesCount++;
      if (loadedImagesCount >= totalImages) finish();
    };
    img.onerror = () => {
      console.warn("Failed to load sprite: " + SPRITE_URLS[key]);
      loadedImagesCount++;
      if (loadedImagesCount >= totalImages) finish();
    };
  }
}

// 디아블로풍 심리스 바닥 텍스처 생성기 (타일 경계선 완전 제거 및 자연스러운 연결)
function generateAllSeamlessGrounds() {
  try {
    const baseStone = SPRITES.ground_stone_iso || SPRITES.ground;
    if (!baseStone) return;

    const w = 512, h = 512;
    const createSeamless = (srcImg, tintColor) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx2 = c.getContext('2d');
      if (!ctx2) return srcImg;
      ctx2.drawImage(srcImg, 0, 0, w, h);

      // 상하좌우 4개 경계선 크로스페이드 (타일 간 이어지는 틈새/선 완전 제거)
      const edge = 64;
      ctx2.save();
      ctx2.globalAlpha = 0.45;
      ctx2.drawImage(srcImg, 0, 0, edge, h, w - edge, 0, edge, h);
      ctx2.drawImage(srcImg, w - edge, 0, edge, h, 0, 0, edge, h);
      ctx2.drawImage(srcImg, 0, 0, w, edge, 0, h - edge, w, edge);
      ctx2.drawImage(srcImg, 0, h - edge, w, edge, 0, 0, w, edge);
      ctx2.restore();

      if (tintColor) {
        ctx2.fillStyle = tintColor;
        ctx2.fillRect(0, 0, w, h);
      }
      return c;
    };

    SPRITES['ground_seamless_stone'] = createSeamless(baseStone, null);
    SPRITES['ground_bamboo'] = createSeamless(baseStone, 'rgba(16, 38, 22, 0.42)');
    SPRITES['ground_cavern'] = createSeamless(baseStone, 'rgba(26, 15, 36, 0.40)');
    SPRITES['ground_sanctum_base'] = createSeamless(baseStone, 'rgba(38, 12, 18, 0.52)');

    // 제단 마법진의 네모난 각진 경계선을 완전히 없애고 바닥과 자연스럽게 녹아들도록 원형 알파 페더링 처리
    if (SPRITES.ground_sanctum && (SPRITES.ground_sanctum.complete || SPRITES.ground_sanctum.width > 0)) {
      const sw = 920, sh = 920;
      const ac = document.createElement('canvas');
      ac.width = sw; ac.height = sh;
      const actx = ac.getContext('2d');
      if (actx) {
        actx.drawImage(SPRITES.ground_sanctum, 0, 0, sw, sh);
        actx.globalCompositeOperation = 'destination-in';
        const grad = actx.createRadialGradient(sw / 2, sh / 2, 270, sw / 2, sh / 2, 440);
        grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
        grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.95)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        actx.fillStyle = grad;
        actx.fillRect(0, 0, sw, sh);
      }
      SPRITES['ground_sanctum_feathered'] = ac;
    }
  } catch (err) {
    console.warn("generateAllSeamlessGrounds error:", err);
  }
}

// --- Wuxia Martial Sect Tiers ---
const TIERS = [
  "삼류 무사 (三流)",
  "이류 고수 (二流)",
  "일류 고수 (一流)",
  "절정 고수 (絶頂)",
  "초절정 고수 (超絶頂)",
  "화경 (化境)",
  "현경 (玄境)",
  "생사경 (生死境)"
];
function getTier(lvl) {
  const idx = Math.min(Math.floor((lvl - 1) / 3), TIERS.length - 1);
  return `${TIERS[idx]} (Lv.${lvl})`;
}

// --- Skill Definitions ---
const SKILL_DEFS = {
  flying_swords: {
    id: 'flying_swords',
    name: '화산 이십사수매화검법 (二十四手梅花劍法)',
    icon: '🌸',
    desc: '매화검이 주위를 맴돌다 적을 향해 쏘아져 베고, 벤 자리마다 매화 꽃잎이 흩날립니다. 연마할수록 검이 늘고 빨라집니다.',
    maxLevel: 5,
    getUpgradeDesc: (lvl) => lvl === 1 ? '매화검 1자루 전개' : `매화검 +1자루, 검의 속도·꽃잎 증가 (Lv.${lvl})`
  },
  dagger_rain: {
    id: 'dagger_rain',
    name: '당문 만천화우 (滿天花雨)',
    icon: '✨',
    desc: '하늘에서 수십 개의 은침 소나기가 쏟아져 내리며 독 안개 장판과 지속 독 피해(도트뎀)를 입힙니다.',
    maxLevel: 5,
    getUpgradeDesc: (lvl) => lvl === 1 ? '은침 소나기 및 독 안개 장판 형성' : `은침 수 +5발, 독 장판 범위 및 도트 피해 증가 (Lv.${lvl})`
  },
  palm_blast: {
    id: 'palm_blast',
    name: '무극 벽공장 (무형풍 / 碧空掌)',
    icon: '💨',
    desc: '적이 가장 많이 몰린 쪽으로 진공 풍압을 터뜨려 날려버립니다. 날아간 적이 다른 적과 부딪히면 둘 다 피해를 입고 기절합니다(벽공 충돌).',
    maxLevel: 5,
    getUpgradeDesc: (lvl) => lvl === 1 ? '적이 몰린 쪽으로 풍압 방출 · 벽공 충돌' : (lvl === 3 ? '반대쪽으로도 한 발 더! 범위·넉백·피해 증가 (Lv.3)' : `풍압 범위·넉백·피해 증가, 더 자주 발동 (Lv.${lvl})`)
  },
  thunder_bomb: {
    id: 'thunder_bomb',
    name: '벽력탄 (霹靂彈)',
    icon: '💣',
    desc: '무림 폭탄인 벽력탄을 무작위 적 위치에 투척하여 광범위 화염 폭발을 일으킵니다.',
    maxLevel: 5,
    getUpgradeDesc: (lvl) => lvl === 1 ? '주기적으로 벽력탄 1개 투척' : `폭발 범위 25% 증가, 폭탄 수 +1 (Lv.${lvl})`
  },
  qinggong_dash: {
    id: 'qinggong_dash',
    name: '답설무흔 (踏雪無痕)',
    icon: '💨',
    desc: '화산의 최고 경공 보법. 이동 속도가 상승하고 경공 대시 재사용 대기시간이 단축됩니다.',
    maxLevel: 5,
    getUpgradeDesc: (lvl) => `이동 속도 +15%, 대시 쿨타임 -0.35초 (Lv.${lvl})`
  },
  vajra_shield: {
    id: 'vajra_shield',
    name: '금강불괴 (金剛不壞)',
    icon: '🛡️',
    desc: '소림의 외공 비전. 최대 혈기가 증가하고 주기적으로 주위에 방어 충격파를 방출합니다.',
    maxLevel: 5,
    getUpgradeDesc: (lvl) => `최대 혈기 +35, 방어 충격파 데미지 대폭 증가 (Lv.${lvl})`
  },
  qi_magnet: {
    id: 'qi_magnet',
    name: '흡성대법 (吸星大法)',
    icon: '🧲',
    desc: '사파의 비기. 흩어진 진기 영석을 더 먼 거리에서 자석처럼 빨아들입니다.',
    maxLevel: 5,
    getUpgradeDesc: (lvl) => `영석 흡인 반경 +50%, 습득 시 혈기 2 회복 (Lv.${lvl})`
  }
};

// --- Ultimate Evolution Skills (만렙 비급 초월 각성) ---
const EVO_SKILL_DEFS = {
  thunder_bomb: {
    id: 'evo_thunder_bomb',
    baseSkillId: 'thunder_bomb',
    name: '구천뇌정 (九天雷霆)',
    badge: '천뢰지존',
    icon: '⚡💣',
    color: '#7dd3fc',
    desc: '벽력탄 4발이 한꺼번에 떨어지고, 터질 때마다 하늘에서 번개가 내리꽂혀 주변 적 3명에게 연쇄 번개가 튑니다!'
  },
  flying_swords: {
    id: 'evo_flying_swords',
    baseSkillId: 'flying_swords',
    name: '매화만개 (梅花滿開)',
    badge: '매화 검선',
    icon: '🌸',
    color: '#f9a8d4',
    desc: '매화검기 8송이가 선회하다 날아가 적을 베고 그 자리에 꽃을 피웁니다. 2.6초마다 적이 몰린 쪽으로 매화검우(梅花劍雨)가 부채꼴로 쏟아져 앞의 적을 모두 베고 밀어냅니다!'
  },
  palm_blast: {
    id: 'evo_palm_blast',
    baseSkillId: 'palm_blast',
    name: '여래신장 (如來神掌)',
    badge: '불문 진경',
    icon: '✋⚡',
    color: '#f59e0b',
    desc: '무형의 풍압이 화면을 휩쓰는 거대한 황금색 여래신장으로 각성! 적들을 화면 밖으로 날려버리며 묵직한 지진파 기절을 일으킵니다!'
  },
  dagger_rain: {
    id: 'evo_dagger_rain',
    baseSkillId: 'dagger_rain',
    name: '생사부 만천화우 (生死符 滿天花雨)',
    badge: '당문 극의',
    icon: '🌸☠️',
    color: '#c084fc',
    desc: '자수정빛 빙백은침 소나기와 맹독 장판이 폭포수처럼 쏟아지며, 중독된 적이 사망할 때마다 연쇄 독 폭발(Poison Nova)을 일으킵니다!'
  },
  vajra_shield: {
    id: 'evo_vajra_shield',
    baseSkillId: 'vajra_shield',
    name: '천지무적신공 (天地無敵神功)',
    badge: '금강 지존',
    icon: '🛡️⚡',
    color: '#facc15',
    desc: '전신에 황금 오라가 휘감겨 받는 피해가 50% 추가 경감되고, 1.5초마다 주위 모든 적에게 황금 뇌전을 연쇄 방출합니다!'
  }
};

// 무공 그림 아이콘 (assets/icons, 제미나이 2026-11-12) — 없으면 이모지 icon 을 씀
for (const k in SKILL_DEFS) SKILL_DEFS[k].img = 'assets/icons/' + k + '.png';
for (const k in EVO_SKILL_DEFS) EVO_SKILL_DEFS[k].img = 'assets/icons/evo_' + k + '.png';
// 화면에 넣을 아이콘: 그림이 있으면 <img>, 없으면 이모지
function skillIconHTML(def) { return def && def.img ? `<img class="skill-img" src="${def.img}" alt="" draggable="false">` : ((def && def.icon) || ''); }

// --- Playable Heroes (3인 협객 정의) ---
const HERO_DEFS = {
  seojin: {
    id: 'seojin',
    name: '서진 (徐振)',
    title: '청운문 23대 제자',
    portrait: 'assets/portrait_seojin.jpg',
    role: '검술 & 치명타 (밸런스)',
    color: '#38bdf8',
    startingSkill: 'flying_swords',
    baseHp: 100,
    baseSpeed: 195,
    critRate: 0.25,
    critMultiplier: 2.1,
    dmgReduction: 0.0,
    bonusProjectile: 0,
    poisonDmgMult: 1.0,
    knockbackMult: 1.0,
    lore: '사부의 유품인 부러진 검의 진실을 찾고 청운문의 기개를 천하에 떨치기 위해 첫 하산길에 올랐다.',
    passives: ['치명타 확률: +15% (기본 25%)', '치명타 피해: +30%', '이동 속도: +10% 쾌속 보법']
  },
  hyunwoon: {
    id: 'hyunwoon',
    name: '현운 (玄雲)',
    title: '무극문 속가제자',
    portrait: 'assets/portrait_hyunwoon.jpg',
    role: '생존 & 넉백 (탱커)',
    color: '#fbbf24',
    startingSkill: 'palm_blast',
    baseHp: 140,
    baseSpeed: 175,
    critRate: 0.10,
    critMultiplier: 1.8,
    dmgReduction: 0.25,
    bonusProjectile: 0,
    poisonDmgMult: 1.0,
    knockbackMult: 1.5,
    lore: '천지의 기운이 뒤틀리고 민초들이 도탄에 빠지자, 산문을 열고 나와 묵직한 권과 장풍으로 도의를 세우고자 한다.',
    passives: ['최대 혈기: +40% (140 HP)', '받는 피해량: 25% 경감 (방어 특화)', '풍압 넉백 파워: 1.5배 강화']
  },
  tangsoyeon: {
    id: 'tangsoyeon',
    name: '당소연 (唐昭娟)',
    title: '서천 당문 소가주',
    portrait: 'assets/portrait_tangsoyeon.jpg',
    role: '원거리 & 독 (자객)',
    color: '#34d399',
    startingSkill: 'dagger_rain',
    baseHp: 90,
    baseSpeed: 185,
    critRate: 0.12,
    critMultiplier: 1.8,
    dmgReduction: 0.0,
    bonusProjectile: 1,
    poisonDmgMult: 1.5,
    knockbackMult: 1.0,
    lore: '가문의 비전 의술서가 도난당해 사람을 괴물로 만드는 혈독환으로 악용되자, 가문의 오명을 씻고 배후를 단죄하려 한다.',
    passives: ['공격 속도: +25% 고속 연사', '스킬 투사체: +1발 추가 발사', '독 도트 피해: 50% 증폭']
  }
};

let currentGatewayScreen = 'title';
let currentSelectedHero = 'seojin';
let currentSelectedSector = 1;

let unlockedSectors = [1];
try {
  const saved = localStorage.getItem('wuxia_unlocked_sectors');
  if (saved) unlockedSectors = JSON.parse(saved);
} catch (e) {}

let clearedSectors = [];
try {
  const savedCleared = localStorage.getItem('wuxia_cleared_sectors');
  if (savedCleared) clearedSectors = JSON.parse(savedCleared);
} catch (e) {}

const SECTOR_DEFS = [
  {
    id: 1,
    name: '제1구역: 서북 취죽림 (翠竹林)',
    titleHanja: '翠竹林 血戰',
    sub: '안개 자욱한 대나무 숲과 고대 사원',
    desc: '흑도 살수들과 사파 강시들이 득실거리는 서북 관문. 제1막 최종보스 혈교 마두가 도사리고 있습니다.',
    durationSec: 180,
    targetTime: '3분 결전 (4대 페이즈 돌파)',
    miniBossName: '흑호 살수두목 (Black Tiger Leader)',
    bossName: '혈교 마두 (Blood Cult Grandmaster)',
    difficulty: '보통 (강호초출)',
    bgPreview: 'assets/ground_bamboo.jpg',
    enemies: [
      { name: '흑도 그림자 살수', hanja: '黑道 殺手', stars: '★★★☆☆', desc: '칠흑 복면과 쌍단검. 빠른 쇄도와 기습 비도 투척.', img: 'assets/portrait_enemy_assassin.jpg' },
      { name: '사파 주술 강시', hanja: '邪派 殭屍', stars: '★★★★☆', desc: '황색 주사 부적이 붙은 시귀. 변칙적인 도약과 맷집.', img: 'assets/portrait_enemy_jiangshi.jpg' },
      { name: '혈교 마두 [보스]', hanja: '血敎 魔頭', stars: '★★★★★', desc: '불타는 혈도를 휘두르는 제1막의 지배자. 광역 혈기 참격.', img: 'assets/portrait_enemy_boss.jpg', isBoss: true }
    ]
  },
  {
    id: 2,
    name: '제2구역: 중원 하오문 본단 (下黑門)',
    titleHanja: '下黑門 陰謀',
    sub: '암흑가의 지하 소굴과 비밀 누각',
    desc: '중원 전역에 혈독환을 유통시킨 흑도 거대 방파. 기괴한 독침과 암기술사들이 매복해 있습니다.',
    durationSec: 240,
    targetTime: '4분 결전 (4대 페이즈 돌파)',
    miniBossName: '하오문 독술장로 (Toxic Elder)',
    bossName: '독룡 마군 (Toxic Dragon Lord)',
    difficulty: '어려움 (일류 고수)',
    bgPreview: 'assets/ground_tile.jpg',
    enemies: [
      { name: '하오문 척후', hanja: '下門 斥候', stars: '★★★☆☆', desc: '빠른 독단검 찌르기와 연막탄 교란.', img: 'assets/portrait_enemy_assassin.jpg' },
      { name: '사파 독술사', hanja: '邪派 毒術士', stars: '★★★★☆', desc: '녹색 부식 독안개 방출 및 원거리 침투.', img: 'assets/portrait_enemy_jiangshi.jpg' },
      { name: '독룡 마군 [보스]', hanja: '毒龍 魔君', stars: '★★★★★', desc: '맹독 비검과 독룡 파동포를 뿜어내는 암흑가 수장.', img: 'assets/portrait_enemy_boss.jpg', isBoss: true }
    ]
  },
  {
    id: 3,
    name: '제3구역: 서남 만독림 (萬毒林)',
    titleHanja: '萬毒門 密林',
    sub: '천 년 묵은 독무와 독충의 밀림',
    desc: '한 모금만 마셔도 폐가 녹아내리는 만독의 성지. 독기에 침식된 괴이들이 쏟아져 나옵니다.',
    durationSec: 300,
    targetTime: '5분 결전 (4대 페이즈 돌파)',
    miniBossName: '천년 강시왕 (Millennium Jiangshi King)',
    bossName: '천독마후 (Ten-Thousand Poison Empress)',
    difficulty: '극난 (절정 고수)',
    bgPreview: 'assets/ground_bamboo.jpg',
    enemies: [
      { name: '만독 괴인', hanja: '萬毒 怪人', stars: '★★★★☆', desc: '상처 입을 때마다 독액을 흩뿌리는 변이체.', img: 'assets/portrait_enemy_assassin.jpg' },
      { name: '주술 망령', hanja: '呪術 亡靈', stars: '★★★★☆', desc: '장벽을 통과해 다가오는 영체 강시.', img: 'assets/portrait_enemy_jiangshi.jpg' },
      { name: '천독마후 [보스]', hanja: '千毒魔后', stars: '★★★★★', desc: '만독 만천화우와 핏빛 독사를 조종하는 밀림의 여왕.', img: 'assets/portrait_enemy_boss.jpg', isBoss: true }
    ]
  },
  {
    id: 4,
    name: '제4구역: 새외 북해빙궁 (北海氷宮)',
    titleHanja: '北海氷宮 凍土',
    sub: '만년 빙하와 얼어붙은 설산 요새',
    desc: '극한의 냉기로 침입자의 혈맥을 얼려버리는 새외의 절대 성역. 얼음 강시와 설산 마인들이 지키고 있습니다.',
    durationSec: 360,
    targetTime: '6분 결전 (4대 페이즈 돌파)',
    miniBossName: '설산 백발마인 (White Demon)',
    bossName: '빙백신군 (Ice Frost Sovereign)',
    difficulty: '악몽 (초절정 고수)',
    bgPreview: 'assets/ground_tile.jpg',
    enemies: [
      { name: '빙궁 검수', hanja: '氷宮 劍手', stars: '★★★★☆', desc: '서리 검기로 빠르게 베어 들어오는 빙궁의 검객.', img: 'assets/portrait_enemy_assassin.jpg' },
      { name: '빙결 강시', hanja: '氷結 殭屍', stars: '★★★★☆', desc: '얼음에 갇힌 채 뛰어오는 강시. 서리 술사·설산 거괴도 함께 나옴.', img: 'assets/portrait_enemy_jiangshi.jpg' },
      { name: '빙백신군 [보스]', hanja: '氷魄神君', stars: '★★★★★', desc: '서리 폭풍과 빙백신검을 내리꽂는 북해의 군주.', img: 'assets/portrait_enemy_boss.jpg', isBoss: true }
    ]
  },
  {
    id: 5,
    name: '제5구역: 극서 혈마전 (血魔殿)',
    titleHanja: '血魔殿 終章',
    sub: '마교 총본산이자 마기가 끓어오르는 혈지',
    desc: '천하를 피로 물들이려는 마교 교주의 지성소. 전 무림의 운명을 건 최후의 결전이 펼쳐집니다.',
    durationSec: 420,
    targetTime: '7분 결전 (4대 페이즈 돌파)',
    miniBossName: '마교 호법사자 (Blood Guardian)',
    bossName: '혈마교주 (Supreme Blood Demon Patriarch)',
    difficulty: '생사경 (生死境)',
    bgPreview: 'assets/ground_tile.jpg',
    enemies: [
      { name: '마교 정예 혈기사', hanja: '血騎士', stars: '★★★★★', desc: '공격 시 체력을 흡수하는 마교 최고 살수단.', img: 'assets/portrait_enemy_assassin.jpg' },
      { name: '혈시귀', hanja: '血屍鬼', stars: '★★★★★', desc: '죽을 때 광범위 혈폭을 일으키는 자폭 시귀.', img: 'assets/portrait_enemy_jiangshi.jpg' },
      { name: '혈마교주 [보스]', hanja: '血魔敎主', stars: '★★★★★+', desc: '천마군림보와 삼천혈해를 부르는 마교 최강의 절대자.', img: 'assets/portrait_enemy_boss.jpg', isBoss: true }
    ]
  }
];

// --- Diablo 2 Act Zone System (구역당 4개 독립 전장 & 쿼터뷰 입체 환경) ---
const ZONE_CONFIGS = [
  // Sector 1: 서북 취죽림 (Act 1)
  [
    { 
      name: '제1관문: 청운림 죽림 외곽', 
      hanjaTitle: '第 一 關 門 : 靑 雲 竹 林',
      theme: 'bamboo_grove',
      weather: 'leaves',
      propType: 'bamboo',
      spriteKey: 'ground_bamboo', 
      ambient: 'rgba(10, 26, 14, 0.08)', 
      lightColor: '#34d399', 
      miniBoss: '흑호 정찰대장', 
      miniBossSprite: 'assassin',
      desc: '바람에 나부끼는 대나무 숲길을 뚫고 흑풍채의 정찰조를 격퇴하십시오.' 
    },
    { 
      name: '제2관문: 흑풍채 성벽 요새', 
      hanjaTitle: '第 二 關 門 : 黑 風 堡 壘',
      theme: 'stone_fortress',
      weather: 'embers',
      propType: 'torch',
      spriteKey: 'ground_stone_iso', 
      ambient: 'rgba(55, 30, 10, 0.18)', 
      lightColor: '#f59e0b', 
      miniBoss: '흑풍 돌격도두', 
      miniBossSprite: 'butcher',
      desc: '불타는 성벽을 기어오르는 마교 기습단과 중장 방패병을 소탕하십시오.' 
    },
    { 
      name: '제3관문: 혈풍 동굴 심층부', 
      hanjaTitle: '第 三 關 門 : 血 風 幽 洞',
      theme: 'blood_cavern',
      weather: 'miasma',
      propType: 'crystal',
      spriteKey: 'ground_cavern', 
      ambient: 'rgba(76, 12, 110, 0.22)', 
      lightColor: '#c084fc', 
      miniBoss: '마교 혈호사자', 
      miniBossSprite: 'necromancer',
      desc: '자색 마기가 솟구치는 동굴의 혈사귀들과 마교 호법을 처단하십시오.' 
    },
    { 
      name: '제4관문: 천마전 대전당 (決戰)', 
      hanjaTitle: '第 四 關 門 : 天 魔 決 戰',
      theme: 'demon_sanctum',
      weather: 'runes',
      propType: 'altar',
      spriteKey: 'ground_sanctum', 
      ambient: 'rgba(95, 12, 28, 0.25)', 
      lightColor: '#ef4444', 
      boss: '혈교 마두', 
      desc: '거대한 마교 룬 결계 속 사파의 군주와 최후의 생사결을 펼치십시오!' 
    }
  ],
  // Sector 2: 중원 하오문 본단 (Act 2)
  [
    { name: '제1관문: 하오문 암거리 외곽', hanjaTitle: '第 一 關 門 : 暗 巷 破 陣', theme: 'stone_fortress', weather: 'embers', propType: 'torch', spriteKey: 'ground_stone_iso', ambient: 'rgba(20, 30, 45, 0.18)', lightColor: '#38bdf8', miniBoss: '하오문 척후조장', miniBossSprite: 'assassin', desc: '비밀 누각의 그림자 살수들을 제압하십시오.' },
    { name: '제2관문: 지하 비밀 수로', hanjaTitle: '第 二 關 門 : 幽 冥 水 路', theme: 'blood_cavern', weather: 'miasma', propType: 'crystal', spriteKey: 'ground_cavern', ambient: 'rgba(10, 45, 30, 0.20)', lightColor: '#34d399', miniBoss: '녹혈 독술장로', miniBossSprite: 'necromancer', desc: '부식성 독안개를 뿜는 하오문 장로를 처단하십시오.' },
    { name: '제3관문: 흑도 철벽 참호', hanjaTitle: '第 三 關 門 : 鐵 壁 斬 虎', theme: 'stone_fortress', weather: 'embers', propType: 'torch', spriteKey: 'ground_stone_iso', ambient: 'rgba(30, 20, 50, 0.20)', lightColor: '#a78bfa', miniBoss: '중장 철갑마인', miniBossSprite: 'butcher', desc: '독침 세례를 뚫고 결전장 입구를 돌파하십시오.' },
    { name: '제4관문: 독룡 혈전각 (決戰)', hanjaTitle: '第 四 關 門 : 毒 龍 決 戰', theme: 'demon_sanctum', weather: 'runes', propType: 'altar', spriteKey: 'ground_sanctum', ambient: 'rgba(80, 15, 60, 0.25)', lightColor: '#f43f5e', boss: '독룡 마군', desc: '맹독 비검을 휘두르는 독룡 마군을 쓰러뜨리십시오!' }
  ],
  // Sector 3: 서남 만독림 (Act 3)
  [
    { name: '제1관문: 만독 밀림 입구', hanjaTitle: '第 一 關 門 : 萬 毒 密 林', theme: 'bamboo_grove', weather: 'leaves', propType: 'bamboo', spriteKey: 'ground_bamboo', ambient: 'rgba(12, 45, 18, 0.20)', lightColor: '#22c55e', miniBoss: '독충 조련사', miniBossSprite: 'assassin', desc: '독충이 들끓는 숲길을 돌파하십시오.' },
    { name: '제2관문: 천년 고목 제단', hanjaTitle: '第 二 關 門 : 千 年 古 壇', theme: 'stone_fortress', weather: 'embers', propType: 'torch', spriteKey: 'ground_stone_iso', ambient: 'rgba(45, 40, 10, 0.18)', lightColor: '#facc15', miniBoss: '천년 강시왕', miniBossSprite: 'butcher', desc: '부적에 봉인된 시귀왕을 격파하십시오.' },
    { name: '제3관문: 만독혈지 늪지대', hanjaTitle: '第 三 關 門 : 血 池 毒 沼', theme: 'blood_cavern', weather: 'miasma', propType: 'crystal', spriteKey: 'ground_cavern', ambient: 'rgba(65, 15, 30, 0.22)', lightColor: '#fb7185', miniBoss: '만독 괴마인', miniBossSprite: 'necromancer', desc: '진득한 독액을 흩뿌리는 괴마를 처단하십시오.' },
    { name: '제4관문: 천독 마궁 (決戰)', hanjaTitle: '第 四 關 門 : 天 毒 決 戰', theme: 'demon_sanctum', weather: 'runes', propType: 'altar', spriteKey: 'ground_sanctum', ambient: 'rgba(90, 10, 40, 0.26)', lightColor: '#e11d48', boss: '천독마후', desc: '만독 만천화우를 내리꽂는 밀림의 여왕을 격파하십시오!' }
  ],
  // Sector 4: 새외 북해빙궁 (Act 4)
  [
    { name: '제1관문: 빙하 설원 능선', hanjaTitle: '第 一 關 門 : 萬 年 氷 原', theme: 'stone_fortress', weather: 'leaves', propType: 'crystal', spriteKey: 'ground_stone_iso', ambient: 'rgba(15, 35, 60, 0.20)', lightColor: '#67e8f9', miniBoss: '서리 살수장', miniBossSprite: 'assassin', desc: '얼어붙은 만년 빙하를 딛고 전진하십시오.' },
    { name: '제2관문: 얼어붙은 성문 외곽', hanjaTitle: '第 二 關 門 : 氷 城 破 門', theme: 'stone_fortress', weather: 'embers', propType: 'torch', spriteKey: 'ground_stone_iso', ambient: 'rgba(20, 30, 55, 0.18)', lightColor: '#93c5fd', miniBoss: '설산 백발마인', miniBossSprite: 'butcher', desc: '서리 폭풍을 일으키는 백발마인을 제압하십시오.' },
    { name: '제3관문: 빙룡 지하 동굴', hanjaTitle: '第 三 關 門 : 氷 龍 陰 窟', theme: 'blood_cavern', weather: 'miasma', propType: 'crystal', spriteKey: 'ground_cavern', ambient: 'rgba(30, 35, 75, 0.22)', lightColor: '#818cf8', miniBoss: '빙백 수호수', miniBossSprite: 'necromancer', desc: '혈맥을 얼려버리는 냉기를 뚫고 전진하십시오.' },
    { name: '제4관문: 북해 지성소 (決戰)', hanjaTitle: '第 四 關 門 : 氷 魄 決 戰', theme: 'demon_sanctum', weather: 'runes', propType: 'altar', spriteKey: 'ground_sanctum', ambient: 'rgba(35, 25, 75, 0.25)', lightColor: '#38bdf8', boss: '빙백신군', desc: '빙백신검의 절대자, 빙백신군을 꺾으십시오!' }
  ],
  // Sector 5: 극서 혈마전 (Act 5)
  [
    { name: '제1관문: 마교 총본산 외성', hanjaTitle: '第 一 關 門 : 魔 敎 外 城', theme: 'stone_fortress', weather: 'embers', propType: 'torch', spriteKey: 'ground_stone_iso', ambient: 'rgba(55, 15, 20, 0.20)', lightColor: '#f87171', miniBoss: '정예 혈기사장', miniBossSprite: 'assassin', desc: '피로 물든 성벽의 수문장을 돌파하십시오.' },
    { name: '제2관문: 혈마 지하 연무장', hanjaTitle: '第 二 關 門 : 地 下 演 武', theme: 'stone_fortress', weather: 'embers', propType: 'torch', spriteKey: 'ground_stone_iso', ambient: 'rgba(65, 18, 25, 0.22)', lightColor: '#ef4444', miniBoss: '마교 우호법', miniBossSprite: 'butcher', desc: '마기가 끓어오르는 지하 회랑을 돌파하십시오.' },
    { name: '제3관문: 혈사귀 혈해 제단', hanjaTitle: '第 三 關 門 : 血 海 祭 壇', theme: 'blood_cavern', weather: 'miasma', propType: 'crystal', spriteKey: 'ground_cavern', ambient: 'rgba(80, 12, 22, 0.25)', lightColor: '#dc2626', miniBoss: '삼천혈해 사자', miniBossSprite: 'necromancer', desc: '혈폭을 일으키는 시귀단을 전멸시키십시오.' },
    { name: '제4관문: 천마 궁극전 (最終 決戰)', hanjaTitle: '第 四 關 門 : 天 魔 極 戰', theme: 'demon_sanctum', weather: 'runes', propType: 'altar', spriteKey: 'ground_sanctum', ambient: 'rgba(95, 8, 28, 0.28)', lightColor: '#f59e0b', boss: '혈마교주', desc: '천하의 운명을 건 천마군림보의 혈마교주와 최종 결전!' }
  ]
];


// --- 색 바꾼 그림 캐시 (성능) ---
// ctx.filter 를 매 장면 쓰면 그래픽 카드를 못 쓰고 아주 느려짐(특히 PC 큰 화면).
// 같은 그림·같은 색 바꾸기는 처음 한 번만 만들어 두고 계속 꺼내 씀.
const _tintCache = new Map();
function tinted(img, filter) {
  if (!img || !img.width || !filter || filter === 'none') return img;
  let m = _tintCache.get(img);
  if (!m) { m = new Map(); _tintCache.set(img, m); }
  let c = m.get(filter);
  if (!c) {
    c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const x = c.getContext('2d');
    x.filter = filter;
    x.drawImage(img, 0, 0);
    m.set(filter, c);
    // 그래픽 카드가 바로 쓰는 형태로 바꿔 둠 (캔버스 그대로 쓰면 매번 다시 올려서 느림)
    if (window.createImageBitmap) createImageBitmap(c).then(b => m.set(filter, b)).catch(() => {});
  }
  return c;
}
