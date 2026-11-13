#!/bin/bash
# 협객 전용 새 무공 아이콘 5장 + 서리 술사 걷기 (제미나이, 장마다 새 대화). Flash-Lite 면 멈춤
source "$(dirname "${BASH_SOURCE[0]}")/gem.sh"
ROOT="$S/../.."
pick_hydrogen() { cdp eval "(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms)); const b=[...document.querySelectorAll('button')].find(b=>/모드 선택/.test(b.getAttribute('aria-label')||'')); if(!b||!/Flash-Lite/.test(b.getAttribute('aria-label'))) return 0; b.click(); await w(1000); const it=[...document.querySelectorAll('[role=menuitem], [role=menuitemradio], button')].find(e=>/Hydrogen/.test(e.innerText||'')); if(it) it.click(); await w(1200); return 1})()" >/dev/null 2>&1; }
mode_ok() { pick_hydrogen; local m; m=$(cdp eval "(()=>{const b=[...document.querySelectorAll('button')].find(b=>/모드 선택/.test(b.getAttribute('aria-label')||'')); return b?b.getAttribute('aria-label'):''})()" 2>/dev/null); echo "$m" | grep -q "Flash-Lite" && { echo "STOP: Flash-Lite"; return 1; }; return 0; }
REF="$ROOT/assets/icons/palm_blast.png"
ICON="Image 1 is a skill icon from my wuxia game. Draw a NEW square skill icon in EXACTLY the same painted style, framing, lighting and size. No text, no letters, no border frame."
one() { # $1 파일 $2 그림 설명 $3 붙일 그림
  [ -f "$NEW/$1" ] && { echo "skip $1"; return; }
  gem_new >/dev/null
  mode_ok || exit 0
  gem_attach "$3"; gem_ask "$2" "$1"
  [ -f "$NEW/$1" ] && cmp -s "$NEW/$1" "$3" && rm "$NEW/$1"
  [ -f "$NEW/$1" ] && echo "done $1" || echo "fail $1"
}
one icon_iaido.png "$ICON Subject: a single lightning-fast horizontal sword draw — a gleaming jian blade half out of its sheath leaving one long straight blue-white slash line across the whole icon, dark background." "$REF"
one icon_sword_curtain.png "$ICON Subject: several glowing blue sword-qi blades circling in a ring like a protective curtain, deflecting small darts with sparks, dark background." "$REF"
one icon_reflect.png "$ICON Subject: a golden barrier of qi around a martial artist's raised palm, an incoming attack bouncing back off it with a burst of golden light, dark background." "$REF"
one icon_tianluo.png "$ICON Subject: a wide spider-web-like net made of silver needles spreading out, green poison glowing at the knots, dark background." "$REF"
one icon_poison_burst.png "$ICON Subject: a toxic green explosion bursting from a falling silhouette, green poison droplets and a skull-shaped puff of smoke, dark background." "$REF"
one mob_ice_mage_walk_gem.png "Image 1 is the walk sprite sheet of a frost sorceress enemy in my 2D wuxia game. Redraw the SAME sheet (same woman, white and pale-blue robes, veil, ice-crystal staff, same art style and size, facing right, 2x2 layout, flat magenta background #FF00FF) but make it a proper walk cycle: Frame 1 right leg forward stride, Frame 2 legs passing with feet together, Frame 3 left leg forward stride, Frame 4 legs passing. The legs and the robe hem must clearly change between frames. No text, no borders, no grid lines." "$NEW/mob_ice_mage_walk.png"
echo ALLDONE
