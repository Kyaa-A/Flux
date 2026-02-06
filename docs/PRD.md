# Flux — Product Requirements Document & Task Breakdown

> Personal Finance Tracker — Full Feature Completion Plan
> Last updated: 2026-02-06

---

## Current State Summary

**What works today:**
- Credentials auth (login/register/logout) with bcrypt hashing
- Transaction CRUD with automatic wallet balance adjustments
- Wallet CRUD with inter-wallet transfers
- Category CRUD with budget limit field (per-category only)
- Dashboard (4 stat cards, 6-month bar chart, expense donut, recent transactions)
- Analytics (spending by category with budget %, income vs expense trends)
- Settings (profile edit, password change, JSON export, account deletion)
- Admin panel (system stats, user listing, ban/unban, role management)
- RBAC: USER / ADMIN / SUPER_ADMIN with hierarchy checks
- Dark/light theme toggle

**What's broken or missing:**
- No route-level protection (no `middleware.ts`) — unauthenticated users can hit dashboard pages before server actions fail
- Budget model in schema has **no `userId`** — can't be linked to users
- Recurring transaction fields (`isRecurring`, `recurringId`) exist but have zero logic
- Notification bell icon is decorative — no notification system
- No password reset / forgot password flow
- No email verification (model exists, flow doesn't)
- OAuth providers commented out
- No dedicated categories management page
- No data import (only JSON export)
- No CSV/PDF export formats
- Transfer creates ad-hoc "Transfer" category instead of using a proper system mechanism

---

## Task Hierarchy: Epic → Story → Sub-task

### Conventions

- **Priority**: P0 = critical (app feels broken without it), P1 = high (core feature gap), P2 = medium (nice to have), P3 = low (polish)
- **Size**: S = small (< 2 hrs), M = medium (2-6 hrs), L = large (6+ hrs)
- Each sub-task is an atomic unit of work that can be implemented and tested independently

---

## EPIC 1: Route Protection & Auth Hardening (P0)

> The app currently has no middleware — any unauthenticated user can navigate to `/dashboard`, `/wallets`, etc. and see the page shell before server actions throw. This must be fixed first.

### Story 1.1: Add NextAuth Middleware for Route Protection [M]

- **Sub-task 1.1.1**: Create `middleware.ts` at project root using NextAuth v5 `auth` export
- **Sub-task 1.1.2**: Define public routes (`/`, `/login`, `/register`, `/api/auth/*`) and redirect unauthenticated users to `/login`
- **Sub-task 1.1.3**: Define admin-only routes (`/admin/*`) and redirect non-admin users to `/dashboard`
- **Sub-task 1.1.4**: Add redirect logic — authenticated users visiting `/login` or `/register` get sent to `/dashboard`

### Story 1.2: Implement Forgot Password / Password Reset Flow [L]

- **Sub-task 1.2.1**: Create a `PasswordResetToken` model in Prisma schema (or repurpose `VerificationToken`) with `userId`, `token` (hashed), `expires`
- **Sub-task 1.2.2**: Create server action `requestPasswordReset(email)` — generates token, stores hashed version, sends email with reset link
- **Sub-task 1.2.3**: Set up email transport (Resend or Nodemailer) with a shared `lib/email.ts` utility
- **Sub-task 1.2.4**: Create email template for password reset (plain HTML)
- **Sub-task 1.2.5**: Create `/forgot-password` page with email input form
- **Sub-task 1.2.6**: Create `/reset-password/[token]` page with new password + confirm password form
- **Sub-task 1.2.7**: Create server action `resetPassword(token, newPassword)` — validates token, updates password hash, deletes token
- **Sub-task 1.2.8**: Add "Forgot password?" link on login page

### Story 1.3: Implement Email Verification [L]

- **Sub-task 1.3.1**: Create server action `sendVerificationEmail(userId)` — generates token, stores in `VerificationToken`, sends email
- **Sub-task 1.3.2**: Create email template for email verification
- **Sub-task 1.3.3**: Create `/verify-email/[token]` page — validates token, sets `emailVerified` on user
- **Sub-task 1.3.4**: Trigger verification email on registration (in `registerUser` action)
- **Sub-task 1.3.5**: Add banner on dashboard for unverified users prompting them to verify
- **Sub-task 1.3.6**: Add "Resend verification" action and button

### Story 1.4: OAuth Provider Integration [M]

- **Sub-task 1.4.1**: Uncomment and configure Google provider in `lib/auth.ts`
- **Sub-task 1.4.2**: Uncomment and configure GitHub provider in `lib/auth.ts`
- **Sub-task 1.4.3**: Add Google/GitHub sign-in buttons on login page
- **Sub-task 1.4.4**: Add Google/GitHub sign-in buttons on register page
- **Sub-task 1.4.5**: Handle OAuth account linking — when an OAuth user signs in, if a credentials user with the same email exists, link the accounts (or show error)
- **Sub-task 1.4.6**: Create default wallet + categories for first-time OAuth users (matching what `registerUser` does for credentials)
- **Sub-task 1.4.7**: Update `.env.example` with OAuth variable placeholders

---

## EPIC 2: Budget Management System (P1)

> The `Budget` model exists in the schema but is completely unused. It also has a design flaw: no `userId` field. This epic implements the full budget feature.

### Story 2.1: Fix and Extend Budget Schema [S]

- **Sub-task 2.1.1**: Add `userId` field and relation to `Budget` model
- **Sub-task 2.1.2**: Add `isActive` boolean field to `Budget` model (default `true`)
- **Sub-task 2.1.3**: Replace `categoryIds String[]` with a proper many-to-many relation (or keep as string array with validation — decide based on query needs)
- **Sub-task 2.1.4**: Run `prisma migrate dev` to apply schema changes

### Story 2.2: Budget Server Actions [M]

- **Sub-task 2.2.1**: Create `lib/actions/budgets.ts` with `getBudgets()` — list all active budgets for user with spent amounts calculated
- **Sub-task 2.2.2**: Add `createBudget()` action with Zod validation
- **Sub-task 2.2.3**: Add `updateBudget()` action
- **Sub-task 2.2.4**: Add `deleteBudget()` action
- **Sub-task 2.2.5**: Add `getBudgetProgress()` action — for each budget, calculate total spending across its linked categories within the budget period
- **Sub-task 2.2.6**: Add budget validation schema to `lib/validations.ts`

### Story 2.3: Budget Management Page [L]

- **Sub-task 2.3.1**: Create `/budgets` route under `(dashboard)` layout
- **Sub-task 2.3.2**: Add "Budgets" item to sidebar navigation (between Wallets and Analytics)
- **Sub-task 2.3.3**: Build `BudgetCard` component — shows budget name, period, progress bar (spent/limit), category chips, status indicator (on track / warning / over budget)
- **Sub-task 2.3.4**: Build `BudgetDialog` component — create/edit form with name, amount, period selector, date pickers, category multi-select
- **Sub-task 2.3.5**: Build the budgets page layout — summary cards (total budgeted, total spent, remaining) + grid of budget cards
- **Sub-task 2.3.6**: Add delete budget with confirmation dialog

### Story 2.4: Budget Alerts on Dashboard [S]

- **Sub-task 2.4.1**: Create `BudgetAlerts` component — shows budgets that are >80% spent or over budget
- **Sub-task 2.4.2**: Add `BudgetAlerts` to the dashboard page below the stats cards
- **Sub-task 2.4.3**: Add budget progress indicators to the analytics spending-by-category section

---

## EPIC 3: Recurring Transactions (P1)

> Fields `isRecurring` and `recurringId` exist on the Transaction model but nothing uses them.

### Story 3.1: Recurring Transaction Schema & Actions [M]

- **Sub-task 3.1.1**: Create `RecurringTransaction` model in Prisma schema — fields: `id`, `userId`, `walletId`, `categoryId`, `amount`, `type`, `description`, `frequency` (DAILY/WEEKLY/BIWEEKLY/MONTHLY/QUARTERLY/YEARLY), `startDate`, `nextRunDate`, `endDate?`, `isActive`, `lastRunAt?`
- **Sub-task 3.1.2**: Run migration
- **Sub-task 3.1.3**: Create `lib/actions/recurring.ts` with `getRecurringTransactions()`, `createRecurringTransaction()`, `updateRecurringTransaction()`, `deleteRecurringTransaction()`, `pauseRecurringTransaction()`, `resumeRecurringTransaction()`
- **Sub-task 3.1.4**: Add validation schema to `lib/validations.ts`

### Story 3.2: Recurring Transaction Processing Engine [M]

- **Sub-task 3.2.1**: Create `lib/actions/recurring.ts` → `processRecurringTransactions()` — finds all active recurring transactions where `nextRunDate <= now`, creates actual transactions, updates wallet balances, advances `nextRunDate`
- **Sub-task 3.2.2**: Create API route `POST /api/cron/recurring` that calls `processRecurringTransactions()` — protected with a cron secret header
- **Sub-task 3.2.3**: Add Vercel cron config (`vercel.json`) to run the cron daily (or document how to set up an external cron trigger)
- **Sub-task 3.2.4**: Link generated transactions back via `recurringId` field on Transaction model

### Story 3.3: Recurring Transaction UI [M]

- **Sub-task 3.3.1**: Add recurring transaction toggle and frequency selector to `TransactionDialog` — when "recurring" is checked, show frequency dropdown and optional end date
- **Sub-task 3.3.2**: Create `/transactions/recurring` page listing all recurring templates with status (active/paused), next run date, frequency, amount
- **Sub-task 3.3.3**: Add actions to each recurring item: edit, pause/resume, delete
- **Sub-task 3.3.4**: Show recurring icon badge on transactions in the transaction list that were auto-generated
- **Sub-task 3.3.5**: Add "Recurring" tab/filter to the transactions page

---

## EPIC 4: Category Management Page (P1)

> Categories are created during registration and can be managed inline in some places, but there's no dedicated management page.

### Story 4.1: Categories Page [M]

- **Sub-task 4.1.1**: Create `/categories` route under `(dashboard)` layout
- **Sub-task 4.1.2**: Add "Categories" item to sidebar navigation (between Transactions and Wallets)
- **Sub-task 4.1.3**: Build page with two sections: Income categories and Expense categories
- **Sub-task 4.1.4**: Build `CategoryCard` component — icon, name, color dot, transaction count, budget limit (if set), edit/archive/delete actions
- **Sub-task 4.1.5**: Build `CategoryDialog` component — create/edit form with name, type, icon picker, color picker, optional budget limit
- **Sub-task 4.1.6**: Add ability to view archived categories and unarchive them
- **Sub-task 4.1.7**: Show total spent per category this month on each card

---

## EPIC 5: Notification System (P1)

> The bell icon in the top navbar exists but is non-functional.

### Story 5.1: Notification Infrastructure [M]

- **Sub-task 5.1.1**: Create `Notification` model in Prisma schema — `id`, `userId`, `title`, `message`, `type` (BUDGET_ALERT/RECURRING/SYSTEM/INFO), `isRead`, `actionUrl?`, `createdAt`
- **Sub-task 5.1.2**: Run migration
- **Sub-task 5.1.3**: Create `lib/actions/notifications.ts` with `getNotifications()`, `markAsRead(id)`, `markAllAsRead()`, `deleteNotification(id)`, `getUnreadCount()`, `createNotification()`

### Story 5.2: Notification UI [M]

- **Sub-task 5.2.1**: Build `NotificationDropdown` component — replaces the decorative bell icon, shows unread count badge
- **Sub-task 5.2.2**: Dropdown panel lists recent notifications with title, message, time ago, read/unread styling
- **Sub-task 5.2.3**: Add "Mark all as read" button in dropdown header
- **Sub-task 5.2.4**: Each notification is clickable — navigates to `actionUrl` if set and marks as read
- **Sub-task 5.2.5**: Create `/notifications` page for full notification history with pagination

### Story 5.3: Notification Triggers [M]

- **Sub-task 5.3.1**: Trigger notification when a budget exceeds 80% spent
- **Sub-task 5.3.2**: Trigger notification when a budget is exceeded (100%+)
- **Sub-task 5.3.3**: Trigger notification when a recurring transaction is auto-processed
- **Sub-task 5.3.4**: Trigger notification when an admin bans/unbans a user account
- **Sub-task 5.3.5**: Trigger notification for large transactions (configurable threshold in settings, default off)

---

## EPIC 6: Data Import & Export Enhancements (P2)

> Currently only JSON export exists. Users need import capability and more export formats.

### Story 6.1: CSV Export [S]

- **Sub-task 6.1.1**: Create `exportAsCSV()` server action that formats transactions as CSV (date, type, amount, category, wallet, description)
- **Sub-task 6.1.2**: Add CSV option to the data export UI in settings
- **Sub-task 6.1.3**: Add date range filter for exports (export last month, last year, all time, custom range)

### Story 6.2: Data Import [L]

- **Sub-task 6.2.1**: Create `/settings/import` or add import section to settings page
- **Sub-task 6.2.2**: Build file upload component that accepts CSV files
- **Sub-task 6.2.3**: Create `parseCSV()` utility that reads the uploaded CSV and maps columns
- **Sub-task 6.2.4**: Build column mapping UI — user maps CSV columns to Flux fields (date, amount, type, description, category, wallet)
- **Sub-task 6.2.5**: Create `importTransactions()` server action — validates rows, auto-creates missing categories/wallets, creates transactions, updates wallet balances
- **Sub-task 6.2.6**: Show import preview (first 5 rows) before confirming
- **Sub-task 6.2.7**: Show import results summary (X imported, Y skipped, Z errors)

---

## EPIC 7: Dashboard & Analytics Improvements (P2)

> The dashboard works but could provide more actionable insights.

### Story 7.1: Enhanced Dashboard [M]

- **Sub-task 7.1.1**: Add net worth trend line chart (total balance over time, requires snapshotting or recalculating from transaction history)
- **Sub-task 7.1.2**: Add "Top spending categories this month" mini-list to dashboard (top 5 with amounts)
- **Sub-task 7.1.3**: Add "Upcoming recurring transactions" widget showing next 5 due recurring items (depends on Epic 3)
- **Sub-task 7.1.4**: Make stat cards clickable — clicking "Monthly Income" navigates to transactions filtered by income this month

### Story 7.2: Enhanced Analytics Page [M]

- **Sub-task 7.2.1**: Add date range selector to analytics page (this week / this month / last 3 months / this year / custom)
- **Sub-task 7.2.2**: Add income by category breakdown (currently only expenses are shown)
- **Sub-task 7.2.3**: Add monthly savings trend chart (income - expense per month over last 12 months)
- **Sub-task 7.2.4**: Add wallet balance distribution chart (pie chart showing balance % per wallet)
- **Sub-task 7.2.5**: Add daily spending heatmap or calendar view for the selected month

### Story 7.3: Financial Reports [M]

- **Sub-task 7.3.1**: Create `/analytics/reports` sub-page
- **Sub-task 7.3.2**: Build monthly summary report — total income, expenses, savings, top categories, wallet changes
- **Sub-task 7.3.3**: Build yearly comparison — month-over-month table showing income/expense/savings for each month
- **Sub-task 7.3.4**: Add "Download report as PDF" using browser print / react-pdf (stretch goal)

---

## EPIC 8: Settings & User Experience (P2)

> Settings page works but is missing several user-facing features.

### Story 8.1: Notification Preferences [S]

- **Sub-task 8.1.1**: Add notification preferences section to settings page
- **Sub-task 8.1.2**: Add toggles: budget alerts on/off, recurring transaction alerts on/off, large transaction threshold (with amount input)
- **Sub-task 8.1.3**: Store preferences in User model (add `notificationPrefs Json?` field) or a separate `UserPreferences` model
- **Sub-task 8.1.4**: Create `updateNotificationPreferences()` server action

### Story 8.2: Currency & Locale Improvements [S]

- **Sub-task 8.2.1**: Use the user's `currency` and `locale` from their profile throughout the app (currently hardcoded to USD/en-US in many components)
- **Sub-task 8.2.2**: Pass currency/locale from session or server component props to client components that display amounts
- **Sub-task 8.2.3**: Add currency selector dropdown in settings with common currencies (USD, EUR, GBP, PHP, JPY, etc.)

### Story 8.3: Profile Avatar Upload [S]

- **Sub-task 8.3.1**: Add avatar upload to profile settings (use UploadThing, Cloudinary, or S3)
- **Sub-task 8.3.2**: Update the user avatar display in the top navbar to use uploaded image
- **Sub-task 8.3.3**: Add fallback to initials avatar when no image is set (already exists)

---

## EPIC 9: Admin Panel Enhancements (P3)

> Admin panel has basic user management. Could use audit logging and more oversight tools.

### Story 9.1: Activity Audit Log [M]

- **Sub-task 9.1.1**: Create `AuditLog` model — `id`, `userId`, `action` (string), `details` (JSON), `ipAddress?`, `createdAt`
- **Sub-task 9.1.2**: Create `lib/actions/audit.ts` with `logAction()` helper
- **Sub-task 9.1.3**: Add audit logging to critical actions: login, registration, password change, account deletion, admin actions (ban, role change)
- **Sub-task 9.1.4**: Create `/admin/audit-log` page with filterable log table (filter by user, action type, date range)

### Story 9.2: Admin User Detail View [S]

- **Sub-task 9.2.1**: Create `/admin/users/[id]` page showing full user profile, account status, wallet count, transaction count, category count, registration date
- **Sub-task 9.2.2**: Add user activity timeline (last login, recent actions from audit log)
- **Sub-task 9.2.3**: Add admin actions inline: change role, ban/unban, deactivate/activate

### Story 9.3: System Health Dashboard [S]

- **Sub-task 9.3.1**: Show database stats on admin dashboard: total transactions this month, active users this week, new registrations trend
- **Sub-task 9.3.2**: Add chart: new users per month (last 6 months)
- **Sub-task 9.3.3**: Add chart: transactions per day (last 30 days)

---

## EPIC 10: UX Polish & Quality of Life (P3)

> Small improvements that make the app feel complete and professional.

### Story 10.1: Onboarding Flow [M]

- **Sub-task 10.1.1**: After first registration, redirect to a `/welcome` or `/onboarding` page
- **Sub-task 10.1.2**: Step 1: Set currency preference
- **Sub-task 10.1.3**: Step 2: Create first wallet (or confirm the default one)
- **Sub-task 10.1.4**: Step 3: Review default categories, add/remove as needed
- **Sub-task 10.1.5**: Step 4: Add first transaction (optional, can skip)
- **Sub-task 10.1.6**: Mark onboarding as complete on user record (`isOnboarded` flag) so it doesn't show again

### Story 10.2: Global Search [M]

- **Sub-task 10.2.1**: Add search bar to the top navbar (using `cmdk` which is already installed)
- **Sub-task 10.2.2**: Create `searchAll()` server action — searches transactions (by description), categories (by name), wallets (by name)
- **Sub-task 10.2.3**: Show grouped results in the command palette: transactions, wallets, categories, pages
- **Sub-task 10.2.4**: Add keyboard shortcut `Ctrl+K` / `Cmd+K` to open search

### Story 10.3: Empty States & Loading UX [S]

- **Sub-task 10.3.1**: Add meaningful empty states with illustrations and CTAs to: dashboard (no transactions), transactions page, wallets page, analytics page
- **Sub-task 10.3.2**: Add skeleton loaders to all pages that fetch data (dashboard cards, transaction list, wallet grid, analytics charts)
- **Sub-task 10.3.3**: Add proper loading.tsx files for all route segments

### Story 10.4: Mobile Responsiveness Audit [S]

- **Sub-task 10.4.1**: Test and fix sidebar behavior on mobile (hamburger toggle, overlay)
- **Sub-task 10.4.2**: Ensure all dialogs/forms are usable on small screens
- **Sub-task 10.4.3**: Make transaction table responsive (card layout on mobile instead of table rows)
- **Sub-task 10.4.4**: Ensure charts resize properly on mobile viewports

---

## Implementation Order (Recommended)

| Phase | Epics | Rationale |
|-------|-------|-----------|
| **Phase 1** | Epic 1 (Route Protection & Auth) | Security foundation — everything else depends on solid auth |
| **Phase 2** | Epic 4 (Categories Page) + Epic 2 (Budgets) | Categories page is quick; budgets depend on categories being manageable |
| **Phase 3** | Epic 3 (Recurring Transactions) | Core finance feature, standalone |
| **Phase 4** | Epic 5 (Notifications) | Depends on budgets + recurring being in place to generate alerts |
| **Phase 5** | Epic 7 (Dashboard & Analytics) + Epic 6 (Import/Export) | Enhancements to existing features |
| **Phase 6** | Epic 8 (Settings) + Epic 10 (UX Polish) | Quality of life improvements |
| **Phase 7** | Epic 9 (Admin Enhancements) | Lowest priority, admin-only features |

---

## Technical Notes

- **Email service**: Needs to be chosen and configured (Resend recommended for Next.js — minimal setup, generous free tier). Required by Epic 1 (Stories 1.2 and 1.3).
- **Cron jobs**: Required by Epic 3 (recurring transaction processing). Use Vercel Cron if deploying to Vercel, otherwise an external cron service or system cron.
- **File upload**: Required by Epic 6 (CSV import) and Epic 8 (avatar upload). Consider UploadThing or just handle server-side with FormData.
- **Budget schema fix**: The current `Budget` model has no `userId` — it must be fixed before any budget work begins (Story 2.1).
- **Transfer mechanism**: Current wallet transfer creates an ad-hoc "Transfer" expense category. Consider making `TRANSFER` a third `TransactionType` enum value or flagging transfer transactions differently so they don't pollute expense analytics.
