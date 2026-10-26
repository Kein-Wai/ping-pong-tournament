import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { prismaMock } from '../testing/prisma-mock';
import { bearer, useTestJwtSecret } from '../testing/auth';

// Solo se mockea la base de datos: verifyToken y los guardas de rol son los reales.
vi.mock('../db', async () => ({
  default: (await import('../testing/prisma-mock')).prismaMock.client,
}));

let app: Awaited<typeof import('../index')>['app'];

const notFound = () => Object.assign(new Error('No User found'), { code: 'P2025' });

describe('Identidad de la sesión (verifyToken lee rol y club vigentes de la base de datos)', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    ({ app } = await import('../index'));
  });

  beforeEach(() => {
    prismaMock.reset();
  });

  it('un token de SuperAdmin cuyo usuario ya es Player en la base de datos pierde el acceso (403)', async () => {
    prismaMock.client.user.findUniqueOrThrow.mockResolvedValue({
      id: 'super-1',
      active: true,
      clubId: null,
      userType: { name: 'Player' },
    });

    const response = await request(app).get('/api/user-types').set(bearer('superAdmin'));

    expect(response.status).toBe(403);
  });

  it('un token con el rol de AdminClub no vale si el usuario fue degradado a Player (403)', async () => {
    prismaMock.client.user.findUniqueOrThrow.mockResolvedValue({
      id: 'admin-1',
      active: true,
      clubId: 'club-1',
      userType: { name: 'Player' },
    });
    prismaMock.client.club.findUnique.mockResolvedValue({ id: 'club-1' });

    const response = await request(app)
      .post('/api/events')
      .set(bearer('adminClub1'))
      .send({});

    expect(response.status).toBe(403);
  });

  it('un token de un usuario borrado se rechaza (401)', async () => {
    prismaMock.client.user.findUniqueOrThrow.mockRejectedValue(notFound());

    const response = await request(app).get('/api/seasons').set(bearer('playerClub1'));

    expect(response.status).toBe(401);
  });

  it('un token de un usuario desactivado se rechaza (401)', async () => {
    prismaMock.client.user.findUniqueOrThrow.mockResolvedValue({
      id: 'player-1',
      active: false,
      clubId: 'club-1',
      userType: { name: 'Player' },
    });

    const response = await request(app).get('/api/seasons').set(bearer('playerClub1'));

    expect(response.status).toBe(401);
  });

  it('un fallo de la base de datos no se confunde con una sesión caducada (500)', async () => {
    prismaMock.client.user.findUniqueOrThrow.mockRejectedValue(new Error('conexión perdida'));

    const response = await request(app).get('/api/seasons').set(bearer('playerClub1'));

    expect(response.status).toBe(500);
  });
});
