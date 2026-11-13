(async () => {
  // 현운 공격 3번째 장면 다시 자르기: 마젠타(255,0,255) 바탕을 "색 풀기"로 빼서 빛나는 장풍 가장자리를 살림
  const im = new Image(); im.src = '/assets_new/hyunwoon_attack_gem.png?t=' + Date.now(); await im.decode();
  const W = im.width, H = im.height, cw = W / 2, ch = H / 2;
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const x = c.getContext('2d'); x.drawImage(im, 0, ch, cw, ch, 0, 0, cw, ch); // 아래 왼쪽 칸
  const id = x.getImageData(0, 0, cw, ch), d = id.data;
  // 바탕색: 네 귀퉁이 근처 평균 (정확한 255,0,255 가 아님)
  let mr = 0, mg = 0, mb = 0, n = 0;
  for (const [sx, sy] of [[10, 10], [cw - 20, 10], [10, ch - 20], [cw - 20, ch - 20], [cw / 2, 10]]) for (let yy = 0; yy < 10; yy++) for (let xx = 0; xx < 10; xx++) { const j = ((sy + yy) * cw + sx + xx) * 4; mr += d[j]; mg += d[j + 1]; mb += d[j + 2]; n++; }
  const M = [mr / n / 255, mg / n / 255, mb / n / 255];
  for (let i = 0; i < d.length; i += 4) {
    const P = [d[i] / 255, d[i + 1] / 255, d[i + 2] / 255];
    // 바탕은 R·B 가 높고 G 가 0 근처. 바탕 흔들림(약 0.1)은 무시
    const m = 0.1;
    let a = Math.max(P[1] / 0.9, (M[0] - m - P[0]) / (M[0] - m), (M[2] - m - P[2]) / (M[2] - m), (Math.abs(P[0] - P[2]) - 0.08) / 0.5);
    const dist = Math.max(Math.abs(P[0] - M[0]), Math.abs(P[1] - M[1]), Math.abs(P[2] - M[2]));
    if (dist > 0.5 && P[1] < 0.75) { d[i + 3] = 255; continue; } // 사람 몸: 바탕과 확실히 다르면 그대로 (빛나는 노랑은 아래에서 풀기)
    if (a < 0.08) { d[i + 3] = 0; continue; }
    a = Math.min(1, a);
    for (let q = 0; q < 3; q++) d[i + q] = Math.max(0, Math.min(255, ((P[q] - (1 - a) * M[q]) / a) * 255));
    d[i + 1] = Math.min(d[i + 1], Math.max(d[i], d[i + 2])); // 가장자리 초록 끼 빼기
    d[i + 3] = Math.round(a * 255);
  }
  window.__M = M;
  // 오른쪽 아래 제미나이 ✦ 자리(이 칸엔 없음) — 칸 가장자리 4px 비움
  for (let y = 0; y < ch; y++) for (let X = 0; X < cw; X++) if (X < 4 || Y(y) || X >= cw - 4) d[(y * cw + X) * 4 + 3] = 0;
  function Y(y) { return y < 4 || y >= ch - 4; }
  x.putImageData(id, 0, 0);
  // 그려진 범위
  let minx = 1e9, maxx = -1, miny = 1e9, maxy = -1;
  for (let y = 0; y < ch; y++) for (let X = 0; X < cw; X++) if (d[(y * cw + X) * 4 + 3] > 40) { if (X < minx) minx = X; if (X > maxx) maxx = X; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  // 지금 게임 그림(440x340): 위 28 · 발 320 · 왼쪽 120 에 맞춤
  const k = (320 - 28) / (maxy - miny);
  const o = document.createElement('canvas'); o.width = 440; o.height = 340;
  const ox = o.getContext('2d'); ox.imageSmoothingQuality = 'high';
  ox.drawImage(c, minx, miny, maxx - minx + 1, maxy - miny + 1, 120, 28, (maxx - minx + 1) * k, (maxy - miny + 1) * k);
  return JSON.stringify({ M: window.__M, k, minx, maxx, miny, maxy, right: 120 + (maxx - minx) * k, url: o.toDataURL('image/png') });
})()
