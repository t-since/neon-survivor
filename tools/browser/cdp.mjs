// 띄워 둔 Edge(포트 9444)의 탭을 조종
// node cdp.mjs <탭 주소 일부> <명령> [인자...]
//   tabs                         탭 목록
//   shot <파일.png>              화면 캡처
//   eval <js | @파일.js>         JS 실행 (Promise 기다림), 결과 출력
//   type <글자>                  지금 포커스된 곳에 글자 입력
//   key <Enter|Escape|...>       키 누르기
//   click <x> <y>                좌표 클릭
//   upload <css 선택자> <파일...> 파일 선택창 input 에 파일 넣기
//   nav <url>                    이동
//   new <url>                    새 탭
import fs from 'node:fs';
const PORT = 9444;
const [match, cmd, ...args] = process.argv.slice(2);
const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
if (match === 'tabs') { list.filter(t => t.type === 'page').forEach(t => console.log(t.id, '|', t.title, '|', t.url)); process.exit(0); }
if (cmd === 'new') { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(args[0])}`, { method: 'PUT' }); console.log(await r.text()); process.exit(0); }
const tab = list.find(t => t.type === 'page' && (t.url.includes(match) || t.id === match));
if (!tab) { console.log('탭 없음: ' + match); process.exit(1); }
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pend = {};
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

if (cmd === 'front') {
  await send('Page.bringToFront'); await sleep(800);
  const r = await send('Runtime.evaluate', { expression: 'document.visibilityState', returnByValue: true });
  console.log('front: ' + r.result.result.value);
} else if (cmd === 'shot') {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(args[0], Buffer.from(r.result.data, 'base64')); console.log('saved ' + args[0]);
} else if (cmd === 'eval') {
  const code = args[0].startsWith('@') ? fs.readFileSync(args[0].slice(1), 'utf8') : args.join(' ');
  const r = await send('Runtime.evaluate', { expression: code, awaitPromise: true, returnByValue: true, userGesture: true });
  if (r.result.exceptionDetails) console.log('ERROR', JSON.stringify(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text));
  else { const v = r.result.result.value; console.log(typeof v === 'string' ? v : JSON.stringify(v, null, 1)); }
} else if (cmd === 'type') {
  await send('Input.insertText', { text: args.join(' ') }); console.log('typed');
} else if (cmd === 'key') {
  const k = args[0]; const vk = { Enter: 13, Escape: 27, Tab: 9, Backspace: 8 }[k] || 0;
  for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code: k, windowsVirtualKeyCode: vk, text: k === 'Enter' && type === 'keyDown' ? '\r' : undefined });
  console.log('key ' + k);
} else if (cmd === 'click') {
  const x = +args[0], y = +args[1];
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  console.log('clicked', x, y);
} else if (cmd === 'upload') {
  const [sel, ...files] = args;
  await send('DOM.enable');
  const doc = await send('DOM.getDocument', { depth: -1, pierce: true });
  const q = await send('DOM.querySelectorAll', { nodeId: doc.result.root.nodeId, selector: sel });
  const ids = q.result?.nodeIds || [];
  if (!ids.length) { console.log('input 없음: ' + sel); } else {
    const r = await send('DOM.setFileInputFiles', { nodeId: ids[ids.length - 1], files });
    console.log(r.error ? 'ERROR ' + JSON.stringify(r.error) : `uploaded ${files.length} file(s) to ${sel} (inputs=${ids.length})`);
  }
} else if (cmd === 'choose') {
  // 파일 선택창을 가로채서 파일 넣기: choose <x> <y> <파일...>  (x,y 를 클릭하면 선택창이 열리는 버튼)
  //   또는 choose sel:<css> <파일...> (그 요소를 JS 로 클릭)
  const files = args[0].startsWith('sel:') ? args.slice(1) : args.slice(2);
  await send('Page.enable');
  await send('DOM.enable');
  await send('Page.setInterceptFileChooserDialog', { enabled: true });
  const opened = new Promise(r => { const prev = ws.onmessage; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.method === 'Page.fileChooserOpened') r(d.params); prev(m); }; });
  if (args[0].startsWith('sel:')) {
    await send('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(args[0].slice(4))}).click()`, userGesture: true });
  } else {
    const x = +args[0], y = +args[1];
    for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  }
  const p = await Promise.race([opened, sleep(6000).then(() => null)]);
  if (!p) console.log('선택창이 안 열림');
  else { const r = await send('DOM.setFileInputFiles', { backendNodeId: p.backendNodeId, files }); console.log(r.error ? 'ERROR ' + JSON.stringify(r.error) : 'chosen ' + files.length + ' file(s)'); }
  await send('Page.setInterceptFileChooserDialog', { enabled: false });
} else if (cmd === 'dldir') {
  // 이 브라우저의 다운로드 폴더 지정 (브라우저 전체)
  const ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
  const bws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise(r => bws.onopen = r);
  const r = await new Promise(res => { bws.onmessage = m => res(JSON.parse(m.data)); bws.send(JSON.stringify({ id: 1, method: 'Browser.setDownloadBehavior', params: { behavior: 'allow', downloadPath: args[0], eventsEnabled: true } })); });
  console.log(r.error ? 'ERROR ' + JSON.stringify(r.error) : 'download dir = ' + args[0]);
  bws.close();
} else if (cmd === 'nav') {
  await send('Page.navigate', { url: args[0] }); await sleep(3000); console.log('nav ok');
} else console.log('명령?');
ws.close();
