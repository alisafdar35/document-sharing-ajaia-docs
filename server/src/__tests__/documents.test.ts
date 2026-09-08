import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../prisma';
import {
  app,
  createDocument,
  docWithText,
  resetDatabase,
  seedUsers,
  shareDocument,
} from './helpers';

describe('GET /api/documents', () => {
  beforeEach(resetDatabase);

  it('splits documents into owned and shared buckets', async () => {
    const { ali, sarah } = await seedUsers();
    const mine = await createDocument(ali.id, 'My notes');
    const hers = await createDocument(sarah.id, 'Her notes');
    await shareDocument(hers.id, ali.id);

    const response = await request(app).get('/api/documents').set('x-user-id', ali.id).expect(200);

    expect(response.body.data.owned).toHaveLength(1);
    expect(response.body.data.owned[0]).toMatchObject({
      id: mine.id,
      title: 'My notes',
      role: 'owner',
      sharedWithCount: 0,
    });

    expect(response.body.data.shared).toHaveLength(1);
    expect(response.body.data.shared[0]).toMatchObject({
      id: hers.id,
      title: 'Her notes',
      role: 'editor',
      permission: 'editor',
      owner: { id: sarah.id, name: 'Sarah Johnson' },
    });
  });

  it('includes a plain-text preview instead of the raw content', async () => {
    const { ali } = await seedUsers();
    await createDocument(ali.id, 'With content', docWithText('Hello from the preview.'));

    const response = await request(app).get('/api/documents').set('x-user-id', ali.id).expect(200);

    expect(response.body.data.owned[0].preview).toBe('Hello from the preview.');
    expect(response.body.data.owned[0].content).toBeUndefined();
  });

  it('counts how many people a document is shared with', async () => {
    const { ali, sarah, john } = await seedUsers();
    const doc = await createDocument(ali.id);
    await shareDocument(doc.id, sarah.id);
    await shareDocument(doc.id, john.id);

    const response = await request(app).get('/api/documents').set('x-user-id', ali.id).expect(200);

    expect(response.body.data.owned[0].sharedWithCount).toBe(2);
  });

  it('never leaks documents the user has no relationship with', async () => {
    const { ali, john } = await seedUsers();
    await createDocument(ali.id, 'Private');

    const response = await request(app).get('/api/documents').set('x-user-id', john.id).expect(200);

    expect(response.body.data).toEqual({ owned: [], shared: [] });
  });
});

describe('GET /api/documents/:id', () => {
  beforeEach(resetDatabase);

  it('returns the parsed content and owner role for the owner', async () => {
    const { ali } = await seedUsers();
    const doc = await createDocument(ali.id, 'Readable', docWithText('Body text'));

    const response = await request(app)
      .get(`/api/documents/${doc.id}`)
      .set('x-user-id', ali.id)
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: doc.id,
      title: 'Readable',
      role: 'owner',
      owner: { id: ali.id },
      shares: [],
    });
    // Content comes back as JSON, not the stored string.
    expect(response.body.data.content).toEqual(docWithText('Body text'));
  });

  it('gives a shared user the editor role', async () => {
    const { ali, sarah } = await seedUsers();
    const doc = await createDocument(ali.id);
    await shareDocument(doc.id, sarah.id);

    const response = await request(app)
      .get(`/api/documents/${doc.id}`)
      .set('x-user-id', sarah.id)
      .expect(200);

    expect(response.body.data.role).toBe('editor');
  });

  it('forbids a user the document was not shared with', async () => {
    const { ali, john } = await seedUsers();
    const doc = await createDocument(ali.id);

    const response = await request(app)
      .get(`/api/documents/${doc.id}`)
      .set('x-user-id', john.id)
      .expect(403);

    expect(response.body.error).toMatch(/do not have access/i);
  });

  it('404s for a document that does not exist', async () => {
    const { ali } = await seedUsers();

    await request(app).get('/api/documents/missing-id').set('x-user-id', ali.id).expect(404);
  });

  it('falls back to an empty document when stored content is corrupt', async () => {
    const { ali } = await seedUsers();
    const doc = await createDocument(ali.id);
    await prisma.document.update({ where: { id: doc.id }, data: { content: 'not json{' } });

    const response = await request(app)
      .get(`/api/documents/${doc.id}`)
      .set('x-user-id', ali.id)
      .expect(200);

    expect(response.body.data.content).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
  });
});

