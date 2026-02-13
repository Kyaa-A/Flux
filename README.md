# Flux

Flux is a personal finance tracker built with Next.js, NextAuth, Prisma, and PostgreSQL.

## Core Features

- Authentication with credentials (register/login/logout), email verification, and password reset
- Optional OAuth sign-in (Google/GitHub) with account linking by verified email
- Route protection with auth-aware `proxy.ts` redirects
- Wallet management with transfers and automatic balance updates
- Transaction management with filters and recurring transaction support
- Category management (income/expense, archive/unarchive, budget limits)
- Budget tracking with progress/alerts
- Notification center (in-app notifications with read/delete actions)
- Server-side notification preferences (budget, recurring, admin account actions, large-transaction threshold)
- Analytics dashboard and admin panel with RBAC (`USER`, `ADMIN`, `SUPER_ADMIN`)
- Admin audit log for security/admin actions
- Data export/import (JSON + CSV + print-to-PDF export)

## Tech Stack

- `Next.js 16` (App Router)
- `React 19`
- `NextAuth v5 beta`
- `Prisma 7` + PostgreSQL (Neon adapter)
- `Tailwind CSS 4` + Radix UI primitives

## Local Setup

1. Install dependencies:
```bash
pnpm install
```

2. Create env file:
```bash
cp .env.example .env
```
Configure OAuth values and set `NEXT_PUBLIC_AUTH_*_ENABLED="true"` for providers you want visible in the UI.

3. Generate Prisma client and apply schema:
```bash
pnpm db:generate
pnpm db:push
```

4. (Optional) seed development data:
```bash
pnpm db:seed
```

5. Start development server:
```bash
pnpm dev
```

## Scripts

- `pnpm dev` - start dev server
- `pnpm build` - prisma generate + production build
- `pnpm lint` - run ESLint
- `pnpm db:generate` - prisma generate
- `pnpm db:push` - push schema to DB
- `pnpm db:migrate` - run dev migration
- `pnpm db:seed` - seed DB
- `pnpm db:studio` - open Prisma Studio

## Cron Processing

Recurring transactions and budget alerts are processed by:

- `POST /api/cron/recurring`
- Protected by `Authorization: Bearer <CRON_SECRET>`
- Scheduled in `vercel.json` (daily)

## Documentation

- Product backlog: `docs/PRD.md`
- Implementation status tracker: `docs/IMPLEMENTATION_TRACKER.md`
