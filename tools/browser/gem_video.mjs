// 제미나이 앱 '동영상 만들기'로 그림 → 영상 하나 (Flow 크레딧과 별도 한도)
// node gem_video.mjs <저장할 .mp4> <프롬프트 .txt> <첫 프레임 그림>
// - 매번 새 채팅에서 요청 (앞 그림이 섞이지 않게)
// - '용량 초과' 답이면 2분 쉬고 '다시 실행' (최대 4번)
import fs from 'node:fs';
import path from 'node:path';
const PORT = 9444;
const [outFile, promptFile, image] = process.argv.slice(2);
const prompt = fs.readFileSync(promptFile, 'utf8').trim();
const DL = path.join(process.env.USERPROFILE, 'Downloads');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
const tab = list.find(t => t.type === 'page' && t.url.startsWith('https://gemini.google.com'));
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}; const listeners = [];
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; } listeners.forEach(f => f(d)); };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async code => { const r = await send('Runtime.evaluate', { expression: code, awaitPromise: true, returnByValue: true, userGesture: true }); return r.result?.result?.value; };
const mouse = async (x, y) => { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); };
const rect = code => ev(`(()=>{const e=${code}; if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
const menuItem = text => rect(`[...document.querySelectorAll('button,[role=menuitem],[role=menuitemcheckbox]')].filter(x=>x.getClientRects().length && (x.innerText||'').replace(/\\s+/g,'').includes(${JSON.stringify(text)}))[0]`);
const plusBtn = () => rect(`[...document.querySelectorAll('button[aria-label="업로드 및 도구"]')].filter(x=>x.getBoundingClientRect().width>0).pop()`);

await send('Page.enable'); await send('DOM.enable');
await send('Page.navigate', { url: 'https://gemini.google.com/app' }); await sleep(4000);
await send('Page.bringToFront'); await sleep(800);
// 정말 새 채팅인지 (이전 대화가 열려 있으면 '새 채팅' 누르기)
for (let i = 0; i < 3; i++) {
  const n = await ev(`document.querySelectorAll('model-response, user-query').length`);
  if (!n) break;
  await ev(`(()=>{const a=[...document.querySelectorAll('a,button')].find(x=>(x.innerText||'').trim()==='새 채팅' || x.getAttribute('aria-label')==='새 채팅'); if(a) a.click(); return !!a})()`);
  await sleep(3000);
}
if (await ev(`document.querySelectorAll('model-response, user-query').length`)) { console.log('새 채팅을 못 엶'); process.exit(1); }
// 1. 동영상 도구
// 메뉴가 늦게 뜰 수 있으니 뜰 때까지 기다림 (안 뜨면 + 를 다시 누름)
const openMenuAndPick = async text => {
  for (let tries = 0; tries < 4; tries++) {
    const pb = await plusBtn(); if (!pb) { await sleep(1500); continue; }
    await mouse(pb.x, pb.y);
    let m = null;
    for (let i = 0; i < 16 && !m; i++) { await sleep(250); m = await menuItem(text); }
    if (m) { await sleep(500); m = await menuItem(text); await mouse(m.x, m.y); return true; }
    for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sleep(800);
  }
  return false;
};
let p, it;
if (!(await openMenuAndPick('동영상만들기'))) { console.log('동영상 메뉴 없음'); process.exit(1); }
await sleep(1500);
const intro = await rect(`[...document.querySelectorAll('button')].find(b=>b.getClientRects().length && (b.innerText||'').trim()==='사용해 보기')`);
if (intro) { await mouse(intro.x, intro.y); await sleep(1000); }
// 2. 첫 프레임 첨부
await send('Page.setInterceptFileChooserDialog', { enabled: true });
const opened = new Promise(r => listeners.push(d => { if (d.method === 'Page.fileChooserOpened') r(d.params); }));
if (!(await openMenuAndPick('파일업로드'))) { console.log('파일 업로드 메뉴 없음'); process.exit(1); }
const fc = await Promise.race([opened, sleep(8000).then(() => null)]);
if (!fc) { console.log('파일 선택창 안 열림'); process.exit(1); }
await send('DOM.setFileInputFiles', { backendNodeId: fc.backendNodeId, files: [path.resolve(image)] });
await send('Page.setInterceptFileChooserDialog', { enabled: false });
await sleep(4000);
// 3. 프롬프트 + 보내기
await ev(`(()=>{const e=document.querySelector('rich-textarea .ql-editor, div[contenteditable=true]'); e.focus(); return true})()`);
await send('Input.insertText', { text: prompt }); await sleep(600);
for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: type === 'keyDown' ? '\r' : undefined });
console.log('보냄: ' + path.basename(image));
// 4. 영상 기다리기 (용량 초과면 다시 실행) — 이 채팅의 마지막 답에 영상이 생겨야 완성
let ok = false, retries = 0;
for (let i = 0; i < 600 && !ok; i++) {
  await sleep(2000);
  const st = await ev(`(()=>{const r=[...document.querySelectorAll('model-response')].pop(); const v=r && r.querySelector('video'); return {v: !!(v && v.duration>0), t: r? r.innerText.slice(0,200):''}})()`);
  if (st.v) { ok = true; break; }
  if (/full capacity|try again later|용량|나중에 다시/i.test(st.t) && !/generating|만들고 있/i.test(st.t)) {
    if (retries >= 4) { console.log('계속 용량 초과: ' + st.t); process.exit(2); }
    retries++; console.log(`용량 초과 → 2분 뒤 다시 실행 (${retries})`); await sleep(120000);
    await ev(`(()=>{const b=[...document.querySelectorAll('model-response button')].filter(x=>x.getAttribute('aria-label')==='다시 실행').pop(); if(b) b.click(); return !!b})()`);
  }
  if (/한도|limit/i.test(st.t) && !/generating/i.test(st.t)) { console.log('한도: ' + st.t); process.exit(3); }
}
if (!ok) { console.log('영상이 안 나옴'); process.exit(2); }
// 5. 다운로드
const t0 = Date.now();
await ev(`(()=>{const r=[...document.querySelectorAll('model-response')].pop(); const v=r.querySelector('video'); v.scrollIntoView({block:'center'}); const b=[...r.querySelectorAll('button')].filter(b=>/다운로드/.test(b.getAttribute('aria-label')||'')).pop() || [...document.querySelectorAll('button')].filter(b=>/다운로드/.test(b.getAttribute('aria-label')||'')).pop(); b.click(); return true})()`);
// 다운로드가 끝나 파일 크기가 3초 동안 그대로일 때까지 기다린 뒤 복사 (옮기다 사라지던 일 방지)
let got = null, lastSize = -1, stable = 0;
for (let i = 0; i < 120 && !got; i++) {
  await sleep(1000);
  const f = fs.readdirSync(DL).filter(n => /^gemini_generated_video.*\.mp4$/i.test(n)).map(n => { try { const st = fs.statSync(path.join(DL, n)); return { n, t: st.mtimeMs, s: st.size }; } catch (e) { return null; } }).filter(x => x && x.t >= t0 - 1000).sort((a, b) => b.t - a.t)[0];
  if (!f) continue;
  if (f.s > 0 && f.s === lastSize) { if (++stable >= 3) got = f.n; } else { stable = 0; lastSize = f.s; }
}
if (!got) { console.log('다운로드 못 찾음'); process.exit(4); }
// 받은 영상의 첫 장면이 첫 프레임 그림과 닮았는지 확인 (다른 영상을 잘못 받는 일 방지)
const { spawnSync } = await import('node:child_process');
const tmpA = path.join(DL, '__chk_a.png'), tmpB = path.join(DL, '__chk_b.png');
spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', '0.05', '-i', path.join(DL, got), '-frames:v', '1', '-vf', 'scale=192:108,format=gray', tmpA]);
spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.resolve(image), '-vf', 'scale=192:108,format=gray', tmpB]);
const ss = spawnSync('ffmpeg', ['-hide_banner', '-i', tmpA, '-i', tmpB, '-lavfi', 'ssim', '-f', 'null', '-'], { encoding: 'utf8' });
const score = +((/All:([\d.]+)/.exec(ss.stderr || '') || [])[1] || 0);
try { fs.unlinkSync(tmpA); fs.unlinkSync(tmpB); } catch (e) {}
console.log('첫 장면 닮은 정도: ' + score.toFixed(3));
if (score < 0.55) { console.log('첫 장면이 그림과 달라서 저장하지 않음'); fs.renameSync(path.join(DL, got), path.join(DL, 'REJECTED_' + got)); process.exit(5); }
fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
fs.copyFileSync(path.join(DL, got), path.resolve(outFile));
try { fs.unlinkSync(path.join(DL, got)); } catch (e) {}
console.log('저장: ' + outFile);
ws.close();
