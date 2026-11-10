// 단색 마젠타(#FF00FF) 배경 그림 → 배경 투명 + 물체만 잘라낸 PNG
// node tools/key_sprite.mjs <입력.png> <출력.png> [최대 높이=800]
// - 마젠타와의 색 거리로 투명도를 부드럽게 (분홍 꽃잎이 같이 지워지지 않게: 초록이 낮고 빨강·파랑이 둘 다 높은 색만 배경)
// - 가장자리 마젠타 번짐 덜기, 가장 큰 덩어리만 남기고 그 크기로 자르기
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const [inp, out, maxHArg] = process.argv.slice(2);
const MAXH = +maxHArg || 800;
const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', inp], { encoding: 'utf8' });
const [W, H] = probe.stdout.trim().split(',').map(Number);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'key-'));
const raw = path.join(tmp, 'in.raw');
spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', inp, '-f', 'rawvideo', '-pix_fmt', 'rgba', raw]);
const px = fs.readFileSync(raw);
const N = W * H;
const alpha = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
  // 마젠타다움: 빨강·파랑이 높고 초록이 낮을수록 (분홍 꽃잎은 초록이 꽤 높아서 남음)
  const mag = Math.min(r, b) - g; // 순수 마젠타 ≈ 255, 연분홍 ≈ 40~80
  const bal = Math.abs(r - b);   // 마젠타는 빨강≈파랑
  let a;
  if (mag > 150 && bal < 70) a = 0;
  else if (mag > 95 && bal < 90) a = (150 - mag) / 55; // 경계는 부드럽게
  else a = 1;
  alpha[i] = Math.max(0, Math.min(1, a));
}
// 가장 큰 덩어리만 (불투명 픽셀끼리 이어진 것)
const label = new Int32Array(N).fill(-1);
let best = -1, bestSize = 0, cur = 0;
const stack = [];
for (let i = 0; i < N; i++) {
  if (alpha[i] < 0.5 || label[i] !== -1) continue;
  let size = 0; stack.push(i); label[i] = cur;
  while (stack.length) {
    const p = stack.pop(); size++;
    const x = p % W, y = (p / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const q = ny * W + nx; if (alpha[q] >= 0.5 && label[q] === -1) { label[q] = cur; stack.push(q); }
    }
  }
  if (size > bestSize) { bestSize = size; best = cur; }
  cur++;
}
// 큰 덩어리 주변(4px)만 살리고 나머지는 투명. 큰 덩어리에 붙은 부드러운 가장자리는 유지
const keep = new Uint8Array(N);
let x0 = W, y0 = H, x1 = 0, y1 = 0;
for (let i = 0; i < N; i++) if (label[i] === best) { keep[i] = 1; const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
const R = 4;
const near = new Uint8Array(N);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (!keep[y * W + x]) continue;
  for (let dy = -R; dy <= R; dy += R) for (let dx = -R; dx <= R; dx += R) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H) near[ny * W + nx] = 1; }
}
for (let i = 0; i < N; i++) {
  let a = (label[i] === best || (near[i] && alpha[i] < 0.5)) ? alpha[i] : 0;
  if (label[i] !== best && label[i] !== -1) a = 0; // 다른 덩어리(작은 꽃잎 조각·표시 등)는 버림
  // 가장자리 마젠타 번짐 덜기: 반투명 픽셀에서 빨강·파랑을 초록 쪽으로
  if (a > 0 && a < 1) {
    const g = px[i * 4 + 1];
    px[i * 4] = Math.round(px[i * 4] * a + g * (1 - a));
    px[i * 4 + 2] = Math.round(px[i * 4 + 2] * a + g * (1 - a));
  }
  px[i * 4 + 3] = Math.round(a * 255);
}
const pad = 6;
x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
const crop = Buffer.alloc(cw * ch * 4);
for (let y = 0; y < ch; y++) px.copy(crop, y * cw * 4, ((y + y0) * W + x0) * 4, ((y + y0) * W + x0 + cw) * 4);
const craw = path.join(tmp, 'out.raw');
fs.writeFileSync(craw, crop);
const scale = ch > MAXH ? `,scale=-2:${MAXH}:flags=lanczos` : '';
const r2 = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${cw}x${ch}`, '-i', craw, '-vf', `format=rgba${scale}`, '-pix_fmt', 'rgba', out], { encoding: 'utf8' });
if (r2.status !== 0) { console.log(r2.stderr); process.exit(1); }
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`완성: ${out} (잘라낸 크기 ${cw}x${ch}${scale ? ` → 높이 ${MAXH}` : ''}, 덩어리 ${cur}개 중 가장 큰 것)`);
