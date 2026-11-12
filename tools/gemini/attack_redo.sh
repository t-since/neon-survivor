#!/bin/bash
# 걷기 그림만 있는 몹의 공격 그림을 새 대화에서 다시 요청 (걷기 시트를 붙여서 같은 모습 유지)
# 쓰는 법: bash tools/gemini/attack_redo.sh  → assets_new/<이름>_attack2.png
source "$(dirname "${BASH_SOURCE[0]}")/gem.sh"
names=(mob_black_wolf mob_poison_spider mob_ice_spider mob_yeti)
atks=(
"Frame 1: crouching low, ready to leap. Frame 2: leaping forward to the right, jaws wide open. Frame 3: biting forward with a dark red slash trail. Frame 4: landing, snarling."
"Frame 1: rearing up, front legs raised high. Frame 2: lunging forward to the right with fangs open, spraying green poison. Frame 3: front legs stabbing down forward. Frame 4: back to normal stance."
"Frame 1: rearing up, front legs raised high. Frame 2: spitting a blue frost web blob forward to the right. Frame 3: front legs stabbing down forward with ice shards. Frame 4: back to normal stance."
"Frame 1: wind-up, ice club raised high overhead with both hands, facing right. Frame 2: club at the top, body leaning back, facing right. Frame 3: massive downward smash to the right, club hitting the ground with a burst of ice chunks. Frame 4: recovery, club lifted onto the shoulder. The creature faces RIGHT in all four frames."
)
for i in 0 1 2 3; do
  nm=${names[$i]}
  if [ -f "$NEW/${nm}_attack2.png" ]; then echo "skip $nm"; continue; fi
  gem_new >/dev/null
  gem_attach "$NEW/${nm}_walk.png"
  gem_ask "Image 1 is a walk sprite sheet of an enemy in my wuxia game. Draw an ATTACK sprite sheet of the SAME creature: exact same design, colors, art style, size and side view facing right, 2x2 layout (4 frames, same size per frame), flat magenta background (#FF00FF). ${atks[$i]} Whole body visible in every cell, not cropped. No text, no borders, no grid lines, no shadows." "${nm}_attack2.png"
  # 새 그림이 안 나와서 이전 그림이 다시 저장됐으면 지움
  if [ -f "$NEW/${nm}_attack2.png" ] && cmp -s "$NEW/${nm}_attack2.png" "$NEW/${nm}_walk.png"; then rm "$NEW/${nm}_attack2.png"; echo "same-as-walk $nm"; fi
  echo "done $nm"
done
echo ALLDONE
