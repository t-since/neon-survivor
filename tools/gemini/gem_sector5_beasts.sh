#!/bin/bash
# 5구역(혈마전) 괴수 2종: 혈랑 · 피박쥐 — 걷기(날기)·공격 2x2 시트 (제미나이, 장마다 새 대화)
# 걷기는 기존 몹 그림(ref_mob_walk.png)을 그림체 기준으로, 공격은 방금 그린 걷기 그림을 붙여 같은 모습 유지
source "$(dirname "${BASH_SOURCE[0]}")/gem.sh"
REF="$S/ref_mob_walk.png"
names=(mob_blood_wolf mob_blood_bat)
descs=(
"'Blood Demon Wolf' - a huge crimson-red demonic wolf (bigger than a normal wolf), dark red fur with black stripes, bone armor plates on its back and shoulders, glowing red rune marks on its body, burning red eyes, long fangs dripping blood, four-legged, side view facing right"
"'Blood Bat' - a giant demonic bat (wingspan as wide as a man is tall), dark red leathery wings with torn edges, black furry body, glowing red eyes, sharp white fangs, small red mist trailing, flying in the air, side view facing right"
)
walks=(
"Four-legged prowling walk cycle: legs clearly alternate between frames (1 front-left and back-right forward, 2 legs passing, 3 opposite legs forward, 4 legs passing). Body low and menacing."
"FLYING cycle instead of walking (always in the air, no ground): 1 wings fully raised up, 2 wings half down, 3 wings fully down, 4 wings half up. Body stays at the same height."
)
atks=(
"Frame 1: crouching low, ready to pounce. Frame 2: leaping forward to the right, jaws wide open. Frame 3: biting forward with a red slash arc and blood mist. Frame 4: landing, snarling."
"Frame 1: wings pulled back, about to dive. Frame 2: diving forward-down to the right, fangs out. Frame 3: biting forward with a small red slash arc and blood mist. Frame 4: flapping back up, wings raised."
)
for i in 0 1; do
  nm=${names[$i]}
  if [ ! -f "$NEW/${nm}_walk.png" ]; then
    gem_new >/dev/null
    gem_attach "$REF"
    gem_ask "Image 1 is an enemy's walk-cycle sprite sheet from my 2D wuxia game: copy its EXACT hand-drawn cel-shaded art style, black outlines and colors quality, 2x2 layout and flat magenta background (#FF00FF). Draw a sprite sheet (4 frames, 2x2, same size per frame) for a NEW enemy beast: ${descs[$i]}. ${walks[$i]} The whole creature fully visible in every cell, not cropped, facing right. No text, no borders, no grid lines, no shadows, no people." "${nm}_walk.png"
    if [ -f "$NEW/${nm}_walk.png" ] && cmp -s "$NEW/${nm}_walk.png" "$REF"; then rm "$NEW/${nm}_walk.png"; fi
    echo "walk $nm"
  fi
  [ -f "$NEW/${nm}_walk.png" ] || { echo "STOP no walk $nm"; continue; }
  if [ ! -f "$NEW/${nm}_attack.png" ]; then
    gem_new >/dev/null
    gem_attach "$NEW/${nm}_walk.png"
    gem_ask "Image 1 is the sprite sheet of an enemy beast in my 2D wuxia game. Draw an ATTACK sprite sheet of the SAME creature: exact same design, colors, art style, size, side view facing right, 2x2 layout (4 frames, same size per frame), flat magenta background (#FF00FF). ${atks[$i]} Whole creature visible in every cell, not cropped. No text, no borders, no grid lines, no shadows." "${nm}_attack.png"
    if [ -f "$NEW/${nm}_attack.png" ] && cmp -s "$NEW/${nm}_attack.png" "$NEW/${nm}_walk.png"; then rm "$NEW/${nm}_attack.png"; echo "same-as-walk $nm"; fi
    echo "attack $nm"
  fi
done
echo ALLDONE
