'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { apiFetch, apiPost, apiDelete } from '@/lib/api';
import { formatCurrency, formatDate, getStatusLabel, getStatusBgColor, formatPhone } from '@/lib/helpers';
import { Plus, Search, FileText, Trash2, ChevronRight, User, Percent, Calendar, ArrowRight, ArrowLeftRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type CalcMode = 'BY_RATE' | 'BY_TOTAL';

interface BorrowerOption {
  id: string;
  name: string;
  whatsapp: string;
}

interface Loan {
  id: string;
  borrowerId: string;
  originalAmount: number;
  interestRate: number;
  totalAmount: number;
  installmentCount: number;
  startDate: string;
  status: string;
  createdAt: string;
  borrower: { name: string; whatsapp: string };
  installments: Array<{ id: string; status: string; amount: number; }>;
}

function calcFromRate(P: number, r: number, n: number): { total: number; pmt: number } {
  if (r <= 0) return { total: P, pmt: P / n };
  const pmt = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  return { total: pmt * n, pmt };
}

function calcRateFromTotal(P: number, F: number, n: number): number {
  // Binary search for the monthly rate
  let lo = 0.0001, hi = 0.5; // 0.01% to 50%
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const { total } = calcFromRate(P, mid, n);
    if (total < F) lo = mid;
    else hi = mid;
  }
  return Math.round(((lo + hi) / 2) * 10000) / 100;
}

