import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/sessions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getSessionUserId(request);
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const { id } = await params;

    // Get the installment
    const installment = await db.installment.findFirst({
      where: { id },
      include: { loan: { include: { installments: true } } },
    });

    if (!installment || installment.loan.userId !== userId) {
      return NextResponse.json({ error: 'Parcela não encontrada' }, { status: 404 });
    }

    if (installment.status !== 'PARTIAL') {
      return NextResponse.json({ error: 'Apenas parcelas parciais podem ser roladas' }, { status: 400 });
    }

    const paidInterest = installment.paidAmount;

    // 1. Create a new installment representing the paid interest
    await db.installment.create({
      data: {
        loanId: installment.loanId,
        installmentNumber: installment.installmentNumber,
        dueDate: installment.dueDate,
        amount: paidInterest,
        status: 'PAID',
        paidAmount: paidInterest,
        paidAt: installment.paidAt || new Date(),
        type: 'INTEREST',
      },
    });

    // 2. Postergar a parcela atual e as futuras
    const installmentsToMove = installment.loan.installments.filter(
      (inst) => inst.installmentNumber >= installment.installmentNumber
    );

    for (const inst of installmentsToMove) {
      const nextDueDate = new Date(inst.dueDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);

      if (inst.id === installment.id) {
        // Reset and roll the current installment
        await db.installment.update({
          where: { id: inst.id },
          data: {
            installmentNumber: inst.installmentNumber + 1,
            dueDate: nextDueDate,
            status: 'PENDING',
            paidAmount: 0,
            paidAt: null,
          },
        });
      } else {
        // Roll subsequent installments
        await db.installment.update({
          where: { id: inst.id },
          data: {
            installmentNumber: inst.installmentNumber + 1,
            dueDate: nextDueDate,
          },
        });
      }
    }

    await db.loan.update({
      where: { id: installment.loanId },
      data: { status: 'ACTIVE' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in roll-remaining:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
