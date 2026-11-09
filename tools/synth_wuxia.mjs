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

// 피격 목소리 '억!': 성대 울림(톱니파) + 모음 '어'의 입 모양 울림(포먼트 3개) + 숨소리, 끝은 'ㄱ'처럼 뚝 끊김
function grunt(f0, dur, f1 = 620, f2 = 1050, f3 = 2450) {
  const n = Math.floor(dur * SR), src = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = f0 * (1.08 - 0.3 * t / dur) * (1 + 0.02 * Math.sin(2 * Math.PI * 23 * t)); // 처음 살짝 높고 떨어짐
    ph = (ph + f / SR) % 1;
    src[i] = (2 * ph - 1) * 0.8 + rnd() * 0.18; // 성대 + 숨
  }
  const v = mix(dur, [svf(src, () => f1, 5, 'bp'), 1], [svf(src, () => f2, 8, 'bp'), 0.55], [svf(src, () => f3, 11, 'bp'), 0.22]);
  // 소리 모양: 빠르게 터지고, 마지막 25ms 는 'ㄱ' 처럼 급히 닫힘
  return shape(v, t => Math.min(1, t / 0.012) * (t > dur - 0.025 ? Math.max(0, (dur - t) / 0.025) : 1) * (1 - 0.35 * t / dur));
}
[['wx_grunt_a', 150, 0.17], ['wx_grunt_b', 128, 0.19], ['wx_grunt_c', 172, 0.15]].forEach(([nm, f0, d]) => {
  save(nm, mix(d + 0.02, [grunt(f0, d), 1], [thud(d + 0.02, 300, 150, 0.05, 0.6, 1800), 0.25]), 0.9);
});

// ===== 묵직한 타격 계열 (귀무자류 '특징'을 참고해 새로 합성: 날카로운 첫소리 + 묵직한 몸통 + 거친 질감 + 짧은 울림) =====
function saturate(x, drive) { const k = Math.tanh(drive); for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * drive) / k; return x; }
function pad(x, sec) { const y = new Float32Array(x.length + Math.floor(sec * SR)); y.set(x); return y; }
function reverb(x, wet = 0.2, size = 1) {
  // 작은 방 울림 (콤 필터 4개 + 올패스 2개)
  const combs = [29.7, 37.1, 41.1, 43.7].map(ms => ({ d: Math.floor(ms * size * SR / 1000), fb: 0.72 }));
  const y = new Float32Array(x.length);
  for (const c of combs) { const b = new Float32Array(c.d); let p = 0; for (let i = 0; i < x.length; i++) { const o = b[p]; b[p] = x[i] + o * c.fb; p = (p + 1) % c.d; y[i] += o * 0.25; } }
  for (const ms of [5.0, 1.7]) { const d = Math.floor(ms * SR / 1000), b = new Float32Array(d); let p = 0; for (let i = 0; i < y.length; i++) { const v = b[p], u = y[i] + v * 0.7; b[p] = u; y[i] = v - u * 0.7; p = (p + 1) % d; } }
  const o = new Float32Array(x.length); for (let i = 0; i < x.length; i++) o[i] = x[i] * (1 - wet) + y[i] * wet * 2.2; return o;
}
const crack = (sec, fc, dec) => shape(svf(noise(Math.floor(sec * SR)), () => fc, 0.8, 'bp'), t => Math.exp(-t / dec));
const offset = (x, sec) => { const y = new Float32Array(x.length + Math.floor(sec * SR)); y.set(x, Math.floor(sec * SR)); return y; };
function impact(sec, { crackFc = 3200, crackDec = 0.008, body0 = 210, body1 = 70, bodyDec = 0.09, grit = 2.2, wet = 0.2, mud = 0.6 } = {}) {
  const c = crack(sec, crackFc, crackDec);
  const b = sweepSine(sec, body0, body1, bodyDec, 0.002);
  const m = shape(svf(noise(Math.floor(sec * SR)), () => 800, 0.9, 'lp'), t => Math.exp(-t / 0.05));
  const x = saturate(mix(sec, [c, 0.9], [b, 1], [m, mud]), grit);
  return reverb(pad(x, 0.3), wet);
}
// 서진 피격: 묵직하게 꽂히는 '퍽!' + 짧은 울림 (목소리 없음)
save('wx_hit_player', impact(0.22, { crackFc: 2600, body0: 230, body1: 80, bodyDec: 0.1, grit: 2.6, wet: 0.22, mud: 0.8 }), 0.95);
// 적 베기: 짧은 칼바람 뒤 '착!' 갈라지는 타격
save('wx_slash_hit', mix(0.5, [swing(0.09, 900, 2400, 1.4), 0.5], [offset(impact(0.16, { crackFc: 3600, crackDec: 0.006, body0: 260, body1: 110, bodyDec: 0.06, grit: 1.8, wet: 0.15, mud: 0.5 }), 0.045), 1]), 0.9);
// 3타 큰 베기: 크게 휘두른 뒤 '쾅!' + 북 울림 + 긴 잔향
save('wx_slash_heavy', mix(0.9, [swing(0.24, 380, 1500), 0.7], [offset(impact(0.3, { crackFc: 3000, crackDec: 0.01, body0: 160, body1: 50, bodyDec: 0.16, grit: 2.4, wet: 0.3, mud: 0.9 }), 0.17), 1], [offset(taiko(0.5, 55), 0.17), 0.6]), 0.95);

