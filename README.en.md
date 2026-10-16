# AI Small Business OS

[한국어](README.md) · [Live demo](https://aismall.vercel.app) · [UX portfolio](docs/PORTFOLIO.en.md)

An operations platform for appointment-based small businesses such as Pilates and yoga studios. It connects inquiries, bookings, sessions, attendance, and customer management. The intended AI workflow is **AI proposes, a person approves**.

The target is a multi-tenant SaaS: each independent organization is a tenant, with branches underneath. Accounts may belong to multiple tenants, with separate authorization and data scopes.

## Implementation status

- 47 sample screens cover desktop/mobile administration, members, and public inquiries.
- The public demo uses fixtures and local UI state. It has no production login or persistent business operations.
- The new server foundation includes PostgreSQL migrations, tenant/branch RLS, membership checks, branch listing, and versioned branch renaming with transactional audit records.
- Integration tests use a temporary PostgreSQL container and a restricted runtime role.
- Supabase PostgreSQL + Auth is connected in Seoul. Server login, identity mapping, first-organization onboarding and six development screens are implemented. A real development account completed login and onboarding; organization/branch reads, inaccessible-organization denial and post-logout protection were verified. Token-expiry refresh still needs explicit testing. Email-bound invitation codes, branch assignments and revocation are implemented; the two-account browser flow passed, including invitation acceptance, manager assignment, revocation and denied access after re-login. Branch-scoped customers, programs, sessions and manual booking confirmation/cancellation are implemented with capacity locking, idempotency and audit. The real administrator browser flow passed. Booking search/pagination, same-program transfers and attendance/corrections are implemented and browser-verified. Member linking, own requests/withdrawals and administrator approval/rejection are implemented; the real two-account request/withdrawal/approval/result flow passed. The workspace now uses the established member cards/bottom navigation and administrator list/task navigation. Member and administrator mobile visuals passed, along with authenticated administrator task navigation, filtering and booking details. The new member request sheet also passed submission, same-request retry, refresh persistence and withdrawal checks. Member self-service same-program transfers and cancellation are implemented with a 24-hour cutoff, ownership/version checks and audit, and passed authenticated mobile verification. Transfers atomically retain the old seat on failure and show the confirmed new schedule. Program-level automatic confirmation is implemented and member-browser verified, including capacity locks, stale-policy rejection, idempotent retries and atomic audits. Customer/program/session registration now uses scoped replay keys; selection searches query the full authorized branch with bounded results. These passed database tests and a synthetic component preview; authenticated administrator browser verification remains. Waitlists, notifications, billing and AI execution remain. Existing demo routes still use fixtures.

## Run locally

Requires Node.js 22.9+ and npm. Docker is required only for database integration tests.

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

Open [localhost:3000](http://localhost:3000). Database credentials are unnecessary for the screen demo. See the [development guide](docs/DEVELOPMENT.md) for database setup and migration roles.

## Documentation

The engineering documentation is maintained in Korean:

- [Project status and next steps](docs/PROJECT_STATUS.md)
- [Implemented architecture and trust boundaries](docs/ARCHITECTURE.md)
- [Multi-tenant design and expansion plan](docs/MULTITENANT_ARCHITECTURE.md)
- [Provider decision](docs/PROVIDER_DECISION.md) and [Supabase setup](docs/SUPABASE_SETUP.md)
- [Development and testing](docs/DEVELOPMENT.md)
- [Login and onboarding](docs/AUTH_ONBOARDING.md)
- [Staff management](docs/TEAM_MANAGEMENT.md)
- [Production readiness review](docs/SAAS_READINESS_REVIEW.md)
- [Screen inventory](docs/reference/screens.md)
- [Full work log](docs/reference/work-log.md)

Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, PostgreSQL 17, node-postgres. UI lives under `src/app` and `src/components`; fixtures under `src/data`; the independent server foundation under `src/server`; SQL under `db/migrations`.

Pushing `main` triggers public deployment. Commit and push only when explicitly requested.

See [manual bookings](docs/MANUAL_BOOKINGS.md) for scope, permissions, concurrency and validation.

See [member booking requests](docs/MEMBER_BOOKINGS.md) for linking, approval, authorization and remaining work.

The [notification outbox foundation](docs/NOTIFICATION_OUTBOX.md) atomically records booking events with isolated worker permissions, leases, ordering and bounded retries. No transport, worker login or live delivery is enabled.

Branch operators can inspect bounded notification status summaries and filtered pages in the booking workspace. Worker tokens and raw payloads remain private. Live delivery remains disabled; bounded manual redrive is available to branch operators.

Failed notifications support up to three operator retries with age/version checks, idempotency and atomic audit records. Actual delivery remains disconnected. See [notification operations](docs/NOTIFICATION_OUTBOX.md).

Members can opt in to booking emails per linked branch (off by default). Worker eligibility checks cover consent, revocation, event freshness and current verified identity. Live Auth/delivery adapters remain disconnected.

A bounded, disabled-by-default notification worker now includes Supabase identity lookup and an optional Resend adapter with a mandatory recipient allowlist. Live credentials, sender setup and scheduling remain disconnected; HTTP integration tests use synthetic responses.

Notification monitoring now shows sanitized latest attempt reasons. `npm run notifications:check` checks pilot configuration offline; `-- --database-readonly` checks worker permissions without claiming or sending notifications.

Pilot batches require an explicit tenant and branch. `npm run notifications:check -- --scope-preview` inspects scoped queue counts without claiming or sending. See [notification operations](docs/NOTIFICATION_OUTBOX.md) for configuration and limitations.

`npm run notifications:pilot` defaults to read-only preview. Sending requires both an explicit execution flag and enabled worker configuration. See [pilot operations](docs/NOTIFICATION_OUTBOX.md).

Delivery webhooks now verify signatures and persist deduplicated delivery facts separately from send acceptance. The endpoint is disabled by default; the dashboard shows delivery facts and timestamps. Bounce/complaint facts suppress further mail for the same branch customer. Live provider setup and a reviewed suppression-release policy remain pending.
