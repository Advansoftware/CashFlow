import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/app/api/auth/login/route';

export async function GET(request: NextRequest) {
  const userId = getSessionUserId(request);
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  // Verify admin
  const user = await db.systemUser.findUnique({ where: { id: userId } });
  if (!user || user.email !== 'brunoantunes94@hotmail.com') {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  }

  const users = await db.systemUser.findMany({
    where: { isActive: true },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      mustChangePassword: true,
      createdAt: true,
      _count: {
        select: {
          borrowers: true,
          loans: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(users);
}

export async function DELETE(request: NextRequest) {
  const userId = getSessionUserId(request);
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const admin = await db.systemUser.findUnique({ where: { id: userId } });
  if (!admin || admin.email !== 'brunoantunes94@hotmail.com') {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
  }

  const { targetUserId } = await request.json();
  if (!targetUserId) {
    return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 });
  }

  if (targetUserId === userId) {
    return NextResponse.json({ error: 'Não pode desativar a si mesmo' }, { status: 400 });
  }

  await db.systemUser.update({
    where: { id: targetUserId },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}