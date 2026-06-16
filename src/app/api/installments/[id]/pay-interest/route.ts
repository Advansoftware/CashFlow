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
    const body = await request.json();
    const { interestAmount, rollImmediately } = body;

    if (interestAmount === undefined || interestAmount <= 0) {
      return NextResponse.json({ error: 'Valor do juro inválido' }, { status: 400 });
    }

    // Get the installment
    const installment = await db.installment.findFirst({
      where: { id },
      include: { loan: { include: { installments: true } } },
    });

    if (!installment || installment.loan.userId !== userId) {
      return NextResponse.json({ error: 'Parcela não encontrada' }, { status: 404 });
    }

    if (rollImmediately) {
      // 1. Create a new installment representing the paid interest
      await db.installment.create({
        data: {
          loanId: installment.loanId,
          installmentNumber: installment.installmentNumber,
          dueDate: installment.dueDate,
          amount: interestAmount,
          status: 'PAID',
          paidAmount: interestAmount,
          paidAt: new Date(),
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

        await db.installment.update({
          where: { id: inst.id },
          data: {
            installmentNumber: inst.installmentNumber + 1,
            dueDate: nextDueDate,
          },
        });
      }

      await db.loan.update({
        where: { id: installment.loanId },
        data: { status: 'ACTIVE' },
      });

      return NextResponse.json({ success: true, rolled: true });
    } else {
      // Just record partial payment on the current installment
      const updated = await db.installment.update({
        where: { id },
        data: {
          status: 'PARTIAL',
          paidAmount: interestAmount,
          paidAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, rolled: false, updated });
    }
  } catch (error) {
    console.error('Error in pay-interest:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
