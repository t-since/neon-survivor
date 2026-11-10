// 만든 영상만 모아 보는 페이지: node tools/cinema/make_gallery.mjs → cinema_gallery.html
// 게임 서버(http://localhost:8781)에서 http://localhost:8781/cinema_gallery.html 로 열기
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../..');
const list = (dir, re = /\.mp4$/i) => fs.existsSync(path.join(ROOT, dir)) ? fs.readdirSync(path.join(ROOT, dir)).filter(f => re.test(f)).sort().map(f => `${dir}/${f}`) : [];
const mb = f => (fs.statSync(path.join(ROOT, f)).size / 1048576).toFixed(1) + 'MB';
const LABEL = { opening: '오프닝', sector2: '2구역 전환', sector3: '3구역 전환', sector4: '4구역 전환', sector5: '5구역 전환', ending: '엔딩', trailer: '트레일러' };
const finals = [...['opening', 'sector2', 'sector3', 'sector4', 'sector5', 'ending'].map(n => `assets/cinema/${n}.mp4`).filter(f => fs.existsSync(path.join(ROOT, f))), ...list('promo')];
const groups = [
  ['오프닝 컷', 'cinema_src/opening'], ['2구역 컷', 'cinema_src/sector2'], ['3구역 컷', 'cinema_src/sector3'], ['4구역 컷', 'cinema_src/sector4'],
  ['5구역 컷', 'cinema_src/sector5'], ['엔딩 컷', 'cinema_src/ending'], ['트레일러 실사 컷', 'cinema_src/trailer'], ['게임 플레이 녹화', 'cinema_src/gameplay'], ['버린 것 (잘못 만들어짐)', 'cinema_src/_bad']
].map(([t, d]) => [t, list(d)]).filter(([, l]) => l.length);
// 미리보기 그림 (영상 2.5초/1초 지점) — cinema_posters/ 에 한 번만 만들어 둠
import { spawnSync } from 'node:child_process';
const posterOf = (f, big) => {
  const p = 'cinema_posters/' + f.replace(/[\/\\]/g, '__').replace(/\.mp4$/i, '.jpg');
  const abs = path.join(ROOT, p);
  if (!fs.existsSync(abs) || fs.statSync(abs).mtimeMs < fs.statSync(path.join(ROOT, f)).mtimeMs) {
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', big ? '2.5' : '1', '-i', path.join(ROOT, f), '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '4', abs]);
  }
  return p;
};
const card = (f, big) => {
  const name = path.basename(f, '.mp4');
  const title = big ? (LABEL[name] || name) : name;
  return `<figure class="${big ? 'big' : ''}"><video src="${f}" poster="${posterOf(f, big)}" controls preload="metadata" playsinline></video><figcaption><b>${title}</b><span>${mb(f)}</span></figcaption></figure>`;
};
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>강호만검 영상 모음</title>
<style>
:root{--bg:#0d0f14;--panel:#171a22;--line:#2a2f3b;--ink:#e9e4d6;--muted:#9aa0ad;--gold:#e8b24a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:"Malgun Gothic",system-ui,sans-serif;padding:24px 16px 60px}
.wrap{max-width:1400px;margin:0 auto}h1{font-size:26px;margin:0 0 4px;color:var(--gold)}p.sub{color:var(--muted);margin:0 0 28px;font-size:14px}
h2{font-size:18px;margin:36px 0 12px;padding-bottom:8px;border-bottom:1px solid var(--line)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.grid.finals{grid-template-columns:repeat(auto-fill,minmax(440px,1fr))}
figure{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:10px;overflow:hidden}
video{display:block;width:100%;aspect-ratio:16/9;background:#000}
figcaption{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;font-size:13px}
figcaption b{font-weight:600}figcaption span{color:var(--muted);font-size:12px}
figure.big figcaption b{color:var(--gold);font-size:15px}
@media (max-width:520px){.grid,.grid.finals{grid-template-columns:1fr}}
</style></head><body><div class="wrap">
<h1>강호만검 · 영상 모음</h1><p class="sub">게임에 들어간 완성본, 컷별 원본 클립, 게임 플레이 녹화 — ${new Date().toLocaleString('ko-KR')} 기준</p>
<h2>완성본</h2><div class="grid finals">${finals.map(f => card(f, true)).join('')}</div>
${groups.map(([t, l]) => `<h2>${t} <small style="color:var(--muted);font-weight:400">${l.length}개</small></h2><div class="grid">${l.map(f => card(f)).join('')}</div>`).join('')}
</div>
<script>
// 하나를 재생하면 나머지는 멈춤
document.querySelectorAll('video').forEach(v => v.addEventListener('play', () => document.querySelectorAll('video').forEach(o => { if (o !== v) o.pause(); })));
</script></body></html>`;
fs.writeFileSync(path.join(ROOT, 'cinema_gallery.html'), html);
console.log(`cinema_gallery.html — 완성본 ${finals.length}개, 클립 ${groups.reduce((a, [, l]) => a + l.length, 0)}개`);
