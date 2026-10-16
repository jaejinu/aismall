# 개발·검증 가이드

[README](../README.md) · [현재 아키텍처](ARCHITECTURE.md)

## 요구 환경과 화면 실행

Node.js 22.9 이상, npm, DB 작업에는 Docker Engine/Desktop이 필요해요. 통합 테스트 기준 DB는 PostgreSQL 17이에요.

```sh
npm ci
npm run dev
```

공개 데모는 DB 없이 실행돼요. 새 Next.js 코드를 작성하기 전에 `AGENTS.md`와 `node_modules/next/dist/docs/`의 해당 가이드를 읽어요.

## 로컬 DB

```sh
docker compose up -d --wait
cp .env.example .env.local
npm run db:migrate
```

`.env.local`이 이미 있으면 덮어쓰지 말고 예시의 누락된 항목만 넣어요. macOS에서 docker 명령이 PATH에 없다면 `/Applications/Docker.app/Contents/Resources/bin/docker compose up -d --wait`를 사용할 수 있어요.

- 기본 주소는 127.0.0.1:55432, DB 이름은 `aismall`이에요. 충돌 시 `AISMALL_DB_PORT`를 바꾸고 URL도 맞춰요.
- `DATABASE_URL`: `aismall_runtime` 로그인. 서버 실행에만 사용해요.
- `DATABASE_ADMIN_URL`: `aismall_migrator` 로그인. 로컬 마이그레이션 명령에만 사용해요. 웹 런타임 배포에는 넣지 않아요.
- 예시 비밀번호는 로컬 전용이에요. 운영 비밀·TLS·네트워크·백업 설정은 공급자 결정 후 별도로 준비해요. 두 URL 모두 `NEXT_PUBLIC_`로 노출하지 않아요.
- 초기화 SQL은 빈 DB 볼륨을 처음 만들 때만 실행돼요. 기존 볼륨의 역할·비밀번호는 compose 환경변수 수정만으로 바뀌지 않아요.
- 로컬 마이그레이션은 빈 구조만 만들어요. 테스트 fixture는 임시 테스트 DB에만 들어가며 실제 앱 계정은 별도 준비하며 조직 생성은 로그인한 `/workspace`에서 진행해요.

중지할 때 `docker compose down`을 사용해요. 볼륨을 유지하므로 다음 실행에서도 데이터가 남아요.

## 마이그레이션과 공급자 전환

`npm run db:migrate`는 `.env.local`을 읽고 관리자 URL로 SQL 파일을 이름순 적용해요. 트랜잭션과 advisory lock으로 동시 실행을 직렬화하고, `aismall_migrations.versions`에 체크섬을 기록해요. 재실행은 이미 적용된 파일을 건너뛰며, 파일 내용이 바뀌면 실패해요. 다음 변경은 새 번호의 SQL로 작성해요.

첫 마이그레이션은 `aismall_app` NOLOGIN 역할이 없으면 만들어요. 관리형 DB에서는 역할 생성 권한이 제한될 수 있으므로 관리자가 이 역할을 먼저 만들고 마이그레이션 소유자와 **별도인** 최소 권한 LOGIN 역할에 부여해야 해요. runtime은 superuser·BYPASSRLS·테이블 소유자 또는 소유자 역할의 멤버이면 안 돼요. 로컬 초기화 예시는 `db/local/init.sql`이에요.

마이그레이션은 자동 배포 훅에 연결하지 않았어요. 스테이징·백업 복구 검증 후 별도 배포 절차로 적용해야 해요. 이번 기반에는 다운 마이그레이션·프로덕션 프로비저닝이 없어요.

## 테스트와 빌드

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

`npm test`는 설정/CLI 테스트 17개와 DB/서명/표시 테스트 113개를 실행해요. `npm run test:config`는 설정 테스트만, `npm run test:db`는 DB 테스트만 실행해요. `scripts/test-db.mjs`가 임의 이름·임의 localhost 포트의 임시 PostgreSQL 17 컨테이너를 만들어요. 로컬/운영 `DATABASE_URL`을 테스트 대상으로 사용하지 않아요. 마이그레이션을 두 번 적용해 재실행을 확인하고 테스트 후 자신의 컨테이너만 삭제해요. 데이터는 tmpfs에 저장돼요. Docker 경로는 `DOCKER_BIN`으로 지정할 수 있어요.

테스트는 제한된 실행 계정으로 조직/지점 격리, 인증 거부, 역할별 변경 권한, 같은 계정의 조직 전환, 커밋·롤백 뒤 컨텍스트 제거, 복합 FK, 권한 회수, 두 연결의 동시 버전 충돌, 감사 실패 롤백, 처리 중 세션 만료를 검사해요. 관리자 연결은 fixture 준비·검증·권한 회수 시뮬레이션에만 사용해요.

테스트 공급자는 테스트용 사용자만 반환해요. 이를 실제 인증 구현으로 사용하지 않아요. 예약 격리·정원 경합·취소는 포함하며 공개 데모 화면·AI·파일 격리는 별도예요.

`next build`는 현재 Google Fonts를 내려받으므로 네트워크가 필요할 수 있어요. 빌드 실패와 코드 검사 통과 여부는 구분해서 기록해요. 화면을 바꾸면 프로덕션 실행에서 시각 검증도 해요.

## Supabase 연결

첫 공급자는 Supabase PostgreSQL + Auth예요. [선정 근거](PROVIDER_DECISION.md)와 [연결 절차](SUPABASE_SETUP.md)를 봐요. `.env.supabase.example`을 참고하고, `npm run provider:check`로 네트워크 없이 설정 형식을 검사할 수 있어요. 서울 개발 DB에는 초기 마이그레이션·runtime 계정을 적용했어요. 실제 연결 검사는 `npm run provider:check -- --remote`로 실행해요.