// ===== 서진 피격 (귀무자풍 '맞는 느낌'): 상대 무기 바람 → 젖은 살 타격 '촥' + 뼈 울림 '뚝' + 저음 '쿵' + 숨 '헉' (목소리 떨림 없는 숨소리) =====
function breath(sec, f1, f2, f3) {
  // 성대 떨림 없이 숨만 모음 '어' 입 모양으로 통과 → 사람이 '헉' 하고 숨 뱉는 느낌
  const n = noise(Math.floor(sec * SR));
  const v = mix(sec, [svf(n, () => f1, 6, 'bp'), 1], [svf(n, () => f2, 9, 'bp'), 0.7], [svf(n, () => f3, 12, 'bp'), 0.35]);
  return shape(v, t => Math.min(1, t / 0.01) * Math.exp(-t / (sec * 0.45)));
}
function fleshSlap(sec, fc) {
  // 빠르게 떨리는 젖은 잡음 '촥'
  const s = svf(noise(Math.floor(sec * SR)), () => fc, 1.3, 'bp');
  return shape(s, t => Math.exp(-t / 0.035) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 95 * t)));
}
function boneClicks(sec, count) {
  const x = buf(sec);
  for (let c = 0; c < count; c++) { const st = Math.floor((0.002 + Math.random() * 0.02) * SR); for (let k = 0; k < 90 && st + k < x.length; k++) x[st + k] += rnd() * Math.exp(-k / 14); }
  return svf(x, () => 2800, 1.0, 'bp');
}
function playerHit(v) {
  const len = 0.32;
  const pre = swing(0.06, 1200, 2600, 1.4);                         // 상대 무기 바람
  const hit = mix(len,
    [fleshSlap(len, v.slap), 1.0],
    [boneClicks(len, 4), 0.7],
    [sweepSine(len, v.b0, v.b1, 0.11, 0.002), 0.15],                 // 저음 '쿵' (둔탁해서 크게 줄임)
    [crack(len, 3000, 0.006), 0.6]);
  const huff = offset(breath(0.16, v.f1, v.f2, v.f3), 0.035);       // 숨 '헉'
  let x = mix(len + 0.08, [pre, 0.35], [offset(saturate(hit, 2.3), 0.045), 1], [huff, v.huff]);
  x = svf(x, () => 220, 0.7, 'hp'); // 220Hz 아래 둔탁한 저음 걸러냄
  return reverb(pad(x, 0.25), 0.14);
}
[['wx_hurt_1', { slap: 1500, b0: 190, b1: 65, f1: 640, f2: 1100, f3: 2500, huff: 0.55 }],
 ['wx_hurt_2', { slap: 1250, b0: 170, b1: 58, f1: 560, f2: 980, f3: 2350, huff: 0.6 }],
 ['wx_hurt_3', { slap: 1750, b0: 210, b1: 72, f1: 700, f2: 1200, f3: 2650, huff: 0.5 }]
].forEach(([nm, v]) => save(nm, playerHit(v), 0.95));

// ===== 적이 맞는 소리 (둔탁한 저음 없이 가볍고 날카로운 '착') =====
function lightCut(len, slapFc, crackFc) {
  const x = mix(len, [fleshSlap(len, slapFc), 0.9], [crack(len, crackFc, 0.005), 0.8], [boneClicks(len, 2), 0.4]);
  return reverb(pad(svf(saturate(x, 1.6), () => 350, 0.7, 'hp'), 0.12), 0.1);
}
save('wx_cut', lightCut(0.12, 1900, 3800), 0.8);                                                   // 무공에 맞을 때 (작고 가볍게)
save('wx_slash_hit', mix(0.4, [swing(0.09, 900, 2400, 1.4), 0.5], [offset(lightCut(0.16, 1500, 3400), 0.045), 1]), 0.9); // 칼에 베일 때
