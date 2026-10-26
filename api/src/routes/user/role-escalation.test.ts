import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { prismaMock } from '../../testing/prisma-mock';
import { bearer, useTestJwtSecret, CLUB_1 } from '../../testing/auth';
import { currentSeasonFixture, userRowWithSecrets } from '../../testing/fixtures';

// Solo se mockea la base de datos: los guardas de autenticacion son los reales.
vi.mock('../../db', async () => ({
  default: (await import('../../testing/prisma-mock')).prismaMock.client,
}));
vi.mock('../../services/email', () => ({ enviarCorreoGenerico: vi.fn().mockResolvedValue(true) }));

const PLAYER_TYPE_ID = 'type-player';
const SUPER_ADMIN_TYPE_ID = '9b2f1c3e-4d5a-4b6c-8d7e-0f1a2b3c4d5e';
let app: Awaited<typeof import('../../index')>['app'];

const lastCall = (fn: { mock: { calls: unknown[][] } }) =>
  fn.mock.calls[fn.mock.calls.length - 1][0] as { data: Record<string, unknown> };

describe('Un AdminClub no puede cambiar el rol de nadie (userTypeId)', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    ({ app } = await import('../../index'));
  });

  beforeEach(() => {
    prismaMock.reset();
    prismaMock.client.season.findFirst.mockResolvedValue(currentSeasonFixture());
    prismaMock.client.userType.findFirst.mockResolvedValue({ id: PLAYER_TYPE_ID });
    prismaMock.client.user.create.mockResolvedValue(userRowWithSecrets({ id: 'new-user' }));
    prismaMock.client.user.findUnique.mockResolvedValue({ id: 'u1', clubId: CLUB_1 });
    prismaMock.client.user.update.mockResolvedValue(userRowWithSecrets());
  });

  const newUser = {
    email: 'nuevo@test.com',
    name: 'Nuevo Jugador',
    userTypeId: SUPER_ADMIN_TYPE_ID,
  };

  describe('POST /api/users', () => {
    it('crea al jugador con el rol Player aunque el AdminClub envíe otro userTypeId', async () => {
      const response = await request(app)
        .post('/api/users')
        .set(bearer('adminClub1'))
        .send(newUser);

      expect(response.status).toBe(201);
      expect(lastCall(prismaMock.client.user.create).data.userTypeId).toBe(PLAYER_TYPE_ID);
    });

    it('el SuperAdmin sí puede elegir el rol', async () => {
      const response = await request(app)
        .post('/api/users')
        .set(bearer('superAdmin'))
        .send(newUser);

      expect(response.status).toBe(201);
      expect(lastCall(prismaMock.client.user.create).data.userTypeId).toBe(SUPER_ADMIN_TYPE_ID);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('ignora el userTypeId que envía un AdminClub', async () => {
      const response = await request(app)
        .put('/api/users/u1')
        .set(bearer('adminClub1'))
        .send({ name: 'Nombre Nuevo', userTypeId: SUPER_ADMIN_TYPE_ID });

      expect(response.status).toBe(200);
      expect(lastCall(prismaMock.client.user.update).data).not.toHaveProperty('userTypeId');
      expect(lastCall(prismaMock.client.user.update).data).toMatchObject({ name: 'Nombre Nuevo' });
    });

    it('el SuperAdmin sí puede cambiar el rol', async () => {
      const response = await request(app)
        .put('/api/users/u1')
        .set(bearer('superAdmin'))
        .send({ userTypeId: SUPER_ADMIN_TYPE_ID });

      expect(response.status).toBe(200);
      expect(lastCall(prismaMock.client.user.update).data.userTypeId).toBe(SUPER_ADMIN_TYPE_ID);
    });
  });
});
