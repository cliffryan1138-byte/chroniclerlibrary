import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  authenticate,
  createSessionToken,
  getUsers,
} from '@/lib/auth';

export async function POST(req: Request) {
  let username = '';
  let password = '';
  try {
    const body = await req.json();
    username = String(body.username ?? '');
    password = String(body.password ?? '');
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }

  if (getUsers().length === 0) {
    return NextResponse.json(
      { error: 'No users are configured. Set DASHBOARD_USERS in the environment.' },
      { status: 500 },
    );
  }

  const user = authenticate(username, password);
  if (!user) {
    return NextResponse.json({ error: 'Wrong username or password.' }, { status: 401 });
  }

  let token: string;
  try {
    token = createSessionToken(user);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not start a session.' },
      { status: 500 },
    );
  }

  const res = NextResponse.json({ ok: true, name: user.name || user.username });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
