// 화면 그리기: 주인공, 적, 투사체, 입자
function renderPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  // 1. Realistic Soft Martial Shadow beneath feet
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 28, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Diablo-style Shrine Buff Auras (태을혈기, 풍신선풍, 금강불괴, 만천비검)
  if (player.activeBuffs) {
    const pulse = 1 + Math.sin(state.gameTime * 5) * 0.08;
    if (player.activeBuffs.invincible > 0) {
      // 황금 종형 금강불괴 무적 결계
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.ellipse(0, -56, 44 * pulse, 64 * pulse, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (player.activeBuffs.blood_fury > 0) {
      // 붉은 화염 회전 혈기 링
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.ellipse(0, 2, 34 * pulse, 14 * pulse, state.gameTime * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (player.activeBuffs.wind_god > 0) {
      // 청록빛 선풍 회오리
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#059669';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.ellipse(0, -30, 36 * pulse, 18 * pulse, -state.gameTime * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 3. Vajra Shield - Golden Body Halo (기존 호신강기)
  if (player.skills.vajra_shield > 0) {
    const lvl = player.skills.vajra_shield;
    const baseAlpha = 0.12 + (lvl / 5) * 0.42;
    const pulse = 1 + Math.sin(state.gameTime * 3) * 0.06;

    const auraGrad = ctx.createRadialGradient(0, -56, 10, 0, -56, 52 * pulse);
    auraGrad.addColorStop(0, `rgba(251, 191, 36, ${baseAlpha})`);
    auraGrad.addColorStop(0.6, `rgba(245, 158, 11, ${baseAlpha * 0.45})`);
    auraGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.ellipse(0, -56, 38 * pulse, 58 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Hit Flinch & Knockback Recoil Displacement
  if (player.hitFlashTimer > 0) {
    const recoil = Math.sin(player.hitFlashTimer * 38) * 4.5;
    ctx.translate(-recoil * player.facing, 0);
  }

  // 5. 움직임: 그림 한 장을 코드로 움직임
  //    (예전 걷기 4장은 다리 자세가 거의 같아 미끄러져 보였고, 공격 2~4번 그림은 손이 몸에서 떨어져 있었음)
  let spriteKey = 'hero_0';
  let bob = 0, lean = 0, skew = 0, sx = 1, sy = 1, forward = 0;
  const t = state.gameTime;
  if (player.isAttacking) {
    // 몸은 기본 그림 그대로, 칼은 아래 drawHeroSword()에서 따로 그려 휘두름
    const prog = Math.min(1, Math.max(0, 1 - (player.attackTimer / (player.attackDuration || 0.32))));
    const wind = prog < 0.25 ? prog / 0.25 : 0;                       // 0~25%: 몸을 뒤로 젖혀 힘 모으기
    const strike = prog >= 0.25 ? Math.max(0, 1 - (prog - 0.25) / 0.75) : 0; // 이후: 앞으로 내지르고 천천히 복귀
    lean = -0.10 * wind + 0.15 * strike;
    forward = -4 * wind + 12 * strike;
    sx = 1 + 0.06 * strike;
    sy = 1 + 0.03 * wind - 0.05 * strike;
  } else if (player.isMoving) {
    const ph = player.walkTimer * 0.7;          // 걸음 박자 (빨리 달리면 빨라짐)
    bob = Math.abs(Math.sin(ph)) * 5;           // 한 걸음마다 살짝 튀어 오름
    lean = 0.07;                                 // 가는 방향으로 몸을 숙임
    skew = Math.sin(ph) * 0.05;                  // 상체가 걸음에 맞춰 좌우로 흔들림
    sy = 1 + Math.sin(ph * 2) * 0.02;            // 디딜 때 살짝 눌림
  } else {
    sy = 1 + Math.sin(t * 2.2) * 0.012;          // 숨쉬기
    skew = Math.sin(t * 1.3) * 0.012;            // 옷자락 살랑
  }
  const sprite = SPRITES[spriteKey];

  // 380x620 해상도 정규화 프레임에 맞춘 정비율 렌더링 (88x144, 잘림 완전 제거)
  const w = 88;
  const h = 144;

  ctx.scale(player.facing, 1);   // 여기부터 +x 가 '앞쪽'
  ctx.translate(forward, -bob);
  ctx.rotate(lean);              // 발을 축으로 기울기
  ctx.transform(1, 0, -skew, 1, 0, 0); // 위쪽만 좌우로 흔들기
  ctx.scale(sx, sy);

  // 6. Visual Look Change Auras (장비 착용 룩변)
  if (player.equipped && player.equipped.robe) {
    const robe = player.equipped.robe;
    ctx.shadowColor = robe.color;
    ctx.shadowBlur = 14;
  } else if (player.skills.vajra_shield > 0) {
    const lvl = player.skills.vajra_shield;
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 8 + lvl * 5;
  }

  // 7. Hit Red/White Flashing Filter on taking damage & Debuff Auras
  if (player.hitFlashTimer > 0) {
    ctx.filter = 'brightness(2.2) sepia(1) hue-rotate(-50deg) saturate(4)';
  } else if (player.debuffs && player.debuffs.poison > 0) {
    ctx.filter = 'drop-shadow(0 0 8px #10b981) hue-rotate(60deg)';
  } else if (player.debuffs && player.debuffs.slow > 0) {
    ctx.filter = 'drop-shadow(0 0 8px #38bdf8) hue-rotate(-30deg)';
  }

  // 칼을 뒤로 들어 올리는 동안(공격 앞부분)은 칼이 몸 뒤에 있도록 먼저 그림
  const atkProg = player.isAttacking ? Math.min(1, Math.max(0, 1 - (player.attackTimer / (player.attackDuration || 0.32)))) : -1;
  const swordBehind = atkProg >= 0 && atkProg < 0.3 && (player.attackCombo || 0) % 2 === 0;
  if (swordBehind) drawHeroSword(atkProg, player.attackCombo || 0);

  const isCanvas = (typeof HTMLCanvasElement !== 'undefined' && sprite instanceof HTMLCanvasElement);
  if (sprite && (isCanvas || sprite.complete || (sprite.width > 0))) {
    ctx.drawImage(sprite, -w / 2, -h + 14, w, h);
  } else {
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(-15, -60, 30, 60);
  }
  ctx.filter = 'none';
  ctx.shadowBlur = 0;

  if (atkProg >= 0 && !swordBehind) drawHeroSword(atkProg, player.attackCombo || 0);

  ctx.restore();
}

// 서진의 칼 휘두르기 (앞쪽이 +x 인 좌표에서 호출)
// prog 0~0.25: 칼을 뒤로 들어 올림 → 0.25~0.55: 크게 휘둘러 내림 → 이후 멈춤 & 사라짐
// combo 가 홀수면 아래에서 위로 올려 베기
function drawHeroSword(prog, combo) {
  const handX = 18, handY = -62;            // 오른손 위치 (서진 그림 기준)
  const up = -2.3, down = 0.75;             // 칼 각도 (라디안): 뒤-위 → 앞-아래
  const reverse = combo % 2 === 1;
  const from = reverse ? down + 0.3 : up;
  const to = reverse ? up + 0.6 : down;
  let a, alpha = 1;
  if (prog < 0.25) {
    const k = prog / 0.25;
    a = from + (reverse ? 0.2 : -0.25) * k;          // 살짝 더 젖혀 힘 모으기
  } else if (prog < 0.55) {
    const k = (prog - 0.25) / 0.3;
    const e = 1 - Math.pow(1 - k, 3);                  // 처음 빠르고 끝에서 멈추는 휘두름
    a = from + (to - from) * e;
  } else {
    a = to;
    alpha = Math.max(0, 1 - (prog - 0.55) / 0.45);
  }
  const L = 62;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(handX, handY);

  // 휘두르는 궤적 (검기)
  if (prog >= 0.25) {
    const k = Math.min(1, (prog - 0.25) / 0.3);
    const e = 1 - Math.pow(1 - k, 3);
    const cur = from + (to - from) * e;
    const tail = from + (to - from) * Math.max(0, e - 0.55);
    ctx.save();
    ctx.globalAlpha = alpha * 0.55;
    const g = ctx.createRadialGradient(0, 0, L * 0.35, 0, 0, L + 10);
    g.addColorStop(0, 'rgba(186, 230, 253, 0)');
    g.addColorStop(0.75, 'rgba(125, 211, 252, 0.55)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0.9)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, L + 10, Math.min(tail, cur), Math.max(tail, cur));
    ctx.arc(0, 0, L * 0.35, Math.max(tail, cur), Math.min(tail, cur), true);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 칼
  ctx.rotate(a);
  ctx.lineJoin = 'round';
  // 손잡이
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-14, -2.2, 14, 4.4);
  // 코등이
  ctx.fillStyle = '#b45309';
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-1, -6, 4, 12, 1.5);
  ctx.fill();
  ctx.stroke();
  // 칼날
  const bg = ctx.createLinearGradient(0, -3, 0, 3);
  bg.addColorStop(0, '#f8fafc');
  bg.addColorStop(0.5, '#cbd5e1');
  bg.addColorStop(1, '#64748b');
  ctx.fillStyle = bg;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.2;
  if (prog >= 0.25 && prog < 0.6) { ctx.shadowColor = '#7dd3fc'; ctx.shadowBlur = 12; }
  ctx.beginPath();
  ctx.moveTo(3, -2.6);
  ctx.lineTo(L, -1.6);
  ctx.lineTo(L + 9, 0);
  ctx.lineTo(L, 1.6);
  ctx.lineTo(3, 2.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 수술
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.quadraticCurveTo(-20, 6, -18, 12);
  ctx.stroke();
  ctx.restore();
}

function renderEnemies() {
  const camX = state.camera.x;
  const camY = state.camera.y;
  const cullW = gameWidth / 2 + 130;
  const cullH = gameHeight / 2 + 130;

  enemies.forEach(e => {
    if (!e.isBoss && !e.isMiniBoss) {
      if (Math.abs(e.x - camX) > cullW || Math.abs(e.y - camY) > cullH) return;
    }
    ctx.save();
    ctx.translate(e.x, e.y);

    // 0. Mini-boss Skill Telegraph Indicator (장판 및 돌진 궤적 예고선)
    if (e.telegraph) {
      ctx.save();
      const t = e.telegraph;
      const progress = Math.min(1, Math.max(0, 1 - (t.timer / t.maxTimer)));
      if (t.type === 'dash_slash') {
        const dx = t.targetX - e.x;
        const dy = t.targetY - e.y;
        const ang = Math.atan2(dy, dx);
        const dist = Math.hypot(dx, dy);

        ctx.rotate(ang);
        ctx.fillStyle = `rgba(239, 68, 68, ${0.15 + progress * 0.35})`;
        ctx.fillRect(0, -26, dist, 52);

        ctx.strokeStyle = '#ef4444';
        ctx.setLineDash([8, 6]);
        ctx.lineWidth = 2.5;
        ctx.strokeRect(0, -26, dist, 52);

        // 전방 돌진 기운 화살표 스트림
        const flowOff = (state.gameTime * 280) % 36;
        for (let fx = flowOff; fx < dist - 25; fx += 36) {
          ctx.strokeStyle = `rgba(254, 202, 202, ${0.35 + progress * 0.45})`;
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(fx - 10, -16);
          ctx.lineTo(fx, 0);
          ctx.lineTo(fx - 10, 16);
          ctx.stroke();
        }

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(dist, 0);
        ctx.lineTo(dist - 22, -20);
        ctx.lineTo(dist - 22, 20);
        ctx.closePath();
        ctx.fill();

        // 머리 위 스킬명 예고 배너
        ctx.save();
        ctx.rotate(-ang);
        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#fca5a5';
        ctx.shadowColor = '#dc2626';
        ctx.shadowBlur = 8;
        ctx.textAlign = 'center';
        ctx.fillText('⚡【 흑풍삼단참 (黑風三段斬) 】', 0, -e.radius - 36);
        ctx.restore();

      } else if (t.type === 'needle_burst') {
        const rad = t.radius || 180;
        ctx.strokeStyle = `rgba(168, 85, 247, ${0.4 + progress * 0.5})`;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, rad * progress, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgba(168, 85, 247, 0.12)`;
        ctx.beginPath();
        ctx.arc(0, 0, rad, 0, Math.PI * 2);
        ctx.fill();

        // 12방향 암기 궤적 예고선
        for (let n = 0; n < 12; n++) {
          const nAng = (n / 12) * Math.PI * 2;
          ctx.strokeStyle = `rgba(192, 132, 252, ${0.45 + progress * 0.45})`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(Math.cos(nAng) * (rad * 0.35), Math.sin(nAng) * (rad * 0.35));
          ctx.lineTo(Math.cos(nAng) * rad, Math.sin(nAng) * rad);
          ctx.stroke();
        }

        // 스킬명 예고 배너
        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#d8b4fe';
        ctx.shadowColor = '#7e22ce';
        ctx.shadowBlur = 8;
        ctx.textAlign = 'center';
        ctx.fillText('🕸️【 천라지망 (天羅地網) 】', 0, -e.radius - 36);

      } else if (t.type === 'blood_quake') {
        const qx = t.targetX - e.x;
        const qy = t.targetY - e.y;
        ctx.save();
        ctx.translate(qx, qy);
        const rad = t.radius || 95;

        // 충전되는 붉은 피바닥 영역
        ctx.fillStyle = `rgba(220, 38, 38, ${0.18 + progress * 0.38})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, rad * progress, rad * 0.58 * progress, 0, 0, Math.PI * 2);
        ctx.fill();

        // 외곽 위험 경계선
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.4;
        ctx.setLineDash([8, 6]);
        ctx.shadowColor = '#dc2626';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(0, 0, rad, rad * 0.58, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // 폭발 직전 지면 암석이 갈라지며 핏빛 마그마가 새어나오는 사전 균열!
        if (progress > 0.25) {
          const crackProg = (progress - 0.25) / 0.75;
          ctx.strokeStyle = `rgba(254, 202, 202, ${crackProg})`;
          ctx.lineWidth = 2.0;
          ctx.shadowBlur = 8;
          drawFissureLines(ctx, rad * crackProg * 0.88, 42);
        }

        // 지면 중심 경고 배너
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = '#fee2e2';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.textAlign = 'center';
        ctx.fillText('💥【 지열혈파 (地裂血波) 】', 0, -rad * 0.58 - 14);

        ctx.restore();
      } else if (t.type === 'necromancer_blast' || t.type === 'curse_blast') {
        // --- 幽冥 怨魂彈 (원혼탄) 시전 예고: 회전하는 구궁팔괘진 + 플레이어 방향 유도 궤적 빔 ---
        const isCurse = t.type === 'curse_blast';
        const mainColor = isCurse ? '#c084fc' : '#34d399';
        const shadowCol = isCurse ? '#9333ea' : '#059669';

        // 1. 술사 발밑의 회전하는 흑마 영혼마법진
        ctx.save();
        const sealRot = state.gameTime * 2.5;
        ctx.strokeStyle = mainColor;
        ctx.shadowColor = shadowCol;
        ctx.shadowBlur = 16;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 42, 0, Math.PI * 2);
        ctx.stroke();

        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, 50, sealRot, sealRot + Math.PI * 2);
        ctx.stroke();

        // 8방향 룬 부적 마크
        for (let r = 0; r < 8; r++) {
          const rAng = sealRot + (r * Math.PI / 4);
          const rx = Math.cos(rAng) * 46;
          const ry = Math.sin(rAng) * 46;
          ctx.fillStyle = mainColor;
          ctx.fillRect(rx - 2.5, ry - 2.5, 5, 5);
        }
        ctx.restore();

        // 2. 플레이어 조준 예고 궤적선 (Dashed aim laser beam)
        const dx = t.targetX - e.x;
        const dy = t.targetY - e.y;
        const ang = Math.atan2(dy, dx);
        const dist = Math.hypot(dx, dy);

        ctx.save();
        ctx.rotate(ang);
        // 채워지는 붉은/초록 위험 궤적 빔
        ctx.fillStyle = isCurse ? `rgba(147, 51, 234, ${0.12 + progress * 0.28})` : `rgba(16, 185, 129, ${0.12 + progress * 0.28})`;
        ctx.fillRect(0, -16, dist, 32);

        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 2.2;
        ctx.setLineDash([12, 6]);
        ctx.lineDashOffset = -state.gameTime * 40;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(dist, 0);
        ctx.stroke();

        // 목표 지점 타겟팅 해골 룬 표식
        ctx.restore();
        ctx.save();
        ctx.translate(dx, dy);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#dc2626';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(0, 0, 24 * (1.2 - progress * 0.2), 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgba(239, 68, 68, ${0.2 + progress * 0.35})`;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();

        // 중앙 두개골 경고 마크
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💀', 0, 0);
        ctx.restore();

        // 3. 머리 위 스킬명 칭호
        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = mainColor;
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 8;
        ctx.textAlign = 'center';
        ctx.fillText(t.skillName || '幽冥 怨魂彈', 0, -170);
        ctx.shadowBlur = 0;

      } else if (t.type === 'necromancer_summon') {
        // --- 萬骨 召喚術 (만골 소환술) 의식 예고: 지면 균열 소환진 & 솟구치는 해골 손 ---
        // 1. 머리 위 스킬 칭호
        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#6ee7b7';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 8;
        ctx.textAlign = 'center';
        ctx.fillText('萬骨 召喚術 (만골 소환술)', 0, -170);
        ctx.shadowBlur = 0;

        // 2. 술사 본체의 영혼 기둥
        ctx.fillStyle = `rgba(16, 185, 129, ${0.15 + progress * 0.3})`;
        ctx.fillRect(-20, -160, 40, 160);

        // 3. 소환 거점 2곳의 지면 萬骨陣
        if (t.summonPoints) {
          t.summonPoints.forEach((sp, idx) => {
            const sx = sp.x - e.x;
            const sy = sp.y - e.y;
            ctx.save();
            ctx.translate(sx, sy);

            const sRot = state.gameTime * 3 + idx;
            ctx.strokeStyle = '#34d399';
            ctx.shadowColor = '#10b981';
            ctx.shadowBlur = 16;
            ctx.lineWidth = 2.4;

            // 소환 마법진 원
            ctx.beginPath();
            ctx.arc(0, 0, 32, 0, Math.PI * 2);
            ctx.stroke();

            // 내부 축소 링
            ctx.beginPath();
            ctx.arc(0, 0, 32 * (1 - progress), 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = `rgba(5, 150, 105, ${0.18 + progress * 0.35})`;
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.fill();

            // 지면에서 솟아오르는 백골 기운
            const reachY = -progress * 26;
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(-4, reachY, 8, 22);
            ctx.fillRect(-10, reachY + 4, 20, 4);

            ctx.font = 'bold 12px sans-serif';
            ctx.fillStyle = '#a7f3d0';
            ctx.textAlign = 'center';
            ctx.fillText('☠ 백골 소환', 0, -38);
            ctx.restore();
          });
        }
      }
      ctx.restore();
    }

    // Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 4, e.radius * 1.15, e.radius * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();

    // 1프레임 깜빡임 없는 안정적인 방향 전환
    const facing = e.facing || (e.x > player.x ? -1 : 1);

    // 지면에 발을 딛고 자연스럽게 전진하는 보행 모션 (퉁퉁 튀어오르는 고무공 바운스 완전 제거)
    const runTimer = e.runTimer || 0;
    const speedMag = Math.hypot(e.vx || 0, e.vy || 0);
    const isMoving = speedMag > 20;
    // 퉁퉁거리는 Math.abs 바운스를 없애고, 잔잔한 지면 보행 진동(1.2px)과 어깨 흔들림(0.025 rad)으로 변경
    if (e.hitCooldown > 0) {
      const flinch = Math.sin(e.hitCooldown * 35) * 4.5;
      ctx.translate(-facing * flinch, 0);
    }

    // 일반 몬스터 공통 걸음 연출 (종류별 성격): 걸음마다 살짝 튀고, 가는 방향으로 숙이고, 좌우로 흔들림
    // (보스·중간보스는 각자 연출, 강시는 콩콩 뛰기가 따로 있음)
    if (!e.isBoss && !e.isMiniBoss && e.type !== 'jiangshi') {
      if (e.seed === undefined) e.seed = Math.random() * Math.PI * 2; // 모두 같은 박자로 움직이지 않게
      const MOTION = {
        assassin: [0.13, 0.03, 3.5], poison_assassin: [0.13, 0.03, 3.5], spearman: [0.08, 0.03, 3],
        skeleton: [0.05, 0.07, 3], archer: [0.04, 0.05, 2.5], ghoul: [0.11, 0.05, 4],
        butcher: [0.04, 0.05, 2], barbarian: [0.06, 0.06, 2.5], necromancer: [0.02, 0.02, 1.5], sorceress: [0.02, 0.02, 1.5]
      };
      const [leanAmt, wobble, hop] = MOTION[e.type] || [0.07, 0.03, 3];
      if (isMoving) {
        const ph = runTimer * 1.35 + e.seed;
        ctx.translate(0, -Math.abs(Math.sin(ph)) * hop);
        ctx.rotate(facing * leanAmt + Math.sin(ph) * wobble);
      } else {
        ctx.scale(1, 1 + Math.sin(state.gameTime * 2.4 + e.seed) * 0.015); // 숨쉬기
      }
    }

    if (e.isBoss) {
      // --- Final Sector Boss (구역 군주) ---
      // 인위적인 선형식 회전선 제거 -> 바닥에 스며드는 묵직한 혈마 진기 안개
      // 쿵쿵 걸음 연출 (걸음 박자는 07_update.js 의 e.gaitPhase: 0=발 디딤 → 1=다음 발 디딤)
      const ph = e.gaitPhase || 0;
      const walking = isMoving;
      const lift = walking ? Math.sin(Math.PI * ph) * 8 : 0;            // 걸음 중간에 몸이 살짝 올라감
      const land = walking ? Math.max(0, 1 - ph / 0.2) : 0;              // 디딘 직후 눌림
      const rock = walking ? Math.sin(Math.PI * ph) * 0.05 * (e.stepSide || 1) : 0; // 좌우로 기우뚱
      const breathe = walking ? 0 : Math.sin(state.gameTime * 1.8) * 0.012;

      // 발밑 그림자 + 혈기 안개 (몸이 올라가면 그림자가 작아짐)
      ctx.save();
      const shadowK = 1 - lift / 40;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 58 * shadowK, 20 * shadowK, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(185, 28, 28, 0.22)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 74, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.translate(0, -lift);
      ctx.rotate(rock);
      ctx.scale(facing * (1 + land * 0.04), 1 - land * 0.05 + breathe); // 발 기준으로 눌렸다 펴짐
      // 60FPS Hit Flash: Handled via lightweight GPU blend

      const bossImg = SPRITES.boss_demon;
      const bw = 180;
      const bh = 240; // 795x1060 해상도 비율에 맞춘 웅장한 위압감 (3:4 비율)
      if (bossImg && bossImg.complete) {
        ctx.drawImage(bossImg, -bw / 2, -bh + 20, bw, bh);
      } else {
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.arc(0, -65, 58, 0, Math.PI * 2);
        ctx.fill();
      }

      // Overhead Boss Title & HP Bar (Unflip facing for clear text)
      ctx.scale(facing, 1);
      ctx.filter = 'none';

      // (머리 위 이름표는 뺌 — 화면 위쪽 보스 체력바에 이름이 이미 나옴)
      // HP Bar
      const hpPct = Math.max(0, e.hp / e.maxHp);
      const barW = 140;
      const barH = 9;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(-barW / 2, -bh + 8, barW, barH);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-barW / 2 + 1, -bh + 9, (barW - 2) * hpPct, barH - 2);
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1;
      ctx.strokeRect(-barW / 2, -bh + 8, barW, barH);

    } else if (e.isMiniBoss) {
      // --- Intermediate Mini-Boss (흑철 참마도장 전용 렌더링 - 1.3배 거대화 & 묵직한 중장 전진 & 자연스러운 지면 기운) ---
      ctx.save();
      const pulse = 1.0 + Math.sin(state.gameTime * 4) * 0.06;
      ctx.fillStyle = 'rgba(217, 119, 6, 0.26)';
      ctx.shadowColor = '#d97706';
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.ellipse(0, 6, 73 * pulse, 34 * pulse, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 둥둥 뜨는 인공 바운스 완전 제거: 지면 접지 기반 묵직한 중장 보행 진동
      const heavyBounce = isMoving ? Math.sin(runTimer * 2.5) * 2.2 : 0;
      ctx.translate(0, heavyBounce);
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend

      // 2. 흑철 참마도장 전용 4단 전진/질주 스프라이트 애니메이션! (1.3배: 192x312 px - 거대한 위압감)
      const mbFrame = isMoving ? (Math.floor(runTimer * 1.25) % 4) : 0;
      const mbImg = SPRITES['miniboss_run_' + mbFrame] || SPRITES.miniboss_run_0 || SPRITES[e.customSprite] || SPRITES.assassin;
      const mw = 192;
      const mh = 312;

      if (mbImg && mbImg.complete) {
        ctx.drawImage(mbImg, -mw / 2, -mh + 22, mw, mh);
      } else {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, -80, 68, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. 머리 위 황금 칭호 뱃지 & 상시 체력바 (Unflip facing)
      ctx.scale(facing, 1);
      ctx.filter = 'none';

      // Title badge (1.3배 거대 보스의 뿔투구 위에 안정적으로 위치)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = '#d97706';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(-95, -mh - 22, 190, 24, 6);
      } else {
        ctx.rect(-95, -mh - 22, 190, 24);
      }
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`👹 [중간보스] ${e.name}`, 0, -mh - 10);

      // HP Bar
      const hpPct = Math.max(0, e.hp / e.maxHp);
      const barW = 140;
      const barH = 8;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(-barW / 2, -mh + 8, barW, barH);
      ctx.fillStyle = hpPct > 0.35 ? '#ef4444' : '#dc2626';
      ctx.fillRect(-barW / 2 + 1, -mh + 9, (barW - 2) * hpPct, barH - 2);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-barW / 2, -mh + 8, barW, barH);

    } else if (e.type === 'jiangshi') {
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend

      // 강시 전용 4단 도약 스프라이트: 지면도약준비(0) -> 공중상승(1) -> 정점비상(2) -> 착지흡수(3)!
      let jFrame = 0;
      if (e.hopHeight > 16) jFrame = 2; // 정점 활공
      else if (e.hopHeight > 4) {
        jFrame = Math.sin(e.hopTimer) > 0 ? 1 : 3; // 상승 vs 하강
      } else {
        jFrame = 0; // 지면 웅크림
      }

      const jImg = SPRITES['jiangshi_leap_' + jFrame] || SPRITES.jiangshi;
      const jw = 120;
      const jh = 160;
      const hopY = -e.hopHeight;

      if (jImg && jImg.complete) {
        ctx.drawImage(jImg, -jw / 2, -jh + 18 + hopY, jw, jh);
      } else {
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.arc(0, -32 + hopY, 26, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (e.type === 'skeleton') {
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend

      if (e.isAttacking) {
        // 2dimg2motion 해골 백골병 4단 참격 모션: 치켜들기(0) -> 내리찍기(1) -> 바닥강타(2) -> 수검(3)
        const prog = Math.min(1, Math.max(0, 1 - (e.atkTimer / 0.48)));
        const fIdx = Math.min(3, Math.floor(prog * 4));
        const sImg = SPRITES['skeleton_atk_' + fIdx] || SPRITES.skeleton;

        const lunge = Math.sin(prog * Math.PI) * 14;
        ctx.translate(lunge, -Math.sin(prog * Math.PI) * 6);

        const sw = 120, sh = 140;
        if (sImg && sImg.complete) {
          ctx.drawImage(sImg, -sw / 2, -sh + 24, sw, sh);
        } else {
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.arc(0, -32, 24, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // 실제 다리가 번갈아 뻗어나가며 진격하는 4단 달리기 애니메이션 (캐릭터보다 늠름한 96x156!)
        const runFrame = isMoving ? (Math.floor(runTimer * 1.35) % 4) : 0;
        const sImg = SPRITES['skeleton_run_' + runFrame] || SPRITES.skeleton;

        const sw = 96, sh = 156;
        const sprintBounce = isMoving ? Math.sin(runTimer * 2.7) * 2.0 : 0;
        ctx.translate(0, sprintBounce);

        if (sImg && sImg.complete) {
          ctx.drawImage(sImg, -sw / 2, -sh + 15, sw, sh);
        } else {
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.arc(0, -28, 22, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (e.type === 'ghoul') {
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend

      // 부패시귀 전용 4단 포복 맹수 질주 스프라이트! (접지 -> 코일 -> 맹수도약 -> 전방착지)
      const runFrame = isMoving ? (Math.floor(runTimer * 1.5) % 4) : 0;
      const gImg = SPRITES['ghoul_run_' + runFrame] || SPRITES.ghoul;
      const gw = 116, gh = 116;
      const gBounce = isMoving ? Math.sin(runTimer * 3.0) * 2.0 : 0;
      ctx.translate(0, gBounce);

      if (gImg && gImg.complete) {
        ctx.drawImage(gImg, -gw / 2, -gh + 18, gw, gh);
      } else {
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(0, -26, 24, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (e.type === 'necromancer') {
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend

      // 1. 고요하고 장엄한 순수 수직 공중부양 (뒤뚱거리는 회전 흔들림 완전히 제거!)
      const floatY = 16 + Math.sin(state.gameTime * 2.2 + ((e.seed || e.x) % 7)) * 5.0;
      ctx.translate(0, -floatY);
      // 회전(ctx.rotate)을 일체 넣지 않아 전혀 뒤뚱거리지 않고 공중에 단정히 떠있음

      // 2. 도포 자락 아래로 흘러내리는 짙은 명계 영혼화염 & 도깨비불 이펙트
      ctx.save();
      const soulP1 = Math.sin(state.gameTime * 4.5) * 4;
      const soulP2 = Math.cos(state.gameTime * 3.8) * 4;
      ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.ellipse(-12 + soulP1, 10, 8, 14, 0.15, 0, Math.PI * 2);
      ctx.ellipse(12 + soulP2, 10, 8, 14, -0.15, 0, Math.PI * 2);
      ctx.ellipse(0, 14, 12, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3. 녹색 영혼 보호 결계
      ctx.save();
      const nPulse = 1.0 + Math.sin(state.gameTime * 4.2) * 0.08;
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 16 * nPulse;
      ctx.beginPath();
      ctx.ellipse(0, -56, 36 * nPulse, 52 * nPulse, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 4. 사령술사 본체 스프라이트 (114x162)
      const nImg = SPRITES.necromancer;
      const nw = 114, nh = 162;
      if (nImg && nImg.complete) {
        ctx.drawImage(nImg, -nw / 2, -nh + 22, nw, nh);
      } else {
        ctx.fillStyle = '#065f46';
        ctx.beginPath();
        ctx.arc(0, -34, 24, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. 지팡이 해골 두개골의 영혼 화염 발광 (시전 중이면 더욱 거대하게 증폭!)
      const isCasting = !!e.telegraph;
      const staffGlow = isCasting ? (1.5 + Math.sin(state.gameTime * 12) * 0.4) : (1.0 + Math.sin(state.gameTime * 4) * 0.15);
      ctx.save();
      ctx.fillStyle = isCasting ? '#a7f3d0' : '#34d399';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = isCasting ? 28 : 14;
      ctx.beginPath();
      ctx.arc(36, -nh + 44, 9 * staffGlow, 0, Math.PI * 2);
      ctx.fill();
      // 안구 영혼화염
      ctx.fillStyle = '#ecfdf5';
      ctx.beginPath();
      ctx.arc(34, -nh + 43, 2.5, 0, Math.PI * 2);
      ctx.arc(39, -nh + 43, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (e.type === 'butcher') {
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend

      // 혈마 도살마인 전용 4단 중장 강타 돌진 스프라이트! (155x185 거구)
      const runFrame = isMoving ? (Math.floor(runTimer * 1.15) % 4) : 0;
      const bImg = SPRITES['butcher_run_' + runFrame] || SPRITES.butcher;
      const bw = 155, bh = 185;
      const heavyStomp = isMoving ? Math.sin(runTimer * 2.3) * 2.8 : 0;
      ctx.translate(0, heavyStomp);

      if (bImg && bImg.complete) {
        ctx.drawImage(bImg, -bw / 2, -bh + 24, bw, bh);
      } else {
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.arc(0, -45, 34, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (e.type === 'barbarian') {
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend

      // 광폭 쌍도객 전용 4단 쌍도 돌진 스프라이트! (108x172)
      const runFrame = isMoving ? (Math.floor(runTimer * 1.35) % 4) : 0;
      const barImg = SPRITES['barbarian_run_' + runFrame] || SPRITES.barbarian;
      const barW = 108, barH = 172;
      const sprintBounce = isMoving ? Math.sin(runTimer * 2.7) * 2.0 : 0;
      ctx.translate(0, sprintBounce);

      if (barImg && barImg.complete) {
        ctx.drawImage(barImg, -barW / 2, -barH + 16, barW, barH);
      } else {
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.arc(0, -34, 25, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (e.type === 'sorceress') {
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend
      // 순수 수직 공중부양 (뒤뚱거리는 회전 흔들림 완전 제거)
      const floatY = 14 + Math.sin(state.gameTime * 2.2 + ((e.seed || e.x) % 7)) * 5.0;
      ctx.translate(0, -floatY);

      // Crimson silk aura
      ctx.save();
      const sPulse = 1.0 + Math.sin(state.gameTime * 5.5) * 0.1;
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
      ctx.lineWidth = 2.0;
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 12 * sPulse;
      ctx.beginPath();
      ctx.ellipse(0, -48, 28 * sPulse, 42 * sPulse, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const sorcImg = SPRITES.sorceress;
      const sw2 = 105, sh2 = 148;
      if (sorcImg && sorcImg.complete) {
        ctx.drawImage(sorcImg, -sw2 / 2, -sh2 + 20, sw2, sh2);
      } else {
        ctx.fillStyle = '#9f1239';
        ctx.beginPath();
        ctx.arc(0, -32, 22, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (e.type === 'archer') {
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend
      const aw = 96, ah = 156;

      if (e.isAiming || e.shootTimer <= 0.85 || e.recoilTimer > 0) {
        // 실제 전용 4단 활쏘기 모션: 화살 장전(0) -> 시위 당김(1) -> 만작 조준(2) -> 격발 반동(3)!
        let shotFrame = 0;
        if (e.recoilTimer > 0) shotFrame = 3; // 방사 및 활 반동
        else if (e.shootTimer <= 0.25) shotFrame = 2; // 만작(Full Draw) 조준
        else if (e.shootTimer <= 0.6) shotFrame = 1; // 시위 당김(Draw)
        else shotFrame = 0; // 화살 장전(Nock)

        const aImg = SPRITES['archer_shoot_' + shotFrame] || SPRITES['skeleton_run_0'];
        if (aImg && aImg.complete) {
          ctx.drawImage(aImg, -aw / 2, -ah + 15, aw, ah);
        } else {
          ctx.fillStyle = '#059669';
          ctx.beginPath();
          ctx.arc(0, -30, 22, 0, Math.PI * 2);
          ctx.fill();
        }

        // 만작 조준 시 화살촉에 번뜩이는 날카로운 조준 섬광!
        if (shotFrame === 2) {
          ctx.fillStyle = '#fbbf24';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(22, -42, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      } else {
        // 이동/유격 시 4단 백골 진격 달리기
        const runFrame = isMoving ? (Math.floor(runTimer * 1.35) % 4) : 0;
        const aImg = SPRITES['skeleton_run_' + runFrame] || SPRITES.skeleton;
        const sprintBounce = isMoving ? Math.sin(runTimer * 2.7) * 2.0 : 0;
        ctx.translate(0, sprintBounce);

        if (aImg && aImg.complete) {
          ctx.drawImage(aImg, -aw / 2, -ah + 15, aw, ah);
        } else {
          ctx.fillStyle = '#059669';
          ctx.beginPath();
          ctx.arc(0, -30, 22, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (e.type === 'poison_assassin') {
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend
      const runFrame = isMoving ? (Math.floor(runTimer * 1.35) % 4) : 0;
      const aImg = SPRITES['assassin_run_' + runFrame] || SPRITES.assassin;
      const aw = 96, ah = 156;
      const sprintBounce = isMoving ? Math.sin(runTimer * 2.7) * 1.8 : 0;
      ctx.translate(0, sprintBounce);

      if (aImg && aImg.complete) {
        ctx.filter = 'hue-rotate(90deg) saturate(1.4)';
        ctx.drawImage(aImg, -aw / 2, -ah + 15, aw, ah);
        ctx.filter = 'none';
      } else {
        ctx.fillStyle = '#065f46';
        ctx.beginPath();
        ctx.arc(0, -30, 22, 0, Math.PI * 2);
        ctx.fill();
      }
      // Venomous glowing daggers swaying with sprint
      const daggerBob = Math.sin(runTimer * 2.7) * 3;
      ctx.fillStyle = '#10b981';
      ctx.fillRect(18, -26 + daggerBob, 12, 3.5);
    } else if (e.type === 'spearman') {
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend
      const runFrame = isMoving ? (Math.floor(runTimer * 1.35) % 4) : 0;
      const aImg = SPRITES['assassin_run_' + runFrame] || SPRITES.assassin;
      const aw = 96, ah = 156;
      const sprintBounce = isMoving ? Math.sin(runTimer * 2.7) * 1.8 : 0;
      ctx.translate(0, sprintBounce);

      if (aImg && aImg.complete) {
        ctx.filter = 'sepia(0.35) saturate(1.5)';
        ctx.drawImage(aImg, -aw / 2, -ah + 15, aw, ah);
        ctx.filter = 'none';
      } else {
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.arc(0, -30, 22, 0, Math.PI * 2);
        ctx.fill();
      }
      // 양손에 쥔 회전 은빛 강철 수리검 (어색한 붙어있는 창 완전 제거!)
      const shurRot = state.gameTime * 18;
      ctx.save();
      ctx.translate(22, -34);
      ctx.rotate(shurRot);
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = '#cbd5e1';
      ctx.shadowBlur = 6;
      ctx.fillRect(-6, -6, 12, 12);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    } else if (e.type === 'curse_mage') {
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend
      // 1. 고요하고 장엄한 순수 수직 공중부양 (뒤뚱거리는 회전 흔들림 완전히 제거!)
      const floatY = 14 + Math.sin(state.gameTime * 2.2 + ((e.seed || e.x) % 7)) * 5.0;
      ctx.translate(0, -floatY);
      // 회전(ctx.rotate) 완전 제거

      // 2. 도포 자락 아래로 피어오르는 흑자색 명계 안개
      ctx.save();
      const soulP1 = Math.sin(state.gameTime * 4.2) * 3;
      ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
      ctx.shadowColor = '#9333ea';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(soulP1, 10, 10, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const aImg = SPRITES.necromancer || SPRITES.assassin;
      if (aImg && aImg.complete) {
        ctx.filter = 'hue-rotate(240deg) saturate(1.8)';
        ctx.drawImage(aImg, -52, -145, 104, 150);
        ctx.filter = 'none';
      } else {
        ctx.fillStyle = '#581c87';
        ctx.beginPath();
        ctx.arc(0, -30, 22, 0, Math.PI * 2);
        ctx.fill();
      }
      // Floating occult staff with pulsating orb
      const staffPulse = 1.0 + Math.sin(state.gameTime * 6) * 0.15;
      ctx.strokeStyle = '#3b0764';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(22, 2);
      ctx.lineTo(22, -64);
      ctx.stroke();
      ctx.fillStyle = '#c084fc';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(22, -68, 9 * staffPulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.scale(facing, 1);
      // 60FPS Hit Flash: Handled via lightweight GPU blend

      // 흑풍 살수: 캐릭터보다 크고 늠름한 4단 전력 질주 애니메이션! (96x156)
      const runFrame = isMoving ? (Math.floor(runTimer * 1.35) % 4) : 0;
      const aImg = SPRITES['assassin_run_' + runFrame] || SPRITES.assassin;
      const aw = 96;
      const ah = 156;
      const sprintBounce = isMoving ? Math.sin(runTimer * 2.7) * 1.8 : 0;
      ctx.translate(0, sprintBounce);

      if (aImg && aImg.complete) {
        ctx.drawImage(aImg, -aw / 2, -ah + 15, aw, ah);
      } else {
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(0, -30, 22, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 60FPS Hardware Hit-Flash (기존 무거운 ctx.filter 소프트웨어 래스터라이저 완전 대체)
    if (e.hitCooldown > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = e.isBoss ? 'rgba(239, 68, 68, 0.5)' : (e.isMiniBoss ? 'rgba(245, 158, 11, 0.5)' : 'rgba(255, 255, 255, 0.45)');
      ctx.beginPath();
      ctx.arc(0, -e.radius, e.radius * 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  });
}

function renderProjectiles() {
  // 1. Eastern Long Flying Swords (청운 장검 & 만검귀종)
  flyingSwords.forEach(sw => {
    ctx.save();
    ctx.translate(sw.x, sw.y);

    let angle = sw.isLaunching ? Math.atan2(sw.vy, sw.vx) : sw.angle + Math.PI / 2;
    ctx.rotate(angle);

    ctx.scale(sw.isEvo ? 0.85 : 0.72, sw.isEvo ? 0.85 : 0.72);

    const look = (player.equipped && player.equipped.weapon) ? player.equipped.weapon.lookEffect : null;
    let mainColor = sw.isEvo ? '#fbbf24' : '#38bdf8';
    if (look === 'frost_blade') mainColor = '#38bdf8';
    else if (look === 'blood_blade') mainColor = '#ef4444';
    else if (look === 'thunder_blade') mainColor = '#c084fc';

    // Glowing Sword Qi Aura (60FPS 최적화된 블러)
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = sw.isLaunching ? 6 : 0;

    if (sw.isLaunching) {
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = sw.isEvo ? 3.5 : 2.5;
      ctx.beginPath();
      ctx.moveTo(-15, 0);
      ctx.lineTo(-46, 0);
      ctx.stroke();
    }

    // A. Blade Gradient (장비 룩변 or 황금 만검귀종 or 청운 비취검)
    const bladeGrad = ctx.createLinearGradient(0, -3, 0, 3);
    if (look === 'frost_blade') {
      bladeGrad.addColorStop(0, '#f0f9ff');
      bladeGrad.addColorStop(0.35, '#ffffff');
      bladeGrad.addColorStop(0.7, '#bae6fd');
      bladeGrad.addColorStop(1, '#0284c7');
    } else if (look === 'blood_blade') {
      bladeGrad.addColorStop(0, '#fee2e2');
      bladeGrad.addColorStop(0.35, '#ffffff');
      bladeGrad.addColorStop(0.7, '#f87171');
      bladeGrad.addColorStop(1, '#b91c1c');
    } else if (look === 'thunder_blade') {
      bladeGrad.addColorStop(0, '#faf5ff');
      bladeGrad.addColorStop(0.35, '#ffffff');
      bladeGrad.addColorStop(0.7, '#d8b4fe');
      bladeGrad.addColorStop(1, '#7e22ce');
    } else if (sw.isEvo) {
      bladeGrad.addColorStop(0, '#fef3c7');
      bladeGrad.addColorStop(0.35, '#ffffff');
      bladeGrad.addColorStop(0.7, '#fde047');
      bladeGrad.addColorStop(1, '#d97706');
    } else {
      bladeGrad.addColorStop(0, '#c7d2fe');
      bladeGrad.addColorStop(0.35, '#ffffff');
      bladeGrad.addColorStop(0.7, '#bae6fd');
      bladeGrad.addColorStop(1, '#38bdf8');
    }
    ctx.fillStyle = bladeGrad;

    ctx.beginPath();
    ctx.moveTo(52, 0);       // Sharpened sword tip
    ctx.lineTo(38, -3.0);
    ctx.lineTo(-10, -2.6);
    ctx.lineTo(-10, 2.6);
    ctx.lineTo(38, 3.0);
    ctx.closePath();
    ctx.fill();

    // Central Fuller & Qi Core
    ctx.strokeStyle = sw.isEvo ? '#b45309' : '#0284c7';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(42, 0);
    ctx.lineTo(-8, 0);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(40, 0);
    ctx.lineTo(-5, 0);
    ctx.stroke();

    // B. Golden Crossguard
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(-13, -7, 3, 14);
    ctx.fill();
    ctx.stroke();

    // C. Long Hilt
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-23, -2, 10, 4);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 0.8;
    for (let hx = -21; hx <= -15; hx += 2.2) {
      ctx.beginPath();
      ctx.moveTo(hx, -2);
      ctx.lineTo(hx + 1, 2);
      ctx.stroke();
    }

    // D. Pommel Ring
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(-25, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // E. Red/Gold Silk Tassel
    ctx.strokeStyle = sw.isEvo ? '#f59e0b' : '#ef4444';
    ctx.lineWidth = 1.6;
    const wave = Math.sin(state.gameTime * 14 + sw.x * 0.05) * 3.5;
    const wave2 = Math.cos(state.gameTime * 12 + sw.y * 0.05) * 2.5;
    ctx.beginPath();
    ctx.moveTo(-28, 0);
    ctx.quadraticCurveTo(-38, wave, -50, wave * 1.5 + wave2);
    ctx.stroke();

    ctx.restore();
  });

  // 2. Projectiles (Formless Gale, Buddha Palm, Golden Ki, Blood Bullets, Poison Shards)
  const pCamX = state.camera.x;
  const pCamY = state.camera.y;
  const pCullW = gameWidth / 2 + 100;
  const pCullH = gameHeight / 2 + 100;

  projectiles.forEach(p => {
    if (Math.abs(p.x - pCamX) > pCullW || Math.abs(p.y - pCamY) > pCullH) return;
    ctx.save();
    ctx.translate(p.x, p.y);

    if (p.type === 'golden_sword_ki') {
      const angle = Math.atan2(p.vy, p.vx);
      ctx.rotate(angle);
      ctx.fillStyle = '#fffbeb';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(45, 0);
      ctx.lineTo(-25, -7);
      ctx.lineTo(-15, 0);
      ctx.lineTo(-25, 7);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(35, 0);
      ctx.lineTo(-50, 0);
      ctx.stroke();
    } else if (p.type === 'blood_bullet') {
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#991b1b';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius || 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.arc(-2, -2, (p.radius || 8) * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'poison_shard') {
      const angle = Math.atan2(p.vy, p.vx);
      ctx.rotate(angle);
      ctx.fillStyle = '#c084fc';
      ctx.shadowColor = '#7e22ce';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(0, -4);
      ctx.lineTo(-12, 0);
      ctx.lineTo(0, 4);
      ctx.closePath();
      ctx.fill();
    } else if (p.type === 'dagger') {
      const angle = Math.atan2(p.vy, p.vx);
      ctx.rotate(angle);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-6, -3);
      ctx.lineTo(-6, 3);
      ctx.closePath();
      ctx.fill();
    } else if (p.type === 'palm_wave') {
      const pAngle = Math.atan2(p.vy, p.vx);
      ctx.rotate(pAngle);

      if (p.isBuddhaPalm) {
        // --- 萬佛朝宗 : 佛光 金剛 卍字印 (Tathagata Sacred Golden Swastika Divine Seal) ---
        // 어색한 장갑 형태 대신, 장엄하게 회전하며 뻗어나가는 거대한 황금 卍자 신성 만다라 투사체
        const size = Math.max(140, (p.width || 220) * 0.72);
        const rot = state.gameTime * 4.2;

        ctx.save();

        // 1. 후방 금빛 풍압 충격파 및 진기 꼬리 (Golden Ki Shockwave Trail)
        const trailGrad = ctx.createLinearGradient(-size * 1.1, 0, 0, 0);
        trailGrad.addColorStop(0, 'rgba(245, 158, 11, 0)');
        trailGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.22)');
        trailGrad.addColorStop(1, 'rgba(254, 240, 138, 0.45)');
        ctx.fillStyle = trailGrad;
        ctx.beginPath();
        ctx.ellipse(-size * 0.35, 0, size * 0.75, size * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. 외곽 회전 금강법륜 & 만다라 링 (Rotating Dharma Wheel)
        ctx.save();
        ctx.rotate(rot);

        // 외곽 2중 신성 금륜
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.9)';
        ctx.lineWidth = 3.6;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 32;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.62, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.74, 0, Math.PI * 2);
        ctx.stroke();

        // 8방향 신성 금빛 광선 (8 Celestial Light Rays)
        for (let r = 0; r < 8; r++) {
          const rAng = (r * Math.PI) / 4;
          const rx1 = Math.cos(rAng) * (size * 0.48);
          const ry1 = Math.sin(rAng) * (size * 0.48);
          const rx2 = Math.cos(rAng) * (size * 0.76);
          const ry2 = Math.sin(rAng) * (size * 0.76);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.lineWidth = (r % 2 === 0) ? 3.0 : 1.8;
          ctx.beginPath();
          ctx.moveTo(rx1, ry1);
          ctx.lineTo(rx2, ry2);
          ctx.stroke();
        }

        // 3. 중심 불광 코로나 화염 (Golden Flame Radial Core)
        const flamePulse = 1.0 + Math.sin(state.gameTime * 10) * 0.08;
        const flameGrad = ctx.createRadialGradient(0, 0, size * 0.1, 0, 0, size * 0.64);
        flameGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        flameGrad.addColorStop(0.35, 'rgba(254, 240, 138, 0.75)');
        flameGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.45)');
        flameGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.62 * flamePulse, 0, Math.PI * 2);
        ctx.fill();

        // 4. 거대한 불광 卍 자 (Sacred Golden "卍" Core Glyph)
        ctx.shadowColor = '#d97706';
        ctx.shadowBlur = 24;
        ctx.font = `bold ${Math.round(size * 0.88)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 금빛 외곽선
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 10;
        ctx.strokeText('卍', 0, 0);

        // 선명한 황금색
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 5;
        ctx.strokeText('卍', 0, 0);

        // 눈부신 백금광 중심부
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#fef08a';
        ctx.shadowBlur = 14;
        ctx.fillText('卍', 0, 0);

        ctx.restore();
        ctx.restore();
      } else {
        // Authentic Eastern Formless Vacuum Gale
        const scale = (p.width || 76) / 76;
        ctx.scale(scale, scale);

        const windGrad = ctx.createRadialGradient(16, 0, 6, 0, 0, 52);
        windGrad.addColorStop(0, 'rgba(255, 255, 255, 0.32)');
        windGrad.addColorStop(0.35, 'rgba(224, 242, 254, 0.18)');
        windGrad.addColorStop(0.7, 'rgba(186, 230, 253, 0.06)');
        windGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = windGrad;

        ctx.beginPath();
        ctx.moveTo(38, 0);
        ctx.quadraticCurveTo(24, -28, -25, -34);
        ctx.quadraticCurveTo(-45, 0, -25, 34);
        ctx.quadraticCurveTo(24, 28, 38, 0);
        ctx.closePath();
        ctx.fill();

        const vortexGrad = ctx.createRadialGradient(8, 0, 2, 8, 0, 26);
        vortexGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        vortexGrad.addColorStop(0.5, 'rgba(224, 242, 254, 0.14)');
        vortexGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = vortexGrad;
        ctx.beginPath();
        ctx.ellipse(8, 0, 24, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
        ctx.lineWidth = 1.6;
        ctx.shadowColor = '#bae6fd';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(4, 0, 36, -Math.PI * 0.36, Math.PI * 0.36);
        ctx.stroke();
      }
    } else if (p.type === 'enemy_arrow') {
      // 1. Archer Arrow (원거리 화살)
      const angle = Math.atan2(p.vy, p.vx);
      ctx.rotate(angle);
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(14, 0);
      ctx.stroke();
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(10, -4);
      ctx.lineTo(10, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(-20, -5);
      ctx.lineTo(-16, 0);
      ctx.lineTo(-20, 5);
      ctx.closePath();
      ctx.fill();
    } else if (p.type === 'poison_shuriken') {
      // 2. Poison Assassin Shuriken / Mini-Boss Demonic Star (독표창 / 천라지망 마교 암기)
      const isMB = !!p.isMiniBossStar;
      const rot = state.gameTime * (isMB ? 32 : 24) + p.x;
      ctx.rotate(rot);

      if (isMB) {
        // 천라지망 8각 마기 비도 (Demonic 8-Point Star Blade)
        const sz = 16;
        ctx.fillStyle = '#a855f7';
        ctx.shadowColor = '#7e22ce';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const ka = (k / 8) * Math.PI * 2;
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(ka - 0.15) * (sz * 0.35), Math.sin(ka - 0.15) * (sz * 0.35));
          ctx.lineTo(Math.cos(ka) * sz, Math.sin(ka) * sz);
          ctx.lineTo(Math.cos(ka + 0.15) * (sz * 0.35), Math.sin(ka + 0.15) * (sz * 0.35));
        }
        ctx.closePath();
        ctx.fill();

        // 중심 독기 코어
        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#15803d';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        for (let k = 0; k < 4; k++) {
          const ka = (k / 4) * Math.PI * 2;
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(ka - 0.2) * 5, Math.sin(ka - 0.2) * 5);
          ctx.lineTo(Math.cos(ka) * 14, Math.sin(ka) * 14);
          ctx.lineTo(Math.cos(ka + 0.2) * 5, Math.sin(ka + 0.2) * 5);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (p.type === 'steel_shuriken' || p.type === 'enemy_javelin') {
      // 3. Shuriken Assassin - High-Speed Rotating Steel 8-Point Shuriken (고속 회전 강철 8각 수리검)
      const rot = state.gameTime * 28 + p.x;
      ctx.rotate(rot);
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.shadowColor = '#cbd5e1';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const ka = (k / 8) * Math.PI * 2;
        const r = (k % 2 === 0) ? 14 : 6;
        const px = Math.cos(ka) * r;
        const py = Math.sin(ka) * r;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(17, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'curse_orb') {
      // 4. Ethereal Nether Soul Skull Projectile (幽冥 怨魂탄 - 거대 비행 원혼 두개골)
      const ang = Math.atan2(p.vy, p.vx);
      ctx.rotate(ang);

      const isCurseMage = p.isCurseMage;
      const mainCol = isCurseMage ? '#c084fc' : '#34d399';
      const coreCol = isCurseMage ? '#581c87' : '#064e3b';
      const glowCol = isCurseMage ? '#a855f7' : '#10b981';
      const eyeCol = isCurseMage ? '#f43f5e' : '#ecfdf5';

      const pulse = 1.0 + Math.sin(state.gameTime * 14) * 0.12;

      // 1. 유령 영혼화염 꼬리 (Soul Flame Tail)
      ctx.save();
      ctx.fillStyle = isCurseMage ? 'rgba(168, 85, 247, 0.45)' : 'rgba(16, 185, 129, 0.45)';
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-32 * pulse, -12);
      ctx.lineTo(-24, 0);
      ctx.lineTo(-32 * pulse, 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 2. 광채 코로나 (Glow Corona) 및 두개골 외형
      ctx.save();
      ctx.shadowColor = glowCol;
      ctx.shadowBlur = 24 * pulse;
      ctx.fillStyle = coreCol;
      ctx.strokeStyle = mainCol;
      ctx.lineWidth = 2.8;

      // 두개골 형상 (Skull shape)
      ctx.beginPath();
      ctx.arc(2, 0, 16 * pulse, -Math.PI * 0.65, Math.PI * 0.65);
      ctx.lineTo(-6, 8 * pulse);
      ctx.lineTo(-6, -8 * pulse);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 두개골 발광 안구 (Burning Eyes)
      ctx.fillStyle = eyeCol;
      ctx.shadowColor = eyeCol;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(6, -5, 3.5, 0, Math.PI * 2);
      ctx.arc(6, 5, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // 이빨/턱 격자선
      ctx.strokeStyle = mainCol;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-1, -4);
      ctx.lineTo(-1, 4);
      ctx.moveTo(-4, -3);
      ctx.lineTo(-4, 3);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  });

  // 3. Falling Needles (당문 만천화우 은침 소나기)
  renderFallingNeedles();
}

function renderFallingNeedles() {
  fallingNeedles.forEach(fn => {
    if (fn.time >= fn.delay) {
      const prog = (fn.time - fn.delay) / fn.duration;
      if (prog >= 0 && prog <= 1) {
        const currX = fn.startX + (fn.destX - fn.startX) * prog;
        const currY = fn.startY + (fn.destY - fn.startY) * prog;
        const angle = Math.atan2(fn.destY - fn.startY, fn.destX - fn.startX);

        ctx.save();
        ctx.translate(currX, currY);
        ctx.rotate(angle);

        // Glowing needle rain streak
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(0, 0);
        ctx.stroke();

        // Silver-jade sharp needle
        ctx.fillStyle = '#f8fafc';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-14, -1.5);
        ctx.lineTo(-14, 1.5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    }
  });
}

function renderParticles() {
  const camX = state.camera.x;
  const camY = state.camera.y;
  const cullW = gameWidth / 2 + 90;
  const cullH = gameHeight / 2 + 90;

  particles.forEach(p => {
    // 60FPS Frustum Culling
    if (Math.abs(p.x - camX) > cullW || Math.abs(p.y - camY) > cullH) return;

    ctx.save();
    if (p.isPixelCross) {
      // 십자 다이아몬드 코어 플레어 (pixelfx/impacts/hit-spark)
      const prog = 1 - p.life / p.maxLife;
      const sz = p.size * (1 - prog * 0.4);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      // 다이아몬드 중심 코어
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -sz * 0.38);
      ctx.lineTo(sz * 0.38, 0);
      ctx.lineTo(0, sz * 0.38);
      ctx.lineTo(-sz * 0.38, 0);
      ctx.closePath();
      ctx.fill();
      // 긴 수평/수직 도트 광선
      ctx.fillStyle = p.glowColor;
      ctx.fillRect(-sz, -1.2, sz * 2, 2.4);
      ctx.fillRect(-1.2, -sz * 0.55, 2.4, sz * 1.1);

    } else if (p.isPixelSlash) {
      // 픽셀 검기 궤적 (pixelfx/melee/sword-slash)
      const prog = 1 - p.life / p.maxLife;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 4.5 * (1 - prog);
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, -0.65, 0.65);
      ctx.stroke();

    } else if (p.isPixelSpark || p.isPixelDissolve || p.isPixelSparkle) {
      // 도트 픽셀 파티클 (pixelfx 사각형 픽셀)
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);

    } else if (p.isPixelDust) {
      // 신법 대시 흙먼지 픽셀 (pixelfx/moves/dust-dash)
      const prog = 1 - p.life / p.maxLife;
      const sz = p.size * (1 + prog * 0.7);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = (1 - prog) * 0.75;
      ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);

    } else if (p.isSlashArc) {
      ctx.translate(p.x, p.y);
      ctx.scale(p.facing, 1);
      const prog = 1 - p.life / p.maxLife;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 6 * (1 - prog);
      ctx.globalAlpha = 1 - prog;

      ctx.beginPath();
      ctx.arc(0, 0, 62, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5 * (1 - prog);
      ctx.stroke();

    } else if (p.isBloodSpike) {
      // 지열혈파 (地裂血波) 솟구치는 거대 혈암 바위 가시 (Towering Erupting Blood & Obsidian Rock Spikes)
      const prog = 1 - p.life / p.maxLife;
      let currentH = 0;
      if (prog < 0.16) {
        currentH = (prog / 0.16) * p.maxHeight;
      } else if (prog < 0.68) {
        currentH = p.maxHeight + Math.sin(prog * 35) * 2;
      } else {
        currentH = p.maxHeight * (1 - (prog - 0.68) / 0.32);
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      const alpha = Math.min(1.0, p.life / 0.25);
      ctx.globalAlpha = alpha;

      // 접지면 타원 그림자
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 2, p.width * 0.75, p.width * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // 뾰족한 삼각 혈암 바위 기둥 (음영 분할 입체 표현)
      const halfW = p.width / 2;
      ctx.fillStyle = '#1e1b4b'; // 어두운 흑요석 면
      ctx.beginPath();
      ctx.moveTo(0, -currentH);
      ctx.lineTo(-halfW, 0);
      ctx.lineTo(0, 3);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = p.color; // 붉은 혈석 발광면
      ctx.beginPath();
      ctx.moveTo(0, -currentH);
      ctx.lineTo(halfW, 0);
      ctx.lineTo(0, 3);
      ctx.closePath();
      ctx.fill();

      // 기둥 중심 핏빛 균열 맥
      ctx.strokeStyle = '#fca5a5';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, -currentH);
      ctx.lineTo(2, -currentH * 0.5);
      ctx.lineTo(0, 0);
      ctx.stroke();

      ctx.restore();

    } else if (p.isMbAfterimage) {
      // 흑풍삼단참 돌진 붉은 잔상 (Mini-Boss Dash Afterimage)
      const alpha = (p.life / p.maxLife) * 0.65;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(p.facing, 1);
      ctx.globalAlpha = alpha;
      // Zero-cost hardware additive flash (무거운 ctx.filter 제거로 60FPS 보장)
      if (p.sprite && (p.sprite.complete || p.sprite.width > 0)) {
        ctx.drawImage(p.sprite, -p.mw / 2, -p.mh + 22, p.mw, p.mh);
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
        ctx.fillRect(-p.mw / 2, -p.mh + 22, p.mw, p.mh);
      }
      ctx.restore();

    } else if (p.isMbSlashWave) {
      // 흑풍삼단참 종점 거대 혈풍 초승달 검기파 (Colossal Crimson Crescent Slash Wave)
      const prog = 1 - p.life / p.maxLife;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      const alpha = Math.min(1.0, (1 - prog) * 1.6);
      ctx.globalAlpha = alpha;

      // 외곽 거대 혈풍 초승달 검기호
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 15 * (1 - prog * 0.5);
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 26;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius * (0.8 + prog * 0.3), -Math.PI * 0.55, Math.PI * 0.55);
      ctx.stroke();

      // 내부 백열 절단 광인
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4 * (1 - prog * 0.5);
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius * (0.8 + prog * 0.3), -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();

      ctx.restore();

    } else if (p.isRing) {
      const progress = 1 - p.life / p.maxLife;
      const currentR = p.r + (p.maxR - p.r) * progress;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3 * (1 - progress);
      ctx.globalAlpha = 1 - progress;
      ctx.beginPath();
      ctx.arc(p.x, p.y, currentR, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });

  damageTexts.forEach(d => {
    ctx.save();
    ctx.font = `bold ${d.size}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.globalAlpha = Math.min(1, d.life * 2);
    // 60FPS Crisp Text Outline (무거운 shadowBlur 래스터라이저 제거)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.strokeText(d.text, d.x, d.y);
    ctx.fillStyle = d.color;
    ctx.fillText(d.text, d.x, d.y);
    ctx.restore();
  });
}

function renderPlumBlossoms() {
  environmentPetals.forEach(p => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = 'rgba(251, 113, 133, ' + p.opacity + ')';
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function renderHerbs() {
  herbs.forEach(h => {
    ctx.save();
    ctx.translate(h.x, h.y);
    const pulse = Math.sin(state.gameTime * 4 + h.x) * 3;
    const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, 26 + pulse);
    grad.addColorStop(0, 'rgba(52, 211, 153, 0.7)');
    grad.addColorStop(1, 'rgba(52, 211, 153, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 26 + pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🌿', 0, 0);

    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#6ee7b7';
    ctx.shadowColor = '#065f46';
    ctx.shadowBlur = 6;
    ctx.fillText(h.type.split(' ')[0], 0, -18);
    ctx.restore();
  });
}

function renderChests() {
  chests.forEach(c => {
    ctx.save();
    ctx.translate(c.x, c.y);
    const bounce = Math.sin(state.gameTime * 5 + c.x) * 3;
    const grad = ctx.createRadialGradient(0, bounce, 6, 0, bounce, 30);
    grad.addColorStop(0, 'rgba(251, 191, 36, 0.8)');
    grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, bounce, 30, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📦', 0, bounce);

    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#fde68a';
    ctx.shadowColor = '#b45309';
    ctx.shadowBlur = 8;
    ctx.fillText(c.isBossChest ? '★ 대첩 비급함 ★' : '황금 비급함', 0, bounce - 22);
    ctx.restore();
  });
}

function renderOffscreenGuides() {
  const halfW = gameWidth / 2 - 55;
  const halfH = gameHeight / 2 - 55;

  const targets = [];
  // 1. 중간보스 & 구역 보스 상시 나침반 레이더 (최우선 순위 가이드!)
  enemies.forEach(e => {
    if (e.isMiniBoss) {
      targets.push({ x: e.x, y: e.y, tag: `👹 [중간보스] ${e.name}`, color: '#f59e0b', isPriority: true });
    } else if (e.isBoss) {
      targets.push({ x: e.x, y: e.y, tag: `☠️ [구역군주] ${e.name}`, color: '#ef4444', isPriority: true });
    }
  });

  // 2. 포탈, 영약, 비급함, 기연 신단, 드롭 장비
  if (state.victoryPortal && state.victoryPortal.active) {
    targets.push({ x: state.victoryPortal.x, y: state.victoryPortal.y, tag: '🌀 [다음 관문] 진격 포탈', color: '#fbbf24', isPriority: true, isPortal: true });
  }
  herbs.forEach(h => targets.push({ x: h.x, y: h.y, tag: '🌿 영약', color: '#34d399' }));
  chests.forEach(c => targets.push({ x: c.x, y: c.y, tag: '📦 비급함', color: '#fbbf24' }));
  shrines.forEach(s => {
    if (s.active) targets.push({ x: s.x, y: s.y, tag: `${s.icon} ${s.name}`, color: s.color, isPriority: true });
  });
  // droppedItems radar markers removed for smooth performance

  // 화면 가장자리 길안내: 긴 글씨 띠 대신 작은 동그라미 아이콘 + 방향 화살표 + 거리
  targets.forEach(t => {
    const relX = t.x - state.camera.x;
    const relY = t.y - state.camera.y;
    const dist = Math.hypot(relX, relY);
    if (Math.abs(relX) <= halfW && Math.abs(relY) <= halfH) return;

    const angle = Math.atan2(relY, relX);
    // 화면 사각형 테두리에 붙이기 (위쪽은 정보창 자리를 피해서 조금 더 안쪽)
    const topPad = 70;
    const c = Math.cos(angle), s = Math.sin(angle);
    const limX = halfW - 6, limY = halfH - 6;
    const k = Math.min(limX / Math.max(Math.abs(c), 1e-6), (s < 0 ? limY - topPad : limY) / Math.max(Math.abs(s), 1e-6));
    const ex = c * k, ey = s * k;
    const icon = (t.tag.match(/^\S+/) || ['•'])[0];
    const r = t.isPriority ? 19 : 15;

    ctx.save();
    ctx.translate(state.camera.x + ex, state.camera.y + ey);
    const pulse = t.isPortal || t.isPriority ? 1 + Math.sin(state.gameTime * 6) * 0.06 : 1;
    ctx.scale(pulse, pulse);
    // 방향 화살표
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.moveTo(r + 9, 0);
    ctx.lineTo(r + 1, -6);
    ctx.lineTo(r + 1, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // 동그라미
    ctx.fillStyle = 'rgba(10, 14, 22, 0.88)';
    ctx.strokeStyle = t.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = `${t.isPriority ? 17 : 14}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 0, 1);
    // 거리 (중요 표시만)
    if (t.isPriority) {
      ctx.font = 'bold 10px sans-serif';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      const label = `${Math.round(dist / 10)}m`;
      ctx.strokeText(label, 0, r + 10);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(label, 0, r + 10);
    }
    ctx.restore();
  });

}


// --- Wuxia Ending Epilogue Credits Controller ---
