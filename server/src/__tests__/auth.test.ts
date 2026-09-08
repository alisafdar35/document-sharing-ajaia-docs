import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, resetDatabase, seedUsers } from './helpers';

describe('app basics', () => {
  beforeEach(resetDatabase);

  it('reports health without a user', async () => {
    const response = await request(app).get('/api/health').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
  });

  it('returns a helpful 404 for unknown routes', async () => {
    const response = await request(app).get('/api/nope').expect(404);

    expect(response.body).toEqual({
      success: false,
      error: 'Route not found: GET /api/nope',
    });
  });

  it('lists users without authentication so the client can boot', async () => {
    await seedUsers();

    const response = await request(app).get('/api/users').expect(200);

    expect(response.body.data).toHaveLength(3);
    expect(response.body.data[0]).toMatchObject({ name: 'Ali Safdar', email: 'ali@example.com' });
    // The seeded users are ordered by creation, oldest first.
    expect(response.body.data.map((user: { name: string }) => user.name)).toEqual([
      'Ali Safdar',
      'Sarah Johnson',
      'John Smith',
    ]);
  });
});

describe('requireUser middleware', () => {
  beforeEach(resetDatabase);

  it('rejects a request with no x-user-id header', async () => {
    const response = await request(app).get('/api/documents').expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/Missing user/i);
  });

  it('rejects a blank x-user-id header', async () => {
    const response = await request(app).get('/api/documents').set('x-user-id', '   ').expect(401);

    expect(response.body.error).toMatch(/Missing user/i);
  });

  it('rejects an id that does not belong to a real user', async () => {
    const response = await request(app)
      .get('/api/documents')
      .set('x-user-id', 'not-a-real-user')
      .expect(401);

    expect(response.body.error).toMatch(/Invalid user/i);
  });

  it('accepts a valid user id', async () => {
    const { ali } = await seedUsers();

    const response = await request(app).get('/api/documents').set('x-user-id', ali.id).expect(200);

    expect(response.body.data).toEqual({ owned: [], shared: [] });
  });
});
