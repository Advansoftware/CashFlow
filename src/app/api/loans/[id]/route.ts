import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/sessions';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getSessionUserId(_request);
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const { id } = await params;
    const loan = await db.loan.findFirst({
      where: { id, userId },
      include: {
        borrower: true,
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    return NextResponse.json(loan);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch loan' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getSessionUserId(_request);
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const { id } = await params;
    const result = await db.loan.deleteMany({ where: { id, userId } });
    if (result.count === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete loan' }, { status: 500 });
  }
}