import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { verifyCredentials, generateToken } from '@/lib/auth';

// In-memory session store
const sessions = new Map<string, { userId: string; expires: number }>();

export function getSessionUserId(request?: NextRequest): string | null {
  const cookieStore = request ? request.cookies : cookies();
  const token = cookieStore.get('cf_session')?.value;
  if (!token) return null;

  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expires) {
    sessions.delete(token);
    return null;
  }

  return session.userId;
}

export function createSession(userId: string): string {
  const token = generateToken();
  sessions.set(token, {
    userId,
    expires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  });
  return token;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    const user = await verifyCredentials(email, password);
    if (!user) {
      return NextResponse.json({ error: 'Email ou senha inválidos' }, { status: 401 });
    }

    const token = createSession(user.id);

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });

    response.cookies.set('cf_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao fazer login' }, { status: 500 });
  }
}