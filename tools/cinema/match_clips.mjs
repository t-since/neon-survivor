// 받은 Flow 영상이 어느 컷인지: 첫 장면을 시작 프레임들과 비교(SSIM)해서 가장 닮은 컷으로 짝지음
// node tools/cinema/match_clips.mjs <영상 폴더> <시작 프레임 폴더(.jpg)> [--apply]
//   --apply: cinema_src/<sector2|...|ending>/<컷>.mp4 로 복사 (같은 컷이 여럿이면 가장 닮은 것)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const [vidDir, frameDir] = process.argv.slice(2);
const APPLY = process.argv.includes('--apply');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'match-'));
const ff = args => spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8' });
const thumb = (src, out, video) => ff([...(video ? ['-ss', '0.05'] : []), '-i', src, '-frames:v', '1', '-vf', 'scale=192:108,format=gray', out]);
const frames = fs.readdirSync(frameDir).filter(f => /^(s\d|ed)_\d+\.jpg$/.test(f));
frames.forEach(f => thumb(path.join(frameDir, f), path.join(tmp, 'f_' + f.replace('.jpg', '.png'))));
const vids = fs.readdirSync(vidDir).filter(f => f.endsWith('.mp4'));
const res = [];
for (const v of vids) {
  const vt = path.join(tmp, 'v_' + v.replace('.mp4', '.png'));
  thumb(path.join(vidDir, v), vt, true);
  let best = null;
  for (const f of frames) {
    const r = spawnSync('ffmpeg', ['-hide_banner', '-i', vt, '-i', path.join(tmp, 'f_' + f.replace('.jpg', '.png')), '-lavfi', 'ssim', '-f', 'null', '-'], { encoding: 'utf8' });
    const m = /All:([\d.]+)/.exec(r.stderr || '');
    const score = m ? +m[1] : 0;
    if (!best || score > best.score) best = { shot: f.replace('.jpg', ''), score };
  }
  res.push({ video: v, ...best });
  console.log(`${v} → ${best.shot} (${best.score.toFixed(3)})`);
}
const byShot = {};
for (const r of res) if (!byShot[r.shot] || r.score > byShot[r.shot].score) byShot[r.shot] = r;
const dup = res.filter(r => byShot[r.shot] !== r);
if (dup.length) console.log('같은 컷이 여러 개: ' + dup.map(d => `${d.video}(${d.shot})`).join(', '));
const all = frames.map(f => f.replace('.jpg', ''));
const missing = all.filter(s => !byShot[s]);
console.log('없는 컷: ' + (missing.join(' ') || '없음'));
if (APPLY) {
  const folder = s => s.startsWith('ed_') ? 'ending' : 'sector' + s[1];
  for (const [shot, r] of Object.entries(byShot)) {
    const dest = path.join(ROOT, 'cinema_src', folder(shot), shot + '.mp4');
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(vidDir, r.video), dest);
  }
  console.log('복사 완료');
}
fs.rmSync(tmp, { recursive: true, force: true });
