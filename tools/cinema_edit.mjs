// =====================================================================
// 시네마틱 편집기: Flow 클립 → 완성 영상 한 편 (assets/cinema/<이름>.mp4) + 자막 시간표 (<이름>.json)
//
//   node tools/cinema_edit.mjs opening           (tools/cinema/opening.json 편집표를 읽음)
//   node tools/cinema_edit.mjs opening --fast    (빠른 확인용: 낮은 화질로 빨리)
//
// 편집표(tools/cinema/<이름>.json)의 컷마다:
//   src   : 클립 파일 (cinema_src/<이름>/op_01.mp4 등). 없으면 fallback 그림으로 천천히 확대하는 임시 영상
//   in    : 클립에서 쓸 시작 시각(초), dur: 이 컷 길이(초)
//   trans : 앞 컷에서 넘어오는 방식 'fade'(겹쳐 바뀜) · 'black'(검게 됐다 밝아짐) · 'cut'(바로), transDur: 겹치는 시간
//   speed : 0.8 이면 느리게 (슬로모션)
//   title : 화면 가운데 큰 글씨 {text, sub, at, dur}
//   sub   : 자막 {who, text, at, end} — 영상에 굽지 않고 게임이 띄움 (나중에 글만 고치기 쉽게)
//   sfx   : [{file, at, vol}] 효과음 (컷 시작 기준 초)
// 전체: music {file, at, vol, fadeIn, fadeOut}, grade (모든 컷에 같은 색 보정)
// 클립 원래 소리는 쓰지 않음 (음악·효과음만)
// =====================================================================
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const name = process.argv[2];
const FAST = process.argv.includes('--fast');
if (!name) { console.log('사용법: node tools/cinema_edit.mjs <이름> [--fast]'); process.exit(1); }
const edl = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/cinema', name + '.json'), 'utf8'));
const W = edl.size?.[0] || 1920, H = edl.size?.[1] || 1080, FPS = edl.fps || 30;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cinema-'));
const FONT_TITLE = 'C:/Windows/Fonts/HANBatangB.ttf';
const FONT_SUB = 'C:/Windows/Fonts/malgunbd.ttf';
fs.copyFileSync(FONT_TITLE, path.join(tmp, 'title.ttf'));
fs.copyFileSync(FONT_SUB, path.join(tmp, 'sub.ttf'));

function ff(args, label) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { cwd: tmp, encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) { console.error(`ffmpeg 실패 (${label}):\n` + r.stderr); process.exit(1); }
}
const abs = p => path.isAbsolute(p) ? p : path.join(ROOT, p);
const exists = p => p && fs.existsSync(abs(p));
const grade = edl.grade || 'null';
const crfSeg = FAST ? 28 : 15, presetSeg = FAST ? 'ultrafast' : 'medium';

