import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/sessions';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getSessionUserId(_request);
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const { id } = await params;
    const borrower = await db.borrower.findFirst({
      where: { id, userId },
      include: {
        loans: {
          include: { installments: { orderBy: { installmentNumber: 'asc' } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!borrower) {
      return NextResponse.json({ error: 'Borrower not found' }, { status: 404 });
    }

    return NextResponse.json(borrower);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch borrower' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getSessionUserId(request);
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, whatsapp, notes } = body;

    const borrower = await db.borrower.updateMany({
      where: { id, userId },
      data: {
        name,
        whatsapp: whatsapp.replace(/\D/g, ''),
        notes: notes || null,
      },
    });

    if (borrower.count === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updated = await db.borrower.findUnique({ where: { id } });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update borrower' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getSessionUserId(_request);
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const { id } = await params;
    const result = await db.borrower.deleteMany({ where: { id, userId } });
    if (result.count === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete borrower' }, { status: 500 });
  }
}