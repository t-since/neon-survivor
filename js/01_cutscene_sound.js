// 3D 컷신 엔진, 효과음
/* ==========================================================================
   WUXIA ROGUELITE SURVIVOR ENGINE
   ========================================================================== */

// --- Three.js 3D Cinematic Cutscene Engine ---
const ThreeCutsceneEngine = {
  initialized: false,
  active: false,
  renderer: null,
  scene: null,
  camera: null,
  animId: null,
  sceneObjects: {},
  onCompleteCallback: null,

  init() {
    if (this.initialized) return;
    if (typeof THREE === 'undefined') {
      console.warn("Three.js not loaded.");
      return;
    }
    const canvas = document.getElementById('cutsceneCanvas');
    if (!canvas) return;

    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
      this.camera.position.set(0, 0, 20);

      window.addEventListener('resize', () => {
        if (this.renderer && this.camera) {
          this.camera.aspect = window.innerWidth / window.innerHeight;
          this.camera.updateProjectionMatrix();
          this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
      });

      this.initialized = true;
    } catch (e) {
      console.warn("Failed to init Three.js WebGLRenderer:", e);
    }
  },

  playBossIntro(bossName, subtitle, onComplete) {
    this.startCutscene({
      type: 'boss',
      title: bossName || '혈교 마두 (Blood Cult Grandmaster)',
      sub: subtitle || '🚨 決 戰 : 區 域 軍 主 降 臨 🚨',
      desc: '천하를 피로 물들이는 사파의 거두가 강림하였다!',
      duration: 3.5
    }, onComplete);
  },

  playUltimateSword(onComplete) {
    this.startCutscene({
      type: 'sword',
      title: '萬 劍 歸 宗 (만검귀종)',
      sub: '✦ 絶 頂 劍 意 極 意 發 動 ✦',
      desc: '하늘을 뒤덮은 만 자루의 비검이 결전장으로 급강하한다!',
      duration: 3.2
    }, onComplete);
  },

  playBreakthrough(tierName, onComplete) {
    this.startCutscene({
      type: 'breakthrough',
      title: `境 界 突 破 : ${tierName || '화경 (化境)'}`,
      sub: '✦ 大 悟 覺 醒 : 武 林 巨 擘 ✦',
      desc: '단전의 진기가 폭발하며 새로운 무학의 경지에 도달했다!',
      duration: 3.0
    }, onComplete);
  },

  startCutscene(cfg, onComplete) {
    if (!this.initialized) this.init();
    if (!this.initialized || typeof THREE === 'undefined') {
      if (onComplete) onComplete();
      return;
    }

    this.active = true;
    this.onCompleteCallback = onComplete;
    this.startTime = performance.now();
    this.duration = (cfg.duration || 3) * 1000;

    const canvas = document.getElementById('cutsceneCanvas');
    const overlay = document.getElementById('cutsceneOverlay');
    const csSub = document.getElementById('csSub');
    const csTitle = document.getElementById('csTitle');
    const csDesc = document.getElementById('csDesc');

    if (csSub) csSub.innerText = cfg.sub;
    if (csTitle) csTitle.innerText = cfg.title;
    if (csDesc) csDesc.innerText = `"${cfg.desc}"`;

    if (canvas) canvas.classList.add('active');
    if (overlay) overlay.classList.add('active');

    this.buildScene(cfg.type);

    if (sound && sound.playLevelUp) sound.playLevelUp();

    this.animate();
  },

  buildScene(type) {
    while (this.scene.children.length > 0) {
      const obj = this.scene.children[0];
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    const amb = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(amb);
    const dir = new THREE.DirectionalLight(0xffeedd, 1.2);
    dir.position.set(5, 10, 7);
    this.scene.add(dir);

    this.sceneObjects = {};

    if (type === 'boss') {
      const ringGeo = new THREE.TorusGeometry(6, 0.25, 16, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xef4444, wireframe: true });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2.3;
      this.scene.add(ring);

      const innerRingGeo = new THREE.TorusGeometry(3.8, 0.15, 16, 48);
      const innerRingMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, wireframe: true });
      const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
      innerRing.rotation.x = Math.PI / 2.3;
      this.scene.add(innerRing);

      const pillarGeo = new THREE.CylinderGeometry(2, 4, 18, 32, 1, true);
      const pillarMat = new THREE.MeshBasicMaterial({ color: 0xdc2626, wireframe: true, transparent: true, opacity: 0.5 });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.y = 2;
      this.scene.add(pillar);

      const coreGeo = new THREE.OctahedronGeometry(2.2, 1);
      const coreMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.2, metalness: 0.8, emissive: 0xef4444, emissiveIntensity: 0.6 });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.y = 2;
      this.scene.add(core);

      const partCount = 350;
      const partGeo = new THREE.BufferGeometry();
      const pos = new Float32Array(partCount * 3);
      for (let i = 0; i < partCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 2 + Math.random() * 8;
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
        pos[i * 3 + 2] = Math.sin(a) * r;
      }
      partGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const partMat = new THREE.PointsMaterial({ color: 0xf87171, size: 0.22, transparent: true, opacity: 0.85 });
      const particles = new THREE.Points(partGeo, partMat);
      this.scene.add(particles);

      this.sceneObjects = { ring, innerRing, pillar, core, particles };
      this.camera.position.set(0, 12, 18);
      this.camera.lookAt(0, 2, 0);

    } else if (type === 'sword') {
      const swords = [];
      const bladeGeo = new THREE.ConeGeometry(0.35, 3.2, 4);
      bladeGeo.rotateX(Math.PI / 2);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.8, roughness: 0.1, metalness: 0.9 });

      for (let i = 0; i < 42; i++) {
        const sword = new THREE.Mesh(bladeGeo, bladeMat);
        const a = (i / 42) * Math.PI * 4;
        const r = 3 + (i * 0.15);
        sword.position.set(Math.cos(a) * r, 14 - i * 0.45, Math.sin(a) * r);
        sword.lookAt(0, 0, 0);
        this.scene.add(sword);
        swords.push({ mesh: sword, angle: a, radius: r, origY: sword.position.y });
      }

      this.sceneObjects = { swords };
      this.camera.position.set(0, 4, 16);
      this.camera.lookAt(0, 0, 0);

    } else {
      const ringGeo = new THREE.RingGeometry(2, 6, 8);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide, wireframe: true });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      this.scene.add(ring);

      const beamGeo = new THREE.CylinderGeometry(1.2, 1.2, 25, 24, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.6, wireframe: true });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = 8;
      this.scene.add(beam);

      this.sceneObjects = { ring, beam };
      this.camera.position.set(0, 3, 14);
      this.camera.lookAt(0, 4, 0);
    }
  },

  animate() {
    if (!this.active) return;
    const now = performance.now();
    const elapsed = now - this.startTime;
    const prog = Math.min(1, elapsed / this.duration);

    if (this.sceneObjects.ring) this.sceneObjects.ring.rotation.z += 0.02;
    if (this.sceneObjects.innerRing) this.sceneObjects.innerRing.rotation.z -= 0.035;
    if (this.sceneObjects.pillar) this.sceneObjects.pillar.rotation.y += 0.015;
    if (this.sceneObjects.core) {
      this.sceneObjects.core.rotation.x += 0.02;
      this.sceneObjects.core.rotation.y += 0.03;
      const camZ = 18 - prog * 7;
      const camY = 12 - prog * 6;
      this.camera.position.set(Math.sin(prog * 2) * 4, camY, camZ);
      this.camera.lookAt(0, 2, 0);
    }
    if (this.sceneObjects.particles) {
      this.sceneObjects.particles.rotation.y += 0.025;
    }

    if (this.sceneObjects.swords) {
      this.sceneObjects.swords.forEach(s => {
        s.mesh.position.y -= 0.25;
        s.mesh.rotation.z += 0.05;
        if (s.mesh.position.y < -5) s.mesh.position.y = s.origY;
      });
      this.camera.position.z = 16 - Math.sin(prog * Math.PI) * 4;
    }

    if (this.sceneObjects.beam) {
      this.sceneObjects.beam.rotation.y += 0.04;
      this.camera.position.y = 3 + prog * 4;
      this.camera.lookAt(0, 4, 0);
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    if (prog < 1) {
      this.animId = requestAnimationFrame(() => this.animate());
    } else {
      this.finish();
    }
  },

  skip() {
    if (!this.active) return;
    this.finish();
  },

  finish() {
    this.active = false;
    if (this.animId) cancelAnimationFrame(this.animId);

    const canvas = document.getElementById('cutsceneCanvas');
    const overlay = document.getElementById('cutsceneOverlay');
    if (canvas) canvas.classList.remove('active');
    if (overlay) overlay.classList.remove('active');

    if (this.onCompleteCallback) {
      const cb = this.onCompleteCallback;
      this.onCompleteCallback = null;
      cb();
    }
  }
};

