#!/bin/bash
# 추가 그림 (11-13): 혈마 늑대 걷기 다시 + 당소연(세 번째 협객) 걷기·공격·시전. Flash-Lite 로 바뀌면 멈춤
source "$(dirname "${BASH_SOURCE[0]}")/gem.sh"
ROOT="$S/../.."
mode_ok() {
  local m; m=$(cdp eval "(()=>{const b=[...document.querySelectorAll('button')].find(b=>/모드 선택/.test(b.getAttribute('aria-label')||'')); return b?b.getAttribute('aria-label'):''})()" 2>/dev/null)
  if echo "$m" | grep -q "Flash-Lite"; then echo "STOP: Flash-Lite"; return 1; fi; return 0
}
one() { # $1 저장이름 $2 요청 $3.. 붙일 그림
  local out="$1" p="$2"; shift 2
  [ -f "$NEW/$out" ] && { echo "skip $out"; return 0; }
  mode_ok || exit 0
  gem_new >/dev/null; gem_attach "$@"; gem_ask "$p" "$out"
  [ -f "$NEW/$out" ] && echo "done $out" || echo "fail $out"
}
FMT="Layout: 2x2 grid, 4 frames, each frame the same size, the whole body fully visible in every cell (not cropped), feet on the same ground line, facing RIGHT, flat solid magenta background (#FF00FF), no text, no borders, no grid lines, no shadows."

# 1) 혈마 늑대 걷기 (다리가 안 움직이던 것)
one mob_blood_wolf_walk2.png "Image 1 is my blood demon wolf enemy (keep the EXACT same design, colors, bone armor, glowing runes and art style). Draw a NEW walk-cycle sprite sheet of it where ALL FOUR legs clearly move: Frame 1: near front leg reaching forward, far front leg pushed back, near hind leg pushed far back, far hind leg stepping forward. Frame 2: legs passing — near front leg straight under the shoulder, far front leg lifted swinging forward, near hind leg lifted swinging forward, far hind leg straight under the hip. Frame 3: the opposite of frame 1. Frame 4: the opposite of frame 2. Near-side legs brighter, far-side legs darker. Body stays level. $FMT" "$NEW/mob_blood_wolf_walk.png"

# 2) 당소연 — 서천 당문 소가주 (암기·독). 서진 걷기 시트 = 그림체 기준, 초상화 = 모습 기준
HERO="$S/ref_hero_walk.png"; FACE="$ROOT/assets/portrait_tangsoyeon.jpg"
LOOK="Image 1 is my hero's walk sprite sheet (copy its EXACT hand-drawn cel-shaded art style, black outlines, character size and 3/4 side view). Image 2 is the portrait of a NEW playable character, Tang Soyeon, young heiress of the Tang clan of hidden weapons and poison: keep her face, hair and outfit from image 2 exactly. Same height and body proportions as the hero in image 1."
one tangsoyeon_walk.png "$LOOK Draw a WALK CYCLE sprite sheet of her: light agile walk, one hand holding a few throwing needles between the fingers. Frame 1: right leg forward stride. Frame 2: legs passing. Frame 3: left leg forward stride. Frame 4: legs passing. Legs clearly change between frames. $FMT" "$HERO" "$FACE"
[ -f "$NEW/tangsoyeon_walk.png" ] && one tangsoyeon_attack.png "Image 1 is the walk sprite sheet of Tang Soyeon, image 2 her portrait. Draw an ATTACK sprite sheet of the SAME character (same face, hair, outfit, style, size): a 3-throw hidden-weapon combo to the right. Frame 1: flicking two throwing needles forward with a silver streak. Frame 2: spinning and throwing a dart with the other hand, green poison trail. Frame 3: fanning out a spread of many needles forward in an arc, green-purple glow. Frame 4: recovery, ready stance with needles between fingers. $FMT" "$NEW/tangsoyeon_walk.png" "$FACE"
[ -f "$NEW/tangsoyeon_walk.png" ] && one tangsoyeon_cast.png "Image 1 is the walk sprite sheet of Tang Soyeon, image 2 her portrait. Draw a SKILL CAST sprite sheet of the SAME character (same face, hair, outfit, style, size). Frame 1: raising one hand, a cloud of green poison mist swirling around it. Frame 2: throwing a large poison bomb vial forward to the right. Frame 3: leaping and showering needles downward like rain, silver streaks. Frame 4: landing gracefully, purple poison flower blooming at her feet. $FMT" "$NEW/tangsoyeon_walk.png" "$FACE"
echo ALLDONE
