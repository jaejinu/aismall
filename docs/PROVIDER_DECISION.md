# DB·인증 공급자 선정

기준일: 2026-10-13. [현재 아키텍처](ARCHITECTURE.md) · [Supabase 연결 절차](SUPABASE_SETUP.md)

## 선정안

첫 연결 대상은 **Supabase PostgreSQL + Supabase Auth**예요. 사용자는 기존 Supabase 계정에 새 프로젝트를 사용하기로 했어요. 개발 프로젝트는 `aismall-dev`, 서울 `ap-northeast-2`에 생성했고 마이그레이션·runtime 계정·TLS·원격 격리 검증을 완료했어요. 실제 프로젝트 생성·원격 연결 검증 완료 여부는 [진행 현황](PROJECT_STATUS.md)에서 확인해요.

업무 DB는 기존 node-postgres와 자체 RLS를 유지해요. 인증 공급자의 조직 기능에 업무 모델을 맡기지 않고, `app.tenants`·`staff_memberships`·`branch_assignments`가 권한의 기준이에요. 특정 공급자 독립 기반이라는 이전 결정과 양립해요. 호스팅과 인증 어댑터만 구체화하는 단계예요.

## 비교와 판단

| 선택지 | 이 프로젝트에 적용했을 때 | 판단 |
| --- | --- | --- |
| Supabase DB + Supabase Auth | PostgreSQL과 인증을 한 프로젝트에서 관리. 자체 조직·지점 모델을 유지 | 초기 선택 |
| Supabase DB + Clerk | 인증 전용 서비스와 DB를 따로 연결. Clerk Organizations를 도입하면 자체 조직 모델과 동기화 설계도 필요 | 기업 SSO·인증 관리 요구가 구체화될 때 재검토 |
| PostgreSQL 직접 운영 + 별도 인증 | 호스팅 제어 범위가 넓지만 DB 패치·백업·장애 대응과 인증 운영 책임도 커짐 | 초기 운영 인력 기준으로 보류 |

이는 현재 저장소와 운영 규모에 대한 설계 판단이에요. Clerk의 조직·인증 기능 및 과금 단위는 [공식 요금표](https://clerk.com/pricing), Supabase의 호스팅·인증 범위는 [공식 요금표](https://supabase.com/pricing)를 확인했어요. 모든 공급자의 기능을 동등 조건으로 벤치마크한 결과는 아니에요.

## 지역·환경·비용

- 서울 리전을 선택할 수 있어요. 일반 Asia-Pacific 대신 specific region을 지정해요. 앱 서버 실행 지역도 DB와 가깝게 맞추되 기존 공개 배포 설정은 이번에 변경하지 않아요. [공식 리전 목록](https://supabase.com/docs/guides/platform/regions)
- 개발 검증은 Free로 시작할 수 있어요. 무료는 활성 프로젝트 2개 제한과 비활성 1주 후 중지가 있어요. 현재 계정에 프로젝트 2개가 표시되어 추가 생성 가능 여부를 생성 화면에서 확인해야 해요.
- 운영 예산 기준은 Pro 월 **$25부터**, 첫 프로젝트 포함이에요. 추가 프로젝트는 월 $10부터이며 compute·사용량·선택 기능·세금에 따라 달라져요. 개발/운영 두 프로젝트를 같은 Pro 조직에 두면 최소 예산 예시는 월 $35부터예요. 무료와 운영 플랜을 최종 비용 확정으로 취급하지 않아요. [요금과 계산 기준](https://supabase.com/pricing)
- Free와 운영은 환경을 분리해요. 기존 타 프로젝트를 삭제·정지하거나 유료로 바꾸는 것은 이번 기본 작업에 포함하지 않아요.
- Free에는 자동 백업이 포함되지 않아요. Pro의 일일 백업도 테넌트별 복구를 자동 해결하지 않으므로 출시 전 별도 복원 연습이 필요해요. [백업·요금 범위](https://supabase.com/pricing)

## 연결 방식

서버리스 앱은 Supavisor transaction pooler의 제한된 `aismall_runtime` LOGIN을 사용해요. 마이그레이션은 관리자 권한의 direct 또는 session 연결로 따로 실행해요. 같은 연결에서 BEGIN → 로컬 사용자/조직 컨텍스트 → 질의 → COMMIT을 수행하는 현재 구조를 유지해요. named prepared statements나 세션에 남는 컨텍스트를 추가하지 않아요. [연결 모드](https://supabase.com/docs/guides/database/connecting-to-postgres)

업무 스키마 `app`·`app_private`는 Data API에 노출하지 않아요. 현재 설계는 서버가 pg로 접근하므로 Data API와 자동 테이블 공개를 끄는 기준이에요. 기존 SQL 마이그레이션이 RLS를 적용하므로 public 스키마 자동 RLS 옵션으로 대체하지 않아요. [API 보안](https://supabase.com/docs/guides/api/securing-your-api)

TLS는 인증서·호스트를 검증하는 `verify-full`을 사용해요. 인증서 오류가 나면 공급자의 CA를 설정하고, `rejectUnauthorized: false`로 해결하지 않아요. [SSL 문서](https://supabase.com/docs/guides/platform/ssl-enforcement)

## 인증 연동 설계와 남은 구현

1. 첫 로그인 방식은 이메일·비밀번호와 이메일 확인을 기본안으로 해요. 비밀번호 저장·해시는 Supabase Auth가 담당해요.
2. Next.js SSR 세션 갱신과 서버 검증을 구현해요. 클라이언트가 제공하는 user/role 또는 `getSession()`의 user만으로 권한을 판단하지 않아요. 인증 서버의 최신 사용자 상태가 필요한 곳은 `getUser()`를 사용해요. [SSR 인증 가이드](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
3. 검증된 issuer/subject를 내부 `app.users.id`에 매핑해요. 사용자 이메일 일치만으로 기존 계정을 합치지 않아요. 현재 users의 RLS는 내부 ID를 요구하므로 로그인 이전 매핑을 위한 최소 범위 서비스와 테스트를 0002 마이그레이션과 함께 추가했어요.
4. 내부 사용자 생성과 조직 가입은 다른 작업이에요. 로그인 성공이 조직 접근을 허용하지 않으며 기존 `withTenant` 검사를 거쳐요.
5. PKCE 콜백·안전한 복귀 URL·로그아웃·권한 회수·쿠키/CSRF 방어·로그인 오류/속도 제한을 함께 구현해요. 운영 경로와 공개 데모를 구분해요.

10/14 인증 어댑터·로그인 UI·첫 조직 생성을 구현했어요. 현재 검증 범위는 [로그인·온보딩](AUTH_ONBOARDING.md)을 봐요. 이메일 확인·초대·비밀번호 재설정을 실제 고객에게 보내려면 custom SMTP가 필요해요. 기본 메일 발송은 프로젝트 팀 주소 등으로 제한되어 있어요. [공식 SMTP 제한](https://supabase.com/docs/guides/auth/auth-smtp)

## 완료 기준

프로젝트 생성 → 별도 실행 역할과 TLS → 마이그레이션 → 읽기 전용 연결 점검 → 실제 공급자에서 두 조직 격리 테스트 → 로그인 어댑터·내부 ID 매핑 테스트를 차례로 확인해요. 로컬 통합 테스트 통과만으로 원격 DB·실제 인증까지 완료했다고 기록하지 않아요.
