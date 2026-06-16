'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { apiFetch, apiPost, getApiError } from '@/lib/api';
import { formatPhone, formatCurrency, formatDate } from '@/lib/helpers';
import { Plus, FileText, ArrowRight, ChevronRight, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateLoanDialog } from './CreateLoanDialog';

interface BorrowerDetail {
  id: string;
  name: string;
  whatsapp: string;
  notes: string | null;
  createdAt: string;
  loans: Array<{
    id: string;
    originalAmount: number;
    totalAmount: number;
    status: string;
    startDate: string;
    installmentCount: number;
    installments: Array<{
      id: string;
      status: string;
      amount: number;
      paidAmount: number;
    }>;
  }>;
}

export function BorrowerDetailView() {
  const { selectedBorrowerId, selectLoan, setView, refreshKey } = useAppStore();
  const [borrower, setBorrower] = useState<BorrowerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [createLoanOpen, setCreateLoanOpen] = useState(false);

  const fetchBorrower = useCallback(async () => {
    if (!selectedBorrowerId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/borrowers/${selectedBorrowerId}`);
      const json = await res.json();
      setBorrower(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedBorrowerId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBorrower();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchBorrower, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-neon/30 border-t-neon rounded-full animate-spin" />
      </div>
    );
  }

  if (!borrower) return null;

  const totalLent = borrower.loans.reduce((sum, l) => sum + l.totalAmount, 0);
  const totalReceived = borrower.loans.reduce(
    (sum, l) => sum + l.installments.reduce((s, i) => s + (i.paidAmount || 0), 0),
    0
  );



  return (
    <div className="space-y-4 pb-6">
      {/* Borrower Info */}
      <div className="bg-surface rounded-2xl p-4 border border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-xl bg-neon-dim flex items-center justify-center">
            <span className="text-neon font-bold text-lg">
              {borrower.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-lg font-bold text-foreground">{borrower.name}</p>
            <p className="text-sm text-muted-foreground">{formatPhone(borrower.whatsapp)}</p>
          </div>
          <a
            href={`https://wa.me/55${borrower.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] flex items-center justify-center transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
          </a>
        </div>
        {borrower.notes && (
          <div className="bg-surface-elevated rounded-xl p-3 text-sm text-muted-foreground">
            {borrower.notes}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface rounded-2xl p-4 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Total Emprestado</p>
          <p className="text-base font-bold text-foreground">{formatCurrency(totalLent)}</p>
        </div>
        <div className="bg-surface rounded-2xl p-4 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Total Recebido</p>
          <p className="text-base font-bold text-neon">{formatCurrency(totalReceived)}</p>
        </div>
      </div>

      {/* Loans */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-neon" />
            Empréstimos ({borrower.loans.length})
          </h3>
          <button
            onClick={() => {
              setCreateLoanOpen(true);
            }}
            className="flex items-center gap-1 text-xs text-neon font-medium hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo
          </button>
        </div>

        {borrower.loans.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">Nenhum empréstimo</p>
          </div>
        ) : (
          <div className="space-y-2">
            {borrower.loans.map((loan) => {
              const paidCount = loan.installments.filter((i) => i.status === 'PAID').length;
              const paidAmount = loan.installments.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
              const progress = loan.totalAmount > 0 ? (paidAmount / loan.totalAmount) * 100 : 0;
              return (
                <div
                  key={loan.id}
                  className="bg-surface rounded-xl p-4 border border-border card-hover"
                  onClick={() => selectLoan(loan.id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(loan.totalAmount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {loan.installmentCount} parcelas · {formatCurrency(loan.originalAmount)} original
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        loan.status === 'ACTIVE' ? 'bg-neon-dim text-neon border-neon/20' : 'bg-secondary text-muted-foreground border-border'
                      }`}>
                        {loan.status === 'ACTIVE' ? 'Ativo' : 'Finalizado'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-neon rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">{paidCount}/{loan.installments.length} parcelas pagas</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Loan Dialog */}
      {/* Create Loan Dialog */}
      <CreateLoanDialog
        open={createLoanOpen}
        onOpenChange={setCreateLoanOpen}
        fixedBorrowerId={borrower.id}
        fixedBorrowerName={borrower.name}
        onSuccess={fetchBorrower}
      />
    </div>
  );
}