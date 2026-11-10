# 브라우저 자동화 (제미나이 그림 · Flow 영상)

전용 **크롬** 창을 원격 조종 포트(9444)로 띄워 두고, 로그인은 사람이 직접 함. (Edge는 안 씀)

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9444 --user-data-dir="$env:USERPROFILE\.cinema-chrome" --no-first-run --disable-features=CalculateNativeWinOcclusion --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-timer-throttling https://gemini.google.com/app https://flow.google.com
```
스크립트는 포트 9444 에 붙기만 하므로 크롬이든 Edge든 그대로 동작함. 한 번에 하나만 띄울 것 (같은 포트).

| 스크립트 | 하는 일 |
|---|---|
| `cdp.mjs <탭> <명령>` | 탭 목록·캡처·클릭·입력·파일 넣기 (`tabs`, `shot`, `eval`, `click`, `type`, `key`, `choose`, `front`) |
| `gem.mjs <저장.png> <프롬프트.txt> [첨부...]` | 제미나이 지금 대화에 그림 요청 → 원본 다운로드 → 저장 (16:9·Pro 모델은 화면에서 미리 골라 둠) |
| `flow_gen.mjs <에셋 이름> <프롬프트.txt> [--attached]` | Flow 에이전트에 '이 그림을 첫 프레임으로 영상 2개' 요청 → 48크레딧 확인창만 승인 (다르면 멈춤) |
| `flow_dl.mjs <폴더> <개수> [720p\|1080p] [순번:이름,...]` | Flow 영상 보기 화면에서 '다음 미디어'로 넘기며 다운로드 |

주의
- 창이 다른 창에 완전히 가려지거나 최소화되면 브라우저가 그리기를 멈춰 메뉴·파일 선택창이 안 열림 → 위의 `--disable-...occlu...` 옵션으로 띄우면 가려져도 동작함 (최소화는 여전히 피할 것)
- 다시 띄우면 제미나이는 '이미지 만들기' 도구·16:9·Pro 를 다시 골라야 함
- Flow 영상에는 생성 표시(✦)가 들어감. 지우거나 가리지 않음 (약관). 표시 없는 영상은 상위 요금제 기능
- 프롬프트 원본: `tools/cinema/prompts/` (p_* 제미나이 그림, fp_* Flow 움직임)
- 비용(2026-11): Omni 1.2 Flash 8초 영상 1개 24크레딧, 1080p 업스케일은 크레딧 없이 됨. 피·죽음 장면은 가끔 정책으로 실패(환불)
