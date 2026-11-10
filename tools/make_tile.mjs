// 그림 한 장 → 이어 붙여도 이음새가 안 보이는 바닥 타일 (정사각형)
// node tools/make_tile.mjs <입력 그림> <출력.jpg> [크기=1024]
// 방법: 가운데를 정사각형으로 잘라 크기를 맞춘 뒤, 반 칸 밀어 둔 그림(B)과 섞음.
//       가장자리는 B(밀린 그림 → 끝과 끝이 원래 이웃이라 이음새 없음), 가운데는 원본(A). 그 사이는 부드럽게.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
const [inp, out, sizeArg] = process.argv.slice(2);
if (!inp || !out) { console.log('node tools/make_tile.mjs <입력> <출력.jpg> [크기]'); process.exit(1); }
const N = +sizeArg || 1024;

const rd = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', inp, '-vf', `crop='min(iw,ih)':'min(iw,ih)',scale=${N}:${N}:flags=lanczos`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: N * N * 3 + 1024 });
if (rd.status !== 0) { console.log('읽기 실패', rd.stderr?.toString()); process.exit(1); }
const A = rd.stdout;
const O = Buffer.alloc(N * N * 3);
const h = N / 2;
// 가운데 1, 가장자리 0 으로 가는 무게 (가장자리 22% 구간에서만 섞어 원본이 많이 남게)
const f = t => { const d = Math.min(t, N - 1 - t) / N; const k = Math.min(1, d / 0.22); return k * k * (3 - 2 * k); };
const fx = new Float32Array(N); for (let i = 0; i < N; i++) fx[i] = f(i);
// 네 장 섞기: 원본 / 가로로 반 칸 / 세로로 반 칸 / 둘 다 민 그림.
// 각 그림의 끊긴 선(원본은 가장자리, 민 그림은 가운데 선)에서는 그 그림의 무게가 0 이라 이음새가 안 보임
for (let y = 0; y < N; y++) {
  const sy = (y + h) % N, wy = fx[y];
  for (let x = 0; x < N; x++) {
    const sx = (x + h) % N, wx = fx[x];
    const w0 = wx * wy, w1 = (1 - wx) * wy, w2 = wx * (1 - wy), w3 = (1 - wx) * (1 - wy);
    const i0 = (y * N + x) * 3, i1 = (y * N + sx) * 3, i2 = (sy * N + x) * 3, i3 = (sy * N + sx) * 3;
    for (let c = 0; c < 3; c++) O[i0 + c] = A[i0 + c] * w0 + A[i1 + c] * w1 + A[i2 + c] * w2 + A[i3 + c] * w3;
  }
}
const wr = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${N}x${N}`, '-i', '-', '-q:v', '3', out], { input: O });
if (wr.status !== 0) { console.log('저장 실패', wr.stderr?.toString()); process.exit(1); }
console.log('타일 저장:', out, `${N}x${N}`, Math.round(fs.statSync(out).size / 1024) + 'KB');
