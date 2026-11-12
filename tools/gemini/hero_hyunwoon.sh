#!/bin/bash
# 새 캐릭터 현운(권사) 몸 그림 3장: 걷기·주먹 공격·장풍 시전 (각 2x2, 4동작)
# 쓰는 법: 제미나이 전용 크롬(9222)에 로그인 → bash tools/gemini/hero_hyunwoon.sh
# 결과: assets_new/hyunwoon_walk.png, hyunwoon_attack.png, hyunwoon_cast.png (이미 있으면 건너뜀)
# 다음: 자르기 → 기획_은자_권사.md 의 '자르기' 참고
source "$(dirname "${BASH_SOURCE[0]}")/gem.sh"
ROOT="$S/../.."
HERO="$S/ref_hero_walk.png"   # 서진 걷기 시트 (assets_new 는 git 에 안 올라가서 여기 복사본): 그림체·크기·자세 기준
FACE="$ROOT/assets/portrait_hyunwoon.jpg"         # 현운 얼굴·옷 기준

LOOK="Hyunwoon, a young wuxia fist fighter (same height and proportions as the hero in image 1): messy black hair tied in a high ponytail, sharp amber eyes, mustard-yellow sleeveless martial vest over a dark grey short-sleeved inner robe, brown leather straps with brass buckles across the chest, dark grey sash belt, dark trousers tied at the calves, black cloth shoes, both forearms and fists wrapped in grey bandages with brown leather bands. NO weapon, bare fists only (exactly like image 2)."
COMMON="copy the EXACT art style, line weight, cel shading, character size, 3/4 view facing right, 2x2 layout and flat magenta background (#FF00FF) of image 1. Full body visible in every cell, feet on the same baseline, facing right. No text, no borders, no grid lines, no shadows."

if [ ! -f "$NEW/hyunwoon_walk.png" ]; then
  gem_new >/dev/null
  gem_attach "$HERO" "$FACE"
  gem_ask "Image 1 is my hero's walk-cycle sprite sheet, image 2 is the portrait of a new playable character. Draw a WALK CYCLE sprite sheet (4 frames) of ${LOOK} Confident, grounded martial artist walk, fists loosely closed. Frames: 1 stride, 2 passing (legs together), 3 opposite stride, 4 passing. Legs clearly change between frames. ${COMMON}" "hyunwoon_walk.png"
  gem_ask "Great. Same character, same style and size: an ATTACK sprite sheet, a 3-hit fist combo to the right. Frame 1: fast straight jab with the front fist, small golden impact burst. Frame 2: powerful hook with the rear fist, body twisting. Frame 3: lunging open-palm strike forward with a round golden shockwave in front of the palm. Frame 4: recovery to a fighting stance, fists up. ${COMMON}" "hyunwoon_attack.png"
  gem_ask "Great. Same character, same style and size: a SKILL CAST sprite sheet. Frame 1: gathering qi, both palms drawn back to the hip, golden aura. Frame 2: both palms thrust forward to the right releasing a big golden wind blast. Frame 3: stomping the ground with one foot, golden dust ring around the feet. Frame 4: rising uppercut with a golden trail. ${COMMON}" "hyunwoon_cast.png"
fi
echo ALLDONE
