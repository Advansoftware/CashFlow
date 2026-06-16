import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/sessions';
import { changePassword, getUserById } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  const userId = getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const user = await getUserById(userId);
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 });
  }

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'A nova senha deve ter no mínimo 6 caracteres' }, { status: 400 });
  }

  // Verify current password
  const { db } = await import('@/lib/db');
  const dbUser = await db.systemUser.findUnique({ where: { id: userId } });
  if (!dbUser) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 });
  }

  const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 401 });
  }

  const success = await changePassword(userId, newPassword);
  if (!success) {
    return NextResponse.json({ error: 'Erro ao alterar senha' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}