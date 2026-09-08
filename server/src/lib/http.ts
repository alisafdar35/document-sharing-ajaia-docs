import type { Response } from 'express';

/**
 * Every API response uses one of two shapes:
 *   { success: true,  data: ... }
 *   { success: false, error: "human readable message" }
 */
export function sendOk<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function sendError(res: Response, status: number, error: string) {
  return res.status(status).json({ success: false, error });
}

/** An error carrying the HTTP status the client should receive. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string) => new AppError(400, message);
export const unauthorized = (message: string) => new AppError(401, message);
export const forbidden = (message: string) => new AppError(403, message);
export const notFound = (message: string) => new AppError(404, message);
export const conflict = (message: string) => new AppError(409, message);
