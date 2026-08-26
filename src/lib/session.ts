import { cookies } from 'next/headers';
import { SESSION_COOKIE, readSessionToken, type Session } from './auth';

/** Read the signed session from the request cookies, or null. */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

/** For route handlers: returns the session or throws a 401-shaped error. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    const err = new Error('Not signed in.') as Error & { status?: number };
    err.status = 401;
    throw err;
  }
  return session;
}

export function errorResponse(err: unknown): Response {
  const status = (err as { status?: number })?.status ?? 500;
  const message = err instanceof Error ? err.message : 'Something went wrong.';
  return Response.json({ error: message }, { status });
}
