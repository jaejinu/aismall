# Supabase 개발 프로젝트 연결

[공급자 선정](PROVIDER_DECISION.md) · [개발 가이드](DEVELOPMENT.md)

이 절차는 새 **개발 프로젝트** 기준이에요. 기존 프로젝트의 DB나 설정에 적용하지 않아요. 현재 실제 생성·연결 상태는 [진행 현황](PROJECT_STATUS.md)에 기록해요.

## 현재 연결 결과 (2026-10-13)

서울 `aismall-dev` (`ivqvqmdeqgupqezbycqu`)에 `0001_tenant_foundation.sql`과 `aismall_runtime`을 적용했어요. 관리자 연결은 session pooler 5432, 앱 연결은 transaction pooler 6543을 사용해요. 두 연결 모두 공식 [공개 CA](../db/certs/README.md)와 `verify-full`로 검증해요. 비밀번호는 Git 제외 `.env.local`에만 저장돼요.

읽기 전용 Auth 설정·runtime 역할/RLS 점검과 두 조직 격리·지점 권한·버전/감사·풀 컨텍스트 초기화·권한 회수 검사가 통과했어요. 이 검사에서 만든 임시 데이터는 삭제했어요. 세션 공급자는 테스트 대역이므로 실제 로그인 검증은 아니에요. 10/14에는 0002·인증 어댑터·온보딩 화면을 추가했어요. 실제 계정 검증 범위와 사용법은 [로그인·온보딩](AUTH_ONBOARDING.md)을 봐요.

## 1. 프로젝트 만들기

기존 계정에서 새 프로젝트를 만들어요.

| 설정 | 값 |
| --- | --- |
| 프로젝트 이름 | `aismall-dev` |
| 리전 | Northeast Asia (Seoul), `ap-northeast-2` |
| 플랜 | 개발은 Free. 한도·추가 비용이 뜨면 먼저 확인 |
| GitHub 연동 | 선택하지 않음. 자동 DB 배포는 아직 구성하지 않음 |
| Enable Data API | 끄기: 업무 DB는 서버의 pg 연결로만 사용 |
| Automatically expose new tables | 끄기 |
| Enable automatic RLS | 기존 마이그레이션이 app 스키마에 직접 적용 |
| Database password | 직접 생성·보관. 채팅·저장소에 기록하지 않음 |

프로젝트 생성 화면에 조직·요금·리전을 확인하고 생성해요. 비밀번호 설정·제출은 사용자가 직접 해요. 무료 한도 때문에 다른 프로젝트를 삭제하거나 정지하지 않아요.

## 2. 로컬 환경 파일

`.env.supabase.example`을 참고해 `.env.local`을 준비해요. 기존 파일이 있으면 필요한 값만 수정해요. 이 파일은 Git에서 제외돼요.

- `SUPABASE_URL`: 새 프로젝트의 HTTPS URL.
- `SUPABASE_PUBLISHABLE_KEY`: API 설정의 `sb_publishable_...` 키. `sb_secret_...`나 legacy service_role 키를 사용하지 않아요.
- `DATABASE_ADMIN_URL`: Connect 화면에서 얻은 관리자 direct 또는 session pooler URL. 비밀번호를 URL 인코딩해서 넣고 `sslmode=verify-full`을 설정해요. 이 값은 로컬 마이그레이션 전용이에요.
- `DATABASE_URL`: 아래에서 만들 제한된 실행 계정의 URL. 기본 postgres 계정 URL을 복사해 그대로 사용하지 않아요.

서버 인증 코드는 이 설정을 사용해요. 로그인 성공 검증에는 이메일 확인된 앱 계정이 필요해요.

## 3. 마이그레이션과 앱 전용 역할

관리자 URL과 CA가 준비되면 로컬에서 실행해요.

```sh
npm run db:migrate
```

이 명령은 `app` 스키마·테이블·RLS·NOLOGIN 그룹 `aismall_app`을 만들어요. 임의 기존 테이블을 덮어쓰지 않아요. 실제 공급자에서 역할 생성 권한이 부족하면 작업을 중단하고 권한을 확인해요.

새 개발 DB에서만 다음 도구로 역할을 한 번 생성할 수 있어요. 현재 서울 프로젝트에는 이미 적용했으므로 다시 실행할 필요가 없어요.

```sh
node scripts/provision-runtime.mjs PROJECT_REF
```

정확한 프로젝트 ref, 관리자 session pooler URL, 비어 있는 `DATABASE_URL`이 필요해요. 무작위 비밀번호를 생성해 `.env.local`에 저장하며 기존 역할·URL은 덮어쓰지 않아요. COMMIT 응답이 유실되면 저장된 자격 증명을 보존하므로 DB 상태부터 확인해요. 아래 수동 방법과 도구 중 하나만 사용해요.

다음 SQL은 관리자가 새 개발 DB에서 **한 번만** 실행하는 예시예요. 이미 역할이 있으면 재생성하거나 암호를 덮어쓰지 말고 속성을 확인해요.

