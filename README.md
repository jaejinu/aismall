# AI Small Business OS

**한국어** · [English](README.en.md)

예약 중심 소규모 사업자(1~5인 필라테스·요가 스튜디오)를 위한 운영 플랫폼의 UX 기획·디자인·퍼블리싱 프로젝트예요.
문의·예약·회차·고객을 한곳에서 다루고, 반복 업무는 **AI가 제안하고 사람이 승인해서 실행**해요.
핵심은 자동화 자체가 아니라 "AI가 무엇을 하려는지 이해하고 통제할 수 있는 경험"이에요.

**데모** · https://aismall.vercel.app (첫 화면이 포트폴리오 소개와 전체 화면 목록이에요)  
**케이스 스터디** · https://aismall.vercel.app/case-study (왜 그렇게 정했는지 — 원칙, 기획 감사, 승인 카드 A/B/C와 사용성 테스트 계획, 실패 설계)

![관리자 승인함 — AI가 제안한 예약 요청과 승인 카드](src/assets/showcase/approvals.png)

> 1차 범위는 리서치 → UX/UI → 디자인 시스템 → 프로토타입 → 퍼블리싱이에요. 실제 AI·서버 연결은 2차 범위라, 화면 데이터는 모두 샘플이고 새로고침하면 처음 상태로 돌아가요.
> 샘플 기준: 2026-10-14(수) 13:00, 재진필라테스 강남점, 사업장 오너 홍지수. 등장하는 사람과 연락처는 모두 지어낸 것이에요.

## 먼저 볼 화면

