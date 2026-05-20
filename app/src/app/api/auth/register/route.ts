import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { setAuthCookie } from '@/lib/auth';
import { ok, fail, zodFail, serverError } from '@/lib/api';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = RegisterSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      return fail('Email already in use', 400);
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const initials = input.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();

    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        initials,
        passwordHash,
        settings: {
          create: {
            darkMode: false,
          }
        }
      },
    });

    await setAuthCookie(user.id);
    return ok({ message: 'Account created' }, 201);
  } catch (e) {
    if (e instanceof z.ZodError) return zodFail(e);
    return serverError(e);
  }
}
