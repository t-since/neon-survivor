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
    let id = 0; const pending = new Map();
    ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } };
    ws.onerror = rej;
    ws.onopen = () => res({
      send: (method, params = {}) => new Promise((r, j) => { const i = ++id; pending.set(i, { res: r, rej: j }); ws.send(JSON.stringify({ id: i, method, params })); }),
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