```sql
CREATE ROLE aismall_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS INHERIT;
GRANT aismall_app TO aismall_runtime;
```

비밀번호를 SQL 파일이나 셸 인수에 쓰지 않아요. 관리자로 연결한 대화형 psql에서 `\password aismall_runtime`으로 비밀번호를 설정한 뒤 아래를 실행해요.

```sql
ALTER ROLE aismall_runtime LOGIN;
```

이 역할에는 postgres/테이블 소유자 역할을 부여하지 않아요. 0002는 첫 조직 생성용 제한된 함수 실행 권한을 추가해요. 0003은 서버 전용 직원 초대·배정·회수 함수를 추가해요. Supabase의 Auth/Storage 관리 역할을 변경하지 않아요.

## 4. 런타임 연결과 TLS

앱은 Connect 화면의 **transaction pooler**를 기준으로 해요. 호스트는 대시보드에서 얻고 추측하지 않아요. 공유 풀러 username은 `aismall_runtime.PROJECT_REF`, 비밀번호는 runtime 역할의 것이에요. 포트는 보통 6543이며 DB 이름은 `postgres`예요. direct 연결이면 username은 `aismall_runtime`이에요.

```text
postgresql://aismall_runtime.PROJECT_REF:ENCODED_PASSWORD@POOLER_HOST:6543/postgres?sslmode=verify-full
```

인증서 검증에 CA가 필요하면 공급자 대시보드에서 해당 인증서를 내려받아 URL의 `sslrootcert`에 파일 경로를 지정해요. 런타임 배포 환경에도 그 인증서 경로를 제공해야 해요. 검증을 끄는 SSL 옵션을 사용하지 않아요. Supabase의 SSL 강제 적용은 DB 재시작을 유발할 수 있으므로 빈 개발 환경에서 먼저 설정·검증해요. [SSL 설정](https://supabase.com/docs/guides/platform/ssl-enforcement)

## 5. 설정 및 연결 점검

```sh
npm run provider:check
npm run provider:check -- --remote
```

첫 명령은 환경변수 형식만 확인하고 네트워크 요청을 하지 않아요. 프로젝트 URL, publishable key 형식, 동일 프로젝트 runtime username, 인증서 검증 옵션을 검사해요. 공식 hosted 도메인만 지원하며 custom domain과 로컬 Supabase CLI 주소는 현재 검사 범위 밖이에요.

`--remote`는 Auth 설정 endpoint의 응답과 DB 실행 역할·RLS를 **읽기 전용**으로 검사해요. 관리자 URL을 사용하지 않고, 키·URL·드라이버 오류 원문·업무 데이터를 출력하지 않아요. 다른 조직 접근 테스트나 실제 로그인 성공을 의미하지 않아요. 스키마·역할 생성 전에 실행하면 실패하는 것이 정상이에요.

이 읽기 전용 점검은 SQL 쓰기나 역할 변경을 하지 않으며 TLS·역할·스키마가 맞지 않으면 실패해요.

개발 DB에 임시 두 조직을 넣고 실제 풀러 격리를 검사하려면 다음 명령을 실행해요. 관리자 URL로 fixture를 준비·정리하고 업무 호출은 runtime 역할로 실행해요. 운영 DB에서는 실행하지 않아요. 종료 시 이번 실행의 UUID 데이터만 삭제하며, 강제 종료나 정리 오류가 나면 잔여 fixture를 확인해야 해요. 동시 수정 충돌은 로컬 통합 테스트에서 검사하며 이 원격 점검에는 포함되지 않아요.

```sh
node --conditions=react-server --import tsx scripts/verify-hosted-tenancy.mjs PROJECT_REF
```

## 6. 다음 인증 작업

개발용 Site URL은 `http://localhost:3000`을 기준으로 해요. 향후 구현할 callback은 `http://localhost:3000/auth/callback`이며 정확한 경로만 허용해요. 아직 해당 route는 없어요. 운영 도메인·임의 preview wildcard는 이번에 등록하지 않아요.

로그인 어댑터·세션 갱신·내부 사용자 매핑·첫 조직 생성 구현을 완료했고 사용자가 로그인·첫 조직/지점 생성을 완료했고 조직/지점 재조회·권한 없는 URL 404·로그아웃 후 차단을 확인했어요. 토큰 만료 후 갱신과 재로그인은 별도 검증이 남아 있어요. 실제 고객의 이메일 확인·초대·비밀번호 복구를 위해서는 발신 도메인과 custom SMTP를 별도 준비해야 해요. 운영 배포에는 관리자 DB URL을 넣지 않아요.

10/14 개발 DB에 0003 직원 관리 마이그레이션도 적용했어요. 실제 runtime의 초대·수락·회수 검증은 통과했고 테스트 데이터는 롤백했어요. 사용법과 실제 두 계정 E2E의 남은 범위는 [직원 관리](TEAM_MANAGEMENT.md)를 봐요.
