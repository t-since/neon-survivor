#!/bin/bash
# ChatGPT 그림 묶음 (11-13 오후): 제한에 걸리면(그림 안 나옴) 멈춤
G="$(cd "$(dirname "${BASH_SOURCE[0]}")" && (pwd -W 2>/dev/null || pwd))"
NEW="$G/../../assets_new"; ROOT="$G/../.."
ask() { # $1 저장 $2 요청 $3.. 첨부
  local out="$NEW/$1" p="$2"; shift 2
  [ -f "$out" ] && { echo "skip $1"; return 0; }
  printf '%s\n' "$p" > "$G/_prompt.txt"
  node "$G/gpt.mjs" "$out" "$G/_prompt.txt" "$@" || { echo "STOP at $1"; rm -f "$G/_prompt.txt"; exit 0; }
  rm -f "$G/_prompt.txt"; echo "done $1"
}
LEGS="ALL FOUR legs must clearly change between frames:
- Frame 1: near front leg reaching forward, far front leg pushing back; near hind leg pushed far back, far hind leg stepping forward under the belly.
- Frame 2: legs passing — near front leg straight under the shoulder, far front leg lifted swinging forward; near hind leg lifted swinging forward, far hind leg straight under the hip.
- Frame 3: the opposite of frame 1.
- Frame 4: the opposite of frame 2.
Near-side legs brighter, far-side legs slightly darker. Body, head and tail stay almost level."
FMT="Layout: 2x2 grid, 4 frames, each frame the same size, the whole creature fully visible in every cell (not cropped), feet on the same ground line, facing RIGHT, flat solid magenta background (#FF00FF), no text, no borders, no grid lines, no shadows."

ask mob_blood_wolf_walk_gpt.png "The attached image is a blood demon wolf enemy from my 2D wuxia game. Draw a NEW walk-cycle sprite sheet of the SAME wolf (same design, red fur, bone armor, glowing runes, hand-drawn cel-shaded style with black outlines, side view). $LEGS $FMT" "$NEW/mob_blood_wolf_walk2.png"
ask mob_black_wolf_walk_gpt.png "The attached image is a black wolf enemy from my 2D wuxia game (smoky black fur, torn red cloth around its neck, glowing red eyes). Draw a NEW, more detailed walk-cycle sprite sheet of the SAME wolf in a hand-drawn cel-shaded style with clear black outlines, side view. $LEGS $FMT" "$NEW/mob_black_wolf_attack_gpt.png"
ask app_icon_gpt.png "Image 1 is the title art of my wuxia action game 'Ten Thousand Swords' (강호만검). Design a square mobile APP ICON (1024x1024) for it: a young wuxia swordsman in a teal robe (like image 2) mid-slash with a glowing blue sword, pink plum blossom petals swirling, a blood-red moon behind, dark dramatic sky; bold readable silhouette at small size, rich colors, hand-drawn ink-comic style with black outlines. Fill the whole square edge to edge (no rounded corners, no border). No text, no letters." "$ROOT/store/screenshots/01_title.jpg" "$ROOT/assets/portrait_seojin.jpg"
ask tangsoyeon_cast_gpt.png "Image 1 is the walk sprite sheet of Tang Soyeon, a playable hidden-weapon and poison heroine in my 2D wuxia game; image 2 is her portrait. Draw a SKILL CAST sprite sheet of the SAME character (same face, long black ponytail, green outfit, art style, size, 3/4 view facing right). Frame 1: raising one hand, green poison mist swirling around it. Frame 2: throwing a poison vial forward to the right with a green trail. Frame 3: leaping and showering silver needles downward. Frame 4: landing gracefully, a small purple poison flower blooming at her feet. Layout: 2x2 grid, 4 frames, same size, full body visible in every cell, feet on the same ground line, flat solid PURE magenta background exactly #FF00FF (not pink, not purple), no text, no borders, no grid lines, no shadows." "$NEW/tangsoyeon_walk.png" "$ROOT/assets/portrait_tangsoyeon.jpg"
echo ALLDONE
