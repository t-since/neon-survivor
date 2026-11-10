// ============================================================
// 첫 판 안내 (튜토리얼) — 처음 하는 사람에게 화면 위쪽에 짧은 안내를 차례로 띄움
// 게임을 멈추지 않고, 해당 행동을 하면 다음 안내로 넘어감. 끝까지 보면 다시 안 나옴.
// 저장: localStorage 'wuxia_tutorial_v1' = 마지막으로 끝낸 단계 번호 (전부 끝나면 'done')
// ============================================================
const TUTORIAL_KEY = 'wuxia_tutorial_v1';

const isTouchUI = () => document.body.classList.contains('is-touch');

// done(t): 이 단계를 끝낼 조건. minTime: 최소 표시 시간, maxTime: 이 시간이 지나면 저절로 넘어감
const TUTORIAL_STEPS = [
  {
    icon: '🧭',
    text: () => isTouchUI()
      ? '<b>화면 왼쪽</b>을 누른 채로 끌면 그 방향으로 움직입니다'
      : '<b>WASD · 방향키</b>로 움직이거나, <b>마우스를 누른 채</b> 끌어 움직입니다',
    done: t => Math.hypot(player.x, player.y) > 220,
    delay: 2.5, // 판 시작 때 뜨는 구역 이름과 겹치지 않게
    minTime: 5, maxTime: 15,
  },
  {
    icon: '🌸',
    text: () => '공격은 <b>자동</b>입니다! 가까운 적에게 무공이 저절로 나갑니다. 적에게 둘러싸이지 않게 움직이세요',
    done: t => state.kills >= 5,
    minTime: 4, maxTime: 14,
  },
  {
    icon: '💠',
    text: () => '쓰러진 적이 떨군 <b>푸른 진기</b>를 주우면 경지(레벨)가 오릅니다',
    done: t => player.level >= 2 || pendingLevelUps > 0 || state.isLevelingUp,
    minTime: 3, maxTime: 30,
  },
  {
    icon: '💨',
    text: () => isTouchUI()
      ? '위험할 땐 <b>오른쪽 아래 경공 버튼</b>으로 순간 이동해 빠져나가세요'
      : '위험할 땐 <b>Space · Shift · 마우스 오른쪽</b>으로 경공(순간 이동)을 쓰세요',
    done: t => player.isDashing,
    minTime: 2.5, maxTime: 12,
  },
  {
    icon: '🏮',
    text: () => '시간이 지나면 더 센 적과 <b>중간 보스</b>가 나옵니다. 마지막 <b>보스</b>를 쓰러뜨리면 구역 돌파!',
    done: t => false,
    minTime: 6, maxTime: 6,
  },
  {
    icon: '💰',
    text: () => '판이 끝나면 <b>은자</b>를 받습니다. 첫 화면 <b>🏯 문파 수련</b>에서 영구히 강해질 수 있어요',
    done: t => false,
    minTime: 6, maxTime: 6,
  },
];

const Tutorial = {
  active: false,
  step: 0,
  t: 0,
  el: null,

  load() {
    try { return localStorage.getItem(TUTORIAL_KEY); } catch (e) { return null; }
  },
  save(v) {
    try { localStorage.setItem(TUTORIAL_KEY, String(v)); } catch (e) {}
  },

  start() {
    const saved = this.load();
    if (saved === 'done') { this.active = false; this.hide(); return; }
    this.step = Math.min(TUTORIAL_STEPS.length - 1, Math.max(0, parseInt(saved, 10) || 0));
    this.active = true;
    this.t = 0;
    this.met = false;
    this.hide(); // 첫 안내는 update() 에서 delay 뒤에 띄움
  },

  ensureEl() {
    if (this.el) return this.el;
    const el = document.createElement('div');
    el.id = 'tutorialHint';
    el.innerHTML = '<span class="tut-icon"></span><span class="tut-text"></span><span class="tut-step"></span><button class="tut-skip" type="button" title="안내 끄기">✕</button>';
    el.querySelector('.tut-skip').addEventListener('click', (e) => { e.stopPropagation(); this.finish(); });
    document.body.appendChild(el);
    this.el = el;
    return el;
  },

  show() {
    const s = TUTORIAL_STEPS[this.step];
    if (!s) return;
    const el = this.ensureEl();
    el.querySelector('.tut-icon').textContent = s.icon;
    el.querySelector('.tut-text').innerHTML = s.text();
    el.querySelector('.tut-step').textContent = (this.step + 1) + '/' + TUTORIAL_STEPS.length;
    el.classList.remove('show');
    void el.offsetWidth; // 다시 나타나는 효과
    el.classList.add('show');
  },

  hide() {
    if (this.el) this.el.classList.remove('show');
  },

  next() {
    this.step++;
    this.t = 0;
    if (this.step >= TUTORIAL_STEPS.length) { this.finish(); return; }
    this.save(this.step);
    if (typeof sound !== 'undefined' && sound.playPickup) { try { sound.playPickup(); } catch (e) {} }
    this.show();
  },

  finish() {
    this.active = false;
    this.save('done');
    this.hide();
  },

  // 게임이 진행 중일 때만 불림 (07_update.js updateGame)
  update(dt) {
    if (!this.active) return;
    const s = TUTORIAL_STEPS[this.step];
    if (!s) { this.finish(); return; }
    this.t += dt;
    if (this.t < (s.delay || 0)) return;
    if (!this.el || !this.el.classList.contains('show')) this.show();
    // 경공처럼 잠깐만 참인 조건도 놓치지 않게 한 번 만족하면 기억해 둠
    if (!this.met && s.done(this.t)) this.met = true;
    if ((this.t >= s.minTime && this.met) || this.t >= s.maxTime) { this.met = false; this.next(); }
  },

  // 레벨업 창: 첫 레벨업 때 창 안에 고르는 법을 한 줄 넣음
  decorateLevelUp() {
    const box = document.querySelector('#levelUpModal .modal-box') || document.getElementById('levelUpModal');
    if (!box) return;
    let tip = document.getElementById('tutorialLevelTip');
    const want = this.active || this.load() !== 'done';
    if (!want || player.level > 3) { if (tip) tip.remove(); return; }
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'tutorialLevelTip';
      const list = document.getElementById('cardList');
      if (list && list.parentNode) list.parentNode.insertBefore(tip, list); else box.appendChild(tip);
    }
    tip.innerHTML = '📜 무공 <b>하나</b>를 골라 배우거나 강화하세요. 한 무공을 <b>Lv.5</b>까지 올리면 <b>초월 각성</b>이 열립니다!';
  },
};

function startTutorial() { Tutorial.start(); }
function updateTutorial(dt) { Tutorial.update(dt); }
// 게임이 끝나거나 첫 화면으로 돌아가면 안내를 숨김 (진행 단계는 저장되어 다음 판에 이어짐)
function pauseTutorial() { Tutorial.hide(); }
// 첫 화면 '안내 다시 보기'용
function resetTutorial() { Tutorial.save(0); }
