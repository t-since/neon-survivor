// ChatGPT 탭에 그림 요청 (CDP 포트: CDP_PORT, 기본 9222): node tools/browser/gpt.mjs <저장.png> <프롬프트.txt> [첨부...] — 무료는 하루 약 3장
import fs from 'node:fs'; import path from 'node:path';
const [outFile, promptFile, ...attach] = process.argv.slice(2);
const prompt = fs.readFileSync(promptFile, 'utf8').trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const list = await (await fetch(`http://127.0.0.1:${process.env.CDP_PORT || 9222}/json`)).json();
const tab = list.find(t => t.type === 'page' && t.url.includes('chatgpt.com'));
if (!tab) { console.log('ChatGPT 탭 없음'); process.exit(1); }
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async code => { const r = await send('Runtime.evaluate', { expression: code, awaitPromise: true, returnByValue: true, userGesture: true }); if (r.result?.exceptionDetails) console.log('JS 오류', r.result.exceptionDetails.exception?.description); return r.result?.result?.value; };
await send('Page.bringToFront'); await sleep(500);
const imgCount = `[...document.querySelectorAll('img')].filter(i=>i.naturalWidth>500 && !i.src.startsWith('data:') && !i.closest('form')).length`;
const before = await ev(imgCount);
if (attach.length) {
  await send('DOM.enable');
  const doc = await send('DOM.getDocument', { depth: -1, pierce: true });
  const q = await send('DOM.querySelectorAll', { nodeId: doc.result.root.nodeId, selector: 'input[type=file]' });
  const ids = q.result.nodeIds; if (!ids.length) { console.log('파일 입력 없음'); process.exit(1); }
  // 이미지 받는 입력 고르기
  let target = ids[0];
  for (const nid of ids) { const a = await send('DOM.getAttributes', { nodeId: nid }); const at = a.result.attributes; const acc = at[at.indexOf('accept') + 1] || ''; if (at.includes('accept') && /image/.test(acc) || !at.includes('accept')) { target = nid; } }
  await send('DOM.setFileInputFiles', { nodeId: target, files: attach.map(f => path.resolve(f)) });
  for (let i = 0; i < 30; i++) { await sleep(500); const n = await ev(`document.querySelectorAll('form img, [data-testid*=attachment] img').length`); if (n >= attach.length) break; }
  await sleep(2500); console.log('첨부', attach.length);
}
await ev(`(()=>{const e=document.querySelector('.ProseMirror, #prompt-textarea'); e.focus(); return 1})()`);
await send('Input.insertText', { text: prompt }); await sleep(800);
const sent = await ev(`(()=>{const b=document.querySelector('[data-testid=send-button], #composer-submit-button, button[aria-label="보내기"]'); if(b && !b.disabled){b.click(); return 'ok'} return 'no'})()`);
console.log('보냄', sent);
let ok = false;
for (let i = 0; i < 300; i++) {
  await sleep(2000);
  const st = await ev(`(()=>{const ims=[...document.querySelectorAll('img')].filter(i=>i.naturalWidth>500 && !i.src.startsWith('data:') && !i.closest('form')); const stop=!!document.querySelector('[data-testid=stop-button], button[aria-label*="중지"]'); return {n:ims.length, stop}})()`);
  if (st.n > before && !st.stop) { ok = true; break; }
  if (i % 30 === 29) { const t = await ev(`(()=>{const m=[...document.querySelectorAll('[data-message-author-role=assistant]')].pop(); return m? m.innerText.slice(-300):''})()`); console.log('...', t.replace(/\s+/g,' ').slice(-150)); if (/limit|한도|제한|can't|cannot|죄송/.test(t) && !st.stop) { console.log('답:', t); process.exit(2); } }
}
if (!ok) { console.log('그림 안 나옴'); process.exit(2); }
await sleep(3000);
const data = await ev(`(async()=>{const ims=[...document.querySelectorAll('img')].filter(i=>i.naturalWidth>500 && !i.src.startsWith('data:') && !i.closest('form')); const im=ims[ims.length-1]; const r=await fetch(im.src,{credentials:'include'}); const b=await r.blob(); return await new Promise(res=>{const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.readAsDataURL(b);})})()`);
fs.writeFileSync(outFile, Buffer.from(data.split(',')[1], 'base64'));
console.log('저장', outFile, (fs.statSync(outFile).size/1048576).toFixed(1)+'MB'); ws.close();
