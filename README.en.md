# AI Small Business OS

[한국어](README.md) · [Live demo](https://aismall.vercel.app) · [UX portfolio](docs/PORTFOLIO.en.md)

An operations platform for appointment-based small businesses such as Pilates and yoga studios. It connects inquiries, bookings, sessions, attendance, and customer management. The intended AI workflow is **AI proposes, a person approves**.

The target is a multi-tenant SaaS: each independent organization is a tenant, with branches underneath. Accounts may belong to multiple tenants, with separate authorization and data scopes.

## Implementation status

- 47 sample screens cover desktop/mobile administration, members, and public inquiries.
- The public demo uses fixtures and local UI state. It has no production login or persistent business operations.
- The new server foundation includes PostgreSQL migrations, tenant/branch RLS, membership checks, branch listing, and versioned branch renaming with transactional audit records.
- Integration tests use a temporary PostgreSQL container and a restricted runtime role.
- Supabase PostgreSQL + Auth is connected in Seoul. Server login, identity mapping, first-organization onboarding and four development screens are implemented. A real development account completed login and onboarding; organization/branch reads, inaccessible-organization denial and post-logout protection were verified. Token-expiry refresh still needs explicit testing. Email-bound invitation codes, branch assignments and revocation are implemented; the two-account browser flow passed, including invitation acceptance, manager assignment, revocation and denied access after re-login. Bookings, notifications, billing and AI execution remain to be implemented. Existing demo routes still use fixtures.

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
