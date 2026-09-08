import { Router } from 'express';
import { prisma } from '../prisma';
import { sendOk } from '../lib/http';

export const usersRouter = Router();

/**
 * GET /api/users
 * Powers the demo user switcher and the "share with" picker.
 * Deliberately open (no x-user-id required) so the client can boot.
 */
usersRouter.get('/', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    return sendOk(res, users);
  } catch (error) {
    next(error);
  }
});
