import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { prismaMock } from '../testing/prisma-mock';
import { bearer, useTestJwtSecret, CLUB_1 } from '../testing/auth';
import { currentSeasonFixture, findLeakedSecrets, userRowWithSecrets } from '../testing/fixtures';

// Solo se mockea la base de datos: los guardas de autenticacion son los reales.
vi.mock('../db', async () => ({
  default: (await import('../testing/prisma-mock')).prismaMock.client,
}));

let app: Awaited<typeof import('../index')>['app'];

describe('Ninguna respuesta de la API devuelve credenciales ni tokens de usuarios', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    ({ app } = await import('../index'));
  });

  beforeEach(() => {
    prismaMock.reset();
    prismaMock.client.season.findFirst.mockResolvedValue(currentSeasonFixture());
  });

  it('PUT /api/teams/:id/players (la plantilla devuelta)', async () => {
    prismaMock.client.team.findUnique.mockResolvedValue({ id: 'team-1', clubId: CLUB_1 });
    prismaMock.client.user.findMany.mockResolvedValue([{ level: 'Intermedio' }]);
    prismaMock.client.team.update.mockResolvedValue({
      id: 'team-1',
      level: 'Intermedio',
      players: [userRowWithSecrets()],
    });

    const response = await request(app)
      .put('/api/teams/team-1/players')
      .set(bearer('adminClub1'))
      .send({ playerIds: ['11111111-1111-4111-a111-111111111111'] });

    expect(response.status).toBe(200);
    expect(findLeakedSecrets(response.body)).toEqual([]);
  });

  it('PUT /api/users/:id (el usuario actualizado)', async () => {
    prismaMock.client.user.findUnique.mockResolvedValue({ id: 'u1', clubId: CLUB_1 });
    prismaMock.client.user.update.mockResolvedValue({
      ...userRowWithSecrets(),
      stats: [],
      skills: [],
    });

    const response = await request(app)
      .put('/api/users/u1')
      .set(bearer('adminClub1'))
      .send({ name: 'Ana María' });

    expect(response.status).toBe(200);
    expect(findLeakedSecrets(response.body)).toEqual([]);
  });

  it('POST /api/users/guest (el invitado creado)', async () => {
    prismaMock.client.userType.findFirst.mockResolvedValue({ id: 'type-player' });
    prismaMock.client.user.create.mockResolvedValue(userRowWithSecrets({ id: 'guest-1' }));

    const response = await request(app)
      .post('/api/users/guest')
      .set(bearer('adminClub1'))
      .send({ name: 'Invitado Uno' });

    expect(response.status).toBe(201);
    expect(findLeakedSecrets(response.body)).toEqual([]);
  });
});
