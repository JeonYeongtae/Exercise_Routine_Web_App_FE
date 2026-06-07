# 홈PT · 운동 루틴 PWA

집에서 PT 받듯 진행하는 개인용 운동 루틴 앱. 맨몸 푸시업 + 치닝디핑(턱걸이/딥스) 기구를
활용해, **개수만 늘어나는 정체기**에서 벗어나도록 *난이도를 단계적으로 올리는* 진행 엔진을 갖췄습니다.

## 핵심 기능 (MVP)

- 📅 **캘린더** — 날짜별 예정 루틴 / 완료 기록을 한눈에
- ▶️ **실시간 운동 가이드** — 나이키런 스타일. 세트·휴식 타이머, **한국어 음성 코칭**, 비프음,
  진동, 화면 꺼짐 방지(Wake Lock)
- 📈 **자동 과부하(progressive overload) 엔진** — 세트마다 강도(RPE)를 입력하면,
  목표를 다 채웠을 때 횟수를 올리고 → 범위 최대치에 도달하면 **더 어려운 변형으로 자동 승급**
- 🥤 **단백질 기록** — 체중 기반 목표 단백질(g) 대비 섭취량 추적, 빠른 추가 프리셋
- 🔔 **예약 운동 알림** — "앱을 안 열어도 오는" 푸시 알림 (별도 백엔드, 아래 참고)
- ⚙️ **설정** — 운동 시작점(변형·세트·목표) 직접 조정 + 알림 관리
- 💾 **오프라인 우선** — 모든 데이터는 폰 안(IndexedDB)에 저장, 인터넷 없이 동작

## 운동 설계 의도

푸시업을 한 세트 15~20개 이상 하면 그건 근비대보다 **근지구력** 자극입니다.
그래서 이 앱은 개수 무한 증가 대신, **근비대 구간(6~12회)을 유지하며 난이도를 올리는**
"난이도 사다리"로 진행합니다.

| 사다리 | 단계 (쉬움 → 어려움) |
|---|---|
| 가슴 밀기 | 무릎 푸시업 → 일반 → 디클라인 → 아처 → 의족 푸시업 |
| 가슴·삼두 | 벤치 딥스 → 딥스 → 템포 딥스 |
| 등·이두 | 데드행 → 네거티브 풀업 → 친업 → 풀업 |
| 코어 | 플랭크 → 행잉 니레이즈 → 행잉 레그레이즈 |

> 출발점은 정체기 탈출을 위해 "개수↓ 난이도↑"로 잡혀 있습니다(예: 푸시업은 디클라인 10회부터).
> 너무 쉽거나 어려우면 **앱 설정 → 운동 시작점 조정**에서 변형·세트·목표를 바로 바꿀 수 있어요
> (기본값은 `src/domain/progression.ts`의 `initialProgress()`).

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 프로덕션 빌드 (PWA 서비스워커 생성)
npm run preview  # 빌드 결과 미리보기
```

## 아이폰에 "앱처럼" 설치하기

PWA는 App Store·심사·연 $99 없이 홈 화면 앱이 됩니다.

1. 앱을 **HTTPS 주소**로 배포 (무료: Vercel / Netlify / Cloudflare Pages 등)
2. 아이폰 **Safari**로 그 주소 접속
3. 공유 버튼 → **"홈 화면에 추가"**
4. 홈 화면 아이콘으로 실행하면 주소창 없는 전체화면 앱

> ⚠️ 푸시 알림은 iOS 16.4+에서, **"홈 화면에 추가"로 설치한 PWA**에서만 동작합니다.
> (자세한 내용은 아래 Phase 2)

## 기술 스택

- React 19 + Vite 8 + TypeScript
- Dexie.js (IndexedDB) — 로컬 저장
- vite-plugin-pwa (Workbox) — 서비스워커 / 매니페스트
- Web Speech / Wake Lock / Vibration / Web Audio — 실시간 코칭 (모두 브라우저 내장)

## 폴더 구조

```
src/
  domain/        # 운동 도메인 (순수 로직, UI 무관)
    types.ts        타입
    exercises.ts    운동 라이브러리 + 난이도 사다리
    progression.ts  ★ 과부하 엔진 (PT 두뇌)
    nutrition.ts    단백질 목표 계산 + 식품 프리셋
  db/db.ts       # Dexie 스키마(progress/sessions/settings/protein) + 초기 시드
  lib/           # coach(음성/비프/진동), date 유틸, push(웹 푸시 구독)
  hooks/         # useWakeLock
  pages/         # Today / Calendar / WorkoutPlayer / Progress / Protein / Settings
public/push-sw.js  # 푸시 핸들러(생성된 SW가 importScripts)
```

## 예약 푸시 알림 (구현됨)

iOS PWA에는 "예약 로컬 알림" API가 없어, "앱을 안 열어도 오는 운동 알림"은
**외부 푸시 서버**가 필요합니다. 별도 백엔드로 구현돼 있습니다:

- 백엔드: [Exercise_Routine_Web_App_BE](../Exercise_Routine_Web_App_BE) — Node + `web-push`(VAPID) + `node-cron`
- 클라이언트: 설정 화면에서 서버 주소·시간 지정 → 권한 요청 → 구독 등록 → 서버가 운동일 정시에 푸시
- 무료 호스팅(Render 등)에 배포

> 알림 없이도 "운동 시작 → 실시간 진행"은 100% 동작합니다. 알림은 부가 기능입니다.

## 배포 & 실기기 점검

음성·진동·Wake Lock·푸시는 실제 아이폰에서 동작이 다릅니다. 배포 방법과 점검
체크리스트는 **[docs/DEPLOY_AND_TEST.md](docs/DEPLOY_AND_TEST.md)** 참고.
