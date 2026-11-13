(async () => {
  // 당소연 머리 줄이기 (11-13 사용자: "얼굴 크기를 조금만 줄일 수 있어?")
  // 목(턱 아래) 점을 기준으로 위쪽만 S 배로 줄임. 목 근처는 서서히 1 로 이어서 경계(특히 묶은 머리)가 끊기지 않게
  const S = 0.82;
  const names = [];
  for (const k of ['walk', 'attack', 'cast']) for (let i = 0; i < 4; i++) names.push(`tangsoyeon_${k}_${i}`);
  const out = {}, info = {};
  const before = document.createElement('canvas'); before.width = 12 * 220; before.height = 2 * 170;
  const bx = before.getContext('2d');
  for (let n = 0; n < names.length; n++) {
    const im = new Image(); im.src = '/assets/hero/' + names[n] + '.png?t=' + Date.now(); await im.decode();
    const w = im.width, h = im.height;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const src = x.getImageData(0, 0, w, h).data;
    let top = h, bot = 0;
    for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) if (src[(y * w + X) * 4 + 3] > 40) { if (y < top) top = y; if (y > bot) bot = y; }
    const H = bot - top;
    // 얼굴 살색: 위쪽 30% 안
    const sk = [];
    for (let y = top; y < top + H * 0.32; y++) for (let X = 0; X < w; X++) {
      const i = (y * w + X) * 4, r = src[i], g = src[i + 1], b = src[i + 2], a = src[i + 3];
      if (a > 200 && r > 190 && g > 140 && g < 225 && b > 110 && b < 200 && r - b > 30) sk.push([X, y]);
    }
    sk.sort((p, q) => p[1] - q[1]);
    const topSkin = sk.slice(0, Math.max(1, Math.floor(sk.length * 0.3)));
    const fx = topSkin.reduce((s, p) => s + p[0], 0) / topSkin.length;
    const face = sk.filter(p => Math.abs(p[0] - fx) < 30);
    const chin = Math.max(...face.map(p => p[1]));
    const cx = face.reduce((s, p) => s + p[0], 0) / face.length;
    const ny = chin + 4; // 목 기준점
    info[names[n]] = { top, chin, cx: Math.round(cx), skin: sk.length };
    // 뒤집어 찾기: 결과 (px,py) ← 원본 (cx + (px-cx)/s, ny + (py-ny)/s), s 는 목 위에서 S, 목 아래로 18px 에 걸쳐 1
    const o = x.createImageData(w, h), d = o.data;
    const blendTop = ny - 6, blendBot = ny + 16;
    for (let py = 0; py < h; py++) {
      const t = py <= blendTop ? 1 : py >= blendBot ? 0 : 1 - (py - blendTop) / (blendBot - blendTop);
      const s = 1 - (1 - S) * (t * t * (3 - 2 * t));
      for (let px = 0; px < w; px++) {
        const sx = cx + (px - cx) / s, sy = ny + (py - ny) / s;
        const x0 = Math.floor(sx), y0 = Math.floor(sy), fxr = sx - x0, fyr = sy - y0;
        const j = (py * w + px) * 4;
        let acc = [0, 0, 0, 0];
        for (const [dx, dy, wt] of [[0, 0, (1 - fxr) * (1 - fyr)], [1, 0, fxr * (1 - fyr)], [0, 1, (1 - fxr) * fyr], [1, 1, fxr * fyr]]) {
          const X = x0 + dx, Y = y0 + dy;
          if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
          const i = (Y * w + X) * 4, a = src[i + 3] * wt;
          acc[0] += src[i] * a; acc[1] += src[i + 1] * a; acc[2] += src[i + 2] * a; acc[3] += a;
        }
        if (acc[3] > 0) { d[j] = acc[0] / acc[3]; d[j + 1] = acc[1] / acc[3]; d[j + 2] = acc[2] / acc[3]; d[j + 3] = acc[3]; }
      }
    }
    const oc = document.createElement('canvas'); oc.width = w; oc.height = h; oc.getContext('2d').putImageData(o, 0, 0);
    out[names[n]] = oc.toDataURL('image/png');
    bx.drawImage(im, n * 220, 0, 220, 170);
    bx.drawImage(oc, n * 220, 170, 220, 170);
    bx.fillStyle = 'rgba(255,0,0,.8)'; bx.fillRect(n * 220 + cx / 2 - 2, ny / 2 - 1, 4, 2);
  }
  return JSON.stringify({ info, cmp: before.toDataURL('image/jpeg', 0.9), out });
})()