describe('POST /api/documents', () => {
  beforeEach(resetDatabase);

  it('creates an empty document owned by the caller', async () => {
    const { ali } = await seedUsers();

    const response = await request(app)
      .post('/api/documents')
      .set('x-user-id', ali.id)
      .send({})
      .expect(201);

    expect(response.body.data).toMatchObject({
      title: 'Untitled document',
      role: 'owner',
      owner: { id: ali.id },
      shares: [],
    });
    expect(response.body.data.content).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
  });

  it('accepts a custom title and trims it', async () => {
    const { ali } = await seedUsers();

    const response = await request(app)
      .post('/api/documents')
      .set('x-user-id', ali.id)
      .send({ title: '  Q4 planning  ' })
      .expect(201);

    expect(response.body.data.title).toBe('Q4 planning');
  });

  it('rejects an empty title', async () => {
    const { ali } = await seedUsers();

    const response = await request(app)
      .post('/api/documents')
      .set('x-user-id', ali.id)
      .send({ title: '   ' })
      .expect(400);

    expect(response.body.error).toMatch(/Title cannot be empty/i);
  });

  it('rejects a title over 200 characters', async () => {
    const { ali } = await seedUsers();

    const response = await request(app)
      .post('/api/documents')
      .set('x-user-id', ali.id)
      .send({ title: 'a'.repeat(201) })
      .expect(400);

    expect(response.body.error).toMatch(/200 characters or fewer/i);
  });
});

describe('PATCH /api/documents/:id', () => {
  beforeEach(resetDatabase);

  it('lets the owner rename a document', async () => {
    const { ali } = await seedUsers();
    const doc = await createDocument(ali.id, 'Old name');

    const response = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('x-user-id', ali.id)
      .send({ title: 'New name' })
      .expect(200);

    expect(response.body.data.title).toBe('New name');
  });

  it('lets a shared editor update the content', async () => {
    const { ali, sarah } = await seedUsers();
    const doc = await createDocument(ali.id);
    await shareDocument(doc.id, sarah.id);

    const response = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('x-user-id', sarah.id)
      .send({ content: docWithText('Edited by Sarah') })
      .expect(200);

    expect(response.body.data.content).toEqual(docWithText('Edited by Sarah'));
    expect(response.body.data.role).toBe('editor');
  });

  it('stops a shared editor from renaming the document', async () => {
    const { ali, sarah } = await seedUsers();
    const doc = await createDocument(ali.id, 'Ali owns this');
    await shareDocument(doc.id, sarah.id);

    const response = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('x-user-id', sarah.id)
      .send({ title: 'Sarah renamed it' })
      .expect(403);

    expect(response.body.error).toMatch(/only the document owner can rename/i);
    const unchanged = await prisma.document.findUnique({ where: { id: doc.id } });
    expect(unchanged?.title).toBe('Ali owns this');
  });

  it('stops a user without access from editing', async () => {
    const { ali, john } = await seedUsers();
    const doc = await createDocument(ali.id);

    await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('x-user-id', john.id)
      .send({ content: docWithText('Sneaky') })
      .expect(403);
  });

  it('rejects content that is not a TipTap document', async () => {
    const { ali } = await seedUsers();
    const doc = await createDocument(ali.id);

    const response = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('x-user-id', ali.id)
      .send({ content: { type: 'paragraph' } })
      .expect(400);

    expect(response.body.error).toMatch(/not in a valid format/i);
  });

  it('rejects an update with nothing to change', async () => {
    const { ali } = await seedUsers();
    const doc = await createDocument(ali.id);

    const response = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('x-user-id', ali.id)
      .send({})
      .expect(400);

    expect(response.body.error).toMatch(/nothing to update/i);
  });

  it('bumps updatedAt when content changes', async () => {
    const { ali } = await seedUsers();
    const doc = await createDocument(ali.id);

    const response = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('x-user-id', ali.id)
      .send({ content: docWithText('Later') })
      .expect(200);

    expect(new Date(response.body.data.updatedAt).getTime()).toBeGreaterThanOrEqual(
      doc.updatedAt.getTime()
    );
  });
});

describe('DELETE /api/documents/:id', () => {
  beforeEach(resetDatabase);

  it('lets the owner delete a document and its shares', async () => {
    const { ali, sarah } = await seedUsers();
    const doc = await createDocument(ali.id);
    await shareDocument(doc.id, sarah.id);

    const response = await request(app)
      .delete(`/api/documents/${doc.id}`)
      .set('x-user-id', ali.id)
      .expect(200);

    expect(response.body.data).toEqual({ id: doc.id, deleted: true });
    expect(await prisma.document.findUnique({ where: { id: doc.id } })).toBeNull();
    expect(await prisma.documentShare.count({ where: { documentId: doc.id } })).toBe(0);
  });

  it('stops a shared editor from deleting the document', async () => {
    const { ali, sarah } = await seedUsers();
    const doc = await createDocument(ali.id);
    await shareDocument(doc.id, sarah.id);

    const response = await request(app)
      .delete(`/api/documents/${doc.id}`)
      .set('x-user-id', sarah.id)
      .expect(403);

    expect(response.body.error).toMatch(/only the document owner can delete/i);
    expect(await prisma.document.findUnique({ where: { id: doc.id } })).not.toBeNull();
  });
});
