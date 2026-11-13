#!/bin/bash
# 컷신을 '그림 컷'으로 바꾸기 위한 장면 그림 (제미나이, 장마다 새 대화) + 진각 아이콘
# - 결과: assets_new/cinema/<장면id>.png  (이미 있으면 건너뜀), assets_new/icon_jingak.png
# - 매 요청 전에 모델이 Flash-Lite 로 바뀌었으면(사용량 소진) 멈춤
# - 나중에: 제미나이 표시(오른쪽 아래 ✦) 자리 잘라 내고 assets/cinema/<id>.jpg 로 → 영상(mp4·json) 빼면 그림 컷으로 나옴
source "$(dirname "${BASH_SOURCE[0]}")/gem.sh"
ROOT="$S/../.."
mkdir -p "$NEW/cinema"
STYLE="$S/ref_cinema_style.jpg"
SJ="$ROOT/assets/portrait_seojin.jpg"
B1="$ROOT/assets/boss/boss_blood_walk_0.png"; B2="$ROOT/assets/boss/boss_dragon_walk_0.png"; B3="$ROOT/assets/boss/boss_empress_walk_0.png"
B4="$ROOT/assets/boss/boss_ice_walk_0.png"; B5="$ROOT/assets/boss_demon.png"

mode_ok() {
  local m; m=$(cdp eval "(()=>{const b=[...document.querySelectorAll('button')].find(b=>/모드 선택/.test(b.getAttribute('aria-label')||'')); return b?b.getAttribute('aria-label'):''})()" 2>/dev/null)
  if echo "$m" | grep -q "Flash-Lite"; then echo "STOP: Flash-Lite (사용량 소진)"; return 1; fi
  return 0
}
BASE="Image 1 shows the art style of my wuxia game's cutscenes: hand-drawn ink-comic illustration, bold black outlines, cel shading, cinematic lighting, muted rich colors. Draw ONE new cinematic widescreen 16:9 illustration in EXACTLY this style. No text, no letters, no speech bubbles, no borders, no frames, no watermark."
CHAR="Image 2 shows the character's look — keep the same face, hair and clothes."
# 장면: id | 붙일 인물 그림(없으면 -) | 장면 설명
SHOTS=(
"op_01|-|Epic title backdrop: misty wuxia mountains at dusk, a lone sword stuck in a rocky peak, blood-red moon behind swirling clouds; keep the center calm and empty for a title."
"op_02|-|Rainy night. An old wuxia master with long white hair and beard, in torn bloody grey-green robes (like the old man in image 1), staggers up long stone steps toward a mountain sect gate holding a broken sword, lightning in the sky. Wide shot."
"op_04|-|A shady night market alley lit by red lanterns: a hooded merchant sells glowing blood-red pills from a small lacquer box; customers with red glowing eyes, sinister mood."
"op_05|-|Foggy bamboo forest village at night, abandoned houses, shambling jiangshi corpses in faded Qing official robes with yellow paper talismans hopping between the houses, eerie green mist."
"op_06|$SJ|Dawn. The young swordsman Seo Jin (image 2) stands at a mountain sect gate looking down at the misty world below, sword at his waist, wind blowing his teal robe and hair, determined. Seen from behind at a three-quarter angle."
"s2_02|-|Close-up on a fallen warrior's gauntleted hand dropping an ornate red lacquer pill box stamped with a black seal; blood-red pills spilling onto wet stones, bamboo leaves around."
"s2_03|-|Back alleys of a central-plains city at night: red lanterns, tiled rooftops, a hidden gambling-den gate of an underworld guild. Keep the center calm and empty for a title."
"s3_02|-|Candle-lit table: an open ledger book beside a stolen ancient medical scroll with a family crest, poison vials and dried herbs, ominous green glow."
"s3_03|-|A dense poisonous jungle and swamp in southwest China: purple mist, giant twisted trees, glowing mushrooms, still dark water. Keep the center calm and empty for a title."
"s4_02|$SJ|The young swordsman Seo Jin (image 2) walking alone through a fierce snowstorm on a mountain path heading north, holding a broken sword wrapped in cloth, small figure in a vast white landscape."
"s4_03|-|A frozen northern ice palace on glaciers under green aurora, falling snow, sharp ice spires. Keep the center calm and empty for a title."
"s5_02|$SJ|Close-up: the young swordsman Seo Jin (image 2) joining two halves of a broken sword; brilliant blue-green qi light bursts from the restored blade, his robe and hair flowing upward."
"s5_04|-|A blood demon palace in the far west under a crimson sky, rivers of blood, towering black spires and red banners. Keep the center calm and empty for a title."
"ed_01|-|A huge blood-red demonic palace collapsing into rubble, the crimson sky splitting open as golden sunlight breaks through the clouds."
"ed_02|-|Villagers in a mountain village in warm golden morning light, the red glow fading from their eyes, families hugging in relief."
"ed_03|-|A simple grave on a mountain top at sunset: a weathered stone marker, wildflowers, plum blossom petals drifting, distant misty peaks."
"ed_04|$SJ|The young swordsman Seo Jin (image 2) kneeling before a mountain grave at sunset, laying a restored sword across the stone marker, solemn."
"ed_05|$SJ|The young swordsman Seo Jin (image 2) walking away along a mountain ridge into the sunset, seen from behind, wind blowing his robe, endless mountains ahead."
"ed_06|-|Sunset over endless misty mountain ranges, a tiny lone swordsman standing on a distant ridge. Keep the center calm and empty for a title."
"s2_01|$B1|The Blood Cult demon lord (image 2: wild white hair, crimson and black armor, huge red broadsword) down on one knee, wounded, grinning cruelly, in a bamboo grove clearing at night."
"s3_01|$B2|The Toxic Dragon Lord (image 2, but in green dragon-scale armor with a dragon helmet and a jade glaive) backed against a stone dungeon wall, terrified, pointing away, green poison smoke."
"s4_01|$B3|The Ten-Thousand Poison Empress (image 2, in purple and black silk with a golden phoenix headdress) lounging on mossy ruins in a dark jungle, smiling slyly and pointing north, purple petals in the air."
"s5_01|$B4|The Ice Frost Sovereign (image 2, but with silver hair, an ice crystal crown and white-blue fur robes) kneeling in a frozen throne hall, holding out the broken tip of a sword with regret."
"s5_03|$B5|The Supreme Blood Demon Patriarch (image 2) seated on a black throne in a blood-red demonic hall, crimson aura, looking down menacingly."
"op_03|$SJ|Close-up in heavy rain at night: a dying old master with long white hair and beard in the arms of the young disciple Seo Jin (image 2), handing him a broken sword, both grief-stricken, lantern light."
)