// --- Audio Synthesizer (Web Audio API) ---
// 배경음악 파일 (제미나이 '음악 만들기'로 생성 → MP3, 약 3분, 끝과 처음이 이어지게 처리)
const BGM_FILES = {
  title: 'assets/audio/bgm_title.mp3',
  bamboo: 'assets/audio/bgm_bamboo.mp3',
  fortress: 'assets/audio/bgm_fortress.mp3',
  cavern: 'assets/audio/bgm_cavern.mp3',
  boss: 'assets/audio/bgm_boss.mp3'
};
const BGM_VOLUME = 0.45;

class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.music = null;       // 지금 나오는 곡 (Audio)
    this.musicKey = null;    // 지금 곡 이름
    this.wantMusic = null;   // 틀어야 할 곡 (첫 터치 전이면 기다렸다가 재생)
    this.unlocked = false;   // 브라우저는 사용자가 한 번 누른 뒤에야 소리를 냄
  }
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.loadSfx();
    if (!this.unlocked) {
      this.unlocked = true;
      if (this.wantMusic) { const k = this.wantMusic; this.musicKey = null; this.setMusic(k); }
    }
  }
  // 배경음악 바꾸기: 같은 곡이면 그대로, 다른 곡이면 1초 동안 소리를 줄였다 키우며 넘김
  setMusic(key) {
    this.wantMusic = key;
    if (!this.unlocked || this.musicKey === key) return;
    this.musicKey = key;
    const old = this.music;
    if (old) this.fade(old, old.volume, 0, 900, () => { old.pause(); });
    if (!key || !BGM_FILES[key]) { this.music = null; return; }
    const a = new Audio(BGM_FILES[key]);
    a.loop = true;
    a.volume = 0;
    a.muted = !this.enabled;
    a.play().catch(() => {});
    this.music = a;
    this.fade(a, 0, BGM_VOLUME, 1200);
  }
  fade(a, from, to, ms, done) {
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k < 1) requestAnimationFrame(step); else if (done) done();
    };
    step();
  }
  applyEnabled() { if (this.music) this.music.muted = !this.enabled; }

  // --- 효과음 파일 (안티그래비티로 만든 효과음, 처음 소리 켤 때 한 번 불러옴) ---
  loadSfx() {
    if (this.sfx || !this.ctx) return;
    this.sfx = {};
    this.sfxLast = {};
    // 무협 효과음 (코드로 합성: 바람·천·북·징, 쇳소리 없음) — tools/synth_wuxia.mjs 로 만듦
    const names = ['wx_swing', 'wx_cut', 'wx_heavy', 'wx_hurt', 'wx_palm', 'wx_boom', 'wx_dash', 'wx_gong', 'wx_step'];
    names.forEach(n => {
      fetch('assets/audio/' + n + '.mp3').then(r => r.arrayBuffer()).then(b => this.ctx.decodeAudioData(b)).then(buf => { this.sfx[n] = buf; }).catch(() => {});
    });
  }
  // 효과음 재생: vol 크기, rate 높낮이(1=그대로), jitter 매번 살짝 다르게, gap 같은 소리 최소 간격(초)
  playSample(name, vol = 0.5, rate = 1, jitter = 0.08, gap = 0.05, lowpass = 0) {
    if (!this.enabled || !this.ctx || !this.sfx || !this.sfx[name]) return false;
    const now = this.ctx.currentTime;
    if (this.sfxLast[name] && now - this.sfxLast[name] < gap) return true; // 너무 잦으면 건너뜀(소리 뭉개짐 방지)
    this.sfxLast[name] = now;
    const src = this.ctx.createBufferSource();
    src.buffer = this.sfx[name];
    src.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * jitter);
    const g = this.ctx.createGain();
    g.gain.value = vol;
    if (lowpass > 0) {
      // 날카로운 고음을 깎아 부드럽게 (쉭 → 훅)
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = lowpass;
      src.connect(lp); lp.connect(g);
    } else {
      src.connect(g);
    }
    g.connect(this.ctx.destination);
    src.start();
    return true;
  }
  playEnemyShot() {
    this.playSample('wx_swing', 0.08, 1.2, 0.1, 0.3);
  }
  playSwordSlash() {
    if (this.playSample('wx_swing', 0.38, 1, 0.08, 0.12)) return;
    if (this.sfx) return; // 예비 합성음(삐삐·띵)은 쓰지 않음
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.12);
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }
  playPalmBlast() {
    if (this.playSample('wx_palm', 0.6, 1, 0.05, 0.2)) return;
    if (this.sfx) return; // 예비 합성음(삐삐·띵)은 쓰지 않음
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 0.28);
    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.28);
  }
  playDaggerRain() {
    if (this.playSample('wx_swing', 0.22, 1.35, 0.08, 0.25)) return;
    if (this.sfx) return; // 예비 합성음(삐삐·띵)은 쓰지 않음
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(350, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }
  playExplosion() {
    if (this.playSample('wx_boom', 0.8, 1, 0.06, 0.08)) return;
    if (this.sfx) return; // 예비 합성음(삐삐·띵)은 쓰지 않음
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.35);
    g1.gain.setValueAtTime(0.5, t);
    g1.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
    osc.connect(g1); g1.connect(this.ctx.destination);
    osc.start(t); osc.stop(t + 0.4);
    const len = Math.floor(this.ctx.sampleRate * 0.35);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = this.ctx.createBufferSource();
    const g2 = this.ctx.createGain();
    src.buffer = buf;
    g2.gain.setValueAtTime(0.35, t);
    src.connect(g2); g2.connect(this.ctx.destination);
    src.start(t);
  }
  playHit() {
    if (this.playSample('wx_hurt', 0.42, 1, 0.08, 0.35)) return;
    if (this.sfx) return; // 예비 합성음(삐삐·띵)은 쓰지 않음
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }
  playPickup() {
    // 경험치 구슬: 음높이 없는 아주 짧고 작은 '톡' (예전 '띵'은 계속 들으면 거슬림)
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (this._lastPickup && now - this._lastPickup < 0.09) return;
    this._lastPickup = now;
    if (!this._tickBuf) {
      const len = Math.floor(this.ctx.sampleRate * 0.03);
      this._tickBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this._tickBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = this._tickBuf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900 + Math.random() * 200;
    bp.Q.value = 1.2;
    const g = this.ctx.createGain();
    g.gain.value = 0.12;
    src.connect(bp); bp.connect(g); g.connect(this.ctx.destination);
    src.start(now);
  }

  playLevelUp() {
    if (this.playSample('wx_gong', 0.4, 1, 0.02, 1.0)) return;
    if (this.sfx) return; // 예비 합성음(삐삐·띵)은 쓰지 않음
    if (!this.enabled || !this.ctx) return;
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.08);
      gain.gain.setValueAtTime(0.24, this.ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + i * 0.08 + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + i * 0.08);
      osc.stop(this.ctx.currentTime + i * 0.08 + 0.28);
    });
  }
  playDash() {
    if (this.playSample('wx_dash', 0.4, 1, 0.08, 0.2)) return;
    if (this.sfx) return; // 예비 합성음(삐삐·띵)은 쓰지 않음
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(700, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.24, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }
}