// ---------- 1. 컷마다 같은 크기·속도의 영상 조각 만들기 ----------
const shots = edl.shots;
shots.forEach((s, i) => {
  const out = `seg${i}.mp4`;
  const vf = [];
  let input;
  if (s.blank) {
    // 검은 화면 (글자만 올리는 컷)
    input = ['-f', 'lavfi', '-t', String(s.dur), '-i', `color=c=${s.blank === true ? 'black' : s.blank}:s=${W}x${H}:r=${FPS}`];
    vf.push('setsar=1');
    console.log(`[${s.id}] 검은 화면`);
  } else if (exists(s.src)) {
    const sp = s.speed || 1;
    input = ['-ss', String(s.in || 0), '-t', String(s.dur * sp + 0.1), '-i', abs(s.src)];
    vf.push(`setpts=PTS/${sp}`, `scale=${W}:${H}:force_original_aspect_ratio=increase`, `crop=${W}:${H}`, `fps=${FPS}`, 'setsar=1');
    console.log(`[${s.id}] 클립 ${s.src}`);
  } else {
    // 임시: 그림을 천천히 확대·이동 (from/to = [가로%, 세로%, 확대])
    const fb = s.fallback || {};
    const img = abs(fb.img || 'assets/title_bg.jpg');
    const [x0, y0, z0] = fb.from || [50, 50, 1.15], [x1, y1, z1] = fb.to || fb.from || [50, 50, 1.0];
    const N = Math.round(s.dur * FPS);
    const e = `((1-cos(PI*on/${N}))/2)`; // 부드럽게 시작·끝
    const z = `(${z0}+(${z1}-${z0})*${e})`;
    const cx = `(${x0}+(${x1}-${x0})*${e})/100`, cy = `(${y0}+(${y1}-${y0})*${e})/100`;
    input = ['-loop', '1', '-framerate', String(FPS), '-t', String(s.dur), '-i', img];
    vf.push(`scale=${W * 3}:${H * 3}:force_original_aspect_ratio=increase`, `crop=${W * 3}:${H * 3}`,
      `zoompan=z='${z}':x='clip(iw*${cx}-iw/zoom/2,0,iw-iw/zoom)':y='clip(ih*${cy}-ih/zoom/2,0,ih-ih/zoom)':d=1:s=${W}x${H}:fps=${FPS}`, 'setsar=1');
    if (fb.vf) vf.push(fb.vf);
    console.log(`[${s.id}] 클립 없음 → 임시 그림 (${s.src || '-'} 에 클립을 넣으면 교체)`);
  }
  vf.push(grade);
  if (s.title) {
    const t = s.title, a = t.at || 0.5, d = t.dur || (s.dur - a - 0.5), fi = 0.8, fo = 0.8;
    const alpha = `if(lt(t,${a}),0,if(lt(t,${a + fi}),(t-${a})/${fi},if(lt(t,${a + d - fo}),1,max(0,(${a + d}-t)/${fo}))))`;
    // y: 제목 중심 높이(화면 비율, 기본 0.47). ink: 밝은 배경용 먹색 글씨
    const cy = Math.round(H * (t.y ?? 0.47));
    const cx = Math.round(W * (t.x ?? 0.5)); // x: 제목 중심 가로 위치(화면 비율)
    const ink = !!t.ink;
    const main = ink ? 'fontcolor=0x14161C:borderw=3:bordercolor=0xF5F1E6@0.55:shadowcolor=0xFFFFFF@0.35:shadowx=0:shadowy=0'
      : 'fontcolor=0xF8F1E0:shadowcolor=0x000000@0.7:shadowx=0:shadowy=4:borderw=2:bordercolor=0x000000@0.35';
    const subc = ink ? 'fontcolor=0x7A1F14:borderw=2:bordercolor=0xF5F1E6@0.6' : 'fontcolor=0xFBBF24:shadowcolor=0x000000@0.8:shadowx=0:shadowy=2:borderw=1:bordercolor=0x000000@0.5';
    fs.writeFileSync(path.join(tmp, `t${i}.txt`), t.text || '', 'utf8');
    vf.push(`drawtext=fontfile=title.ttf:textfile=t${i}.txt:fontsize=${Math.round(H * 0.105)}:${main}:alpha='${alpha}':x=${cx}-text_w/2:y=${cy}-text_h/2`);
    if (t.sub) {
      fs.writeFileSync(path.join(tmp, `s${i}.txt`), t.sub, 'utf8');
      vf.push(`drawtext=fontfile=sub.ttf:textfile=s${i}.txt:fontsize=${Math.round(H * 0.036)}:${subc}:alpha='${alpha}':x=${cx}-text_w/2:y=${cy + Math.round(H * 0.085)}`);
    }
  }
  // 자막 굽기 (트레일러처럼 게임 밖에서 쓰는 영상): edl.burnSubs 가 true 면 sub 를 화면 아래에 그림
  if (edl.burnSubs && s.sub && s.sub.text) {
    const a = s.sub.at ?? 0.4, e = s.sub.end ?? (s.dur - 0.3), fi = 0.35;
    const alpha = `if(lt(t,${a}),0,if(lt(t,${a + fi}),(t-${a})/${fi},if(lt(t,${e - fi}),1,max(0,(${e}-t)/${fi}))))`;
    fs.writeFileSync(path.join(tmp, `c${i}.txt`), s.sub.text, 'utf8');
    vf.push(`drawtext=fontfile=sub.ttf:textfile=c${i}.txt:fontsize=${Math.round(H * 0.042)}:fontcolor=0xF3EEE2:alpha='${alpha}':x=(w-text_w)/2:y=h-${Math.round(H * 0.14)}:shadowcolor=0x000000@0.85:shadowx=0:shadowy=3:borderw=2:bordercolor=0x000000@0.4`);
  }
  ff([...input, '-vf', vf.join(','), '-t', String(s.dur), '-an', '-c:v', 'libx264', '-preset', presetSeg, '-crf', String(crfSeg), '-pix_fmt', 'yuv420p', out], s.id);
});

