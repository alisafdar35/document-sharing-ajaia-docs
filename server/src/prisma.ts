import { PrismaClient } from '@prisma/client';

/**
 * A single PrismaClient per process. `globalThis` caching keeps `tsx watch`
 * from opening a new connection pool on every hot reload.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
