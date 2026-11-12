#!/bin/bash
# 현운(권사) 몸 그림 3장을 ChatGPT 로 (9222 크롬 ChatGPT 탭, 로그인은 사용자). 안 되면 거기서 멈춤
G="$(cd "$(dirname "${BASH_SOURCE[0]}")" && (pwd -W 2>/dev/null || pwd))"
NEW="$G/../../assets_new"
HERO="$G/ref_hero_walk.png"; FACE="$G/../../assets/portrait_hyunwoon.jpg"
LOOK="Image 1 is my hero's walk sprite sheet (copy its EXACT hand-drawn cel-shaded art style, black outlines, character size and 3/4 side view facing right). Image 2 is the portrait of a NEW playable character, Hyunwoon, a young wuxia fist fighter: messy black hair in a high ponytail, amber eyes, mustard-yellow sleeveless martial vest over a dark grey short-sleeved inner robe, brown leather straps with brass buckles across the chest, dark grey sash belt, dark trousers tied at the calves, black cloth shoes, both forearms and fists wrapped in grey bandages with brown leather bands. NO weapon, bare fists only. Same height and body proportions as the hero in image 1."
FMT="Layout: 2x2 grid, 4 frames, each frame the same size, full body fully visible in every cell (nothing cropped), feet on the same ground line, facing RIGHT in every frame, flat solid magenta background (#FF00FF), no text, no borders, no grid lines, no shadows."
ask() { # $1 저장이름 $2 요청
  [ -f "$NEW/$1" ] && { echo "skip $1"; return 0; }
  printf '%s\n\n%s\n\n%s\n' "$LOOK" "$2" "$FMT" > "$G/_prompt.txt"
  node "$G/gpt.mjs" "$NEW/$1" "$G/_prompt.txt" "$HERO" "$FACE" || { echo "STOP at $1"; rm -f "$G/_prompt.txt"; exit 1; }
  rm -f "$G/_prompt.txt"
}
ask hyunwoon_walk_gpt.png "Draw a WALK CYCLE sprite sheet of Hyunwoon: confident grounded martial artist walk, fists loosely closed and swinging. Frame 1: right leg forward stride. Frame 2: legs passing together. Frame 3: left leg forward stride (opposite of frame 1). Frame 4: legs passing together. The legs must clearly change between frames; use a brighter near leg and a slightly darker far leg so they can be told apart."
ask hyunwoon_attack_gpt.png "Draw an ATTACK sprite sheet of Hyunwoon, a 3-hit fist combo to the right. Frame 1: fast straight jab with the front fist, small golden impact burst. Frame 2: powerful hook with the rear fist, body twisting. Frame 3: lunging open-palm strike forward with a round golden shockwave in front of the palm. Frame 4: recovery to a fighting stance with fists up."
ask hyunwoon_cast_gpt.png "Draw a SKILL CAST sprite sheet of Hyunwoon. Frame 1: gathering qi, both palms drawn back to the hip, golden aura. Frame 2: both palms thrust forward to the right releasing a big golden wind blast. Frame 3: stomping the ground with one foot, golden dust ring around the feet. Frame 4: rising uppercut with a golden trail."
echo ALLDONE
