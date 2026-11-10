// 제미나이 새 채팅을 '이미지 만들기' 도구 + 지정 비율로 열기
// node gem_newchat.mjs [비율 1:1|16:9|4:3|3:4|9:16]
const PORT = 9444;
const ratio = process.argv[2] || '16:9';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
const tab = list.find(t => t.type === 'page' && t.url.startsWith('https://gemini.google.com'));
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pend = {};
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async code => { const r = await send('Runtime.evaluate', { expression: code, awaitPromise: true, returnByValue: true, userGesture: true }); return r.result?.result?.value; };
const mouse = async (x, y) => { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); };
const rect = code => ev(`(()=>{const e=${code}; if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
const waitRect = async (code, ms = 4000) => { for (let t = 0; t < ms; t += 250) { const r = await rect(code); if (r) return r; await sleep(250); } return null; };

await send('Page.navigate', { url: 'https://gemini.google.com/app' }); await sleep(3500);
await send('Page.bringToFront'); await sleep(600);
if (await ev(`document.querySelectorAll('model-response, user-query').length`)) {
  await ev(`(()=>{const a=[...document.querySelectorAll('a,button')].find(x=>(x.innerText||'').trim()==='새 채팅'); if(a) a.click(); return !!a})()`); await sleep(3000);
}
// 모델: 그림을 그릴 수 있는 Pro 로 (한도 뒤에 Flash-Lite 로 바뀌어 있으면 그림을 못 그림)
const modeBtn = await waitRect(`[...document.querySelectorAll('button')].filter(b=>/모드 선택/.test(b.getAttribute('aria-label')||'') && b.getClientRects().length)[0]`);
if (modeBtn && !(await ev(`[...document.querySelectorAll('button')].some(b=>/현재 Pro 모드/.test(b.getAttribute('aria-label')||''))`))) {
  await mouse(modeBtn.x, modeBtn.y); await sleep(1000);
  const pro = await waitRect(`[...document.querySelectorAll('*')].filter(x=>x.children.length===0 && /^\\d+(\\.\\d+)? Pro$/.test((x.textContent||'').trim()) && x.getClientRects().length)[0]`);
  if (pro) { await mouse(pro.x, pro.y); await sleep(1000); }
  if (!(await ev(`[...document.querySelectorAll('button')].some(b=>/현재 Pro 모드/.test(b.getAttribute('aria-label')||''))`))) { console.log('Pro 모델을 고를 수 없음 (한도일 수 있음)'); process.exit(3); }
}
// 이미지 도구
const plus = await waitRect(`[...document.querySelectorAll('button[aria-label="업로드 및 도구"]')].filter(x=>x.getBoundingClientRect().width>0).pop()`);
await mouse(plus.x, plus.y);
let it = await waitRect(`[...document.querySelectorAll('button,[role=menuitem],[role=menuitemcheckbox]')].filter(x=>x.getClientRects().length && /이미지 만들기/.test(x.innerText||''))[0]`);
await sleep(500); it = await rect(`[...document.querySelectorAll('button,[role=menuitem],[role=menuitemcheckbox]')].filter(x=>x.getClientRects().length && /이미지 만들기/.test(x.innerText||''))[0]`);
await mouse(it.x, it.y); await sleep(1500);
// 비율
const ar = await waitRect(`[...document.querySelectorAll('button')].filter(b=>/가로세로/.test((b.getAttribute('aria-label')||'') + (b.innerText||'')) && b.getClientRects().length)[0]`);
await mouse(ar.x, ar.y); await sleep(1000);
const opt = await waitRect(`[...document.querySelectorAll('*')].filter(x=>x.children.length===0 && (x.textContent||'').trim()===${JSON.stringify(ratio)} && x.getClientRects().length)[0]`);
if (opt) { await sleep(400); const o2 = await rect(`[...document.querySelectorAll('*')].filter(x=>x.children.length===0 && (x.textContent||'').trim()===${JSON.stringify(ratio)} && x.getClientRects().length)[0]`); await mouse(o2.x, o2.y); await sleep(800); }
console.log(await ev(`[...document.querySelectorAll('button')].filter(b=>/가로세로|모드 선택/.test(b.getAttribute('aria-label')||'')).map(b=>b.getAttribute('aria-label')).join(' | ')`));
ws.close();
