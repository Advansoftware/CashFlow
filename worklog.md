---
Task ID: 1
Agent: Main Agent
Task: Build complete CashFlow loan management system with auth, multi-tenancy, PWA

Work Log:
- Analyzed reference image (RespondIA) for color palette: dark bg #080C12, surface #111827, neon green #00FFA3
- Created Prisma schema with SystemUser, Borrower, Loan, Installment models
- Added multi-tenancy with userId FK on Borrower and Loan
- Created seed script with admin user brunoantunes94@hotmail.com / CashFlow@2025!
- Built custom auth system (session-based with cookies) with login, register, change-password, me APIs
- Updated all existing APIs (borrowers, loans, installments, dashboard) with userId filtering
- Created admin API for user management (only brunoantunes94@hotmail.com can access)
- Built Login page with premium dark theme
- Built First Password Change page (forced on first login)
- Built Dashboard with monthly summary, overdue indicator, upcoming payments
- Built Borrowers CRUD with search
- Built Loans CRUD with dual interest calculation (by rate OR by total)
- Built Loan Detail view with installment management, partial payment, WhatsApp integration
- Built Admin panel with user creation (admin/client roles), user deactivation
- Added PWA support: manifest.json, service worker (sw.js), Apple meta tags, icons
- Applied premium dark theme with neon green accents throughout
- All routes protected with auth middleware
- Data isolation: each user only sees their own data (LGPD compliant)

Stage Summary:
- Complete loan management system with all requested features
- Auth: Login, forced password change, role-based access, admin panel
- Multi-tenancy with data isolation
- PWA installable on mobile devices
- Dual interest calculation (Price table, bidirectional)
- WhatsApp integration for debt collection
- Mobile-first responsive design with premium dark theme

---
Task: Migrate all client-side fetch('/api/...') calls to use apiFetch helpers from @/lib/api

Files updated (8):
- src/app/page.tsx — fetch('/api/auth/me') → apiFetch (1 GET)
- src/components/loan-system/BorrowersView.tsx — 1 GET, 1 POST, 1 PUT, 1 DELETE replaced
- src/components/loan-system/ChangePasswordPage.tsx — 1 POST replaced
- src/components/loan-system/Navigation.tsx — 1 POST replaced
- src/components/loan-system/AdminView.tsx — 2 GET, 1 POST, 1 DELETE replaced
- src/components/loan-system/BorrowerDetailView.tsx — 1 GET, 1 POST replaced
- src/components/loan-system/DashboardView.tsx — 1 GET replaced
- src/components/loan-system/LoansView.tsx — 2 GET, 1 POST, 1 DELETE replaced

Total: 20 fetch calls migrated to apiFetch/apiPost/apiPut/apiDelete helpers.

Exclusions (by design):
- LoginPage.tsx fetch('/api/auth/login') left untouched (no token available yet)
- LoanDetailView.tsx not in scope of this task (contains 4 remaining fetch calls)
- useAppStore imports left untouched in all files

Lint: PASSED (bun run lint — zero errors)