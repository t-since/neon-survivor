#!/bin/bash
# 협객별 컷신 그림 (11-13 사용자: "다른 캐릭터들의 서사도 추가") — 현운(hy_) 8장 + 당소연(tg_) 8장
# 결과: assets_new/cinema/<hy|tg>_<장면id>.png (이미 있으면 건너뜀) → 왼쪽 위 90% 잘라 assets/cinema/*.jpg
source "$(dirname "${BASH_SOURCE[0]}")/gem.sh"
ROOT="$S/../.."
mkdir -p "$NEW/cinema"
STYLE="$S/ref_cinema_style.jpg"
HY="$ROOT/assets/portrait_hyunwoon.jpg"; TG="$ROOT/assets/portrait_tangsoyeon.jpg"
pick_hydrogen() { cdp eval "(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms)); const b=[...document.querySelectorAll('button')].find(b=>/모드 선택/.test(b.getAttribute('aria-label')||'')); if(!b||!/Flash-Lite/.test(b.getAttribute('aria-label'))) return 0; b.click(); await w(1000); const it=[...document.querySelectorAll('[role=menuitem], [role=menuitemradio], button')].find(e=>/Hydrogen/.test(e.innerText||'')); if(it) it.click(); await w(1200); return 1})()" >/dev/null 2>&1; }
mode_ok() { pick_hydrogen; local m; m=$(cdp eval "(()=>{const b=[...document.querySelectorAll('button')].find(b=>/모드 선택/.test(b.getAttribute('aria-label')||'')); return b?b.getAttribute('aria-label'):''})()" 2>/dev/null); echo "$m" | grep -q "Flash-Lite" && { echo "STOP: Flash-Lite"; return 1; }; return 0; }
BASE="Image 1 shows the art style of my wuxia game's cutscenes: hand-drawn ink-comic illustration, bold black outlines, cel shading, cinematic lighting, muted rich colors. Draw ONE new cinematic widescreen 16:9 illustration in EXACTLY this style. No text, no letters, no speech bubbles, no borders, no frames, no watermark."
CHAR="Image 2 shows the main character's look — keep the same face, hair and clothes."
SENIOR="a big burly bald martial monk-like man in his thirties wearing the same ochre-yellow sleeveless vest over a grey martial uniform"
SHOTS=(
"hy_op_02|-|Night in a small village below a mountain martial sect. $SENIOR, with glowing red eyes and swollen red veins, rampages and smashes a wooden house with his fists while villagers flee; an open red lacquer pill box lies on the ground. Wide shot, rain."
"hy_op_03|$HY|Close-up at night in the rain: the young martial artist Hyun Woon (image 2) holds back his senior brother — $SENIOR, red glowing veins, tears in his red eyes — their fists locked together, the senior's face torn between madness and sorrow."
"hy_op_06|$HY|Dawn. The young martial artist Hyun Woon (image 2) walks out through a stone mountain-temple gate with bandaged fists, looking down at the misty world below, determined. Three-quarter view from behind."
"hy_s4_02|$HY|The young martial artist Hyun Woon (image 2) trudging alone through a fierce snowstorm on a northern mountain path, bandaged fists, a fur cloak over his vest, small figure in a vast white landscape."
"hy_s5_02|$HY|Close-up: the young martial artist Hyun Woon (image 2) clenching a glowing pale-blue ice-crystal heart in his bandaged fist; golden qi surges up around his arm, his hair flowing upward."
"hy_ed_03|-|Warm morning in a mountain temple courtyard: $SENIOR, now healthy with normal eyes, sitting up on a mat and opening his eyes, a melting blue ice crystal in a bowl beside him, soft sunlight and incense."
"hy_ed_04|$HY|Sunrise in a mountain temple courtyard: the young martial artist Hyun Woon (image 2) and his recovered senior brother ($SENIOR) clasping forearms firmly, both smiling with relief."
"hy_ed_05|$HY|The young martial artist Hyun Woon (image 2) walking down a winding mountain road toward villages in the valley at sunset, seen from behind, bandaged fists, small bundle on his shoulder."
"tg_op_02|-|Night in the grand hall of the Tang poison-and-medicine clan of Sichuan: an ancient scroll cabinet broken open and empty, scattered papers, green lanterns, the shadow of a black-clad thief fleeing across the moonlit roof tiles."
"tg_op_03|$TG|Candle-lit ancestral hall: the stern middle-aged Tang clan master (black beard, dark green and black robes with silver embroidery) grips the shoulders of his daughter Tang So-yeon (image 2), grave warning expression, empty scroll cabinet behind them."
"tg_op_06|$TG|Dawn. Tang So-yeon (image 2) stands on a misty bamboo mountain path outside her clan's gate, silver needles between her fingers, determined. Three-quarter view."
"tg_s4_02|$TG|Tang So-yeon (image 2) walking alone through a fierce snowstorm on a northern mountain path, a dark cloak over her green outfit, small figure in a vast white landscape."
"tg_s5_02|$TG|Close-up: Tang So-yeon (image 2) fitting a torn final page back into an ancient medical book; glowing green and gold herbal symbols rise from the pages, lighting her face."
"tg_ed_03|-|Morning in the courtyard of the Tang clan apothecary: clan disciples in green hand out antidote vials and herbal bundles to grateful villagers, green banners, warm light."
"tg_ed_04|$TG|Tang So-yeon (image 2) kneeling at the Tang ancestral shrine, placing a recovered ancient medical book on the altar before her father the clan master (black beard, dark green robes), incense smoke, solemn and proud."
"tg_ed_05|$TG|Tang So-yeon (image 2) walking away along a mountain road into the sunset, a wooden medicine box on her back, seen from behind."
)
for row in "${SHOTS[@]}"; do
  id="${row%%|*}"; rest="${row#*|}"; ref="${rest%%|*}"; desc="${rest#*|}"
  [ -f "$NEW/cinema/$id.png" ] && { echo "skip $id"; continue; }
  gem_new >/dev/null
  mode_ok || exit 0
  if [ "$ref" = "-" ]; then gem_attach "$STYLE"; gem_ask "$BASE Scene: $desc" "cinema/$id.png"
  else gem_attach "$STYLE" "$ref"; gem_ask "$BASE $CHAR Scene: $desc" "cinema/$id.png"; fi
  [ -f "$NEW/cinema/$id.png" ] && echo "done $id" || echo "fail $id"
done
echo ALLDONE
