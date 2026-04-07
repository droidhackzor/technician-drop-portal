import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const cookieName = 'cdp_session';

function getSecret() {
  const secret = process.env.JWT_SECRET || 'temporary-insecure-demo-secret-change-me';
  return new TextEncoder().encode(secret);
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  };
}

export async function createSession(user: { id: string; email: string; fullName: string; role: string }) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());

  cookies().set(cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSession() {
  cookies().set(cookieName, '', { path: '/', maxAge: 0 });
}

export async function getSession() {
  const token = cookies().get(cookieName)?.value;
  if (!token) return null;

  try {
    const verified = await jwtVerify(token, getSecret());
    return verified.payload as {
      id: string;
      email: string;
      fullName: string;
      role: 'TECHNICIAN' | 'LEADERSHIP';
    };
  } catch {
    return null;
  }
}
