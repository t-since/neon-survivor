// 제미나이(띄워 둔 Edge 탭)로 그림 하나 만들기
// node gem.mjs <저장할 파일.png> <프롬프트 파일.txt> [첨부 그림...]
// - 지금 열린 대화에 이어서 요청 (같은 대화 = 그림체 유지)
// - 생성 끝나면 '원본 크기 이미지 다운로드' → 다운로드 폴더에서 찾아 <저장할 파일>로 옮김
import fs from 'node:fs';
import path from 'node:path';
const PORT = 9444;
const [outFile, promptFile, ...attach] = process.argv.slice(2);
const prompt = fs.readFileSync(promptFile, 'utf8').trim();
const DL = path.join(process.env.USERPROFILE, 'Downloads');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
const tab = list.find(t => t.type === 'page' && t.url.includes('gemini.google.com'));
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}; const listeners = [];
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; } listeners.forEach(f => f(d)); };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async code => { const r = await send('Runtime.evaluate', { expression: code, awaitPromise: true, returnByValue: true, userGesture: true }); if (r.result?.exceptionDetails) console.log('JS 오류:', r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result?.result?.value; };

// 탭이 화면에 안 보이면(최소화·다른 탭) 브라우저가 그리기를 멈춰서 메뉴·파일 선택창이 안 됨 → 앞으로 가져옴
await send('Page.bringToFront');
await sleep(800);
const vis = await ev('document.visibilityState');
if (vis !== 'visible') console.log('주의: 제미나이 탭이 화면에 안 보임 (' + vis + ') — Edge 창이 최소화돼 있으면 열어 주세요');
const countImgs = () => ev(`document.querySelectorAll('single-image img, generated-image img').length`);
const before = await countImgs();

// 1. 첨부
if (attach.length) {
  await send('Page.enable'); await send('DOM.enable');
  await send('Page.setInterceptFileChooserDialog', { enabled: true });
  const opened = new Promise(r => listeners.push(d => { if (d.method === 'Page.fileChooserOpened') r(d.params); }));
  const mouse = async (x, y) => { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); };
  const rectOf = code => ev(`(()=>{const e=${code}; if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.x+r.width/2, y:r.y+r.height/2}})()`);
  const plus = await rectOf(`[...document.querySelectorAll('button[aria-label="업로드 및 도구"]')].filter(e=>{const r=e.getBoundingClientRect(); return r.width>0 && r.height>0}).pop()`);
  if (!plus) { console.log('+ 버튼 없음'); process.exit(1); }
  const findItem = () => rectOf(`[...document.querySelectorAll('button, [role=menuitem], .mat-mdc-menu-item')].filter(e=>e.getClientRects().length).find(x=>(x.innerText||'').replace(/\\s+/g,'').includes('파일업로드')||(x.innerText||'').trim()==='파일')`);
  // + 를 누르면 바로 위에 메뉴가 뜸 → 첫 항목 '파일 업로드' 위치(+ 기준)를 누름
  for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(500);
  await mouse(plus.x, plus.y);
  let item = null;
  for (let i = 0; i < 16 && !item; i++) { await sleep(250); item = await findItem(); }
  if (!item) { console.log('파일 업로드 메뉴 없음'); process.exit(1); }
  await sleep(600); // 메뉴 펼침 애니메이션이 끝난 뒤 위치를 다시 읽음
  item = await findItem();
  await mouse(item.x, item.y);
  const p = await Promise.race([opened, sleep(8000).then(() => null)]);
  if (!p) { console.log('파일 선택창이 안 열림'); process.exit(1); }
  await send('DOM.setFileInputFiles', { backendNodeId: p.backendNodeId, files: attach.map(f => path.resolve(f)) });
  await send('Page.setInterceptFileChooserDialog', { enabled: false });
  // 첨부 미리보기가 다 올라올 때까지
  for (let i = 0; i < 40; i++) { await sleep(500); const n = await ev(`document.querySelectorAll('uploader-file-preview, .file-preview-container img, [data-test-id*="file-preview"]').length`); if (n >= attach.length) break; }
  await sleep(1500);
  console.log('첨부 ' + attach.length);
}

// 2. 프롬프트 입력 + 보내기
await ev(`(()=>{const e=document.querySelector('rich-textarea .ql-editor, div[contenteditable=true]'); e.focus(); return true})()`);
await send('Input.insertText', { text: prompt });
await sleep(600);
for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: type === 'keyDown' ? '\r' : undefined });
console.log('보냄, 생성 기다리는 중...');

// 3. 새 그림이 나올 때까지 (최대 4분)
let ok = false;
for (let i = 0; i < 240; i++) {
  await sleep(1000);
  const st = await ev(`(()=>{const im=[...document.querySelectorAll('single-image img, generated-image img')]; const last=im[im.length-1]; return {n:im.length, done: !!(last && last.complete && last.naturalWidth>0)}})()`);
  if (st.n > before && st.done) { ok = true; break; }
  if (i % 30 === 29) {
    const txt = await ev(`(()=>{const r=[...document.querySelectorAll('model-response')].pop(); return r? r.innerText.slice(-200):''})()`);
    if (txt && /한도|limit|할 수 없|can't|cannot|죄송/.test(txt)) { console.log('제미나이 답: ' + txt); process.exit(2); }
  }
}
if (!ok) { const txt = await ev(`(()=>{const r=[...document.querySelectorAll('model-response')].pop(); return r? r.innerText.slice(-300):''})()`); console.log('그림이 안 나옴. 답: ' + txt); process.exit(2); }
await sleep(2000);

// 4. 원본 다운로드 → 옮기기
const t0 = Date.now();
await ev(`(()=>{const b=[...document.querySelectorAll('button[aria-label="원본 크기 이미지 다운로드"]')].pop(); b.click(); return true})()`);
let got = null;
for (let i = 0; i < 90 && !got; i++) {
  await sleep(1000);
  const f = fs.readdirSync(DL).filter(n => /^Gemini_Generated_Image_.*\.(png|jpg|jpeg|webp)$/i.test(n)).map(n => ({ n, t: fs.statSync(path.join(DL, n)).mtimeMs })).filter(x => x.t >= t0 - 1000).sort((a, b) => b.t - a.t)[0];
  if (f) { await sleep(800); got = path.join(DL, f.n); }
}
if (!got) { console.log('다운로드 파일을 못 찾음'); process.exit(3); }
fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
fs.renameSync(got, path.resolve(outFile));
console.log('저장: ' + outFile + ' (' + (fs.statSync(outFile).size / 1048576).toFixed(1) + 'MB)');
ws.close();
