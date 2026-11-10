// 게임 플레이 녹화 (트레일러용): 화면 없는 크롬으로 게임을 1920x1080으로 띄워 장면을 연출하고 녹화
// node tools/cinema/record_gameplay.mjs <장면 이름> [초=12]
//   장면: combat(무공 전부 + 적 떼) · boss(혈마교주 보스전) · levelup(초월 카드 화면)
// 결과: cinema_src/gameplay/<장면>.mp4 (30fps)
// 게임 서버가 http://localhost:8781 에 떠 있어야 함
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../..');
const scene = process.argv[2] || 'combat';
const SEC = +process.argv[3] || 12;
const W = 1920, H = 1080, FPS = 30;
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => fs.existsSync(p));
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'rec-'));
const port = 9555;
const proc = spawn(chrome, ['--headless=new', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch (e) {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}; const frames = [];
const framesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'frames-'));
let recording = false;
ws.onmessage = m => {
  const d = JSON.parse(m.data);
  if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; }
  if (d.method === 'Page.screencastFrame') {
    if (recording) {
      const f = path.join(framesDir, `f${String(frames.length).padStart(5, '0')}.jpg`);
      fs.writeFileSync(f, Buffer.from(d.params.data, 'base64'));
      frames.push({ f, t: d.params.metadata.timestamp });
    }
    ws.send(JSON.stringify({ id: ++id, method: 'Page.screencastFrameAck', params: { sessionId: d.params.sessionId } }));
  }
};
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async code => { const r = await send('Runtime.evaluate', { expression: code, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) console.log('JS 오류', r.result.exceptionDetails.exception?.description); return r.result?.result?.value; };

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://localhost:8781/?debug=1' });
await sleep(5000);

// 공통: 테스트 버튼 숨기기, 레벨업·상자 창 자동 고르기, 무적
const COMMON = `
  document.querySelectorAll('#cheatBtn, #pixelModeBtn, .debug-only').forEach(e => e.style.display = 'none');
  setInterval(() => {
    const lm = document.getElementById('levelUpModal');
    if (window.__autoPick !== false && lm && lm.style.display === 'flex') { const c = lm.querySelector('.skill-card, button'); if (c) c.click(); }
    const tm = document.getElementById('treasureModal');
    if (tm && tm.style.display === 'flex') document.getElementById('closeTreasureBtn').click();
  }, 250);
  if (!state.isGodMode) cheatToggleGod();
`;
// 서진을 천천히 원을 그리며 움직이게
const MOVE = `
  (() => { const dirs = [['ArrowRight'], ['ArrowRight','ArrowDown'], ['ArrowDown'], ['ArrowLeft','ArrowDown'], ['ArrowLeft'], ['ArrowLeft','ArrowUp'], ['ArrowUp'], ['ArrowRight','ArrowUp']]; let i = 0;
    setInterval(() => { ['ArrowRight','ArrowLeft','ArrowUp','ArrowDown'].forEach(k => keys[k] = false); dirs[i++ % dirs.length].forEach(k => keys[k] = true); }, 900); })();
`;
const SCENES = {
  combat: `unlockedSectors=[1,2,3,4,5]; selectSector(3); confirmStartGame(); ${COMMON}
    cheatMaxAll(); transitionToNextZone(); ${MOVE}
    setInterval(() => { if (enemies.length < 90) spawnEnemySwarm(40); }, 1200); 'ok'`,
  boss: `unlockedSectors=[1,2,3,4,5]; selectSector(5); confirmStartGame(); ${COMMON}
    cheatMaxAll(); player.atkMultiplier = 1.2; ${MOVE}
    setTimeout(() => { spawnSectorBoss(SECTOR_DEFS[4].bossName);
      // 보스를 서진 근처로 데려와 화면 안에서 싸우게
      setTimeout(() => { const b = enemies.find(e => e.isBoss) || state.boss; if (b) { b.x = player.x + 260; b.y = player.y - 40; } }, 300);
      setInterval(() => { const b = enemies.find(e => e.isBoss) || state.boss; if (b && Math.hypot(b.x - player.x, b.y - player.y) > 420) { b.x = player.x + 240; b.y = player.y; } }, 1500);
    }, 1500); 'ok'`,
  levelup: `unlockedSectors=[1,2,3,4,5]; selectSector(1); confirmStartGame(); ${COMMON}
    window.__autoPick = false; spawnEnemySwarm(30); setTimeout(() => { cheatLevelUp(1); }, 2500); 'ok'`
};
console.log('장면 준비:', await ev(SCENES[scene]));
await sleep(scene === 'levelup' ? 1500 : 8000); // 무공·적이 화면에 차고 첫 레벨업 창들이 지나갈 때까지
await send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
recording = true;
console.log(`녹화 ${SEC}초...`);
await sleep(SEC * 1000);
recording = false;
await send('Page.stopScreencast');
ws.close(); proc.kill();

// 프레임 시각 그대로 이어 붙여 30fps 영상으로
if (frames.length < 2) { console.log('프레임 없음'); process.exit(1); }
const list = frames.map((fr, i) => {
  const dur = i + 1 < frames.length ? Math.max(0.001, frames[i + 1].t - fr.t) : 1 / FPS;
  return `file '${fr.f.replace(/\\/g, '/')}'\nduration ${dur.toFixed(4)}`;
}).join('\n') + `\nfile '${frames[frames.length - 1].f.replace(/\\/g, '/')}'\n`;
const listFile = path.join(framesDir, 'list.txt');
fs.writeFileSync(listFile, list);
const outDir = path.join(ROOT, 'cinema_src', 'gameplay');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, scene + '.mp4');
const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-vf', `fps=${FPS},scale=${W}:${H}`, '-c:v', 'libx264', '-crf', '16', '-pix_fmt', 'yuv420p', out], { encoding: 'utf8' });
if (r.status !== 0) { console.log(r.stderr); process.exit(1); }
const span = frames[frames.length - 1].t - frames[0].t;
console.log(`완성: cinema_src/gameplay/${scene}.mp4 (프레임 ${frames.length}개, ${span.toFixed(1)}초, 평균 ${(frames.length / span).toFixed(0)}fps)`);
fs.rmSync(framesDir, { recursive: true, force: true });
