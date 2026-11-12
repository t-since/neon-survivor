async () => {
  // 몬스터 2x2 시트(걷기·공격)를 프레임 8장으로 자르기
  // 걷기 시트의 인물 키로 배율을 정하고(키 300px), 공격 시트도 같은 배율 → 두 동작 크기가 같음
  // 발바닥(가장 아래)과 허리 중심을 기준점(220,320)에 맞춤
  const JOBS = __JOBS__;
  const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src + '?t=' + Date.now(); });
  const OUT_W = 440, OUT_H = 340, AX = 220, AY = 320, TARGET_H = 300;

  function keyed(img, killCross) {
    const W = img.naturalWidth, H = img.naturalHeight;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, W, H); const p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const r = p[i], g = p[i + 1], b = p[i + 2];
      const px = (i / 4) % W, py = Math.floor(i / 4 / W);
      if (px > W - 170 && px < W - 40 && py > H - 170 && py < H - 40 && r - g > 30 && b - g > 30 && r > 200 && b > 200) { p[i + 3] = 0; continue; } // 제미나이 표시
      if (killCross && (Math.abs(px - W / 2) < 7 || Math.abs(py - H / 2) < 7)) { p[i + 3] = 0; continue; } // 칸 나누는 선 지우기
      const m = (Math.min(r, b) - g) / 255;
      if (m > 0.62) { p[i + 3] = 0; continue; }
      if (m > 0.22) p[i + 3] = Math.round(p[i + 3] * (0.62 - m) / 0.40);
      if (m > 0) { const k = Math.min(r, b) - g; p[i] = Math.max(0, r - k * 0.85); p[i + 2] = Math.max(0, b - k * 0.85); }
    }
    x.putImageData(d, 0, 0);
    return c;
  }
  function cells(c, split, rowsN, gridRow) {
    if (gridRow !== undefined) { // 4칸 x 2줄 그림: gridRow 줄의 4칸
      const W = c.width, hh = Math.floor(c.height / 2), cw = Math.floor(W / 4);
      return [0, 1, 2, 3].map(k => measure(c, k * cw, gridRow * hh, cw, hh));
    }
    const W = c.width, H = c.height, hh = Math.floor(H / (rowsN || 2)), res = [];
    for (let q = 0; q < (rowsN || 4); q++) {
      const row = rowsN ? q : Math.floor(q / 2), sx = split ? split[row] : Math.floor(W / 2);
      const ox = rowsN ? 0 : (q % 2) ? sx : 0, oy = row * hh, cw = rowsN ? W : (q % 2) ? W - sx : sx;
      const qd = c.getContext('2d').getImageData(ox, oy, cw, hh).data;
      let minY = hh, maxY = -1;
      for (let yy = 0; yy < hh; yy++) for (let xx = 0; xx < cw; xx++) if (qd[(yy * cw + xx) * 4 + 3] > 40) { if (yy < minY) minY = yy; if (yy > maxY) maxY = yy; }
      const figH = maxY - minY; let sxs = 0, n = 0;
      for (let yy = Math.round(maxY - figH * 0.55); yy < Math.round(maxY - figH * 0.45); yy++) {
        let best = [0, 0], cur = -1;
        for (let xx = 0; xx <= cw; xx++) {
          const on = xx < cw && qd[(yy * cw + xx) * 4 + 3] > 40;
          if (on && cur < 0) cur = xx;
          if (!on && cur >= 0) { if (xx - cur > best[1] - best[0]) best = [cur, xx]; cur = -1; }
        }
        if (best[1] > best[0]) { sxs += (best[0] + best[1]) / 2; n++; }
      }
      res.push({ ox, oy, cw, hh, minY, maxY, figH, cx: n ? sxs / n : cw / 2 });
    }
    return res;
  }
  // 칸 안에서 큰 덩어리만 남기고 옆 칸에서 넘어온 작은 조각은 지움
  function keepMain(c, ox, oy, cw, hh) {
    const x = c.getContext("2d"), d = x.getImageData(ox, oy, cw, hh), p = d.data, N = cw * hh;
    const lab = new Int32Array(N).fill(-1), sizes = [];
    for (let s = 0; s < N; s++) {
      if (lab[s] >= 0 || p[s * 4 + 3] <= 40) continue;
      const id = sizes.length; let n = 0; const st = [s]; lab[s] = id;
      while (st.length) { const q = st.pop(); n++; const qx = q % cw, qy = (q / cw) | 0;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = qx + dx, ny = qy + dy; if (nx < 0 || ny < 0 || nx >= cw || ny >= hh) continue; const r = ny * cw + nx; if (lab[r] < 0 && p[r * 4 + 3] > 40) { lab[r] = id; st.push(r); } } }
      sizes.push(n);
    }
    if (!sizes.length) return;
    const big = Math.max(...sizes);
    for (let s = 0; s < N; s++) { const l = lab[s]; if (l >= 0 && sizes[l] < big * 0.03) p[s * 4 + 3] = 0; else if (l < 0 && p[s * 4 + 3] > 0) { /* 흐린 가장자리는 둠 */ } }
    x.putImageData(d, ox, oy);
  }
  function measure(c, ox, oy, cw, hh) {
    keepMain(c, ox, oy, cw, hh);
    const qd = c.getContext("2d").getImageData(ox, oy, cw, hh).data;
    let minY = hh, maxY = -1;
    for (let yy = 0; yy < hh; yy++) for (let xx = 0; xx < cw; xx++) if (qd[(yy * cw + xx) * 4 + 3] > 40) { if (yy < minY) minY = yy; if (yy > maxY) maxY = yy; }
    const figH = maxY - minY; let sxs = 0, n = 0;
    for (let yy = Math.round(maxY - figH * 0.55); yy < Math.round(maxY - figH * 0.45); yy++) {
      let best = [0, 0], cur = -1;
      for (let xx = 0; xx <= cw; xx++) { const on = xx < cw && qd[(yy * cw + xx) * 4 + 3] > 40; if (on && cur < 0) cur = xx; if (!on && cur >= 0) { if (xx - cur > best[1] - best[0]) best = [cur, xx]; cur = -1; } }
      if (best[1] > best[0]) { sxs += (best[0] + best[1]) / 2; n++; }
    }
    return { ox, oy, cw, hh, minY, maxY, figH, cx: n ? sxs / n : cw / 2 };
  }
  const out = {};
  for (const job of JOBS) {
    const walk = keyed(await load('/assets_new/' + job.walk));
    let wc = cells(walk, job.splitWalk, job.walkRows, job.grid42 ? 0 : undefined);
    if (job.walkOrder) wc = job.walkOrder.map(i => wc[i]);
    const hs = wc.map(c => c.figH).sort((a, b) => a - b);
    const scale = (job.targetH || TARGET_H) / ((hs[1] + hs[2]) / 2);
    const walkH = (hs[1] + hs[2]) / 2;
    const sheets = [['walk', walk, wc, scale]];
    if (job.attack) {
      const atk = keyed(await load('/assets_new/' + job.attack), job.killCross);
      for (const r of (job.eraseAtk || [])) atk.getContext('2d').clearRect(r[0], r[1], r[2], r[3]);
      let ac = cells(atk, job.splitAtk, job.atkRows, job.grid42 ? 1 : undefined);
      if (job.atkOrder) ac = job.atkOrder.map(i => ac[i]);
      // 공격 시트는 크기가 다르게 그려질 때가 있어서, '준비 자세' 칸(기본 4번째)의 키를 걷기 키에 맞춤
      const ref = ac[job.atkRef === undefined ? 3 : job.atkRef];
      sheets.push(['attack', atk, ac, scale * walkH / ref.figH]);
    }
    for (const [kind, c, cs, scale] of sheets) {
      cs.forEach((cell, i) => {
        const oc = document.createElement('canvas'); oc.width = OUT_W; oc.height = OUT_H;
        const o = oc.getContext('2d'); o.imageSmoothingQuality = 'high';
        o.setTransform(scale, 0, 0, scale, AX - cell.cx * scale, AY - cell.maxY * scale);
        o.drawImage(c, cell.ox, cell.oy, cell.cw, cell.hh, 0, 0, cell.cw, cell.hh);
        out[job.name + '_' + kind + '_' + i] = oc.toDataURL('image/png');
      });
    }
  }
  return out;
}
