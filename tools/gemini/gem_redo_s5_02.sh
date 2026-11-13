#!/bin/bash
# 5구역 진입 s5_02 다시 (11-13 사용자: 검을 부러뜨리는 자세로 보임 → 두 쪽을 맞대어 잇는 장면)
source "$(dirname "${BASH_SOURCE[0]}")/gem.sh"
ROOT="$S/../.."
# 흑룡포 그림이 끝날 때까지 기다림 (같은 탭을 쓰므로)
OUT="C:/Users/BRYCE-~1/AppData/Local/Temp/claude/c081c630cda252be/853ef6b7-455d-4f16-8b02-36aebd2429be/tasks/bxdrcbsbs.output"
for i in $(seq 1 120); do grep -q "ALLDONE\|STOP" "$OUT" 2>/dev/null && break; sleep 10; done
m=$(cdp eval "(()=>{const b=[...document.querySelectorAll('button')].find(b=>/모드 선택/.test(b.getAttribute('aria-label')||'')); return b?b.getAttribute('aria-label'):''})()" 2>/dev/null)
echo "$m" | grep -q "Flash-Lite" && { echo "STOP: Flash-Lite"; exit 0; }
mv -f "$NEW/cinema/s5_02.png" "$NEW/cinema/s5_02_old.png" 2>/dev/null
gem_new >/dev/null
gem_attach "$S/ref_cinema_style.jpg" "$ROOT/assets/portrait_seojin.jpg"
gem_ask "Image 1 shows the art style of my wuxia game's cutscenes: hand-drawn ink-comic illustration, bold black outlines, cel shading, cinematic lighting. Image 2 shows the young swordsman Seo Jin — keep his face, hair and teal-white robe. Draw ONE cinematic widescreen 16:9 illustration in EXACTLY this style: Seo Jin, calm and resolute (not angry), holds the HILT half of a broken sword upright in his right hand; with his left hand he gently presses the separate broken BLADE TIP (a plain piece of blade with no hilt and no guard) against the jagged break, the two pieces touching and being REJOINED; soft blue-green qi light flows along the crack, sealing it; his robe and hair float gently in the rising energy. Medium close-up. No text, no letters, no borders, no watermark." "cinema/s5_02.png"
[ -f "$NEW/cinema/s5_02.png" ] && echo "done s5_02" || { mv -f "$NEW/cinema/s5_02_old.png" "$NEW/cinema/s5_02.png"; echo "fail s5_02"; }