| 화면 | 주소 | 볼 것 |
| --- | --- | --- |
| 관리자 오늘 | [`/admin/today`](https://aismall.vercel.app/admin/today) | 브리핑, 오늘 회차, 확인이 필요한 일(예약은 완료·메시지는 실패) |
| 승인함 | [`/admin/approvals`](https://aismall.vercel.app/admin/approvals) | AI 제안 승인 카드 — 실행할 행동, 회원에게 갈 메시지, 근거 펼치기, 수정·거절 |
| 관리자 모바일 | [`/mobile/today`](https://aismall.vercel.app/mobile/today) | 오늘·승인함·문의함·일정·더보기 5개 탭 · 잠금 화면 알림 → 카드 → 다시 확인 → 일부 실패 → 다시 보내기 |
| AI 권한 | [`/admin/settings/ai`](https://aismall.vercel.app/admin/settings/ai?as=admin&preview=reminder) | 업무 유형별 수준, 끌 수 없는 규칙, 바꾸기 전 영향 미리보기, 본인 확인 |
| 활동 기록 | [`/admin/activity`](https://aismall.vercel.app/admin/activity) | 누가·무엇을·왜 — 사건 단위로 다시 보기(정책 결정·다음 행동) |
| 회원 앱 | [`/member/home`](https://aismall.vercel.app/member/home) | 회원이 직접 예약·대기 신청, 참석 확인, 휴강 안내 |

관리자 데스크톱(오늘·문의함·승인함·일정·회차·출석부·휴강·예약·프로그램·회원·AI 관리·활동 기록·설정), 관리자 모바일(오늘·승인함·문의함·일정·출석부·더보기), 회원 모바일, 비회원 공개 문의 화면이 있어요.

## 문제 → 결정

### 01 · 승인 카드: 짧은 시간에 무엇이 바뀌는지 알 수 있게
AI가 '예약 만들고 메시지 보내기'를 하려 할 때, 정보가 많으면 읽지 않고 승인하고 적으면 불안해서 누르지 못해요. 같은 요청을 세 가지 밀도(A 전부 · B 요약 · C 핵심 + 근거 펼치기)로 만들고 사용성 테스트(Test A)로 고르기로 했어요. 지금 화면은 C안이에요.

<p>
  <img src="src/assets/showcase/test-a-card-a.png" width="230" alt="승인 카드 A안 — 전부" />
  <img src="src/assets/showcase/test-a-card-b.png" width="230" alt="승인 카드 B안 — 요약" />
  <img src="src/assets/showcase/test-a-card-c.png" width="230" alt="승인 카드 C안 — 핵심과 근거 펼치기" />
</p>

### 02 · 실행 결과: 실패를 숨기지 않아요
예약은 됐는데 알림톡만 실패하면 '처리 완료'로는 아무도 몰라요. 실행 직전에 정원·정책·연결을 다시 확인하고, 결과는 "된 것 · 안 된 것 · 다음 행동"으로 보여 주고 실패한 메시지만 다시 보내요.

<p>
  <img src="src/assets/showcase/m-push.png" width="230" alt="잠금 화면 승인 알림" />
  <img src="src/assets/showcase/m-result.png" width="230" alt="실행 결과 — 예약은 확정, 메시지만 실패" />
</p>

### 03 · AI 권한: 좁히기만, 어떤 규칙은 끌 수 없게
자동 실행은 위험 낮음만, 예약 생성·변경·취소는 항상 승인 후 실행. 지점(사업장 오너)은 브랜드 기본값보다 좁히기만 하고, 수신 동의 없는 회원에게 메시지·노쇼 위험을 이유로 한 예약 제한은 설정으로도 바꿀 수 없어요.

![AI 권한 — 업무 유형별 수준, 끌 수 없는 규칙, 변경 미리보기](src/assets/showcase/ai-permissions.png)

### 04 · 회원 앱: 회원은 직접, 확인도 회원이
회원은 수업을 직접 신청·변경·취소하고, AI 도우미는 예약 초안만 만들어요. 회원이 버튼을 눌러야 예약돼요.

<p>
  <img src="src/assets/showcase/member-home.png" width="230" alt="회원 홈" />
  <img src="src/assets/showcase/member-assist.png" width="230" alt="회원 AI 도우미" />
</p>

### 05 · 관리자 모바일: 수업 사이에 폰으로, 넓은 일은 PC로
모바일은 오늘·승인함·문의함·일정 네 가지(와 출석부)만 깊게 만들고, 설정·활동 기록처럼 넓은 화면이 필요한 메뉴는 PC로 연결해요. 문의 답장은 AI 초안을 사람이 고쳐서 보내고, 지시를 바꾸려는 의심 문의에는 초안을 만들지 않아요.

<p>
  <img src="src/assets/showcase/m-admin-today.png" width="230" alt="관리자 모바일 오늘" />
  <img src="src/assets/showcase/m-inbox-draft.png" width="230" alt="문의 대화 — AI 초안을 사람이 보내요" />
  <img src="src/assets/showcase/m-inbox-flagged.png" width="230" alt="의심 문의 — 초안 없이 직접 답장" />
</p>

## 설계에서 지킨 원칙

- **AI는 제안, 사람은 승인** — 자동 실행은 위험 낮음만. 위험 중간은 같은 유형을 묶어 한 번에 승인. AI의 예약 생성·변경·취소는 항상 승인 후 실행.
- **끌 수 없는 규칙** — 수신 동의 없는 회원에게 메시지 금지, 노쇼 위험을 이유로 예약 제한 금지 등은 권한 설정으로도 바꿀 수 없어요.
- **실패를 숨기지 않기** — 결과는 "된 것 · 안 된 것 · 다음 행동"으로 보여 줘요(예: 예약은 확정, 메시지만 실패).
- **권한은 좁히기만** — 브랜드 기본값(최고관리자) 아래에서 지점(사업장 오너)은 더 좁히기만 해요.
- **시간이 지나도 출석이 아니에요** — 이용 결과(미확인·출석·노쇼)는 예약 상태와 따로 기록해요.
- **한국어 표시명** — 화면에는 오늘·문의함·승인함·지켜보기 모드처럼 한국어만 써요.

결정 근거는 [`docs/reference/decisions-D01-D15.md`](docs/reference/decisions-D01-D15.md), 진행 기록은 [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md)에 있어요.

## 과정

1. **기획** — PRD·요구사항·기능·스펙·정책을 정리하고, 외부 검토 의견(D-01~D-15)을 반영했어요. 유저플로우와 와이어프레임까지.
2. **디자인 시스템** — Figma 변수(색 라이트·다크, 간격, 반경), 텍스트 스타일 10개, 컴포넌트 57개.

   <img src="src/assets/showcase/figma-foundations.png" width="420" alt="Figma 색 변수 — 라이트 모드" />

3. **사용성 테스트 준비(Test A)** — 승인 카드 A/B/C안 비교 계획, 진행 대본, 기록 양식.
4. **퍼블리싱** — Figma 변수를 CSS 토큰으로 1:1 옮기고, 화면끼리 데이터가 맞도록 기준 데이터([`docs/reference/canonical-data.md`](docs/reference/canonical-data.md)) 하나를 함께 써요.

## 기술

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 — `src/app/globals.css`에 Figma 변수와 1:1인 디자인 토큰, 다크 모드
- lucide-react 아이콘 · tailwind-merge
- Vercel 배포
- 도구: Figma, manyfast(기획 문서), Claude Code(AI 페어 프로그래밍)

## 실행

```bash
npm install
npm run dev   # http://localhost:3000
```

## 구조

| 위치 | 내용 |
| --- | --- |
| `src/app/admin/` | 관리자 데스크톱 화면 |
| `src/app/mobile/` | 관리자 모바일 화면(오늘·승인함·문의함·일정·출석부·더보기) |
| `src/app/member/` | 회원 모바일 화면 |
| `src/components/ui/` | 공통 컴포넌트(배지·버튼·필터 칩·토글·회차 줄 등) |
| `src/data/` | 샘플 데이터 — 모든 화면이 같은 기준 데이터를 써요 |
| `src/assets/showcase/` | 첫 화면·README 스크린샷 |
| `docs/` | 진행 현황, 결정 기록, Figma 규칙, 기준 데이터 |
