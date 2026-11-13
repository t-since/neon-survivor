// ============================================================
// 외형 (은자 상점 1단계, 2026-11-12) — 그림 없이 코드로 되는 것만
// - 옷 색: 서진 그림에서 청록색(옷) 부분만 골라 색을 바꿈 (얼굴·머리는 그대로)
// - 검기 색: 매화검(비검) 빛을 빙백·천마혈·자하로 (판 안 장비 효과와 같은 색)
// - 저장: progress.looks = { owned: {id:true}, robe: '', blade: '' }  (js/14_progress.js 의 progress 에 함께)
// - 가격은 아래 LOOKS 의 cost 만 고치면 됨 (기획_은자_권사.md '정할 것')
// ============================================================
const LOOKS = [
  { id: 'robe_black', kind: 'robe', name: '묵의 (墨衣)', icon: '🖤', cost: 300, robe: { sat: 0.12, light: 0.5 } },
  { id: 'robe_white', kind: 'robe', name: '백의 (白衣)', icon: '🤍', cost: 300, robe: { sat: 0.06, light: 1.7 } },
  { id: 'robe_red', kind: 'robe', name: '홍의 (紅衣)', icon: '❤️', cost: 300, robe: { hue: 352, sat: 1.1 } },
  { id: 'robe_purple', kind: 'robe', name: '자의 (紫衣)', icon: '💜', cost: 300, robe: { hue: 272, sat: 1.0 } },
  { id: 'outfit_heukryong', kind: 'robe', name: '흑룡포 (黑龍袍)', icon: '🐉', cost: 1500, sheet: 'seojin_heukryong' }, // 새 옷: 그림 한 벌 통째로
  { id: 'blade_frost', kind: 'blade', name: '빙백 검기', icon: '❄️', cost: 400, look: 'frost_blade' },
  { id: 'blade_blood', kind: 'blade', name: '천마혈 검기', icon: '🩸', cost: 400, look: 'blood_blade' },
  { id: 'blade_thunder', kind: 'blade', name: '자하 검기', icon: '⚡', cost: 400, look: 'thunder_blade' }
];
function looksState() {
  if (!progress.looks) progress.looks = { owned: {}, robe: '', blade: '' };
  if (!progress.looks.owned) progress.looks.owned = {};
  return progress.looks;
}
// 지금 끼운 검기 (판 안에서 주운 장비가 있으면 그게 먼저)
function skinBladeLook() {
  const L = looksState(), d = LOOKS.find(x => x.id === L.blade);
  return d ? d.look : null;
}

// ── 옷 색 바꾸기 (그림마다 한 번 만들어 둠) ──
const _robeCache = new Map();
// 새 옷(그림 한 벌)을 입었으면 그 그림 이름 앞머리 (없거나 못 불러왔으면 null)
function heroSheetPrefix() {
  const L = looksState(), d = LOOKS.find(x => x.id === L.robe);
  return (d && d.sheet && typeof SPRITES !== 'undefined' && SPRITES[d.sheet + '_walk_0']) ? d.sheet : null;
}
function heroSkinImg(img) {
  const L = looksState(), d = LOOKS.find(x => x.id === L.robe);
  if (!d || d.sheet || !img || !img.width) return img;
  let m = _robeCache.get(img);
  if (!m) { m = new Map(); _robeCache.set(img, m); }
  if (m.has(d.id)) return m.get(d.id);
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const data = x.getImageData(0, 0, c.width, c.height), p = data.data, R = d.robe;
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] < 10) continue;
    const r = p[i] / 255, g = p[i + 1] / 255, b = p[i + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dd = mx - mn;
    if (dd < 0.06) continue; // 회색·흰색·검은색은 그대로
    const s = dd / (1 - Math.abs(2 * l - 1) || 1);
    let h = mx === r ? ((g - b) / dd) % 6 : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4;
    h = (h * 60 + 360) % 360;
    if (h < 150 || h > 235 || s < 0.12) continue; // 청록·파랑(옷)만
    if (R.light !== undefined && R.light < 1 && l > 0.7) continue; // 어둡게 할 때 옅은 안쪽 소매는 그대로 (얼룩 방지)
    const nh = R.hue !== undefined ? R.hue : h;
    const ns = Math.min(1, s * (R.sat !== undefined ? R.sat : 1));
    const nl = Math.min(1, l * (R.light !== undefined ? R.light : 1));
    // HSL → RGB
    const C = (1 - Math.abs(2 * nl - 1)) * ns, X = C * (1 - Math.abs((nh / 60) % 2 - 1)), M = nl - C / 2;
    let rr = 0, gg = 0, bb = 0;
    if (nh < 60) [rr, gg, bb] = [C, X, 0]; else if (nh < 120) [rr, gg, bb] = [X, C, 0]; else if (nh < 180) [rr, gg, bb] = [0, C, X];
    else if (nh < 240) [rr, gg, bb] = [0, X, C]; else if (nh < 300) [rr, gg, bb] = [X, 0, C]; else [rr, gg, bb] = [C, 0, X];
    p[i] = (rr + M) * 255; p[i + 1] = (gg + M) * 255; p[i + 2] = (bb + M) * 255;
  }
  x.putImageData(data, 0, 0);
  m.set(d.id, c);
  return c;
}

