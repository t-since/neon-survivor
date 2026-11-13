// 제미나이 전용 크롬(127.0.0.1:9222)을 조작하는 작은 도구 (Node 24 내장 WebSocket 사용)
// 사용법:
//   node cdp.mjs tabs
//   node cdp.mjs shot <out.png> [urlPart]
//   node cdp.mjs eval "<js expression>" [urlPart]
//   node cdp.mjs evalfile <file.js> [urlPart]
//   node cdp.mjs type "<text>" [urlPart]          (현재 포커스된 입력칸에 글자 넣기)
//   node cdp.mjs upload "<css selector>" <file1> [file2...]   (gemini 탭의 파일 입력에 파일 넣기)
//   node cdp.mjs key Enter [urlPart]
import fs from 'node:fs';
import path from 'node:path';
const require_path_resolve = f => path.resolve(f);
const BASE = 'http://127.0.0.1:9222';
const [cmd, ...args] = process.argv.slice(2);

async function pickTab(part = 'gemini.google.com') {
  const tabs = await (await fetch(BASE + '/json')).json();
  const pages = tabs.filter(t => t.type === 'page');
  const hit = pages.find(t => t.url.includes(part));
  if (hit) return hit;
  // 제미나이 탭이 없으면 다른 탭(ChatGPT 등)을 건드리지 않고 새 탭을 엶
  const nt = await (await fetch(BASE + '/json/new?https://' + part + '/app', { method: 'PUT' })).json();
  await new Promise(r => setTimeout(r, 6000));
  return nt;
}
function connect(wsUrl) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(wsUrl);
    let id = 0; const pending = new Map(); const waiters = [];
    ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } else if (m.method) { for (let k = waiters.length - 1; k >= 0; k--) if (waiters[k].method === m.method) { waiters[k].res(m.params); waiters.splice(k, 1); } } };
    ws.onerror = rej;
    ws.onopen = () => res({
      send: (method, params = {}) => new Promise((r, j) => { const i = ++id; pending.set(i, { res: r, rej: j }); ws.send(JSON.stringify({ id: i, method, params })); }),
      waitEvent: (method, ms = 10000) => new Promise((r, j) => { const w = { method, res: r }; waiters.push(w); setTimeout(() => j(new Error('timeout ' + method)), ms); }),
      close: () => ws.close()
    });
  });
}
async function evalIn(c, expr) {
  const r = await c.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}

if (cmd === 'tabs') {
  const tabs = await (await fetch(BASE + '/json')).json();
  console.log(tabs.filter(t => t.type === 'page').map(t => `${t.id}  ${t.title}  ${t.url}`).join('\n'));
  process.exit(0);
}
const urlPartArg = { shot: args[1], eval: args[1], evalfile: args[1], type: args[1], key: args[1] }[cmd];
const tab = await pickTab(urlPartArg);
const c = await connect(tab.webSocketDebuggerUrl);
try {
  if (cmd === 'shot') {
    const r = await c.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(args[0], Buffer.from(r.data, 'base64'));
    console.log('saved', args[0], tab.url);
  } else if (cmd === 'eval') {
    console.log(JSON.stringify(await evalIn(c, args[0]), null, 1));
  } else if (cmd === 'evalfile') {
    console.log(JSON.stringify(await evalIn(c, fs.readFileSync(args[0], 'utf8')), null, 1));
  } else if (cmd === 'type') {
    await c.send('Input.insertText', { text: args[0] });
    console.log('typed');
  } else if (cmd === 'key') {
    const key = args[0];
    const code = key === 'Enter' ? 13 : 0;
    await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: code, text: key === 'Enter' ? '\r' : undefined });
    await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: code });
    console.log('key', key);
  } else if (cmd === 'choose') {
    // 사람처럼 '업로드 및 도구' → '파일 업로드' 를 누르고, 뜨는 파일 선택 창에 파일을 넣음 (2026-11-13: 그림 올리는 칸이 메뉴를 눌러야만 생김)
    const files = args.map(f => require_path_resolve(f));
    await c.send('Page.enable'); await c.send('DOM.enable');
    await c.send('Page.setInterceptFileChooserDialog', { enabled: true });
    const opened = c.waitEvent('Page.fileChooserOpened', 10000);
    const rect = await evalIn(c, "(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms)); document.querySelector('button[aria-label=\"업로드 및 도구\"]').click(); await w(900); const it=[...document.querySelectorAll('[role=menuitem], button, mat-list-item, [role=option]')].find(b=>(b.innerText||'').trim()==='파일 업로드'); if(!it) throw new Error('파일 업로드 메뉴 없음'); const r=it.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2}})()");
    // 실제 마우스 클릭 (프로그램 클릭은 파일 창을 못 엶)
    for (const type of ['mousePressed', 'mouseReleased']) await c.send('Input.dispatchMouseEvent', { type, x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
    const ev = await opened;
    await c.send('DOM.setFileInputFiles', { files, backendNodeId: ev.backendNodeId });
    await c.send('Page.setInterceptFileChooserDialog', { enabled: false });
    console.log('chosen', files.length);
  } else if (cmd === 'drop') {
    // 그림 파일을 입력칸에 끌어다 놓기 (11-13: 메뉴·파일 창 방식이 안 될 때)
    const files = args.map(f => require_path_resolve(f));
    const r = await evalIn(c, "(()=>{const e=document.querySelector('rich-textarea')||document.querySelector('div[contenteditable=true]'); const b=e.getBoundingClientRect(); return {x:b.left+b.width/2, y:b.top+b.height/2}})()");
    const data = { items: [], files, dragOperationsMask: 1 };
    for (const type of ['dragEnter', 'dragOver', 'drop']) { await c.send('Input.dispatchDragEvent', { type, x: r.x, y: r.y, data }); await new Promise(z => setTimeout(z, 300)); }
    console.log('dropped', files.length);
  } else if (cmd === 'upload') {
    const [selector, ...files] = args;
    await c.send('DOM.enable');
    const doc = await c.send('DOM.getDocument', { depth: -1, pierce: true });
    const q = await c.send('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector });
    if (!q.nodeIds.length) throw new Error('no element for ' + selector);
    await c.send('DOM.setFileInputFiles', { nodeId: q.nodeIds[q.nodeIds.length - 1], files });
    console.log('uploaded', files.length);
  } else {
    console.log('unknown command');
  }
} finally { c.close(); }
