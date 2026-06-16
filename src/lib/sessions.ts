// Session store using globalThis to survive HMR in dev mode
interface SessionData {
  userId: string;
  expires: number;
}

function getSessionStore(): Map<string, SessionData> {
  const g = globalThis as Record<string, unknown>;
  if (!g.__cf_sessions) {
    g.__cf_sessions = new Map<string, SessionData>();
  }
  return g.__cf_sessions as Map<string, SessionData>;
}

export function createSession(userId: string): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  getSessionStore().set(token, {
    userId,
    expires: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });
  return token;
}

export function getSessionUserId(request: Request): string | null {
  const sessions = getSessionStore();

  // Try Authorization header first (most reliable across proxies)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const session = sessions.get(token);
    if (session && Date.now() <= session.expires) {
      return session.userId;
    }
    if (session) sessions.delete(token);
  }

  // Fallback to cookie
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/cf_session=([^;]+)/);
  if (match) {
    const token = match[1];
    const session = sessions.get(token);
    if (session && Date.now() <= session.expires) {
      return session.userId;
    }
    if (session) sessions.delete(token);
  }

  return null;
}