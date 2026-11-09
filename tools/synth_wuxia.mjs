// 무협 효과음 합성 → MP3 (쇳소리·높은 '띵' 없이, 바람·천·북 느낌)
// 사용: node synth_wuxia.mjs <출력폴더>
import fs from 'fs';
import { Mp3Encoder } from '@breezystack/lamejs';
const OUT = process.argv[2];
const SR = 44100;
const rnd = (() => { let s = 12345; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff * 2 - 1; }; })();
const buf = sec => new Float32Array(Math.floor(sec * SR));
const env = (t, a, d) => t < a ? t / a : Math.exp(-(t - a) / d); // 빠르게 올라갔다 천천히 사라짐

// 상태변수 필터 (주파수를 시간에 따라 바꿀 수 있음)
function svf(x, fcFn, q, mode = 'bp') {
  const y = new Float32Array(x.length); let lp = 0, bp = 0;
  for (let i = 0; i < x.length; i++) {
    const f = 2 * Math.sin(Math.PI * Math.min(0.45, fcFn(i / SR) / SR));
    const hp = x[i] - lp - bp / q; bp += f * hp; lp += f * bp;
    y[i] = mode === 'bp' ? bp : mode === 'lp' ? lp : hp;
  }
  return y;
}
const noise = n => { const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = rnd(); return x; };
function sweepSine(sec, f0, f1, decay, attack = 0.003) {
  const x = buf(sec); let ph = 0;
  for (let i = 0; i < x.length; i++) { const t = i / SR; const f = f1 + (f0 - f1) * Math.exp(-t / (decay * 0.6)); ph += 2 * Math.PI * f / SR; x[i] = Math.sin(ph) * env(t, attack, decay); }
  return x;
}
function mix(len, ...parts) { const o = buf(len); for (const [x, g] of parts) for (let i = 0; i < Math.min(o.length, x.length); i++) o[i] += x[i] * g; return o; }
function shape(x, fn) { for (let i = 0; i < x.length; i++) x[i] *= fn(i / SR); return x; }
function normalize(x, peak = 0.8) { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); const k = m ? peak / m : 1; for (let i = 0; i < x.length; i++) x[i] *= k; return x; }
function fadeOut(x, sec = 0.03) { const n = Math.floor(sec * SR); for (let i = 0; i < n; i++) x[x.length - 1 - i] *= i / n; return x; }

