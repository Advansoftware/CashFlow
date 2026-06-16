import { create } from 'zustand';

export type View = 'dashboard' | 'borrowers' | 'loans' | 'loan-detail' | 'borrower-detail' | 'admin' | 'admin-user-dashboard';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  mustChangePassword: boolean;
}

interface AppState {
  // Auth
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;

  // Navigation
  currentView: View;
  selectedLoanId: string | null;
  selectedBorrowerId: string | null;
  adminSelectedUserId: string | null;
  refreshKey: number;
  setView: (view: View) => void;
  selectLoan: (id: string) => void;
  selectBorrower: (id: string) => void;
  selectAdminUser: (id: string) => void;
  goBack: () => void;
  triggerRefresh: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Auth
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  logout: () => {
    document.cookie = 'cf_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    set({ user: null, isAuthenticated: false, currentView: 'dashboard' });
  },

  // Navigation
  currentView: 'dashboard',
  selectedLoanId: null,
  selectedBorrowerId: null,
  adminSelectedUserId: null,
  refreshKey: 0,
  setView: (view) => set({ currentView: view, selectedLoanId: null, selectedBorrowerId: null, adminSelectedUserId: null }),
  selectLoan: (id) => set({ currentView: 'loan-detail', selectedLoanId: id }),
  selectBorrower: (id) => set({ currentView: 'borrower-detail', selectedBorrowerId: id }),
  selectAdminUser: (id) => set({ currentView: 'admin-user-dashboard', adminSelectedUserId: id }),
  goBack: () => set({ currentView: 'dashboard', selectedLoanId: null, selectedBorrowerId: null, adminSelectedUserId: null }),
  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
}));