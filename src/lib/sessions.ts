// In-memory session store
const sessions = new Map<string, { userId: string; expires: number }>();

export function createSession(userId: string): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  sessions.set(token, {
    userId,
    expires: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });
  return token;
}

export function getSessionUserId(request: Request): string | null {
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