# 진각 아이콘 (무공 아이콘과 같은 모양)
if [ ! -f "$NEW/icon_jingak.png" ] && mode_ok; then
  gem_new >/dev/null
  gem_attach "$ROOT/assets/icons/palm_blast.png"
  gem_ask "Image 1 is a skill icon from my wuxia game. Draw a NEW square skill icon in EXACTLY the same painted style, framing and size: a martial artist's foot stomping down on cracked stone ground, a golden shockwave ring and dust bursting outward. No text, no letters." "icon_jingak.png"
  echo "icon jingak"
fi

for row in "${SHOTS[@]}"; do
  id="${row%%|*}"; rest="${row#*|}"; ref="${rest%%|*}"; desc="${rest#*|}"
  [ -f "$NEW/cinema/$id.png" ] && { echo "skip $id"; continue; }
  mode_ok || exit 0
  gem_new >/dev/null
  if [ "$ref" = "-" ]; then gem_attach "$STYLE"; gem_ask "$BASE Scene: $desc" "cinema/$id.png"
  else gem_attach "$STYLE" "$ref"; gem_ask "$BASE $CHAR Scene: $desc" "cinema/$id.png"; fi
  [ -f "$NEW/cinema/$id.png" ] && echo "done $id" || echo "fail $id"
done
echo ALLDONE
