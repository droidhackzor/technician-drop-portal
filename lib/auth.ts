import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret'
);

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role: string;
};

export async function authenticateUser(email: string, password: string): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    role: user.role,
  };
}

export async function createSessionToken(user: SessionUser) {
  return await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get('session')?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    return {
      id: String(payload.id),
      email: String(payload.email),
      name: payload.name ? String(payload.name) : null,
      role: String(payload.role),
    };
  } catch {
    return null;
  }
}
