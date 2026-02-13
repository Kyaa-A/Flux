# Flux Implementation Tracker

Last audited: 2026-02-13

## Implemented In Codebase

- Auth and access:
  - Credentials auth via NextAuth
  - OAuth providers (Google/GitHub) with conditional env-based enablement
  - Email verification flow (`/verify-email/[token]`)
  - Forgot/reset password flow (`/forgot-password`, `/reset-password/[token]`)
  - Route protection via auth proxy with public/admin redirects
  - RBAC (`USER`, `ADMIN`, `SUPER_ADMIN`)
- Finance core:
  - Wallet CRUD + wallet transfers with transactional balance updates
  - Transaction CRUD with balance updates and filters
  - Category CRUD + archive/unarchive + optional budget limits
  - Budgets (user-linked) with progress calculations
- Recurring + notifications:
  - Recurring transaction CRUD + processing engine
  - Cron endpoint for recurring processing and budget alert generation
  - In-app notification model + dropdown + mark-read/delete actions
  - Budget alert notifications (80% warning, 100% exceeded)
  - Server-side notification preferences persisted on user profile and enforced for:
    - Budget warnings/exceeded alerts
    - Recurring processed alerts
    - Admin account status/role change alerts
    - Large transaction alerts with threshold
- Settings and data:
  - Profile update (name/currency/locale)
  - Password change
  - Account deletion
  - Data export (JSON + CSV)
  - CSV transaction import with preview and auto-create of missing wallet/category
- UI routes present:
  - Dashboard, transactions, recurring, categories, wallets, budgets, analytics, admin, settings

## Implemented In This Audit Pass

- Added explicit recurring toggle actions:
  - `pauseRecurringTransaction` in `lib/actions/recurring.ts`
  - `resumeRecurringTransaction` in `lib/actions/recurring.ts`
  - Wired recurring list UI to use the new actions in `app/(dashboard)/transactions/recurring/recurring-list.tsx`
- Migrated deprecated middleware convention:
  - Renamed `middleware.ts` to `proxy.ts` and exported `proxy`
- Added deployment cron config:
  - `vercel.json` with daily schedule for `/api/cron/recurring`
- Added environment template:
  - `.env.example`
- Replaced default template readme with project-specific docs:
  - `README.md`
- Implemented OAuth integration:
  - Added Google/GitHub providers in `lib/auth.ts`
  - Added account-linking support via `allowDangerousEmailAccountLinking`
  - Added first-login workspace bootstrap for OAuth users
  - Added OAuth buttons to `app/(auth)/login/page.tsx` and `app/(auth)/register/page.tsx`
- Implemented server-side notification preferences:
  - Added `User.notificationPrefs` field in schema
  - Added `getNotificationPreferences` and `updateNotificationPreferences` in `lib/actions/settings.ts`
  - Reworked `components/settings/notification-preferences.tsx` to load/save via server actions
  - Added preference-aware notification gating in `lib/notifications.ts`
  - Enforced preferences in recurring processor and admin notification flows
  - Added large transaction notification trigger in `lib/actions/transactions.ts`
- Implemented CSV export date ranges in settings UI:
  - Added preset ranges and custom date support in `components/settings/data-export.tsx`
- Implemented dedicated transfer transaction type:
  - Added `TRANSFER` to `TransactionType` enum
  - Added `Transaction.transferGroupId` for paired transfer legs
  - Updated `transferBetweenWallets` to create two `TRANSFER` transactions linked by `transferGroupId`
  - Added atomic pair rollback when deleting any transfer leg in `lib/actions/transactions.ts`
  - Updated transactions UI/filtering to display `TRANSFER` rows safely
- Implemented notifications history page with pagination:
  - Added `getNotificationsPaginated` in `lib/actions/notifications.ts`
  - Added route `app/(dashboard)/notifications/page.tsx`
  - Added client pagination/actions UI in `app/(dashboard)/notifications/notifications-page-client.tsx`
  - Linked from dropdown and sidebar navigation
- Implemented admin audit log:
  - Added `AuditLog` model in Prisma (`audit_logs` table)
  - Added reusable logger helper in `lib/audit.ts`
  - Added admin query action `getAuditLogs` in `lib/actions/audit.ts`
  - Added admin page `app/(dashboard)/admin/audit-log/page.tsx` with filters/pagination
  - Wired audit events into critical flows:
    - login success
    - registration
    - password reset success
    - password change
    - account deletion
    - admin role/ban/unban/active-state changes
- Implemented PDF export path (print-friendly):
  - Added `Export PDF` in `components/settings/data-export.tsx`
  - Generates a report and opens browser print dialog for Save as PDF

## Gaps Still Open (Not Fully Implemented)

- No critical gaps identified in the current audited scope.

## Documentation Gaps Closed By This File

Before this update, the repository had a backlog PRD (`docs/PRD.md`) but lacked:

- A current implementation status snapshot
- A clear list of unresolved functional gaps
- Deployment cron configuration documentation
- Environment variable baseline for setup

This tracker is the canonical implementation status document moving forward.
