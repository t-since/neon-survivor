// 제미나이 2x2 시트(마젠타 배경) → 게임 프레임 4장 (440x340, 발 기준점 220,320, 인물 키 300)
// node tools/cut_sheet.mjs <시트.png> <출력 앞부분> [--scale 배율] [--h 키(기본 300)]
//   예) node tools/cut_sheet.mjs assets_new/sheets/boss_patriarch_walk.png assets/boss/boss_patriarch_walk
//       → boss_patriarch_walk_0~3.png, 배율을 출력 → 공격 시트에 --scale 로 그대로 넘기면 같은 크기
// - 칸을 반듯하게 나누지 않고 '덩어리' 단위로 자름 (칼끝이 옆 칸으로 넘어가도 잘리지 않음)
// - 프레임 순서: 위 줄 왼→오, 아래 줄 왼→오
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const args = process.argv.slice(2);
const [inp, outPrefix] = args;
const opt = k => { const i = args.indexOf(k); return i >= 0 ? +args[i + 1] : null; };
const TARGET_H = opt('--h') || 300, FIXED_SCALE = opt('--scale');
const FW = 440, FH = 340, AX = 220, AY = 320;
const [W, H] = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', inp], { encoding: 'utf8' }).stdout.trim().split(',').map(Number);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cut-'));
const raw = path.join(tmp, 'in.raw');
spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', inp, '-f', 'rawvideo', '-pix_fmt', 'rgba', raw]);
const px = fs.readFileSync(raw), N = W * H;
// 1. 마젠타 빼기 (key_sprite 와 같은 기준)
const A = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
  const mag = Math.min(r, b) - g, bal = Math.abs(r - b);
  A[i] = mag > 150 && bal < 70 ? 0 : mag > 95 && bal < 90 ? Math.max(0, Math.min(1, (150 - mag) / 55)) : 1;
  if (A[i] > 0 && A[i] < 1) { px[i * 4] = Math.round(r * A[i] + g * (1 - A[i])); px[i * 4 + 2] = Math.round(b * A[i] + g * (1 - A[i])); }
}
// 2. 덩어리 찾기
const lab = new Int32Array(N).fill(-1), comps = [];
const st = [];
for (let i = 0; i < N; i++) {
  if (A[i] < 0.5 || lab[i] !== -1) continue;
  const c = { id: comps.length, n: 0, sx: 0, sy: 0, x0: W, y0: H, x1: 0, y1: 0 };
  st.push(i); lab[i] = c.id;
  while (st.length) {
    const p = st.pop(), x = p % W, y = (p / W) | 0;
    c.n++; c.sx += x; c.sy += y; if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
    for (const q of [p - 1, p + 1, p - W, p + W]) { if (q < 0 || q >= N) continue; if ((q === p - 1 && x === 0) || (q === p + 1 && x === W - 1)) continue; if (A[q] >= 0.5 && lab[q] === -1) { lab[q] = c.id; st.push(q); } }
  }
  comps.push(c);
}
comps.sort((a, b) => b.n - a.n);
const main = comps.slice(0, 4);
if (main.length < 4) { console.log('덩어리가 4개보다 적음: ' + main.length); process.exit(1); }
// 위 줄 / 아래 줄로 나눠 왼→오
main.forEach(c => { c.cx = c.sx / c.n; c.cy = c.sy / c.n; });
main.sort((a, b) => a.cy - b.cy);
const rows = [main.slice(0, 2).sort((a, b) => a.cx - b.cx), main.slice(2, 4).sort((a, b) => a.cx - b.cx)];
const frames = [...rows[0], ...rows[1]];
// 작은 조각(불꽃·머리카락 끝)은 가장 가까운 큰 덩어리의 상자 안에 있으면 그 프레임에 붙임
const owner = new Int32Array(comps.length).fill(-1);
frames.forEach((c, fi) => owner[c.id] = fi);
for (const c of comps.slice(4)) {
  if (c.n < 30) continue;
  const cx = c.sx / c.n, cy = c.sy / c.n;
  const f = frames.findIndex(m => cx >= m.x0 - 12 && cx <= m.x1 + 12 && cy >= m.y0 - 12 && cy <= m.y1 + 12);
  if (f >= 0) { owner[c.id] = f; const m = frames[f]; m.x0 = Math.min(m.x0, c.x0); m.x1 = Math.max(m.x1, c.x1); m.y0 = Math.min(m.y0, c.y0); m.y1 = Math.max(m.y1, c.y1); }
}
// 3. 배율: 걷기는 키 중간값으로, --scale 이 있으면 그 값
const heights = frames.map(f => f.y1 - f.y0 + 1).sort((a, b) => a - b);
// --match <기존 프레임.png>: 그 프레임의 인물 키에 이 시트의 마지막 칸(준비 자세) 키를 맞춤 (공격 시트를 기존 걷기 그림 크기로)
let matchScale = null;
const mi = args.indexOf('--match');
if (mi >= 0) {
  const ref = args[mi + 1];
  const mraw = path.join(tmp, 'm.raw');
  spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', ref, '-f', 'rawvideo', '-pix_fmt', 'rgba', mraw]);
  const m = fs.readFileSync(mraw); let top = FH, bot = 0;
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) if (m[(y * FW + x) * 4 + 3] > 128) { if (y < top) top = y; if (y > bot) bot = y; }
  const refH = bot - top + 1, last = frames[3];
  matchScale = refH / (last.y1 - last.y0 + 1);
  console.log(`기준 프레임 키 ${refH}px ← 이 시트 마지막 칸 키 ${last.y1 - last.y0 + 1}px`);
}
const scale = FIXED_SCALE || matchScale || TARGET_H / ((heights[1] + heights[2]) / 2);
console.log(`배율 ${scale.toFixed(4)} (프레임 키 ${frames.map(f => f.y1 - f.y0 + 1).join(', ')})`);
// 4. 프레임마다: 그 프레임 덩어리(+가장자리 반투명)만 담아 배율로 줄이고, 발을 (220,320)에
frames.forEach((f, fi) => {
  const pad = 3, x0 = Math.max(0, f.x0 - pad), y0 = Math.max(0, f.y0 - pad), x1 = Math.min(W - 1, f.x1 + pad), y1 = Math.min(H - 1, f.y1 + pad);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, buf = Buffer.alloc(cw * ch * 4);
  let footSum = 0, footN = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * W + x, o = ((y - y0) * cw + (x - x0)) * 4;
    let a = A[i];
    const l = lab[i];
    if (l >= 0) { if (owner[l] !== fi) a = 0; }
    else if (a > 0) { // 반투명 가장자리: 이웃이 이 프레임 것이면 살림
      let ok = false;
      for (const q of [i - 1, i + 1, i - W, i + W, i - 2, i + 2]) if (q >= 0 && q < N && lab[q] >= 0 && owner[lab[q]] === fi) { ok = true; break; }
      if (!ok) a = 0;
    }
    buf[o] = px[i * 4]; buf[o + 1] = px[i * 4 + 1]; buf[o + 2] = px[i * 4 + 2]; buf[o + 3] = Math.round(a * 255);
    if (a > 0.5 && y > f.y1 - (f.y1 - f.y0) * 0.1) { footSum += x; footN++; }
  }
  const footX = footN ? footSum / footN : (f.x0 + f.x1) / 2;
  const sw = Math.max(1, Math.round(cw * scale)), sh = Math.max(1, Math.round(ch * scale));
  const ox = Math.round(AX - (footX - x0) * scale), oy = Math.round(AY - (f.y1 + 1 - y0) * scale);
  const rin = path.join(tmp, `f${fi}.raw`); fs.writeFileSync(rin, buf);
  const out = `${outPrefix}_${fi}.png`;
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${cw}x${ch}`, '-i', rin,
    '-f', 'lavfi', '-i', `color=c=black@0.0:s=${FW}x${FH},format=rgba`,
    '-filter_complex', `[0]scale=${sw}:${sh}:flags=lanczos,format=rgba[f];[1][f]overlay=${ox}:${oy}:format=auto,format=rgba`, '-frames:v', '1', out], { encoding: 'utf8' });
  if (r.status !== 0) { console.log(r.stderr); process.exit(1); }
  console.log(`${out}  (발 x=${Math.round(footX)}, 크기 ${sw}x${sh}, 위치 ${ox},${oy})`);
});
fs.rmSync(tmp, { recursive: true, force: true });
