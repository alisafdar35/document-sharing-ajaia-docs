import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../prisma';
import { app, createDocument, resetDatabase, seedUsers, shareDocument } from './helpers';

describe('POST /api/documents/:id/share', () => {
  beforeEach(resetDatabase);

  it('lets the owner share with another user', async () => {
    const { ali, sarah } = await seedUsers();
    const doc = await createDocument(ali.id);

    const response = await request(app)
      .post(`/api/documents/${doc.id}/share`)
      .set('x-user-id', ali.id)
      .send({ userId: sarah.id })
      .expect(201);

    expect(response.body.data).toMatchObject({
      permission: 'editor',
      user: { id: sarah.id, name: 'Sarah Johnson', email: 'sarah@example.com' },
    });
  });

  it('makes the document appear in the recipient dashboard', async () => {
    const { ali, sarah } = await seedUsers();
    const doc = await createDocument(ali.id, 'Shared doc');

    await request(app)
      .post(`/api/documents/${doc.id}/share`)
      .set('x-user-id', ali.id)
      .send({ userId: sarah.id })
      .expect(201);

    const dashboard = await request(app)
      .get('/api/documents')
      .set('x-user-id', sarah.id)
      .expect(200);

    expect(dashboard.body.data.shared).toHaveLength(1);
    expect(dashboard.body.data.shared[0].title).toBe('Shared doc');
  });

  it('refuses to share a document twice with the same person', async () => {
    const { ali, sarah } = await seedUsers();
    const doc = await createDocument(ali.id);
    await shareDocument(doc.id, sarah.id);

    const response = await request(app)
      .post(`/api/documents/${doc.id}/share`)
      .set('x-user-id', ali.id)
      .send({ userId: sarah.id })
      .expect(409);

    expect(response.body.error).toMatch(/already has access/i);
  });

  it('refuses to share a document with its own owner', async () => {
    const { ali } = await seedUsers();
    const doc = await createDocument(ali.id);

    const response = await request(app)
      .post(`/api/documents/${doc.id}/share`)
      .set('x-user-id', ali.id)
      .send({ userId: ali.id })
      .expect(400);

    expect(response.body.error).toMatch(/already owns/i);
  });

  it('404s when sharing with a user who does not exist', async () => {
    const { ali } = await seedUsers();
    const doc = await createDocument(ali.id);

    const response = await request(app)
      .post(`/api/documents/${doc.id}/share`)
      .set('x-user-id', ali.id)
      .send({ userId: 'ghost-user' })
      .expect(404);

    expect(response.body.error).toMatch(/does not exist/i);
  });

  it('stops a shared editor from re-sharing the document', async () => {
    const { ali, sarah, john } = await seedUsers();
    const doc = await createDocument(ali.id);
    await shareDocument(doc.id, sarah.id);

    const response = await request(app)
      .post(`/api/documents/${doc.id}/share`)
      .set('x-user-id', sarah.id)
      .send({ userId: john.id })
      .expect(403);

    expect(response.body.error).toMatch(/only the document owner can share/i);
    expect(await prisma.documentShare.count({ where: { documentId: doc.id } })).toBe(1);
  });

  it('requires a userId in the body', async () => {
    const { ali } = await seedUsers();
    const doc = await createDocument(ali.id);

    const response = await request(app)
      .post(`/api/documents/${doc.id}/share`)
      .set('x-user-id', ali.id)
      .send({})
      .expect(400);

    expect(response.body.error).toMatch(/select a person/i);
  });
});

describe('DELETE /api/documents/:id/share/:userId', () => {
  beforeEach(resetDatabase);

  it('lets the owner revoke access', async () => {
    const { ali, sarah } = await seedUsers();
    const doc = await createDocument(ali.id);
    await shareDocument(doc.id, sarah.id);

    const response = await request(app)
      .delete(`/api/documents/${doc.id}/share/${sarah.id}`)
      .set('x-user-id', ali.id)
      .expect(200);

    expect(response.body.data).toEqual({
      documentId: doc.id,
      userId: sarah.id,
      removed: true,
    });
  });

  it('cuts off the revoked user immediately', async () => {
    const { ali, sarah } = await seedUsers();
    const doc = await createDocument(ali.id);
    await shareDocument(doc.id, sarah.id);

    await request(app)
      .delete(`/api/documents/${doc.id}/share/${sarah.id}`)
      .set('x-user-id', ali.id)
      .expect(200);

    await request(app).get(`/api/documents/${doc.id}`).set('x-user-id', sarah.id).expect(403);
  });

  it('404s when the person does not have access', async () => {
    const { ali, john } = await seedUsers();
    const doc = await createDocument(ali.id);

    const response = await request(app)
      .delete(`/api/documents/${doc.id}/share/${john.id}`)
      .set('x-user-id', ali.id)
      .expect(404);

    expect(response.body.error).toMatch(/does not have access/i);
  });

  it('stops a shared editor from revoking anyone', async () => {
    const { ali, sarah, john } = await seedUsers();
    const doc = await createDocument(ali.id);
    await shareDocument(doc.id, sarah.id);
    await shareDocument(doc.id, john.id);

    await request(app)
      .delete(`/api/documents/${doc.id}/share/${john.id}`)
      .set('x-user-id', sarah.id)
      .expect(403);

    expect(await prisma.documentShare.count({ where: { documentId: doc.id } })).toBe(2);
  });
});

describe('document detail shares', () => {
  beforeEach(resetDatabase);

  it('lists everyone the document is shared with', async () => {
    const { ali, sarah, john } = await seedUsers();
    const doc = await createDocument(ali.id);
    await shareDocument(doc.id, sarah.id);
    await shareDocument(doc.id, john.id);

    const response = await request(app)
      .get(`/api/documents/${doc.id}`)
      .set('x-user-id', ali.id)
      .expect(200);

    expect(response.body.data.shares).toHaveLength(2);
    expect(response.body.data.shares.map((s: { user: { id: string } }) => s.user.id)).toEqual([
      sarah.id,
      john.id,
    ]);
  });
});
