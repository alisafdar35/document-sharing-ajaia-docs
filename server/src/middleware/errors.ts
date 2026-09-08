import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError, sendError } from '../lib/http';

export function notFoundHandler(req: Request, res: Response) {
  return sendError(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
}

/** Turns every thrown error into the standard `{ success: false, error }` shape. */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error instanceof AppError) {
    return sendError(res, error.status, error.message);
  }

  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? 'The request was invalid.';
    return sendError(res, 400, message);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return sendError(res, 409, 'That record already exists.');
    }
    if (error.code === 'P2025') {
      return sendError(res, 404, 'The requested record no longer exists.');
    }
  }

  if (error instanceof SyntaxError && 'body' in error) {
    return sendError(res, 400, 'The request body was not valid JSON.');
  }

  console.error('[unhandled error]', error);
  return sendError(res, 500, 'Something went wrong. Please try again.');
}