export function LoansView() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [borrowers, setBorrowers] = useState<BorrowerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Loan | null>(null);
  const [calcMode, setCalcMode] = useState<CalcMode>('BY_RATE');
  const [form, setForm] = useState({
    borrowerId: '',
    originalAmount: '',
    interestRate: '',
    totalAmount: '',
    installmentValue: '',
    installmentCount: '',
    startDate: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const { selectLoan, refreshKey, triggerRefresh } = useAppStore();

  const fetchData = useCallback(async () => {
    try {
      const [loansRes, borrowersRes] = await Promise.all([
        apiFetch('/api/loans'),
        apiFetch('/api/borrowers'),
      ]);
      setLoans(await loansRes.json());
      setBorrowers(await borrowersRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData, refreshKey]);

  const filtered = loans.filter((l) => l.borrower.name.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => {
    setForm({
      borrowerId: '',
      originalAmount: '',
      interestRate: '',
      totalAmount: '',
      installmentValue: '',
      installmentCount: '',
      startDate: new Date().toISOString().split('T')[0],
    });
    setCalcMode('BY_RATE');
    setCreateOpen(true);
  };

  const openDelete = (loan: Loan) => { setSelected(loan); setDeleteOpen(true); };

  // Computed values for preview
  const P = parseFloat(form.originalAmount) || 0;
  const n = parseInt(form.installmentCount) || 0;
  const r = parseFloat(form.interestRate) || 0;
  const totalInput = parseFloat(form.totalAmount) || 0;
  const pmtInput = parseFloat(form.installmentValue) || 0;

  let previewTotal = 0;
  let previewPmt = 0;
  let previewRate = 0;

  if (calcMode === 'BY_RATE' && P > 0 && r > 0 && n > 0) {
    const calc = calcFromRate(P, r / 100, n);
    previewTotal = calc.total;
    previewPmt = calc.pmt;
    previewRate = r;
  } else if (calcMode === 'BY_TOTAL' && P > 0 && totalInput > 0 && n > 0) {
    previewTotal = totalInput;
    previewPmt = totalInput / n;
    previewRate = calcRateFromTotal(P, totalInput, n);
  }

  const handleCreate = async () => {
    let finalRate: number;
    let finalTotal: number;

    if (calcMode === 'BY_RATE') {
      finalRate = parseFloat(form.interestRate);
      const calc = calcFromRate(P, finalRate / 100, n);
      finalTotal = calc.total;
    } else {
      finalTotal = totalInput;
      finalRate = calcRateFromTotal(P, totalInput, n);
    }

    if (!form.borrowerId || !P || !finalRate || !n || !form.startDate) return;
    setSubmitting(true);
    try {
      await apiPost('/api/loans', {
          borrowerId: form.borrowerId,
          originalAmount: P,
          interestRate: finalRate,
          installmentCount: n,
          startDate: form.startDate,
        });
      setCreateOpen(false);
      triggerRefresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await apiDelete(`/api/loans/${selected.id}`);
      setDeleteOpen(false);
      triggerRefresh();
    } finally {
      setSubmitting(false);
    }
  };

  const getLoanProgress = (loan: Loan) => {
    const paid = loan.installments.filter((i) => i.status === 'PAID' || i.status === 'PARTIAL').length;
    return { paid, total: loan.installments.length, percent: (paid / loan.installments.length) * 100 };
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Empréstimos</h2>
          <p className="text-sm text-muted-foreground">{loans.length} empréstimo{loans.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-neon text-background rounded-xl text-sm font-semibold hover:shadow-[0_0_20px_rgba(0,255,163,0.3)] transition-all active:scale-95">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-surface border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-neon/30 border-t-neon rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-surface-elevated flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{search ? 'Nenhum resultado' : 'Nenhum empréstimo cadastrado'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((loan) => {
            const progress = getLoanProgress(loan);
            return (
              <div key={loan.id} className="bg-surface rounded-2xl p-4 border border-border card-hover" onClick={() => selectLoan(loan.id)}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neon-dim flex items-center justify-center shrink-0">
                      <span className="text-neon font-bold text-xs">{loan.borrower.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{loan.borrower.name}</p>
                      <p className="text-xs text-muted-foreground">{formatPhone(loan.borrower.whatsapp)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openDelete(loan)} className="w-8 h-8 rounded-lg bg-secondary hover:bg-danger/10 flex items-center justify-center transition-colors"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => selectLoan(loan.id)} className="w-8 h-8 rounded-lg bg-secondary hover:bg-surface-elevated flex items-center justify-center transition-colors"><ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
                  </div>
                </div>
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Valor Total</p>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(loan.totalAmount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Original</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(loan.originalAmount)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{progress.paid}/{progress.total} parcelas</span>
                    <span className="text-xs text-neon font-medium">{progress.percent.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-neon rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,255,163,0.3)]" style={{ width: `${progress.percent}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Percent className="w-3 h-3" />{loan.interestRate}% a.m.</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{loan.installmentCount}x</span>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-neon font-medium">Ver parcelas <ArrowRight className="w-3 h-3" /></span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-surface border-border text-foreground sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Novo Empréstimo</DialogTitle>
            <DialogDescription className="text-muted-foreground">Crie um empréstimo com cálculo automático (tabela Price)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pessoa *</label>
              <Select value={form.borrowerId} onValueChange={(v) => setForm({ ...form, borrowerId: v })}>
                <SelectTrigger className="bg-surface-elevated border-border text-foreground rounded-xl h-11">
                  <SelectValue placeholder="Selecione uma pessoa" />
                </SelectTrigger>
                <SelectContent className="bg-surface-elevated border-border">
                  {borrowers.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-foreground">{b.name} — {formatPhone(b.whatsapp)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Valor Original (R$) *</label>
              <Input type="number" step="0.01" placeholder="Ex: 5000" value={form.originalAmount} onChange={(e) => setForm({ ...form, originalAmount: e.target.value })} className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11" />
            </div>

            {/* Calc Mode Toggle */}
            <div className="bg-surface-elevated rounded-xl p-1 flex gap-1">
              <button
                type="button"
                onClick={() => setCalcMode('BY_RATE')}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  calcMode === 'BY_RATE' ? 'bg-neon text-background' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                Informar Taxa
              </button>
              <button
                type="button"
                onClick={() => setCalcMode('BY_TOTAL')}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  calcMode === 'BY_TOTAL' ? 'bg-neon text-background' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Informar Total
              </button>
            </div>

            {calcMode === 'BY_RATE' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Taxa de Juros (% a.m.) *</label>
                <Input type="number" step="0.01" placeholder="Ex: 2.5" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11" />
                <p className="text-xs text-muted-foreground">CET do banco — taxa mensal para cálculo (tabela Price)</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valor Total a Pagar (R$) *</label>
                  <Input type="number" step="0.01" placeholder="Ex: 5500" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valor da Parcela (R$) — opcional</label>
                  <Input type="number" step="0.01" placeholder="Auto-calculado se vazio" value={form.installmentValue} onChange={(e) => setForm({ ...form, installmentValue: e.target.value })} className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11" />
                  <p className="text-xs text-muted-foreground">Se preenchido, o número de parcelas será calculado automaticamente</p>
                </div>
              </>
            )}

            {calcMode === 'BY_RATE' || !form.installmentValue ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Número de Parcelas *</label>
                <Select value={form.installmentCount} onValueChange={(v) => setForm({ ...form, installmentCount: v })}>
                  <SelectTrigger className="bg-surface-elevated border-border text-foreground rounded-xl h-11">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-elevated border-border">
                    {[2, 3, 4, 5, 6, 8, 10, 12, 18, 24, 36].map((n) => (
                      <SelectItem key={n} value={String(n)} className="text-foreground">{n} parcelas</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Parcelas (auto)</label>
                <div className="h-11 px-4 bg-surface-elevated/50 border border-border rounded-xl flex items-center text-sm text-muted-foreground">
                  {pmtInput > 0 && P > 0 ? Math.max(1, Math.round(totalInput / pmtInput)) : '—'}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Data de Início *</label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11" />
            </div>

            {/* Preview */}
            {(previewTotal > 0 || previewPmt > 0) && (
              <div className="bg-neon-dim rounded-xl p-4 border border-neon/20 space-y-2">
                <p className="text-xs text-neon font-medium">💰 Prévia do Cálculo</p>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Valor original</span>
                  <span className="text-xs text-foreground font-medium">{formatCurrency(P)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Taxa equivalente</span>
                  <span className="text-xs text-foreground font-medium">{previewRate.toFixed(2)}% a.m.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Total com juros</span>
                  <span className="text-xs text-neon font-medium">{formatCurrency(previewTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Valor por parcela</span>
                  <span className="text-xs text-neon font-bold">{formatCurrency(previewPmt)}</span>
                </div>
                <div className="flex justify-between border-t border-neon/10 pt-2 mt-2">
                  <span className="text-xs text-muted-foreground">Custo dos juros</span>
                  <span className="text-xs text-warning font-medium">{formatCurrency(previewTotal - P)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)} className="bg-surface-elevated text-foreground hover:bg-secondary rounded-xl flex-1">Cancelar</Button>
            <Button
              onClick={handleCreate}
              disabled={submitting || !form.borrowerId || !P || !n || (calcMode === 'BY_RATE' && !r) || (calcMode === 'BY_TOTAL' && !totalInput)}
              className="bg-neon text-background hover:bg-neon/90 font-semibold rounded-xl flex-1"
            >
              {submitting ? 'Criando...' : 'Criar Empréstimo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-surface border-border text-foreground sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-danger">Excluir Empréstimo</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Excluir empréstimo de <strong className="text-foreground">{selected?.borrower.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)} className="bg-surface-elevated text-foreground hover:bg-secondary rounded-xl flex-1">Cancelar</Button>
            <Button onClick={handleDelete} disabled={submitting} className="bg-danger text-white hover:bg-danger/90 font-semibold rounded-xl flex-1">
              {submitting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}