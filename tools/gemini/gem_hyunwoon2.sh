#!/bin/bash
# 현운 공격·시전 그림을 제미나이로 (걷기 그림 hyunwoon_walk_gpt.png 를 붙여 같은 모습 유지). 장마다 새 대화
source "$(dirname "${BASH_SOURCE[0]}")/gem.sh"
WALK="$NEW/hyunwoon_walk_gpt.png"; FACE="$S/../../assets/portrait_hyunwoon.jpg"
BASE="Image 1 is the walk sprite sheet of Hyunwoon, a playable wuxia fist fighter in my game; image 2 is his portrait. Draw a NEW sprite sheet of the SAME character: exact same face, ponytail, mustard-yellow vest, grey inner robe, leather straps, dark trousers, bandaged fists, same art style, same size, 3/4 side view facing RIGHT. No weapon, bare fists. Layout: 2x2 grid, 4 frames, each frame the same size, full body visible in every cell, feet on the same ground line, flat solid magenta background (#FF00FF), no text, no borders, no grid lines, no shadows."
one() { # $1 파일 $2 동작
  [ -f "$NEW/$1" ] && { echo "skip $1"; return; }
  gem_new >/dev/null
  gem_attach "$WALK" "$FACE"
  gem_ask "$BASE $2" "$1"
  if [ -f "$NEW/$1" ] && cmp -s "$NEW/$1" "$WALK"; then rm "$NEW/$1"; echo "same-as-walk $1"; fi
  echo "done $1"
}
one hyunwoon_attack_gem.png "ATTACK sheet, a 3-hit fist combo to the right. Frame 1: fast straight jab with the front fist, small golden impact burst. Frame 2: powerful hook with the rear fist, body twisting. Frame 3: lunging open-palm strike forward with a round golden shockwave in front of the palm. Frame 4: recovery to a fighting stance with fists up."
one hyunwoon_cast_gem.png "SKILL CAST sheet. Frame 1: gathering qi, both palms drawn back to the hip, golden aura. Frame 2: both palms thrust forward to the right releasing a big golden wind blast. Frame 3: stomping the ground with one foot, golden dust ring around the feet. Frame 4: rising uppercut with a golden trail."
echo ALLDONE
