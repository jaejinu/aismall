# AI Small Business OS

[English](README.en.md) · [공개 데모](https://aismall.vercel.app) · [포트폴리오](docs/PORTFOLIO.md)

필라테스·요가·클래스처럼 예약 중심으로 운영하는 소규모 사업장을 위한 플랫폼이에요. 문의 → 예약 → 회차 → 출석 → 고객 관리를 연결하고, 반복 업무는 **AI가 제안하고 사람이 승인**하는 방식으로 발전시켜요.

여러 사업장에 제공하는 **멀티테넌트 SaaS**가 목표예요. 독립 조직·브랜드를 테넌트로, 그 아래 매장을 지점으로 구분해요. 한 계정이 여러 조직에 소속될 수 있지만 각 조직의 데이터와 권한은 분리해요.

## 현재 구현 범위

| 영역 | 현재 상태 |
| --- | --- |
| UX·화면 | 기존 데모 47개 + 로그인·조직·직원 개발 화면 4개 |
| 공개 데모 | 샘플 데이터와 화면 내 상태로 동작. 실제 운영 데이터 저장·인증 없음 |
| 서버 기반 | PostgreSQL 스키마, 조직·지점 RLS, 서버 소속 검사, 지점 조회·이름 변경 서비스 |
| 개발 DB | Supabase 서울: 마이그레이션·앱 전용 역할·TLS·원격 격리 검사 완료 |
| 변경 안전성 | 예상 버전 검사, 트랜잭션, 지점 이름 변경 감사 기록 |
| 검증 | 임시 PostgreSQL의 제한된 실행 계정으로 격리·권한·실패·동시 수정 테스트 |
| 로그인·온보딩 | 서버 인증·내부 사용자 연결·첫 조직과 지점 생성 구현. 실제 계정 로그인·조직/지점 조회·로그아웃 차단 확인 |
| 직원 관리 | 이메일에 연결된 일회용 코드 초대·수락, 지점/역할 배정, 접근 회수·감사 구현 |
| 아직 필요한 것 | 예약 운영 UI 연결, 예약 DB, 알림·결제·AI 실행·운영 인프라 |

기존 공개 데모는 샘플 데이터를 유지해요. 새 `/login`·`/workspace`에는 Supabase 인증과 DB 기반 조직·지점 흐름을 구현했어요. [로그인 사용법·검증 범위](docs/AUTH_ONBOARDING.md)를 봐요. **현재 공개 배포는 실사용 SaaS가 아니에요.**

## 문서 길잡이

| 궁금한 것 | 문서 |
| --- | --- |
| 어디까지 했고 다음에 무엇을 하나요? | [진행 현황·새 세션 체크리스트](docs/PROJECT_STATUS.md) |
| 코드 구조와 요청 흐름은 어떻게 되나요? | [현재 아키텍처](docs/ARCHITECTURE.md) |
| 여러 조직을 어떻게 분리하나요? | [멀티테넌트 설계와 확장 계획](docs/MULTITENANT_ARCHITECTURE.md) |
| DB·로그인은 어떤 공급자를 쓰나요? | [공급자 선정](docs/PROVIDER_DECISION.md) · [Supabase 설정](docs/SUPABASE_SETUP.md) |
| 로컬 실행·DB·테스트는 어떻게 하나요? | [개발 가이드](docs/DEVELOPMENT.md) |
| 실제 운영을 위해 무엇을 고쳐야 하나요? | [SaaS 운영 전환 점검](docs/SAAS_READINESS_REVIEW.md) |
| 기획·디자인 결정의 배경은 무엇인가요? | [포트폴리오](docs/PORTFOLIO.md) · [케이스 스터디](https://aismall.vercel.app/case-study) |
| 각 화면과 과거 작업은 어디 있나요? | [화면 목록](docs/reference/screens.md) · [전체 작업 로그](docs/reference/work-log.md) |

## 빠른 시작

Node.js 22.9 이상과 npm을 사용해요. 화면 데모 실행에는 DB가 필요하지 않아요.

```sh
npm ci
npm run dev
```

[localhost:3000](http://localhost:3000)에서 첫 화면과 전체 화면 목록을 볼 수 있어요.

```sh
npm run typecheck
npm run lint
npm test               # Docker 필요: 임시 PostgreSQL 생성 → 테스트 → 삭제
npm run build
```

DB 설정과 마이그레이션은 [개발 가이드](docs/DEVELOPMENT.md)를 따라요. `main` 푸시는 공개 배포로 이어지므로 커밋·푸시는 별도 요청이 있을 때만 해요.

## 기술과 구조

Next.js 16 App Router · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL 17 · node-postgres

```text
src/app/                  공개 데모와 관리자·회원 화면
src/components/           공통 UI·기능별 화면 구성
src/data/                 샘플 데이터 (운영 DB와 연결되지 않음)
src/server/auth/          검증된 세션 인터페이스
src/server/access/        조직 소속 확인·트랜잭션·RLS 컨텍스트
src/server/db/            제한된 실행 계정의 DB 연결 풀
src/server/services/      지점 조회·이름 변경 업무 서비스
db/migrations/            버전·체크섬으로 관리하는 SQL
scripts/                  마이그레이션·임시 DB 테스트 실행
tests/                    실제 DB 격리·권한 통합 테스트
docs/                     현황·설계·개발·운영 점검·기획 기록
```

두 실제 계정의 직원 초대·역할 변경·회수 검증을 완료했어요. 다음 구현 순서는 수동 예약 한 흐름 → 알림·복구·구독 → 승인형 AI예요. 운영 배포는 아직 하지 않았어요.

직원 초대와 권한 변경 사용법·제한·검증 범위는 [직원 관리](docs/TEAM_MANAGEMENT.md)를 봐요. 초대 메일은 자동 발송하지 않아요.
