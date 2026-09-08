import { Router } from 'express';
import { prisma } from '../prisma';
import { requireUser } from '../middleware/require-user';
import { getDocumentForUser, getOwnedDocument } from '../lib/access';
import { badRequest, conflict, forbidden, notFound, sendOk } from '../lib/http';
import {
  buildPreview,
  emptyDoc,
  isTipTapDoc,
  parseContent,
  serializeContent,
} from '../lib/tiptap';
import { fileToDocument } from '../lib/import';
import {
  createDocumentSchema,
  importDocumentSchema,
  shareDocumentSchema,
  updateDocumentSchema,
} from '../lib/validation';

export const documentsRouter = Router();

// Every document route requires a valid active user.
documentsRouter.use(requireUser);

const ownerSelect = { id: true, name: true, email: true } as const;

const detailInclude = {
  owner: { select: ownerSelect },
  shares: {
    include: { user: { select: ownerSelect } },
    orderBy: { createdAt: 'asc' },
  },
} as const;

type ShareRecord = {
  id: string;
  permission: string;
  createdAt: Date;
  user: { id: string; name: string; email: string };
};

const serializeShares = (shares: ShareRecord[]) =>
  shares.map((share) => ({
    id: share.id,
    permission: share.permission,
    createdAt: share.createdAt,
    user: share.user,
  }));

/**
 * GET /api/documents
 * Returns the two dashboard buckets: documents the user owns and documents
 * that have been shared with them. Newest activity first.
 */
documentsRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [owned, sharedRows] = await Promise.all([
      prisma.document.findMany({
        where: { ownerId: userId },
        orderBy: { updatedAt: 'desc' },
        include: { owner: { select: ownerSelect }, _count: { select: { shares: true } } },
      }),
      prisma.documentShare.findMany({
        where: { userId },
        orderBy: { document: { updatedAt: 'desc' } },
        include: { document: { include: { owner: { select: ownerSelect } } } },
      }),
    ]);

    return sendOk(res, {
      owned: owned.map((doc) => ({
        id: doc.id,
        title: doc.title,
        preview: buildPreview(doc.content),
        owner: doc.owner,
        role: 'owner' as const,
        sharedWithCount: doc._count.shares,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })),
      shared: sharedRows.map((row) => ({
        id: row.document.id,
        title: row.document.title,
        preview: buildPreview(row.document.content),
        owner: row.document.owner,
        role: 'editor' as const,
        permission: row.permission,
        sharedAt: row.createdAt,
        createdAt: row.document.createdAt,
        updatedAt: row.document.updatedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/** GET /api/documents/:id - owner or shared editor only. */
documentsRouter.get('/:id', async (req, res, next) => {
  try {
    const { document, role } = await getDocumentForUser(req.params.id, req.user.id);

    return sendOk(res, {
      id: document.id,
      title: document.title,
      content: parseContent(document.content),
      owner: document.owner,
      role,
      shares: serializeShares(document.shares),
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  } catch (error) {
    next(error);
  }
});

/** POST /api/documents - creates an empty document owned by the active user. */
documentsRouter.post('/', async (req, res, next) => {
  try {
    const { title } = createDocumentSchema.parse(req.body ?? {});

    const document = await prisma.document.create({
      data: {
        title: title ?? 'Untitled document',
        content: serializeContent(emptyDoc()),
        ownerId: req.user.id,
      },
      include: detailInclude,
    });

    return sendOk(
      res,
      {
        id: document.id,
        title: document.title,
        content: parseContent(document.content),
        owner: document.owner,
        role: 'owner' as const,
        shares: [],
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      },
      201
    );
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/documents/import
 * The client reads the file locally and posts its text, so there is no
 * multipart upload to manage. Type / size / emptiness are validated here as
 * well as in the browser.
 */
documentsRouter.post('/import', async (req, res, next) => {
  try {
    const { filename, content } = importDocumentSchema.parse(req.body ?? {});
    const { title, doc } = fileToDocument(filename, content);

    const document = await prisma.document.create({
      data: { title, content: serializeContent(doc), ownerId: req.user.id },
      include: { owner: { select: ownerSelect } },
    });

    return sendOk(
      res,
      {
        id: document.id,
        title: document.title,
        content: parseContent(document.content),
        owner: document.owner,
        role: 'owner' as const,
        shares: [],
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      },
      201
    );
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/documents/:id
 * Owner may rename and edit content; a shared editor may only edit content.
 */
documentsRouter.patch('/:id', async (req, res, next) => {
  try {
    const { title, content } = updateDocumentSchema.parse(req.body ?? {});
    const { document, role } = await getDocumentForUser(req.params.id, req.user.id);

    if (title !== undefined && role !== 'owner') {
      throw forbidden('Only the document owner can rename this document.');
    }

    const data: { title?: string; content?: string } = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) {
      if (!isTipTapDoc(content)) {
        throw badRequest('Document content is not in a valid format.');
      }
      data.content = serializeContent(content);
    }

    const updated = await prisma.document.update({
      where: { id: document.id },
      data,
      include: detailInclude,
    });

    return sendOk(res, {
      id: updated.id,
      title: updated.title,
      content: parseContent(updated.content),
      owner: updated.owner,
      role,
      shares: serializeShares(updated.shares),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    next(error);
  }
});

/** DELETE /api/documents/:id - owner only. Shares are removed with it. */
documentsRouter.delete('/:id', async (req, res, next) => {
  try {
    const document = await getOwnedDocument(req.params.id, req.user.id, 'delete this document');

    await prisma.$transaction([
      prisma.documentShare.deleteMany({ where: { documentId: document.id } }),
      prisma.document.delete({ where: { id: document.id } }),
    ]);

    return sendOk(res, { id: document.id, deleted: true });
  } catch (error) {
    next(error);
  }
});

/** POST /api/documents/:id/share - owner only. */
documentsRouter.post('/:id/share', async (req, res, next) => {
  try {
    const { userId, permission } = shareDocumentSchema.parse(req.body ?? {});
    const document = await getOwnedDocument(req.params.id, req.user.id, 'share this document');

    if (userId === document.ownerId) {
      throw badRequest('This person already owns the document.');
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      throw notFound('That user does not exist.');
    }

    const existing = await prisma.documentShare.findUnique({
      where: { documentId_userId: { documentId: document.id, userId } },
    });
    if (existing) {
      throw conflict(`${target.name} already has access to this document.`);
    }

    const share = await prisma.documentShare.create({
      data: { documentId: document.id, userId, permission: permission ?? 'editor' },
      include: { user: { select: ownerSelect } },
    });

    return sendOk(
      res,
      {
        id: share.id,
        permission: share.permission,
        createdAt: share.createdAt,
        user: share.user,
      },
      201
    );
  } catch (error) {
    next(error);
  }
});

/** DELETE /api/documents/:id/share/:userId - owner only. */
documentsRouter.delete('/:id/share/:userId', async (req, res, next) => {
  try {
    const document = await getOwnedDocument(
      req.params.id,
      req.user.id,
      'change who this document is shared with'
    );

    const share = await prisma.documentShare.findUnique({
      where: { documentId_userId: { documentId: document.id, userId: req.params.userId } },
    });
    if (!share) {
      throw notFound('That person does not have access to this document.');
    }

    await prisma.documentShare.delete({ where: { id: share.id } });

    return sendOk(res, { documentId: document.id, userId: req.params.userId, removed: true });
  } catch (error) {
    next(error);
  }
});
