// 소품 2x2 시트(마젠타 배경) → 소품 4개 PNG (배경 투명, 가장 큰 덩어리만)
// node tools/split_props.mjs <시트.png> <이름1> <이름2> <이름3> <이름4>   (왼쪽 위, 오른쪽 위, 왼쪽 아래, 오른쪽 아래)
// 결과: assets/props/<이름>.png (높이 최대 600)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const [sheet, ...names] = process.argv.slice(2);
if (!sheet || names.length !== 4) { console.log('node tools/split_props.mjs <시트> <이름1> <이름2> <이름3> <이름4>'); process.exit(1); }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'props-'));
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const cells = ['0:0', 'iw/2:0', '0:ih/2', 'iw/2:ih/2'];
names.forEach((n, i) => {
  const cut = path.join(tmp, `${n}.png`);
  const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', sheet, '-vf', `crop=iw/2:ih/2:${cells[i]}`, cut]);
  if (r.status !== 0) { console.log('자르기 실패', n, r.stderr?.toString()); return; }
  const out = path.join(here, '..', 'assets', 'props', `${n}.png`);
  const k = spawnSync('node', [path.join(here, 'key_sprite.mjs'), cut, out, '600'], { encoding: 'utf8' });
  console.log(n, k.status === 0 ? '→ ' + out : '실패 ' + k.stderr);
});
