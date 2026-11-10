// Flow 에이전트에게 '이 그림을 첫 프레임으로 영상 2개' 요청 → 확인 창의 '승인' 누르기
// node flow_gen.mjs <에셋 이름 예: op_02.jpg> <프롬프트 파일>
import fs from 'node:fs';
const PORT = 9444;
const [asset, promptFile] = process.argv.slice(2);
const prompt = fs.readFileSync(promptFile, 'utf8').trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
const tab = list.find(t => t.type === 'page' && t.url.includes('flow.google.com'));
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pend = {};
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async code => { const r = await send('Runtime.evaluate', { expression: code, awaitPromise: true, returnByValue: true, userGesture: true }); if (r.result?.exceptionDetails) console.log('JS 오류', r.result.exceptionDetails.text); return r.result?.result?.value; };
const mouse = async (x, y) => { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); };
const rectByText = (sel, text) => ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(sel)})].filter(x=>x.getClientRects().length && (x.innerText||'').replace(/\\s+/g,' ').trim().includes(${JSON.stringify(text)})).pop(); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
const rectByLabel = label => ev(`(()=>{const e=[...document.querySelectorAll('button')].filter(x=>x.getClientRects().length && x.getAttribute('aria-label')===${JSON.stringify(label)}).pop(); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);

await send('Page.bringToFront'); await sleep(800);
// 1. 첨부: 오른쪽 입력창의 + → 에셋 고르기 → 프롬프트에 추가 (--attached 면 이미 첨부된 것으로 보고 건너뜀)
const SKIP_ATTACH = process.argv.includes('--attached');
if (!SKIP_ATTACH) {
let plus = await rectByLabel('프롬프트 상자에 소재 추가');
if (!plus) { // 화면에 따라 이름이 다를 수 있음: 오른쪽 아래 + 위치
  plus = { x: 949, y: 901 };
}
await mouse(plus.x, plus.y); await sleep(1500);
// 목록이 길면 화면 밖으로 밀리므로 검색칸에 이름 입력
// 왼쪽 분류에서 '이미지'만 보이게 (검색은 이름으로 안 찾아짐)
const cat = await ev(`(()=>{const e=[...document.querySelectorAll('*')].filter(x=>x.children.length===0 && (x.textContent||'').trim()==='이미지' && x.getClientRects().length).map(x=>({r:x.getBoundingClientRect()})).filter(o=>o.r.x>480 && o.r.x<700)[0]; if(!e) return null; return {x:e.r.x+e.r.width/2,y:e.r.y+e.r.height/2}})()`);
if (cat) { await mouse(cat.x, cat.y); await sleep(1500); }
// 선택 창 목록(오른쪽, x>400)에서 이름이 같은 항목 → 화면 밖이면 스크롤해서 보이게
const findIt = `[...document.querySelectorAll('span, div')].filter(x=>x.children.length===0 && (x.textContent||'').trim()===${JSON.stringify(asset)}).map(x=>({x, r:x.getBoundingClientRect()})).filter(o=>o.r.width>0 && o.r.x>400)[0]`;
// 목록은 스크롤해야 아래 항목을 더 불러옴 → 찾을 때까지 목록을 내림
for (let tries = 0; tries < 15; tries++) {
  const found = await ev(`(()=>{const o=${findIt}; if(o){ o.x.scrollIntoView({block:'center'}); return true }
    const any=[...document.querySelectorAll('span, div')].filter(x=>x.children.length===0 && /\\.(jpg|png)$/.test((x.textContent||'').trim()) && x.getBoundingClientRect().x>700).pop();
    let p=any; while(p && p!==document.body){ if(p.scrollHeight>p.clientHeight+10 && getComputedStyle(p).overflowY!=='visible') break; p=p.parentElement }
    if(p && p!==document.body){ p.scrollTop += 600; } else if(any) any.scrollIntoView({block:'end'});
    return false})()`);
  await sleep(found ? 700 : 900);
  if (found) break;
}
const it = await ev(`(()=>{const e=${findIt}; if(!e || e.r.y<0 || e.r.y>innerHeight) return null; return {x:e.r.x+e.r.width/2, y:e.r.y+e.r.height/2}})()`);
if (!it) { console.log('에셋 못 찾음: ' + asset); process.exit(1); }
await mouse(it.x, it.y); await sleep(800);
const add = await rectByText('button', '프롬프트에 추가');
if (add) { await mouse(add.x, add.y); await sleep(1200); } // 없으면 항목을 누를 때 바로 첨부된 것
else await sleep(800);
}
// 확인 창이 새로 생겼는지: '크레딧을 사용하여' 문구 개수로 판단
const countApprove = () => ev(`[...document.querySelectorAll('*')].filter(x=>x.children.length===0 && /크레딧을 사용하여/.test(x.textContent||'')).length`);
const before = await countApprove();
// 2. 입력 + 보내기
const box = await ev(`(()=>{const e=[...document.querySelectorAll('textarea, [contenteditable=true]')].filter(x=>x.getClientRects().length).pop(); if(!e) return null; e.focus(); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
if (box) await mouse(box.x, box.y);
await send('Input.insertText', { text: prompt });
await sleep(600);
for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: type === 'keyDown' ? '\r' : undefined });
console.log('요청 보냄: ' + asset);
// 3. 확인 창의 '승인' (항상 승인 아님). 48크레딧(2개)일 때만 승인, 다르면 멈춤
const countSched = () => ev(`[...document.querySelectorAll('*')].filter(x=>x.children.length===0 && /scheduled|queue|생성 중|시작했|시작되|대기열|처리 중/i.test(x.textContent||'')).length`);
const sched0 = await countSched();
let appeared = false;
for (let i = 0; i < 90 && !appeared; i++) { await sleep(1000); appeared = (await countApprove()) > before; }
if (!appeared) { console.log('확인 창이 안 나옴'); process.exit(2); }
await sleep(2500); // 대화창 자동 스크롤이 멈출 때까지
const cost = await ev(`(()=>{const t=[...document.querySelectorAll('*')].filter(x=>x.children.length===0 && /크레딧을 사용하여/.test(x.textContent||'')).pop(); return t? t.textContent.trim():''})()`);
console.log('확인 창: ' + cost);
const EXPECT = (process.argv.find(a => a.startsWith('--cost=')) || '--cost=48').slice(7);
if (!cost.startsWith(EXPECT + ' 크레딧')) { console.log(`예상(${EXPECT}크레딧)과 달라서 승인하지 않고 멈춤`); process.exit(3); }
let ok = false;
for (let tries = 0; tries < 3 && !ok; tries++) {
  // '승인' 글자(선택지)는 왼쪽, 내가 보낸 '승인' 말풍선은 오른쪽 → 왼쪽에 있는 것 중 가장 아래
  const findOpt = `(()=>{const e=[...document.querySelectorAll('*')].filter(x=>x.children.length===0 && (x.textContent||'').trim()==='승인' && x.getClientRects().length).map(x=>({x, r:x.getBoundingClientRect()})).filter(o=>o.r.x<1100).sort((a,b)=>a.r.y-b.r.y).pop(); if(!e) return null; return e;})()`;
  const r = await ev(`(()=>{const o=${findOpt}; if(!o) return null; o.x.scrollIntoView({block:'center'}); return true})()`);
  if (!r) break;
  await sleep(700);
  const r2 = await ev(`(()=>{const o=${findOpt}; return {x:o.r.x+o.r.width/2, y:o.r.y+o.r.height/2}})()`);
  await mouse(r2.x, r2.y);
  for (let i = 0; i < 20 && !ok; i++) { await sleep(1000); ok = (await countSched()) > sched0; }
}
console.log(ok ? '승인함 (대기열에 들어감)' : '승인 확인 안 됨');
ws.close();
