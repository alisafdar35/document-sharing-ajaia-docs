import type { Express } from 'express';
import { createApp } from '../app';
import { prisma } from '../prisma';
import { emptyDoc, serializeContent } from '../lib/tiptap';
import type { TipTapDoc } from '../lib/tiptap';

export const app: Express = createApp();

/** Wipes every table. Called before each test so cases stay independent. */
export async function resetDatabase() {
  await prisma.documentShare.deleteMany();
  await prisma.document.deleteMany();
  await prisma.user.deleteMany();
}

export const createUser = (name: string, email: string, createdAt?: Date) =>
  prisma.user.create({ data: { name, email, ...(createdAt ? { createdAt } : {}) } });

/**
 * Ali owns things, Sarah is shared with, John is the outsider.
 *
 * createdAt is set explicitly because /api/users orders by it, and three
 * inserts can otherwise land in the same millisecond and tie.
 */
export async function seedUsers() {
  const base = Date.UTC(2026, 0, 1);
  const at = (minutes: number) => new Date(base + minutes * 60_000);

  const ali = await createUser('Ali Safdar', 'ali@example.com', at(0));
  const sarah = await createUser('Sarah Johnson', 'sarah@example.com', at(1));
  const john = await createUser('John Smith', 'john@example.com', at(2));

  return { ali, sarah, john };
}

export const createDocument = (
  ownerId: string,
  title = 'Test document',
  content: TipTapDoc = emptyDoc()
) =>
  prisma.document.create({
    data: { title, content: serializeContent(content), ownerId },
  });

export const shareDocument = (documentId: string, userId: string) =>
  prisma.documentShare.create({ data: { documentId, userId } });

/** A minimal TipTap document containing one paragraph of `text`. */
export const docWithText = (text: string): TipTapDoc => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});
