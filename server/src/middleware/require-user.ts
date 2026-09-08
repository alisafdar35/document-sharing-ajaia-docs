import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../prisma';
import { unauthorized } from '../lib/http';

export const USER_HEADER = 'x-user-id';

/**
 * Authentication is intentionally simplified for this exercise: the client
 * sends the active demo user's id in the `x-user-id` header. The middleware
 * still resolves that id against the database, so an unknown or malformed id
 * is rejected before it reaches any route handler.
 */
export async function requireUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const headerValue = req.header(USER_HEADER);

    if (!headerValue || headerValue.trim() === '') {
      throw unauthorized('Missing user. Select a user before continuing.');
    }

    const user = await prisma.user.findUnique({ where: { id: headerValue.trim() } });
    if (!user) {
      throw unauthorized('Invalid user. Select a different user and try again.');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
