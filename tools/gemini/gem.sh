# 제미나이 전용 크롬 조작 묶음 (source 해서 사용)
S="$(cd "$(dirname "${BASH_SOURCE[0]}")" && (pwd -W 2>/dev/null || pwd))"  # 윈도 경로(C:/...)로: node 가 읽을 수 있게
NEW="$S/../../assets_new"
cdp() { node "$S/cdp.mjs" "$@"; }

# 새 대화 + 이미지 모드
gem_new() {
  cdp eval "(()=>{location.href='https://gemini.google.com/app'; return 1})()" >/dev/null 2>&1
  sleep 5
  cdp eval "(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms)); for(let i=0;i<20 && !document.querySelector('button[aria-label=\"업로드 및 도구\"]');i++) await w(300); document.querySelector('button[aria-label=\"업로드 및 도구\"]').click(); await w(800); const el=[...document.querySelectorAll('[role=menuitem], [role=menuitemcheckbox], button, mat-list-item')].find(b=>(b.innerText||'').trim()==='이미지 만들기'); el?.click(); await w(800); return !!el})()"
}
# 파일 첨부 (여러 개 가능)
gem_attach() {
  cdp eval "(async()=>{document.querySelector('button[aria-label=\"업로드 및 도구\"]').click(); await new Promise(r=>setTimeout(r,800)); return 1})()" >/dev/null
  cdp upload 'input[type=file][accept^="image"]' "$@" >/dev/null
  cdp key Escape >/dev/null
  sleep 4
}
# 지금까지 생성된 그림 수
gem_count() { cdp eval "(()=>[...document.querySelectorAll('model-response img, single-image img')].filter(i=>i.naturalWidth>300 && i.complete).length)()"; }
# 요청 보내고 새 그림이 나오면 저장: gem_ask "<prompt>" <저장파일이름>
gem_ask() {
  local before; before=$(gem_count)
  cdp eval "(()=>{const e=document.querySelector('rich-textarea .ql-editor, div[contenteditable=true]'); e.focus(); return document.activeElement===e})()" >/dev/null
  [ -n "$1" ] && cdp type "$1" >/dev/null
  sleep 1
  cdp eval "(()=>{const b=document.querySelector('button[aria-label=\"메시지 보내기\"]'); if(b){b.click(); return 'sent'} return 'no button'})()" >/dev/null
  for i in $(seq 1 40); do sleep 5; n=$(gem_count); [ "$n" -gt "$before" ] 2>/dev/null && break; done
  sleep 5
  for k in 1 2 3 4 5 6; do if cdp evalfile "$S/grab.js" > "$S/img.json" 2>/dev/null; then node "$S/save.js" "$S/img.json" "$NEW/$2"; return 0; fi; sleep 8; done; echo "grab failed"
}

# 음악: 새 대화 + 음악 모드
gem_new_music() {
  cdp eval "(()=>{location.href='https://gemini.google.com/app'; return 1})()" >/dev/null 2>&1
  sleep 5
  cdp eval "(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms)); for(let i=0;i<20 && !document.querySelector('button[aria-label=\"업로드 및 도구\"]');i++) await w(300); document.querySelector('button[aria-label=\"업로드 및 도구\"]').click(); await w(800); const el=[...document.querySelectorAll('[role=menuitem], [role=menuitemcheckbox], button, mat-list-item')].find(b=>(b.innerText||'').trim()==='음악 만들기'); el?.click(); await w(1000); return !!el})()" >/dev/null
}
# 음악 요청 → 영상(mp4) 저장: gem_music "<prompt>" <저장파일이름.mp4>
gem_music() {
  gem_new_music
  cdp eval "(()=>{const e=document.querySelector('rich-textarea .ql-editor, div[contenteditable=true]'); e.focus(); return 1})()" >/dev/null
  cdp type "$1" >/dev/null; sleep 1
  cdp eval "(()=>{const b=document.querySelector('button[aria-label=\"메시지 보내기\"]'); b&&b.click(); return 1})()" >/dev/null
  for i in $(seq 1 50); do sleep 6; n=$(cdp eval "(()=>{const v=document.querySelector('video, audio'); return v && (v.currentSrc||v.src) ? 1 : 0})()"); [ "$n" = "1" ] && break; done
  sleep 6
  for k in 1 2 3 4 5; do if cdp evalfile "$S/grabmedia.js" > "$S/media.json" 2>/dev/null; then node "$S/savemedia.js" "$S/media.json" "$NEW/$2"; return 0; fi; sleep 8; done; echo "music grab failed: $2"
}
