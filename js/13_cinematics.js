// =====================================================================
// 13_cinematics.js — 시네마틱: 시작(오프닝) · 구역 넘어갈 때 · 엔딩 (2026-11-10)
//
// ■ 대사·컷 순서 고치기: 아래 CINEMATICS 만 고치면 됨
// ■ 그림/영상 넣기: assets/cinema/<컷 id>.mp4 (또는 .webm / .jpg / .png / .webp) 로 저장
//   - 같은 이름이면 영상 → 그림 순으로 먼저 찾은 것을 씀
//   - 파일이 없으면 fb(기존 그림 + 천천히 확대·이동)로 대신 보여줌
//   - 프롬프트와 파일 이름 목록: 시네마틱_프롬프트.md
// ■ 조작: 클릭 · Space · Enter · → 다음 컷 (글자가 나오는 중이면 먼저 글자를 다 보여줌)
//         Esc 또는 [건너뛰기] 전체 건너뛰기
// ■ 테스트: 주소 끝에 ?cinema=opening (sector2~sector5, ending 도 가능)
// =====================================================================

const CINEMA_DIR = 'assets/cinema/';

// 기존 그림 (새 그림이 없을 때 대신 씀). 배경은 타이틀 그림의 여러 부분을 확대해서 씀
const CB = {
  title: 'assets/title_bg.jpg',
  jiangshi: 'assets/mobs/mob_jiangshi_walk_0.png',
  sjWalk: 'assets/hero/seojin_walk_0.png',
  sjCast: 'assets/hero/seojin_cast_2.png',
  sjAtk: 'assets/hero/seojin_attack_2.png',
  bBlood: 'assets/boss/boss_blood_walk_0.png',
  bDragon: 'assets/boss/boss_dragon_walk_0.png',
  bEmpress: 'assets/boss/boss_empress_walk_0.png',
  bIce: 'assets/boss/boss_ice_walk_0.png',
  bPatriarch: 'assets/boss_demon.png'
};
// 보스 색 (12_bosses.js BOSS_STYLES 와 같게)
const CF = {
  dragon: 'hue-rotate(110deg) saturate(1.3)',
  empress: 'hue-rotate(250deg) saturate(1.5) brightness(1.05)',
  ice: 'grayscale(0.5) sepia(1) hue-rotate(165deg) saturate(2.2) brightness(1.15)',
  patriarch: 'saturate(1.6) contrast(1.15) brightness(0.85)'
};

