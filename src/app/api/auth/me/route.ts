import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/sessions';
import { getUserById } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const userId = getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const user = await getUserById(userId);
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  return NextResponse.json(user);
}