(async () => {
  // 현운 시전 1번(쌍장 장풍): 원본에서 장풍이 그림 끝에 잘려 세로 직선으로 끊김 → 오른쪽 끝을 서서히 흩어지게, 아래쪽 떨어진 조각 지우기
  const im = new Image(); im.src = '/assets/hero/hyunwoon_cast_1.png?t=' + Date.now(); await im.decode();
  const w = im.width, h = im.height, c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  const id = x.getImageData(0, 0, w, h), d = id.data;
  let maxx = 0; for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) if (d[(y * w + X) * 4 + 3] > 20 && X > maxx) maxx = X;
  const fadeLen = 95, x0 = maxx - fadeLen;
  for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) {
    const i = (y * w + X) * 4;
    if (y >= 302 && X >= 165) { d[i + 3] = 0; continue; } // 아래 떨어진 조각
    if (X > x0) {
      const t = (X - x0) / fadeLen;                       // 0 → 1
      // 끝을 들쭉날쭉하게: 줄마다 사라지는 자리가 조금씩 다름 (불꽃처럼)
      const jag = 0.18 * Math.sin(y * 0.21) + 0.12 * Math.sin(y * 0.57 + 1.3);
      const k = Math.max(0, Math.min(1, 1 - (t + jag) * 1.05));
      d[i + 3] = Math.round(d[i + 3] * k * k);
    }
  }
  x.putImageData(id, 0, 0);
  return JSON.stringify({ maxx, url: c.toDataURL('image/png') });
})()
