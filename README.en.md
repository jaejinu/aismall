# AI Small Business OS

[한국어](README.md) · **English**

A UX planning, design and front-end project for an operations platform for small booking-based studios (1–5 person pilates and yoga studios).
Inquiries, bookings, class sessions and customers live in one place, and repetitive work follows one rule: **AI proposes, a person approves, then it runs**.
The point is not automation itself but an experience where owners can understand what the AI is about to do — and stay in control of it.

**Live demo** · https://aismall.vercel.app (the first page is the portfolio overview and the full screen list)  
**Case study (Korean)** · https://aismall.vercel.app/case-study — the reasoning: principles, the planning audit, approval card A/B/C and the usability test plan, designing for failure

![Admin approval inbox — booking requests proposed by AI and the approval card](src/assets/showcase/approvals.png)

> Phase 1 covers research → UX/UI → design system → prototype → front-end. Real AI and backend come in phase 2, so all screen data is sample data and resets on refresh.
> The product UI is in Korean (the target market is Korean studios). Sample baseline: Wed 2026-10-14 13:00, "Jaejin Pilates" Gangnam branch, branch owner 홍지수. All people and contact details are made up.

## Start here

| Screen | Path | What to look at |
| --- | --- | --- |
| Admin · Today | [`/admin/today`](https://aismall.vercel.app/admin/today) | Briefing, today's sessions, things that need attention (booking done, message failed) |
| Approval inbox | [`/admin/approvals`](https://aismall.vercel.app/admin/approvals) | The AI approval card — actions to run, the message the member will get, expandable reasoning, edit / reject |
| Admin mobile | [`/mobile/today`](https://aismall.vercel.app/mobile/today) | Five tabs (Today, Approvals, Inbox, Schedule, More) · lock-screen alert → card → re-check → partial failure → resend |
| AI permissions | [`/admin/settings/ai`](https://aismall.vercel.app/admin/settings/ai?as=admin&preview=reminder) | Level per task type, rules that can't be turned off, impact preview before changing, re-authentication |
| Activity log | [`/admin/activity`](https://aismall.vercel.app/admin/activity) | Who did what and why — replay a whole incident (policy decision, next action) |
| Member app | [`/member/home`](https://aismall.vercel.app/member/home) | Members book and join waitlists themselves, confirm attendance, handle cancelled classes |

Screens: admin desktop (today, inbox, approvals, schedule, session, attendance, class cancellation, bookings, programs, members, AI management, activity log, settings), admin mobile (today, approvals, inbox, schedule, attendance, more), member mobile, and a public inquiry page for non-members.

## Problem → decision

### 01 · Approval card: see what will change, fast
When the AI wants to "create a booking and send a message", too much information gets approved without reading, too little makes owners afraid to tap. I built the same request at three densities (A: everything · B: one-line summary · C: actions + message, with reasoning on expand) and planned a usability test (Test A) to choose. The live screens use C.

<p>
  <img src="src/assets/showcase/test-a-card-a.png" width="230" alt="Approval card A — everything" />
  <img src="src/assets/showcase/test-a-card-b.png" width="230" alt="Approval card B — summary" />
  <img src="src/assets/showcase/test-a-card-c.png" width="230" alt="Approval card C — key info with expandable reasoning" />
</p>

### 02 · Execution result: never hide a failure
If the booking went through but the KakaoTalk message failed, "Done" tells nobody. The system re-checks capacity, policy and connections right before running, shows the result as "what worked · what didn't · next action", and lets you resend only the failed message.

<p>
  <img src="src/assets/showcase/m-push.png" width="230" alt="Lock-screen approval alert" />
  <img src="src/assets/showcase/m-result.png" width="230" alt="Result — booking confirmed, only the message failed" />
</p>

### 03 · AI permissions: only narrower, and some rules can't be turned off
Only low-risk work runs automatically; creating, changing or cancelling bookings always waits for approval. A branch (owner) can only narrow the brand defaults, and rules such as "no messages to members without consent" or "never restrict bookings because of no-show risk" can't be changed by any setting.

![AI permissions — level per task type, locked rules, change preview](src/assets/showcase/ai-permissions.png)

### 04 · Member app: members act, members confirm
Members book, change and cancel classes themselves. The AI assistant only drafts a booking — nothing is booked until the member taps the button.

<p>
  <img src="src/assets/showcase/member-home.png" width="230" alt="Member home" />
  <img src="src/assets/showcase/member-assist.png" width="230" alt="Member AI assistant" />
</p>

### 05 · Admin mobile: the phone between classes, the desktop for the wide work
Mobile goes deep on four things only — today, approvals, inbox, schedule (plus attendance) — and links wide-screen menus like settings and the activity log to desktop. Inquiry replies are AI drafts that a person edits and sends; for suspicious messages that try to override instructions, no draft is made at all.

<p>
  <img src="src/assets/showcase/m-admin-today.png" width="230" alt="Admin mobile — today" />
  <img src="src/assets/showcase/m-inbox-draft.png" width="230" alt="Inquiry — a person sends the AI draft" />
  <img src="src/assets/showcase/m-inbox-flagged.png" width="230" alt="Suspicious inquiry — no draft, reply manually" />
</p>

## Principles

- **AI proposes, people approve** — only low-risk work runs automatically; medium-risk items of the same type are approved together; AI booking changes always wait for approval.
- **Rules you can't turn off** — e.g. no messages without consent, no booking restrictions based on no-show risk — even permission settings can't change them.
- **Don't hide failures** — results always show what worked, what didn't, and the next action.
- **Permissions only get narrower** — branches can narrow the brand defaults, never widen them.
- **Time passing isn't attendance** — attendance (unknown / attended / no-show) is recorded separately from booking status.
- **Plain Korean labels** — the UI uses everyday Korean names only; English stays in code.

Decision records: [`docs/reference/decisions-D01-D15.md`](docs/reference/decisions-D01-D15.md) · progress log: [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) (both in Korean).

## Process

1. **Planning** — PRD, requirements (17), features (55), specs (31) and policies (8), revised with an external review (D-01–D-15); user flow (90 screens) and wireframes.
2. **Design system** — Figma variables (color light/dark, spacing, radius), 10 text styles, 57 components; every screen bound to variables and styles.

   <img src="src/assets/showcase/figma-foundations.png" width="420" alt="Figma color variables — light mode" />

3. **Usability test prep (Test A)** — plan for comparing approval cards A/B/C, recruiting notice, consent form, moderator script, note-taking forms.
4. **Front-end** — Figma variables mapped 1:1 to CSS tokens, and every screen reads from one canonical sample dataset ([`docs/reference/canonical-data.md`](docs/reference/canonical-data.md)) so names and numbers match across screens.

## Tech

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 — design tokens in `src/app/globals.css` mapped 1:1 to Figma variables, dark mode
- lucide-react icons · tailwind-merge
- Deployed on Vercel
- Tools: Figma, manyfast (planning docs), Claude Code (AI pair programming)

## Run locally

```bash
npm install
npm run dev   # http://localhost:3000
```

## Structure

| Path | Contents |
| --- | --- |
| `src/app/admin/` | Admin desktop screens |
| `src/app/mobile/` | Admin mobile screens (today, approvals, inbox, schedule, attendance, more) |
| `src/app/member/` | Member mobile screens |
| `src/components/ui/` | Shared components (badges, buttons, filter chips, toggles, session rows…) |
| `src/data/` | Sample data — every screen uses the same canonical dataset |
| `src/assets/showcase/` | Screenshots for the landing page and README |
| `docs/` | Progress log, decision records, Figma rules, canonical data |
