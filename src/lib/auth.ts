// -----------------------------------------------------------------------------
// Session auth.
//
// Deliberately dependency-free: scrypt for password hashing and an HMAC-signed
// cookie for the session. Users are configured via the DASHBOARD_USERS env var,
// so adding or removing someone is an env change and a redeploy — no database.
// -----------------------------------------------------------------------------

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

export interface DashboardUser {
  username: string;
  name: string;
  passwordHash: string;
}

export interface Session {
  username: string;
  name: string;
  /** Expiry, epoch seconds. */
  exp: number;
}

export const SESSION_COOKIE = 'chronicler_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

// -- Password hashing ---------------------------------------------------------

/** Produce a `scrypt$<salt>$<hash>` string. Used by scripts/hash-password.mjs. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, expected] = parts;
  let actual: Buffer;
  try {
    actual = scryptSync(password, salt, 64);
  } catch {
    return false;
  }
  const expectedBuf = Buffer.from(expected, 'hex');
  if (expectedBuf.length !== actual.length) return false;
  return timingSafeEqual(actual, expectedBuf);
}

// -- User lookup --------------------------------------------------------------

export function getUsers(): DashboardUser[] {
  const raw = process.env.DASHBOARD_USERS;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (u): u is DashboardUser =>
        !!u && typeof u.username === 'string' && typeof u.passwordHash === 'string',
    );
  } catch {
    // A malformed DASHBOARD_USERS must not authenticate anyone.
    return [];
  }
}

export function authenticate(username: string, password: string): DashboardUser | null {
  const user = getUsers().find((u) => u.username.toLowerCase() === username.toLowerCase().trim());
  if (!user) {
    // Burn roughly the same time as a real verification so a missing username
    // and a wrong password aren't distinguishable by response timing.
    verifyPassword(password, `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`);
    return null;
  }
  return verifyPassword(password, user.passwordHash) ? user : null;
}

// -- Signed session cookie ----------------------------------------------------

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error('SESSION_SECRET is not set (or is too short). See .env.example.');
  }
  return s;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createSessionToken(user: DashboardUser): string {
  const session: Session = {
    username: user.username,
    name: user.name || user.username,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined): Session | null {
  if (!token) return null;
  const idx = token.lastIndexOf('.');
  if (idx <= 0) return null;
  const payload = token.slice(0, idx);
  const signature = token.slice(idx + 1);

  let expectedSig: string;
  try {
    expectedSig = sign(payload);
  } catch {
    return null;
  }

  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Session;
    if (typeof session.exp !== 'number' || session.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;
