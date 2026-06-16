---
Task ID: 1
Agent: Main Agent
Task: Fix error messages and "Não autenticado" bug on change password page

Work Log:
- Diagnosed root cause: in-memory sessions Map in sessions.ts was cleared by Next.js HMR (hot module replacement), invalidating sessions between login and change-password
- Fixed sessions.ts to use globalThis for session storage (survives HMR)
- Fixed page.tsx useEffect to use a ref guard, preventing it from logging out an already-authenticated user
- Fixed LoginPage error handling: 401 → "Email ou senha inválidos", TypeError → "Erro de conexão com o servidor. Verifique sua internet."
- Fixed ChangePasswordPage error handling: 401 with "Senha atual incorreta" → shows that specific message, other 401 → "Sessão expirada. Faça login novamente." (auto-logs out), connection error → "Erro de conexão"
- Added `credentials: 'include'` to all apiFetch calls for reliable cookie transmission
- Added `getApiError()` helper in api.ts for consistent error message mapping across all components
- Updated error handling in BorrowersView, LoansView, LoanDetailView, BorrowerDetailView, AdminView
- Replaced `alert()` with toast in AdminView
- Reset seed user password to CashFlow@2025! with mustChangePassword: true
- Verified full flow via agent-browser: Login → Change Password → Dashboard ✓
- Verified wrong password shows "Email ou senha inválidos" ✓
- Lint passes clean ✓

Stage Summary:
- Sessions now survive HMR via globalThis storage
- All error messages are context-specific: connection errors, invalid credentials, permission errors, server errors
- Change password page works correctly after login without "Não autenticado" error
- Password reset to original: brunoantunes94@hotmail.com / CashFlow@2025!