// ── 문파 수련 창 아래 '외형' 칸 ──
function renderLooks() {
  const list = document.getElementById('trainingList');
  if (!list) return;
  let box = document.getElementById('looksList');
  if (!box) { box = document.createElement('div'); box.id = 'looksList'; list.after(box); }
  const L = looksState();
  const chip = d => {
    const own = !!L.owned[d.id], on = (d.kind === 'robe' ? L.robe : L.blade) === d.id;
    const label = on ? '착용 중' : own ? '착용' : `💰 ${d.cost}`;
    const dis = !own && progress.silver < d.cost;
    return `<button type="button" class="look-chip ${on ? 'on' : ''} ${own ? 'own' : ''}" data-look="${d.id}" ${dis ? 'disabled' : ''}><span>${d.icon} ${d.name}</span><b>${label}</b></button>`;
  };
  const base = (kind, name) => {
    const on = !(kind === 'robe' ? L.robe : L.blade);
    return `<button type="button" class="look-chip ${on ? 'on' : ''} own" data-look-base="${kind}"><span>${name}</span><b>${on ? '착용 중' : '착용'}</b></button>`;
  };
  box.innerHTML = `<div class="looks-head">🎨 외형 <span>(한 번 사면 계속 · 언제든 바꿔 입기)</span></div>
    <div class="looks-row"><em>옷</em>${base('robe', '🩵 청운 (기본)')}${LOOKS.filter(d => d.kind === 'robe').map(chip).join('')}</div>
    <div class="looks-row"><em>검기</em>${base('blade', '🌸 매화 (기본)')}${LOOKS.filter(d => d.kind === 'blade').map(chip).join('')}</div>`;
}
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('[data-look], [data-look-base]');
  if (!t || t.disabled) return;
  const L = looksState();
  if (t.dataset.lookBase) { L[t.dataset.lookBase] = ''; }
  else {
    const d = LOOKS.find(x => x.id === t.dataset.look);
    if (!d) return;
    if (!L.owned[d.id]) {
      if (progress.silver < d.cost) return;
      progress.silver -= d.cost; L.owned[d.id] = true;
      try { sound.init(); sound.playLevelUp(); } catch (err) {}
    } else { try { sound.init(); sound.playPickup(); } catch (err) {} }
    L[d.kind] = d.id;
  }
  saveProgress();
  renderTraining(); // 은자 숫자·단추 갱신 (renderLooks 도 함께 부름)
});
// 수련 창을 그릴 때마다 외형 칸도
if (typeof renderTraining === 'function') {
  const _rt = renderTraining;
  renderTraining = function () { _rt(); renderLooks(); };
}