// 컷 설명
//  id    : 파일 이름 (assets/cinema/<id>.mp4 / .jpg ...)
//  card  : true 면 가운데 큰 제목 컷 (hanja 큰 글씨 + text 작은 글씨)
//  who   : 말하는 사람 (없으면 해설)
//  text  : 대사·해설
//  dur   : 컷 길이(초). 없으면 글자 수로 정함 / 영상은 영상 길이
//  sfx   : gong · boom · slash · heavy · palm
//  fb    : 새 그림이 없을 때 — bg 배경, from/to [가로%, 세로%, 확대] 카메라 이동,
//          fig 앞에 세울 인물 그림, side 인물 위치(left/right/center), flip 좌우 뒤집기, ff 인물 색 필터,
//          blend 인물 합성(검은 배경 그림은 'lighten'), tint 화면 색, bgf 배경 필터
const CINEMATICS = {
  opening: {
    music: 'title',
    shots: [
      { id: 'op_01', card: true, hanja: '江 湖 萬 劍', text: '강호만검', sfx: 'gong', dur: 3.2,
        fb: { bg: CB.title, from: [50, 50, 1.25], to: [50, 40, 1.08], tint: 'rgba(0,0,0,.55)' } },
      { id: 'op_02', text: '비가 내리던 그 밤, 사부님은 부러진 검 한 자루를 쥔 채 청운산으로 돌아오셨다.',
        fb: { bg: CB.title, from: [70, 60, 1.6], to: [62, 55, 1.35], tint: 'rgba(10,20,40,.55)', bgf: 'grayscale(.6) brightness(.7)' } },
      { id: 'op_03', who: '사부', text: '진아… 이 검의 나머지 반쪽을… 찾거라.',
        fb: { bg: CB.title, from: [50, 22, 2.0], to: [50, 20, 2.3], tint: 'rgba(10,20,40,.55)', bgf: 'grayscale(.85) brightness(.65)' } },
      { id: 'op_04', text: '삼 년 뒤. 강호에 \'혈독환\'이라는 붉은 단약이 퍼졌다. 그것을 삼킨 자는 더 이상 사람이 아니었다.',
        fb: { bg: CB.title, from: [30, 82, 1.7], to: [35, 72, 1.4], tint: 'rgba(80,0,0,.28)' } },
      { id: 'op_05', text: '서북 취죽림. 사라진 마을 사람들이 시체가 되어 걸어 다닌다는 소문이 돌았다.',
        fb: { bg: CB.title, from: [22, 50, 1.7], to: [28, 55, 1.45], tint: 'rgba(5,35,20,.5)', bgf: 'hue-rotate(60deg) brightness(.7)', fig: CB.jiangshi, side: 'left' } },
      { id: 'op_06', who: '서진', text: '사부님. 오늘, 산을 내려갑니다.', sfx: 'slash',
        fb: { bg: CB.title, from: [75, 55, 1.5], to: [72, 48, 1.15], tint: 'rgba(0,10,30,.25)' } }
    ]
  },

  sector2: {
    music: 'title',
    shots: [
      { id: 's2_01', who: '혈교 마두', text: '크큭… 혈독환은 시작일 뿐이다. 중원에선 이미… 하오문이 그것을 팔고 있지.',
        fb: { bg: CB.title, from: [30, 40, 1.4], to: [32, 35, 1.6], tint: 'rgba(60,0,0,.55)', bgf: 'brightness(.6)', fig: CB.bBlood, side: 'left', ff: 'brightness(.85)' } },
      { id: 's2_02', text: '쓰러진 마두의 품에서 나온 것은, 하오문의 인장이 찍힌 붉은 약함이었다.', sfx: 'heavy',
        fb: { bg: CB.title, from: [45, 75, 1.8], to: [50, 70, 2.0], tint: 'rgba(60,0,0,.4)' } },
      { id: 's2_03', card: true, hanja: '第 二 區 域', text: '중원 하오문 본단', sfx: 'gong', dur: 2.8,
        fb: { bg: CB.title, from: [35, 55, 1.6], to: [35, 55, 1.35], tint: 'rgba(0,0,0,.6)', bgf: 'grayscale(.5)' } }
    ]
  },

  sector3: {
    music: 'title',
    shots: [
      { id: 's3_01', who: '독룡 마군', text: '우린 팔기만 했을 뿐이다! 약을 만드는 건… 만독림의 그 여자다!',
        fb: { bg: CB.title, from: [20, 45, 1.5], to: [22, 40, 1.7], tint: 'rgba(0,50,20,.5)', bgf: 'brightness(.6)', fig: CB.bDragon, side: 'left', ff: CF.dragon } },
      { id: 's3_02', text: '장부에 적힌 원료의 출처는 서남 만독림. 그리고 그 곁에 끼워진 것은, 도난당한 당문의 의술서였다.',
        fb: { bg: CB.title, from: [40, 60, 1.6], to: [50, 55, 1.3], tint: 'rgba(0,40,20,.45)', bgf: 'hue-rotate(80deg) brightness(.75)' } },
      { id: 's3_03', card: true, hanja: '第 三 區 域', text: '서남 만독림', sfx: 'gong', dur: 2.8,
        fb: { bg: CB.title, from: [25, 70, 1.6], to: [25, 70, 1.35], tint: 'rgba(0,30,10,.6)', bgf: 'hue-rotate(80deg) brightness(.7)' } }
    ]
  },

  sector4: {
    music: 'title',
    shots: [
      { id: 's4_01', who: '천독마후', text: '부러진 검이라… 그 검끝은 북해에 있다. 네 사부를 벤 자가 가져갔지.',
        fb: { bg: CB.title, from: [30, 60, 1.5], to: [28, 55, 1.7], tint: 'rgba(40,0,50,.5)', bgf: 'hue-rotate(250deg) brightness(.6)', fig: CB.bEmpress, side: 'left', ff: CF.empress } },
      { id: 's4_02', text: '사부님을 벤 자. 서진은 부러진 검을 쥐고 북쪽으로 향했다.', sfx: 'heavy',
        fb: { bg: CB.title, from: [78, 60, 1.6], to: [74, 50, 1.3], tint: 'rgba(120,170,220,.25)', bgf: 'grayscale(.7) brightness(1.1)' } },
      { id: 's4_03', card: true, hanja: '第 四 區 域', text: '새외 북해빙궁', sfx: 'gong', dur: 2.8,
        fb: { bg: CB.title, from: [60, 45, 1.5], to: [60, 45, 1.3], tint: 'rgba(20,50,90,.55)', bgf: 'grayscale(1) brightness(1.2)' } }
    ]
  },

  sector5: {
    music: 'title',
    shots: [
      { id: 's5_01', who: '빙백신군', text: '이것이 네 사부의 검끝이다. 그는 혈마교주를 막다 쓰러졌다. 나는… 그 싸움을 지켜보기만 했지.',
        fb: { bg: CB.title, from: [40, 50, 1.5], to: [42, 45, 1.7], tint: 'rgba(30,60,100,.5)', bgf: 'grayscale(1) brightness(.8)', fig: CB.bIce, side: 'left', ff: CF.ice } },
      { id: 's5_02', text: '두 쪽의 검이 맞닿자, 잠들어 있던 청운의 기운이 깨어났다.', sfx: 'palm',
        fb: { bg: CB.title, from: [62, 45, 1.4], to: [60, 50, 1.25], tint: 'rgba(0,40,90,.35)', bgf: 'brightness(.6)', fig: CB.sjCast, side: 'right', flip: true } },
      { id: 's5_03', who: '혈마교주', text: '오너라, 청운의 애송이. 네 사부와 같은 곳으로 보내 주마.', sfx: 'boom',
        fb: { bg: CB.title, from: [32, 25, 1.9], to: [32, 30, 1.5], tint: 'rgba(90,0,0,.35)', fig: CB.bPatriarch, side: 'center', ff: CF.patriarch, blend: 'lighten' } },
      { id: 's5_04', card: true, hanja: '第 五 區 域', text: '극서 혈마전', sfx: 'gong', dur: 3.0,
        fb: { bg: CB.title, from: [35, 30, 1.6], to: [35, 30, 1.35], tint: 'rgba(60,0,0,.55)' } }
    ]
  },

  ending: {
    music: 'title',
    shots: [
      { id: 'ed_01', text: '혈마교주가 쓰러지자 혈마전이 무너져 내리고, 핏빛 하늘이 걷히기 시작했다.', sfx: 'boom',
        fb: { bg: CB.title, from: [35, 28, 1.7], to: [45, 20, 1.2], tint: 'rgba(60,0,0,.25)' } },
      { id: 'ed_02', text: '혈독환에 물들었던 사람들이 하나둘, 제 얼굴을 되찾았다.',
        fb: { bg: CB.title, from: [30, 80, 1.6], to: [30, 70, 1.3], tint: 'rgba(255,200,120,.15)', bgf: 'sepia(.4) brightness(1.1)' } },
      { id: 'ed_03', text: '청운산. 사부님의 무덤 앞.',
        fb: { bg: CB.title, from: [80, 55, 1.4], to: [80, 50, 1.6], tint: 'rgba(255,190,110,.18)', bgf: 'sepia(.5) brightness(1.05)' } },
      { id: 'ed_04', who: '서진', text: '사부님. 검을… 찾아왔습니다.',
        fb: { bg: CB.title, from: [78, 50, 1.8], to: [78, 46, 2.0], tint: 'rgba(255,190,110,.15)', bgf: 'sepia(.5)' } },
      { id: 'ed_05', text: '바람이 불어오면 검을 뽑고, 바람이 잦아들면 길을 떠난다.',
        fb: { bg: CB.title, from: [30, 55, 1.5], to: [45, 50, 1.25], tint: 'rgba(255,150,60,.22)', bgf: 'sepia(.6) saturate(1.3) brightness(.8)', fig: CB.sjWalk, side: 'right' } },
      { id: 'ed_06', card: true, hanja: '江 湖 萬 劍 · 終', text: '강호의 길은 끝이 없는 법', sfx: 'gong', dur: 3.6,
        fb: { bg: CB.title, from: [50, 50, 1.1], to: [50, 50, 1.0], tint: 'rgba(0,0,0,.6)', bgf: 'sepia(.5)' } }
    ]
  }
};

