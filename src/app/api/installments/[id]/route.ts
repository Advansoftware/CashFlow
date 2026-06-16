import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/app/api/auth/login/route';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getSessionUserId(request);
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, paidAmount } = body;

    // Verify installment belongs to user's loan
    const installment = await db.installment.findFirst({
      where: { id },
      include: { loan: true },
    });

    if (!installment || installment.loan.userId !== userId) {
      return NextResponse.json({ error: 'Parcela não encontrada' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (paidAmount !== undefined) updateData.paidAmount = paidAmount;
    if (status === 'PAID') {
      updateData.paidAt = new Date();
      if (!paidAmount || paidAmount <= 0) {
        updateData.paidAmount = installment.amount;
      }
    }
    if (status === 'PARTIAL' && paidAmount !== undefined) {
      updateData.paidAt = new Date();
    }

    const updated = await db.installment.update({
      where: { id },
      data: updateData,
    });

    // Check if all paid
    if (status === 'PAID' || status === 'PARTIAL') {
      const loan = await db.loan.findUnique({
        where: { id: installment.loanId },
        include: { installments: true },
      });
      if (loan) {
        const allDone = loan.installments.every(
          (inst) => inst.status === 'PAID' || inst.status === 'PARTIAL'
        );
        if (allDone) {
          await db.loan.update({ where: { id: loan.id }, data: { status: 'COMPLETED' } });
        }
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update installment' }, { status: 500 });
  }
}