// 휘두름: 바람이 지나가는 소리 (가운데가 가장 크고 높음), 낮은 '훅'이 받침
function swing(sec, lo, hi, q = 1.3) {
  const n = noise(Math.floor(sec * SR));
  const bell = t => Math.sin(Math.PI * Math.min(1, t / sec));
  const b = shape(svf(n, t => lo + (hi - lo) * Math.pow(bell(t), 1.5), q, 'bp'), t => Math.pow(bell(t), 1.8));
  const body = shape(svf(noise(n.length), () => 260, 0.8, 'lp'), t => Math.pow(bell(t), 2));
  return mix(sec, [b, 1], [body, 0.6]);
}
// 천 펄럭임 (대시)
function flutter(sec) { const s = swing(sec, 500, 1700, 1.1); return shape(s, t => 0.65 + 0.35 * Math.sin(2 * Math.PI * 28 * t)); }
// 둔탁한 타격: 짧은 잡음 + 낮은 '퍽'
function thud(sec, f0, f1, decay, crack = 0.5, crackFc = 1400) {
  const c = shape(svf(noise(Math.floor(sec * SR)), () => crackFc, 0.9, 'bp'), t => Math.exp(-t / 0.018));
  return mix(sec, [sweepSine(sec, f0, f1, decay), 1], [c, crack]);
}
// 북(태고) 느낌: 낮은 몸통 + 가죽 울림
function taiko(sec, f) {
  const body = sweepSine(sec, f * 1.6, f, 0.35, 0.002);
  const skin = shape(svf(noise(Math.floor(sec * SR)), () => 600, 1.5, 'bp'), t => Math.exp(-t / 0.05));
  return mix(sec, [body, 1], [skin, 0.35]);
}
// 징: 낮은 비배음 여러 개가 천천히 사라짐 (높은 '띵' 없이 둥글게)
function gong(sec, f) {
  const parts = [[1, 1], [1.47, 0.55], [2.09, 0.35], [2.56, 0.22], [3.18, 0.12]];
  const x = buf(sec);
  for (const [r, g] of parts) { let ph = 0; for (let i = 0; i < x.length; i++) { const t = i / SR; ph += 2 * Math.PI * f * r * (1 + 0.004 * Math.sin(2 * Math.PI * 3 * t)) / SR; x[i] += Math.sin(ph) * g * env(t, 0.03, 0.9 / r); } }
  return svf(x, () => 1800, 0.7, 'lp');
}
// 폭발: 넓은 잡음이 낮아지며 사라짐 + 깊은 울림 + 잔불 탁탁
function boom(sec) {
  const n = noise(Math.floor(sec * SR));
  const body = shape(svf(n, t => 120 + 1800 * Math.exp(-t / 0.12), 0.7, 'lp'), t => env(t, 0.004, 0.45));
  const sub = sweepSine(sec, 90, 32, 0.5, 0.004);
  const crack = buf(sec); for (let i = 0; i < crack.length; i++) { const t = i / SR; if (t > 0.05 && Math.random() < 0.0009 * Math.exp(-t / 0.4)) for (let k = 0; k < 120 && i + k < crack.length; k++) crack[i + k] += rnd() * Math.exp(-k / 25); }
  return mix(sec, [body, 1], [sub, 0.9], [crack, 0.25]);
}
// 장풍: 낮은 공기가 부풀었다 빠지는 '훙'
function palm(sec) {
  const n = noise(Math.floor(sec * SR));
  const swell = t => Math.sin(Math.PI * Math.min(1, t / sec)) ** 1.2;
  const air = shape(svf(n, t => 220 + 700 * swell(t), 0.9, 'lp'), swell);
  const sub = shape(sweepSine(sec, 70, 48, 0.6, 0.06), swell);
  return mix(sec, [air, 1], [sub, 0.7]);
}

function save(name, x, peak) {
  normalize(x, peak); fadeOut(x);
  const pcm = new Int16Array(x.length); for (let i = 0; i < x.length; i++) pcm[i] = Math.max(-32768, Math.min(32767, Math.round(x[i] * 32767)));
  const enc = new Mp3Encoder(1, SR, 96); const parts = [];
  for (let i = 0; i < pcm.length; i += 1152) { const m = enc.encodeBuffer(pcm.subarray(i, i + 1152)); if (m.length) parts.push(Buffer.from(m)); }
  const e = enc.flush(); if (e.length) parts.push(Buffer.from(e));
  const out = Buffer.concat(parts); fs.writeFileSync(OUT + '/' + name + '.mp3', out);
  console.log(name, (x.length / SR).toFixed(2) + 's', Math.round(out.length / 1024) + 'KB');
}

save('wx_swing', swing(0.26, 450, 1600), 0.7);                                       // 칼 휘두르기 '휙'
save('wx_cut', mix(0.2, [thud(0.2, 160, 70, 0.07, 0.8, 1500), 1], [swing(0.12, 700, 1800, 1.4), 0.35]), 0.8); // 적 베기 '착'
save('wx_heavy', mix(0.6, [swing(0.32, 300, 1200), 0.8], [taiko(0.6, 62), 1]), 0.85); // 3타 큰 베기 '휘익-쿵'
// 서진 피격 '퍽!': 휴대폰·노트북 스피커에서도 들리게 중간 높이(420→200Hz) 몸통 + 또렷한 타격 잡음 두 겹
save('wx_hurt', mix(0.24, [thud(0.24, 420, 200, 0.06, 2.2, 2200), 1], [thud(0.24, 200, 110, 0.09, 0.6, 1000), 0.45]), 0.95);
save('wx_palm', palm(0.6), 0.8);                                                       // 장풍 '훙'
save('wx_boom', boom(1.4), 0.9);                                                       // 벽력탄 폭발
save('wx_dash', flutter(0.3), 0.6);                                                    // 대시 펄럭
save('wx_gong', gong(1.8, 98), 0.7);                                                   // 레벨업 징
save('wx_step', taiko(0.5, 48), 0.85);                                                 // 보스 발걸음 '쿵'
