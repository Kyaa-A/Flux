# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flux is a personal finance tracker built with Next.js 16 (App Router), React 19, and PostgreSQL (Neon serverless). It uses NextAuth v5 (beta) for authentication with credentials-based login, Prisma ORM for database access, and shadcn/ui for the component library.

## Commands

```bash
pnpm dev              # Start dev server with Turbopack (localhost:3000)
pnpm build            # Generate Prisma client + build for production
pnpm lint             # Run ESLint (v9 flat config)
pnpm db:generate      # Regenerate Prisma client
pnpm db:push          # Push schema changes to database (no migration)
pnpm db:migrate       # Create and apply a migration
pnpm db:seed          # Seed database with demo data
pnpm db:studio        # Open Prisma Studio GUI
```

No test framework is configured.

## Architecture

### Routing & Layouts

- `app/(auth)/` — Login and register pages (public)
- `app/(dashboard)/` — Protected pages with sidebar + top navbar layout. Contains: dashboard, transactions, wallets, analytics, settings, admin
- `app/api/auth/[...nextauth]/` — NextAuth API handler (only API route)

Auth protection is handled at the server action level via `requireAuth()` / `requireAdmin()` from `lib/rbac.ts`. There is no middleware.ts.

### Database

- **Prisma schema**: `prisma/schema.prisma`
- **Prisma config**: `prisma.config.ts` (sets client output to `app/generated/prisma/`)
- **Client singleton**: `lib/db.ts` — uses Neon serverless adapter (`@prisma/adapter-neon`)
- **Generated client**: `app/generated/prisma/` — import types and enums from here

All Prisma commands require `--schema prisma/schema.prisma` or use the config in `prisma.config.ts`.

### Server Actions

All data mutations and queries go through server actions in `lib/actions/`:

| File | Scope |
|------|-------|
| `auth.ts` | User registration (creates default wallet + 12 categories) |
| `dashboard.ts` | Dashboard stats, charts, recent transactions |
| `transactions.ts` | Full CRUD with wallet balance adjustments |
| `wallets.ts` | CRUD, transfers between wallets, summary stats |
| `categories.ts` | CRUD with budget limit tracking |
| `settings.ts` | Profile, password, data export, account deletion |

Wallet balances are updated atomically when transactions are created/updated/deleted — income increments, expense decrements.

### Auth & RBAC

- **Auth config**: `lib/auth.ts` — NextAuth v5 with JWT strategy and PrismaAdapter
- **RBAC**: `lib/rbac.ts` — Three-tier role hierarchy: `USER < ADMIN < SUPER_ADMIN`
- Session JWT includes `user.role` for authorization checks
- User status checks (banned/inactive) happen at login time in the credentials provider

### Validation

Zod schemas for all forms live in `lib/validations.ts`. Used with `react-hook-form` via `@hookform/resolvers`.

### Styling

- Tailwind CSS v4 (PostCSS plugin, no tailwind.config file)
- Theme variables defined in `app/globals.css` using OKLch color space with `@dark` variant
- shadcn/ui components in `components/ui/` (New York style, zinc base color)
- `lib/utils.ts` exports `cn()` for class merging, plus `formatCurrency()` and `formatDate()` helpers

### Environment Variables

Required in `.env`:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `AUTH_SECRET` — NextAuth session encryption key
- `AUTH_URL` — Base URL (e.g., `http://localhost:3000`)

Optional (for OAuth):
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

## Conventions

- Path alias: `@/*` maps to project root
- Package manager: pnpm (enforced via `packageManager` field)
- All server-side data access uses server actions (`"use server"`) — no direct Prisma calls in components
- Components importing server actions must be client components or call them from server components
- Decimal fields (amounts, balances) use Prisma `Decimal` type
