/** MathSphere AI — cookie sessions with scrypt password hashing. No external auth dependency. */
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";

export const SESSION_COOKIE = "mathsphere_session";
const SESSION_DAYS = 30;

export function hashPassword(password: string, salt?: string) {
  const s = salt ?? randomBytes(16).toString("hex");
  const hash = scryptSync(password, s, 64).toString("hex");
  return { salt: s, hash };
}

export function verifyPassword(password: string, salt: string, expected: string): boolean {
  const actual = scryptSync(password, salt, 64);
  const exp = Buffer.from(expected, "hex");
  if (exp.length !== actual.length) return false;
  return timingSafeEqual(actual, exp);
}

export interface SessionUser {
  id: number;
  username: string;
  displayName: string;
}

export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await db.insert(sessions).values({ token, userId, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    try { await db.delete(sessions).where(eq(sessions.token, token)); } catch { /* already gone */ }
  }
  jar.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<SessionUser | null> {
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const rows = await db
      .select({ id: users.id, username: users.username, displayName: users.displayName })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function registerUser(username: string, password: string, displayName?: string) {
  const clean = username.trim().toLowerCase();
  if (!/^[a-z0-9_.-]{3,32}$/.test(clean)) return { error: "Usernames must be 3–32 characters: letters, digits, dot, dash or underscore." } as const;
  if (password.length < 6) return { error: "Passwords must be at least 6 characters." } as const;
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, clean)).limit(1);
  if (existing.length) return { error: "That username is already taken." } as const;
  const { salt, hash } = hashPassword(password);
  const cleanDisplayName = (displayName ?? username).trim().slice(0, 40) || clean;
  const inserted = await db
    .insert(users)
    .values({ username: clean, displayName: cleanDisplayName, passwordHash: hash, salt })
    .returning({ id: users.id, username: users.username, displayName: users.displayName });
  return { user: inserted[0] } as const;
}

export async function loginUser(username: string, password: string) {
  const clean = username.trim().toLowerCase();
  const rows = await db.select().from(users).where(eq(users.username, clean)).limit(1);
  const u = rows[0];
  if (!u) return { error: "No such account. Check the username or register first." } as const;
  if (!verifyPassword(password, u.salt, u.passwordHash)) return { error: "Incorrect password." } as const;
  return { user: { id: u.id, username: u.username, displayName: u.displayName } } as const;
}
