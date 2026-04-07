import { NextResponse } from 'next/server';
import { z } from 'zod';
import { login } from '@/lib/auth';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid email or password payload' },
        { status: 400 }
      );
    }

    const user = await login(parsed.data.email, parsed.data.password);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
