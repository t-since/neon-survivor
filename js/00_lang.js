// 언어 (한국어 / English) — 게임 코드는 한국어 그대로 두고, 화면에 나오는 순간 영어로 바꿈
// - 첫 언어: 저장된 선택(wuxia_lang) → 없으면 폰·PC 언어가 한국어면 ko, 아니면 en
// - 바꾸는 곳: 화면 글씨(DOM, 새로 생기는 글씨 포함) · 캔버스 글씨(fillText) · 문서 제목
// - 사전: 00_lang_en.js (I18N_EN, I18N_HTML). 사전에 없는 한국어는 window.I18N.miss 에 모임 (?debug=1 에서 확인용)
const I18N = (() => {
  let lang = 'ko';
  try {
    const saved = localStorage.getItem('wuxia_lang');
    const q = new URLSearchParams(location.search).get('lang');
    lang = q || saved || (/^ko/i.test(navigator.language || '') ? 'ko' : 'en');
  } catch (e) { lang = /^ko/i.test(navigator.language || '') ? 'ko' : 'en'; }
  if (lang !== 'en') lang = 'ko';

  const HANGUL = /[가-힣]/;
  const norm = s => s.replace(/\s+/g, ' ').trim();
  const dict = new Map();
  const pats = [];
  const htmlDict = new Map();
  const cache = new Map();
  const miss = new Set();
  const esc = s => s.replace(/[.*+?^$()|[\]\\]/g, '\\$&');

  function load() {
    if (typeof I18N_EN === 'undefined') return;
    for (const [k, v] of Object.entries(I18N_EN)) {
      const nk = norm(k);
      if (/\{\d\}/.test(nk)) {
        // '제{0}구역: {1}' → /^제(.+?)구역: (.+?)$/ , 바뀌는 자리 순서 기억
        const order = [];
        const re = new RegExp('^' + esc(nk).replace(/\\?\{(\d)\\?\}/g, (_, d) => { order.push(+d); return '(.+?)'; }) + '$');
        pats.push({ re, order, out: v, n: nk.length });
      } else dict.set(nk, v);
    }
    // '제1관문: 청운림 죽림 외곽' 같은 열쇠에서 짧은 이름('청운림 죽림 외곽')도 자동으로 등록
    for (const [k, v] of [...dict]) {
      const m = k.match(/^제\d(?:관문|구역): (.+)$/), e = v.match(/^(?:Gate|Region) \d: (.+)$/);
      if (m && e && !dict.has(m[1])) dict.set(m[1], e[1]);
      // '금강불괴 (金剛不壞)' → '금강불괴' 도 (한자 없이 쓰는 곳)
      const sk = k.match(/^(.+?) \([^)]*\)$/), sv = v.match(/^(.+?) \([^)]*\)$/);
      if (sk && sv && !dict.has(sk[1])) dict.set(sk[1], sv[1]);
    }
    pats.sort((a, b) => b.n - a.n); // 긴(구체적인) 틀부터
    if (typeof I18N_HTML !== 'undefined') for (const [k, v] of Object.entries(I18N_HTML)) htmlDict.set(norm(k), v);
  }

  // 따옴표·괄호·별표로 감싼 글씨: 안쪽만 번역
  const WRAP = /^(["“『(\[★◆]\s*)([\s\S]*?)(\s*["”』)\]★◆])$/;
  function piece(s) {
    if (dict.has(s)) return dict.get(s);
    // ' · ' 로 이어 붙인 글씨: 조각마다 (틀보다 먼저 — 틀이 여러 조각을 한꺼번에 삼키지 않게)
    const parts = s.split(' · ');
    if (parts.length > 1) { const t = parts.map(p => piece(p)); if (t.every(x => x !== null)) return t.join(' · '); }
    const out = core(s);
    if (out !== null) return out;
    const w = s.match(WRAP);
    if (w && w[2]) { const inner = piece(w[2].trim()); if (inner !== null) return w[1] + inner + w[3]; }
    // '최대 혈기 100 → 135', '[답설무흔] +1' : 이름 + 숫자 → 이름만 번역
    const nm = s.match(/^([^\d+\-]*?[가-힣][^\d+\-]*?)\s*([+\-]?\d[^가-힣]*)$/);
    if (nm) { const lab = piece(nm[1].trim()); if (lab !== null) return lab + ' ' + nm[2]; }
    // '🌸 매화검법' : 앞의 그림 글자 + 이름
    const ic = s.match(/^([^\s가-힣\w]+)\s+(.+)$/);
    if (ic) { const rest = piece(ic[2]); if (rest !== null) return ic[1] + ' ' + rest; }
    return null;
  }
  function core(s) {
    if (dict.has(s)) return dict.get(s);
    for (const p of pats) {
      const m = s.match(p.re);
      if (m) {
        const vals = {};
        p.order.forEach((d, i) => { vals[d] = m[i + 1]; });
        return p.out.replace(/\{(\d)\}/g, (_, d) => vals[d] === undefined ? '' : tr(vals[d]));
      }
    }
    return null;
  }

  // 한 덩어리 글씨 번역 (앞뒤 빈칸은 살림)
  function tr(s) {
    if (lang === 'ko' || typeof s !== 'string' || !HANGUL.test(s)) return s;
    if (cache.has(s)) return cache.get(s);
    const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
    const n = norm(s);
    let out = piece(n);
    if (out === null && n.includes('\n') === false && s.trim().includes('\n')) {
      // 여러 줄 글씨: 줄마다 (앞뒤 빈칸은 줄 안에 이미 있으므로 다시 붙이지 않음)
      const joined = s.split('\n').map(l => tr(l)).join('\n');
      if (cache.size > 6000) cache.clear();
      cache.set(s, joined);
      if (joined === s) miss.add(n);
      return joined;
    }
    let res;
    if (out === null) { miss.add(n); res = s; } else res = lead + out + trail;
    if (cache.size > 6000) cache.clear();
    cache.set(s, res);
    return res;
  }

  // ── 화면 글씨 (DOM) ──
  const ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
  function doText(node) {
    const v = node.nodeValue;
    if (!v || !HANGUL.test(v)) return;
    const t = tr(v);
    if (t !== v) node.nodeValue = t;
  }
  function doEl(el) {
    if (el.nodeType !== 1 || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
    // 굵은 글씨가 섞인 문장 통째로
    if (htmlDict.size && el.children.length && HANGUL.test(el.textContent)) {
      const k = norm(el.innerHTML);
      if (htmlDict.has(k)) { el.innerHTML = htmlDict.get(k); return; }
    }
    for (const a of ATTRS) {
      const v = el.getAttribute && el.getAttribute(a);
      if (v && HANGUL.test(v)) { const t = tr(v); if (t !== v) el.setAttribute(a, t); }
    }
    for (let c = el.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) doText(c); else if (c.nodeType === 1) doEl(c);
    }
  }
  function startDom() {
    document.documentElement.lang = lang;
    document.title = tr(document.title);
    doEl(document.body);
    new MutationObserver(list => {
      for (const m of list) {
        if (m.type === 'characterData') doText(m.target);
        else if (m.type === 'attributes') { const el = m.target; const v = el.getAttribute(m.attributeName); if (v && HANGUL.test(v)) { const t = tr(v); if (t !== v) el.setAttribute(m.attributeName, t); } }
        else {
          const tg = m.target;
          if (htmlDict.size && tg.nodeType === 1 && tg.children.length && htmlDict.has(norm(tg.innerHTML))) { tg.innerHTML = htmlDict.get(norm(tg.innerHTML)); continue; }
          for (const n of m.addedNodes) { if (!n.isConnected) continue; if (n.nodeType === 3) doText(n); else doEl(n); }
        }
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  // ── 캔버스 글씨 ──
  function patchCanvas() {
    const P = CanvasRenderingContext2D.prototype;
    for (const fn of ['fillText', 'strokeText']) {
      const orig = P[fn];
      P[fn] = function (text, ...rest) { return orig.call(this, typeof text === 'string' && HANGUL.test(text) ? tr(text) : text, ...rest); };
    }
  }

  function setLang(l) {
    try { localStorage.setItem('wuxia_lang', l); } catch (e) {}
    const q = new URLSearchParams(location.search);
    if (q.has('lang')) { q.set('lang', l); location.search = q.toString(); } else location.reload();
  }

  if (lang === 'en') {
    load();
    const dbg = (location.search.match(/i18n=([a-z]+)/) || [])[1] || '';
    if (dbg !== 'nocanvas' && dbg !== 'none') patchCanvas();
    if (dbg !== 'nodom' && dbg !== 'none') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startDom); else startDom(); }
  }
  return { get lang() { return lang; }, tr, setLang, miss };
})();
// 짧게 쓰기: T('한국어') → 지금 언어 글씨
function T(s) { return I18N.tr(s); }