// ---------------------------------------------------------------------
// 파일 찾기: <id>.mp4 → .webm → .jpg → .png → .webp (먼저 있는 것)
// ---------------------------------------------------------------------
const cinemaMediaCache = {};
function resolveCinemaMedia(id) {
  if (cinemaMediaCache[id]) return cinemaMediaCache[id];
  const probeVideo = ext => new Promise(res => {
    const v = document.createElement('video');
    let done = false;
    const end = r => { if (!done) { done = true; res(r); } };
    v.muted = true; v.preload = 'metadata'; v.playsInline = true;
    v.onloadedmetadata = () => end({ type: 'video', src: CINEMA_DIR + id + ext, duration: v.duration });
    v.onerror = () => end(null);
    setTimeout(() => end(null), 5000);
    v.src = CINEMA_DIR + id + ext;
  });
  const probeImg = ext => new Promise(res => {
    const i = new Image();
    i.onload = () => res({ type: 'img', src: CINEMA_DIR + id + ext });
    i.onerror = () => res(null);
    i.src = CINEMA_DIR + id + ext;
  });
  const tries = [probeVideo('.mp4'), probeVideo('.webm'), probeImg('.jpg'), probeImg('.png'), probeImg('.webp')];
  cinemaMediaCache[id] = Promise.all(tries).then(rs => rs.find(r => r) || null);
  return cinemaMediaCache[id];
}

