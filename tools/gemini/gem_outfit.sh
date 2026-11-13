#!/bin/bash
# 서진 새 옷 (외형 3단계): 원래 걷기·베기·시전 시트를 붙여 '같은 자세, 옷만 바꿈' → 움직임이 그대로 맞음. Flash-Lite 면 멈춤
source "$(dirname "${BASH_SOURCE[0]}")/gem.sh"
mode_ok() { local m; m=$(cdp eval "(()=>{const b=[...document.querySelectorAll('button')].find(b=>/모드 선택/.test(b.getAttribute('aria-label')||'')); return b?b.getAttribute('aria-label'):''})()" 2>/dev/null); echo "$m" | grep -q "Flash-Lite" && { echo "STOP: Flash-Lite"; return 1; }; return 0; }
OUTFIT="${OUTFIT:-a black martial robe with golden dragon embroidery on the chest and sleeves, a crimson sash belt, black trousers and black boots, the sword sheath black with gold fittings}"
NAME="${NAME:-heukryong}"
for kind in walk attack cast; do
  src="$NEW/hero_${kind}_sheet_now.png"; out="seojin_${NAME}_${kind}.png"
  [ -f "$NEW/$out" ] && { echo "skip $out"; continue; }
  [ -f "$src" ] || { echo "no source $src"; continue; }
  mode_ok || exit 0
  gem_new >/dev/null; gem_attach "$src"
  gem_ask "Image 1 is my hero's sprite sheet (2x2, 4 frames). Redraw the SAME sheet with EXACTLY the same poses, positions, sizes, face, hair, sword and art style in every frame — ONLY change his clothes to: ${OUTFIT}. Keep the flat magenta background (#FF00FF) and the 2x2 layout. No text, no borders, no grid lines." "$out"
  [ -f "$NEW/$out" ] && cmp -s "$NEW/$out" "$src" && rm "$NEW/$out"
  [ -f "$NEW/$out" ] && echo "done $out" || echo "fail $out"
done
echo ALLDONE
