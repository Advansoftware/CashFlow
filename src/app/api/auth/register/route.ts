import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/app/api/auth/login/route';
import { db } from '@/lib/db';
import { getUserById } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  const userId = getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const currentUser = await getUserById(userId);
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Apenas administradores podem criar usuários' }, { status: 403 });
  }

  const { email, name, password, role } = await request.json();

  if (!email || !name || !password || !role) {
    return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });
  }

  if (!['ADMIN', 'CLIENT'].includes(role)) {
    return NextResponse.json({ error: 'Role inválido' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter no mínimo 6 caracteres' }, { status: 400 });
  }

  // Only super admin (bruno) can create other admins
  if (role === 'ADMIN' && currentUser.email !== 'brunoantunes94@hotmail.com') {
    return NextResponse.json({ error: 'Apenas o administrador principal pode criar outros admins' }, { status: 403 });
  }

  const existing = await db.systemUser.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Este email já está cadastrado' }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 12);

  const newUser = await db.systemUser.create({
    data: {
      email,
      name,
      passwordHash: hash,
      role,
      mustChangePassword: true,
      isActive: true,
      createdBy: userId,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      mustChangePassword: true,
      createdAt: true,
    },
  });

  return NextResponse.json(newUser, { status: 201 });
}