// 편집된 영상 한 편: assets/cinema/<이름>.mp4 + <이름>.json(자막 시간표) — tools/cinema_edit.mjs 가 만듦
const cinemaFilmCache = {};
// 2026-11-13 사용자 결정: 컷신은 영상 대신 장면 그림(assets/cinema/<id>.jpg, 제미나이·ChatGPT)으로. 영상 파일은 뺌(원본은 구글 드라이브 cinema_src·git 기록)
const CINE_STILLS = true;
function findCinemaFilm(key) {
  if (CINE_STILLS) return Promise.resolve(null);
  if (cinemaFilmCache[key]) return cinemaFilmCache[key];
  cinemaFilmCache[key] = fetch(CINEMA_DIR + key + '.json', { cache: 'no-cache' })
    .then(r => r.ok ? r.json() : null)
    .then(meta => {
      if (!meta) return null;
      return new Promise(res => {
        const v = document.createElement('video');
        let done = false;
        const end = r => { if (!done) { done = true; res(r); } };
        v.preload = 'metadata';
        v.onloadedmetadata = () => end({ src: CINEMA_DIR + key + '.mp4', cues: meta.cues || [], duration: v.duration });
        v.onerror = () => end(null);
        setTimeout(() => end(null), 6000);
        v.src = CINEMA_DIR + key + '.mp4';
      });
    })
    .catch(() => null);
  return cinemaFilmCache[key];
}

