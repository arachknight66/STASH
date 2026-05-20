import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  issues?: { path: string; message: string }[];
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(error: string, status = 400): NextResponse<ApiError> {
  return NextResponse.json({ success: false, error }, { status });
}

export function zodFail(err: ZodError<any>): NextResponse<ApiError> {
  return NextResponse.json(
    {
      success: false,
      error: 'Validation failed',
      issues: err.issues.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    },
    { status: 422 },
  );
}

export function serverError(e: unknown): NextResponse<ApiError> {
  console.error('[STASH API Error]', e);
  return fail('Internal server error', 500);
}

import { getSessionUserId } from '@/lib/auth';

// Get userId from secure cookie session
export async function getUserId(req: Request): Promise<string | null> {
  return await getSessionUserId();
}