## 작업 규칙

- 커밋·푸시는 요청받았을 때만 해요. 요청받으면 작업 브랜치를 푸시하고 `main` 대상 PR도 함께 생성해요. 같은 브랜치의 열린 PR이 있으면 제목·본문을 갱신해요.
- PR은 대화를 보지 않은 리뷰어도 이해하도록 한국어로 작성해요. 해결하려는 문제와 변경 이유, 주요 변경과 동작의 전후 차이, 실행한 검증과 결과, 남은 한계, 해당하는 DB 마이그레이션·환경 설정·배포 영향을 포함해요. 최종 변경 범위를 기준으로 작성하고 미실행 검증은 통과한 것처럼 쓰지 않아요. 기본 양식은 `.github/pull_request_template.md`예요.
- 완료 보고에는 커밋 해시와 PR 링크를 포함해요. PR 병합·`main` 직접 푸시는 별도 요청 때만 해요. `main` 반영은 공개 배포를 유발해요.
- 상태는 `PROJECT_STATUS.md`, 전체 이력은 `reference/work-log.md`에 기록해요.
- 실데이터는 인증 없는 기존 데모 경로에 연결하지 않아요.
- 공급자가 정해지면 검증된 세션 어댑터·사용자 매핑·로그아웃/회수·CSRF 방어를 서버 진입점과 함께 구현해요.

개발 DB의 원격 격리 검증은 `node --conditions=react-server --import tsx scripts/verify-hosted-tenancy.mjs PROJECT_REF`로 실행해요. 임시 데이터를 생성·삭제하므로 개발 프로젝트에서만 실행해요. 역할 최초 생성 도구·CA 경로와 완료 상태는 [연결 절차](SUPABASE_SETUP.md)를 봐요. 실제 로그인 검증과는 별개예요.

## 로그인과 빌드 확인

[로그인·온보딩 안내](AUTH_ONBOARDING.md)에 개발 계정 준비, 화면 주소, 보안 경계와 검증 결과를 정리했어요. 현재 테스트는 설정/CLI 17개·DB/서명/표시 113개예요. 기본 Turbopack이 환경 포트 오류로 실패하면 `npm run build -- --webpack`으로 프로덕션 빌드를 확인할 수 있어요. 기본 빌드 설정은 유지해요.

## 직원 관리 검증

[직원 관리](TEAM_MANAGEMENT.md)에서 화면·권한·제한을 확인해요. 원격 검사는 `node scripts/verify-hosted-team.mjs PROJECT_REF`이며 개발 DB에서만 실행해요. 실제 runtime으로 임시 조직에서 초대·수락·배정·회수를 수행하고 트랜잭션 전체를 롤백해요. 사용자 이메일이나 실제 초대 코드를 명령 인수로 전달하지 않아요.

## 수동 예약 검증

[수동 예약](MANUAL_BOOKINGS.md)에 사용법·권한·DB 잠금·검증 결과를 정리했어요. `node scripts/verify-hosted-bookings.mjs PROJECT_REF`는 정확한 개발 프로젝트를 확인한 뒤 실제 runtime에서 전체 예약 흐름을 검증하고 롤백해요. 실제 사용자 계정·고객 개인정보를 만들지 않아요.

## 회원 신청 검증

[회원 신청](MEMBER_BOOKINGS.md)의 권한·동시성 검사를 포함해 총 130개 테스트예요. `node scripts/verify-hosted-members.mjs PROJECT_REF`는 개발 runtime으로 임시 고객 연결·신청·승인·자동 확정·회원 변경/취소·회수·격리·감사를 확인하고 전체 롤백해요. 실제 두 계정 브라우저 검증과는 별개예요.

## 알림 대기열 검증

[알림 대기열](NOTIFICATION_OUTBOX.md)의 워커 역할·원자성·재시도 검사는 npm test에 포함돼요. node scripts/verify-hosted-outbox.mjs PROJECT_REF는 유휴 개발 큐에서만 실행하고 합성 변경 전체를 롤백해요. 발송 adapter와 파일럿 CLI는 구현됐고, 실제 발송·스케줄·전용 워커 로그인은 미활성 상태예요.

알림 파일럿 준비 점검은 `npm run notifications:check`(네트워크 없음), 워커 DB 읽기 전용 점검은 `-- --database-readonly`로 실행해요. 별도 `.env.worker.local` 변수·권한·검증 한계는 [알림 운영 문서](NOTIFICATION_OUTBOX.md)의 0017 절을 봐요.

파일럿 대상 큐는 `npm run notifications:check -- --scope-preview`로 읽기 전용 확인해요. `NOTIFICATION_TENANT_ID`·`NOTIFICATION_BRANCH_ID`가 필요하며 실행/발송은 하지 않아요. 자세한 내용은 알림 운영 문서의 0018 절을 봐요.

`npm run notifications:pilot`은 기본 읽기 전용 미리보기예요. 실제 실행은 `-- --execute --limit 1`과 `NOTIFICATION_WORKER_ENABLED=true`가 모두 필요해요. 종료 코드와 설정은 [알림 운영 문서](NOTIFICATION_OUTBOX.md)의 파일럿 실행 명령 절을 봐요.

전달 webhook은 기본 비활성인 `POST /api/webhooks/resend`예요. 0019 마이그레이션·별도 DB 로그인·서명 키가 필요해요. 실행 조건과 남은 운영 준비는 [알림 운영 문서](NOTIFICATION_OUTBOX.md)의 webhook 절을 봐요.
