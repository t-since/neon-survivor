// Flow 영상 보기 화면에서 지금 영상부터 '다음 미디어'로 넘기며 차례로 다운로드
// node flow_dl.mjs <저장 폴더> <개수> [720p|1080p]
import fs from 'node:fs';
import path from 'node:path';
const PORT = 9444;
const [outDir, countArg, quality = '720p', pickArg = ''] = process.argv.slice(2);
// pickArg: '0:op_07,2:op_06' → 그 순번만 받아서 이름 붙임 (나머지는 넘기기만)
const PICK = Object.fromEntries(pickArg.split(',').filter(Boolean).map(p => p.split(':')).map(([i, n]) => [+i, n]));
const HAS_PICK = Object.keys(PICK).length > 0;
const N = +countArg || 20;
const DL = path.join(process.env.USERPROFILE, 'Downloads');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
const tab = list.find(t => t.type === 'page' && t.url.includes('flow.google.com'));
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pend = {};
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async code => { const r = await send('Runtime.evaluate', { expression: code, awaitPromise: true, returnByValue: true, userGesture: true }); return r.result?.result?.value; };
const mouse = async (x, y) => { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); };
const btn = label => ev(`(()=>{const e=[...document.querySelectorAll('button')].find(x=>x.getClientRects().length && x.getAttribute('aria-label')===${JSON.stringify(label)}); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2, dis: e.disabled}})()`);
const leaf = (text, minX = 0) => ev(`(()=>{const e=[...document.querySelectorAll('*')].filter(x=>x.children.length===0 && (x.textContent||'').trim()===${JSON.stringify(text)} && x.getClientRects().length && x.getBoundingClientRect().x>${minX})[0]; if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);

await send('Page.bringToFront'); await sleep(800);
fs.mkdirSync(outDir, { recursive: true });
const log = [];
for (let k = 0; k < N; k++) {
  const title = await ev(`(()=>{const h=[...document.querySelectorAll('h1,h2,div,span')].find(x=>x.children.length===0 && x.getClientRects().length && x.getBoundingClientRect().y<60 && x.getBoundingClientRect().x>60 && x.getBoundingClientRect().x<200); return h? h.textContent.trim():''})()`);
  if (HAS_PICK && !(k in PICK)) {
    console.log(`[${k}] 넘김: ${title}`);
    const nx0 = await btn('다음 미디어');
    if (!nx0 || nx0.dis) break;
    await mouse(nx0.x, nx0.y); await sleep(2500);
    continue;
  }
  const t0 = Date.now();
  const d = await btn('미디어 다운로드') || { x: 956, y: 38 };
  await mouse(d.x, d.y); await sleep(1200);
  const q = await leaf(quality, 900);
  if (!q) { console.log(`[${k}] ${quality} 메뉴 없음`); if (HAS_PICK) { const nx1 = await btn('다음 미디어'); if (!nx1 || nx1.dis) break; await mouse(nx1.x, nx1.y); await sleep(2500); continue; } break; }
  await mouse(q.x, q.y);
  let got = null;
  for (let i = 0; i < (quality === '1080p' ? 400 : 90) && !got; i++) {
    await sleep(1000);
    const f = fs.readdirSync(DL).filter(n => /\.mp4$/i.test(n)).map(n => ({ n, t: fs.statSync(path.join(DL, n)).mtimeMs })).filter(x => x.t >= t0 - 500).sort((a, b) => b.t - a.t)[0];
    if (f && !fs.existsSync(path.join(DL, f.n + '.crdownload'))) { await sleep(1000); got = f.n; }
  }
  if (!got) { console.log(`[${k}] 다운로드 안 됨: ${title}`); }
  else {
    const dest = path.join(outDir, HAS_PICK ? `${PICK[k]}.mp4` : `v${String(k + 1).padStart(2, '0')}.mp4`);
    fs.renameSync(path.join(DL, got), dest);
    log.push({ file: path.basename(dest), title, src: got });
    console.log(`[${k}] ${path.basename(dest)} ← ${title}`);
  }
  await sleep(500);
  const nx = await btn('다음 미디어');
  if (!nx || nx.dis) { console.log('마지막 미디어'); break; }
  await mouse(nx.x, nx.y); await sleep(2500);
}
fs.writeFileSync(path.join(outDir, 'list.json'), JSON.stringify(log, null, 1));
ws.close();