// ---------------------------------------------------------------------
// 재생기
// ---------------------------------------------------------------------
const Cinema = {
  active: false,
  music: null,
  key: null,
  shots: [],
  idx: -1,
  onDone: null,
  typing: false,
  typeTimer: null,
  advTimer: null,
  root: null,
  token: 0,

  build() {
    if (this.root) return;
    const r = document.createElement('div');
    r.id = 'cinema';
    r.innerHTML = `
      <div class="cn-stage"></div>
      <div class="cn-bar cn-top"></div>
      <div class="cn-bar cn-bot">
        <div class="cn-sub"><div class="cn-who"></div><div class="cn-line"></div></div>
      </div>
      <button class="cn-skip" type="button">건너뛰기 <kbd>Esc</kbd></button>
      <div class="cn-hint">클릭 · Space 다음</div>
      <div class="cn-tap">한 번 더 누르면 건너뜁니다</div>
      <div class="cn-dots"></div>`;
    document.body.appendChild(r);
    this.root = r;
    this.stage = r.querySelector('.cn-stage');
    this.whoEl = r.querySelector('.cn-who');
    this.lineEl = r.querySelector('.cn-line');
    this.dotsEl = r.querySelector('.cn-dots');
    this.skipBtn = r.querySelector('.cn-skip');
    this.skipBtn.addEventListener('click', e => { e.stopPropagation(); this.skipAll(); });
    r.addEventListener('click', () => this.tap());
    this.tapEl = r.querySelector('.cn-tap');
  },

  play(key, onDone) {
    const def = CINEMATICS[key];
    this.build();
    try { sound.init(); } catch (e) {}
    this.key = key;
    this.music = null; // 영상인지 그림 컷인지 정해질 때까지 음악은 잠깐 줄임
    this.shots = [];
    this.film = null;
    this.onDone = onDone || null;
    this.idx = -1;
    this.active = true;
    const tok = ++this.token;
    this.stage.innerHTML = '';
    this.dotsEl.innerHTML = '';
    this.whoEl.textContent = '';
    this.lineEl.textContent = '';
    let seen = [];
    try { seen = JSON.parse(localStorage.getItem('wuxia_cinema_seen') || '[]'); } catch (e) {}
    this.skipBtn.classList.toggle('hot', seen.includes(key)); // 이미 본 컷신이면 건너뛰기 버튼을 눈에 띄게
    this.root.classList.remove('film');
    this.root.classList.add('on');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    // 편집된 영상이 있으면 영상, 없으면 그림 컷
    findCinemaFilm(key).then(film => {
      if (tok !== this.token || !this.active) return;
      if (film) { this.playFilm(film); return; }
      if (!def || !def.shots.length) { this.end(); return; }
      this.music = def.music || null;
      this.shots = def.shots;
      def.shots.forEach(s => resolveCinemaMedia(s.id)); // 미리 찾아 두기
      this.dotsEl.innerHTML = def.shots.map(() => '<i></i>').join('');
      this.next();
    });
  },

  // 영상 한 편 재생: 배경음악은 끄고 영상 소리, 자막은 시간표대로
  playFilm(film) {
    this.film = film;
    this.root.classList.add('film');
    const v = document.createElement('video');
    v.className = 'cn-film';
    v.src = film.src;
    v.playsInline = true;
    v.muted = !(typeof sound !== 'undefined' && sound.enabled);
    v.volume = 1;
    // 16:9 틀 안에서 1.12배 확대 → 오른쪽 아래 제미나이 표시가 틀 밖으로 (11-12 사용자 확인)
    const box = document.createElement('div');
    box.className = 'cn-filmbox';
    box.appendChild(v);
    this.stage.appendChild(box);
    this.filmEl = v;
    const p = v.play();
    if (p && p.catch) p.catch(() => { v.muted = true; v.play().catch(() => {}); }); // 소리 자동 재생이 막히면 소리 없이라도
    v.onended = () => { if (this.film === film) this.end(); };
    v.onerror = () => { if (this.film === film) this.end(); };
    let shown = null;
    const tick = () => {
      if (this.film !== film || !this.active) return;
      const t = v.currentTime;
      const cue = film.cues.find(c => t >= c.t0 && t < c.t1) || null;
      if (cue !== shown) {
        shown = cue;
        this.whoEl.textContent = cue ? cue.who : '';
        this.lineEl.textContent = cue ? cue.text : '';
        this.root.classList.toggle('narr', !!cue && !cue.who);
        this.lineEl.parentElement.classList.remove('show');
        if (cue) requestAnimationFrame(() => this.lineEl.parentElement.classList.add('show'));
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },

  tap() {
    if (!this.active) return;
    if (!this.film) { this.next(); return; }
    const now = performance.now();
    if (this.tapAt && now - this.tapAt < 2500) { this.tapAt = 0; this.root.classList.remove('tap1'); this.skipAll(); return; }
    this.tapAt = now;
    this.root.classList.add('tap1');
    clearTimeout(this.tapTimer);
    this.tapTimer = setTimeout(() => { this.tapAt = 0; if (this.root) this.root.classList.remove('tap1'); }, 2500);
  },

  next() {
    if (!this.active) return;
    if (this.film) return; // 영상은 클릭으로 넘기지 않음 (건너뛰기 버튼·Esc·Space)
    if (this.typing) { this.finishTyping(); return; }
    clearTimeout(this.advTimer);
    this.idx++;
    if (this.idx >= this.shots.length) { this.end(); return; }
    this.show(this.shots[this.idx]);
  },

  async show(shot) {
    const tok = this.token, i = this.idx;
    [...this.dotsEl.children].forEach((d, k) => d.classList.toggle('on', k <= i));
    this.whoEl.textContent = '';
    this.lineEl.textContent = '';
    const media = await resolveCinemaMedia(shot.id);
    if (tok !== this.token || i !== this.idx || !this.active) return; // 그 사이 넘겼으면 무시

    const layer = document.createElement('div');
    layer.className = 'cn-layer' + (shot.card ? ' cn-card' : '');
    const fb = shot.fb || {};
    let dur = shot.dur;

    if (media && media.type === 'video') {
      const v = document.createElement('video');
      v.className = 'cn-media';
      v.src = media.src; v.muted = true; v.playsInline = true; v.autoplay = true;
      v.play().catch(() => {});
      layer.appendChild(v);
      if (!dur && isFinite(media.duration) && media.duration > 0) dur = Math.min(media.duration, 12);
    } else {
      const img = document.createElement('img');
      img.className = 'cn-media';
      img.alt = '';
      img.src = media ? media.src : fb.bg;
      this.root.classList.toggle('stills', !!media); // 장면 그림이 있으면 위아래 검은 띠 대신 자막 그늘만 (그림이 잘리지 않게)
      if (!media && fb.bgf) img.style.filter = fb.bgf;
      layer.appendChild(img);
      if (!media && fb.fig) {
        const f = document.createElement('img');
        f.className = 'cn-fig cn-' + (fb.side || 'center');
        f.alt = '';
        f.src = fb.fig;
        if (fb.ff) f.style.filter = fb.ff + (fb.blend ? '' : ' drop-shadow(0 0 24px rgba(0,0,0,.8))');
        if (fb.blend) f.style.mixBlendMode = fb.blend;
        if (fb.flip) f.style.scale = '-1 1';
        layer.appendChild(f);
      }
    }
    if (!media && fb.tint) {
      const t = document.createElement('div');
      t.className = 'cn-tint';
      t.style.background = fb.tint;
      layer.appendChild(t);
    }
    if (shot.card) {
      const c = document.createElement('div');
      c.className = 'cn-cardtxt';
      c.innerHTML = `<div class="cn-hanja"></div><div class="cn-kor"></div>`;
      c.querySelector('.cn-hanja').textContent = shot.hanja || '';
      c.querySelector('.cn-kor').textContent = shot.text || '';
      layer.appendChild(c);
    }

    const len = (shot.text || '').length;
    if (!dur) dur = shot.card ? 3 : Math.max(3.6, 1.6 + len / 26 + 1.8);

    // 카메라 천천히 확대·이동 (영상이 아닐 때)
    const m = layer.querySelector('img.cn-media');
    if (m) {
      const kb = media ? { from: [50, 50, 1.06], to: [50, 50, 1.0] } : fb; // 새 장면 그림: 아주 살짝만
      const tf = p => {
        const [x, y, s] = p || [50, 50, 1.1];
        const lim = 50 * (1 - 1 / s);
        const cx = Math.max(50 - lim, Math.min(50 + lim, x)), cy = Math.max(50 - lim, Math.min(50 + lim, y));
        return `scale(${s}) translate(${50 - cx}%, ${50 - cy}%)`;
      };
      m.animate([{ transform: tf(kb.from) }, { transform: tf(kb.to || kb.from) }],
        { duration: dur * 1000 + 800, easing: 'ease-in-out', fill: 'forwards' });
    }

    // 이전 컷 위로 서서히 겹쳐 나타나기
    const old = [...this.stage.children];
    this.stage.appendChild(layer);
    requestAnimationFrame(() => layer.classList.add('in'));
    setTimeout(() => old.forEach(o => o.remove()), 900);

    if (shot.sfx) this.sfx(shot.sfx);

    if (!shot.card && shot.text) this.typeText(shot.who || '', shot.text);
    this.advTimer = setTimeout(() => { if (tok === this.token && i === this.idx) this.next(); }, dur * 1000);
  },

  typeText(who, text) {
    this.whoEl.textContent = who;
    this.root.classList.toggle('narr', !who);
    this.fullText = text;
    let n = 0;
    this.typing = true;
    clearInterval(this.typeTimer);
    this.typeTimer = setInterval(() => {
      n += 1;
      this.lineEl.textContent = text.slice(0, n);
      if (n >= text.length) this.finishTyping();
    }, 36);
  },

  finishTyping() {
    clearInterval(this.typeTimer);
    this.typing = false;
    if (this.fullText != null) this.lineEl.textContent = this.fullText;
  },

  sfx(name) {
    try {
      const map = { gong: ['wx_gong', 0.5], boom: ['wx_boom', 0.6], slash: ['wx_slash_heavy', 0.5], heavy: ['wx_heavy', 0.5], palm: ['wx_palm', 0.6] };
      const s = map[name];
      if (s && sound && sound.playSample) sound.playSample(s[0], s[1], 1, 0, 0);
    } catch (e) {}
  },

  skipAll() { if (this.active) this.end(); },

  end() {
    clearTimeout(this.advTimer);
    clearTimeout(this.tapTimer); this.tapAt = 0; if (this.root) this.root.classList.remove('tap1');
    this.finishTyping();
    this.fullText = null;
    this.active = false;
    this.token++;
    try {
      const seen = JSON.parse(localStorage.getItem('wuxia_cinema_seen') || '[]');
      if (!seen.includes(this.key)) { seen.push(this.key); localStorage.setItem('wuxia_cinema_seen', JSON.stringify(seen)); }
    } catch (e) {}
    this.root.classList.remove('on');
    this.film = null;
    this.stage.querySelectorAll('video').forEach(v => { v.pause(); v.muted = true; });
    setTimeout(() => { if (!this.active) this.stage.innerHTML = ''; }, 500);
    const cb = this.onDone;
    this.onDone = null;
    if (cb) cb();
  },

  // 04_core.js 의 keydown 맨 앞에서 부름. 컷신 중이면 true (다른 키 처리 막음)
  handleKey(e) {
    if (!this.active) return false;
    if (e.key === 'Escape') { e.preventDefault(); this.skipAll(); }
    else if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (e.repeat) return; // 누르고 있는 키로 넘어가지 않게
      if (this.film) this.skipAll(); else this.next();
    }
    return true;
  }
};

function playCinematic(key, onDone) { Cinema.play(key, onDone); }

// 테스트: 주소 끝에 ?cinema=opening
(() => {
  const k = new URLSearchParams(location.search).get('cinema');
  if (k && CINEMATICS[k]) window.addEventListener('load', () => setTimeout(() => playCinematic(k, () => {}), 600));
})();