// ---------- 2. 장면 전환으로 이어 붙이기 ----------
// 컷 k 의 시작 시각 = 앞 컷 길이 합 − 겹친 시간 합
const transOf = (s, k) => k === 0 ? 0 : (s.trans === 'cut' ? 0 : (s.transDur ?? (s.trans === 'black' ? 1.0 : 0.8)));
const starts = []; let acc = 0;
shots.forEach((s, k) => { acc -= transOf(s, k); starts.push(acc); acc += s.dur; });
const total = +(acc).toFixed(3);
// 모든 조각을 같은 시간 단위로 (cut(concat)과 fade(xfade)를 섞으면 시간 단위가 달라져 실패하던 것)
let fc = shots.map((s, k) => `[${k}:v]settb=AVTB,setpts=PTS-STARTPTS,fps=${FPS}[n${k}];`).join(''), last = '[n0]';
shots.forEach((s, k) => {
  if (k === 0) return;
  const td = transOf(s, k);
  const label = `[v${k}]`;
  if (td === 0) { fc += `${last}[n${k}]concat=n=2:v=1:a=0,settb=AVTB,fps=${FPS}${label};`; }
  else fc += `${last}[n${k}]xfade=transition=${s.trans === 'black' ? 'fadeblack' : 'fade'}:duration=${td}:offset=${starts[k].toFixed(3)},settb=AVTB,fps=${FPS}${label};`;
  last = label;
});
const fadeIn = edl.fadeIn ?? 1.0, fadeOut = edl.fadeOut ?? 1.5;
fc += `${last}fade=t=in:st=0:d=${fadeIn},fade=t=out:st=${(total - fadeOut).toFixed(3)}:d=${fadeOut}[vout]`;
const segInputs = shots.flatMap((s, i) => ['-i', `seg${i}.mp4`]);
ff([...segInputs, '-filter_complex', fc, '-map', '[vout]', '-c:v', 'libx264', '-preset', presetSeg, '-crf', String(crfSeg), '-pix_fmt', 'yuv420p', 'video.mp4'], '이어 붙이기');

// ---------- 3. 소리: 음악 + 효과음 ----------
const aIn = [], aF = [], mixes = [];
const m = edl.music;
if (m && exists(m.file)) {
  aIn.push('-i', abs(m.file));
  const at = m.at || 0, mo = Math.max(0, total - at);
  aF.push(`[0:a]atrim=start=${m.from || 0}:duration=${mo},asetpts=PTS-STARTPTS,volume=${m.vol ?? 0.6},afade=t=in:d=${m.fadeIn ?? 1.5},afade=t=out:st=${(mo - (m.fadeOut ?? 3)).toFixed(3)}:d=${m.fadeOut ?? 3},adelay=${Math.round(at * 1000)}:all=1[m]`);
  mixes.push('[m]');
}
shots.forEach((s, k) => (s.sfx || []).forEach(x => {
  if (!exists(x.file)) { console.warn('효과음 없음: ' + x.file); return; }
  const idx = aIn.length / 2; aIn.push('-i', abs(x.file));
  const t = Math.max(0, starts[k] + (x.at || 0));
  aF.push(`[${idx}:a]volume=${x.vol ?? 0.7},adelay=${Math.round(t * 1000)}:all=1[x${idx}]`);
  mixes.push(`[x${idx}]`);
}));
let haveAudio = mixes.length > 0;
if (haveAudio) {
  const af = aF.join(';') + `;${mixes.join('')}amix=inputs=${mixes.length}:normalize=0:dropout_transition=0,atrim=duration=${total},alimiter=limit=0.9[aout]`;
  ff([...aIn, '-filter_complex', af, '-map', '[aout]', '-c:a', 'pcm_s16le', '-ar', '48000', 'audio.wav'], '소리');
}

// ---------- 4. 최종 출력 ----------
const outDir = edl.outDir ? abs(edl.outDir) : path.join(ROOT, 'assets/cinema'); // 트레일러 등은 게임 밖 폴더로
fs.mkdirSync(outDir, { recursive: true });
const outMp4 = path.join(outDir, name + '.mp4');
ff(['-i', 'video.mp4', ...(haveAudio ? ['-i', 'audio.wav'] : []), '-map', '0:v', ...(haveAudio ? ['-map', '1:a', '-c:a', 'aac', '-b:a', '160k'] : []),
  '-c:v', 'libx264', '-preset', FAST ? 'veryfast' : 'slow', '-crf', FAST ? '30' : String(edl.crf || 22), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-t', String(total), outMp4], '최종 출력');

// ---------- 5. 자막 시간표 (게임이 영상 위에 띄움) ----------
const cues = [];
shots.forEach((s, k) => {
  if (!s.sub || !s.sub.text) return;
  const nextT = k + 1 < shots.length ? transOf(shots[k + 1], k + 1) : 0;
  const t0 = starts[k] + (s.sub.at ?? 0.5);
  const t1 = starts[k] + (s.sub.end ?? (s.dur - nextT - 0.2));
  cues.push({ t0: +t0.toFixed(2), t1: +t1.toFixed(2), who: s.sub.who || '', text: s.sub.text });
});
fs.writeFileSync(path.join(outDir, name + '.json'), JSON.stringify({ duration: total, cues }, null, 2), 'utf8');

const mb = (fs.statSync(outMp4).size / 1048576).toFixed(1);
console.log(`\n완성: ${path.relative(ROOT, outMp4).replace(/\\/g, '/')} (${total.toFixed(1)}초, ${mb}MB${FAST ? ', 빠른 확인용 화질' : ''}) + ${name}.json (자막 ${cues.length}개)`);
fs.rmSync(tmp, { recursive: true, force: true });
