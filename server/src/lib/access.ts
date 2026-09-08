import { prisma } from '../prisma';
import { forbidden, notFound } from './http';

export type DocumentRole = 'owner' | 'editor';

const documentInclude = {
  owner: { select: { id: true, name: true, email: true } },
  shares: {
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  },
} as const;

/**
 * The single place where document permissions are decided.
 *
 *   owner  -> read, edit, rename, share, delete
 *   editor -> read, edit content
 *   anyone else -> 403
 *
 * Route handlers must go through this function; the client is never trusted.
 */
export async function getDocumentForUser(documentId: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: documentInclude,
  });

  if (!document) {
    throw notFound('Document not found.');
  }

  if (document.ownerId === userId) {
    return { document, role: 'owner' as DocumentRole };
  }

  const share = document.shares.find((entry) => entry.userId === userId);
  if (share) {
    return { document, role: 'editor' as DocumentRole };
  }

  throw forbidden('You do not have access to this document.');
}

/** Same as getDocumentForUser but rejects anyone who is not the owner. */
export async function getOwnedDocument(documentId: string, userId: string, action: string) {
  const { document, role } = await getDocumentForUser(documentId, userId);
  if (role !== 'owner') {
    throw forbidden(`Only the document owner can ${action}.`);
  }
  return document;
}
