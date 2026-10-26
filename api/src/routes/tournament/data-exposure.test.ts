import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { prismaMock } from '../../testing/prisma-mock';
import { bearer, useTestJwtSecret, CLUB_1 } from '../../testing/auth';

// Solo se mockea la base de datos: los guardas de autenticacion son los reales.
vi.mock('../../db', async () => ({
  default: (await import('../../testing/prisma-mock')).prismaMock.client,
}));

const SECRETS = {
  password: '$2a$10$hash-de-contraseña',
  googleId: 'google-sub-123',
  verificationToken: 'token-de-verificacion',
  resetPasswordToken: 'token-de-reset',
};

const playerWithSecrets = {
  id: 'p1',
  name: 'Ana',
  surname: 'Gil',
  email: 'ana@test.com',
  stats: { elo: 500 },
  ...SECRETS,
  resetPasswordExpires: new Date('2030-01-01T00:00:00Z'),
};

let app: Awaited<typeof import('../../index')>['app'];

describe('Rutas de torneos: datos de usuarios que nunca deben salir', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    ({ app } = await import('../../index'));
  });

  beforeEach(() => {
    prismaMock.reset();
    // El jugador del club puede ver el torneo: es la condición para llegar a la respuesta.
    prismaMock.client.user.findUnique.mockResolvedValue({ clubStatus: 'Aprobado' });
  });

  it('GET /api/tournaments/:id no devuelve credenciales ni tokens de los participantes', async () => {
    prismaMock.client.tournament.findUnique.mockResolvedValue({
      id: 't1',
      clubId: CLUB_1,
      participants: [{ playerId: 'p1', player: playerWithSecrets }],
    });

    const response = await request(app).get('/api/tournaments/t1').set(bearer('playerClub1'));

    expect(response.status).toBe(200);
    const body = JSON.stringify(response.body);
    for (const secret of Object.values(SECRETS)) {
      expect(body).not.toContain(secret);
    }
    expect(body).not.toContain('resetPasswordExpires');
  });

  it('GET /api/tournaments/:id conserva los datos públicos del participante', async () => {
    prismaMock.client.tournament.findUnique.mockResolvedValue({
      id: 't1',
      clubId: CLUB_1,
      participants: [{ playerId: 'p1', player: playerWithSecrets }],
    });

    const response = await request(app).get('/api/tournaments/t1').set(bearer('playerClub1'));

    expect(response.body.data.participants[0].player).toMatchObject({
      id: 'p1',
      name: 'Ana',
      surname: 'Gil',
      stats: { elo: 500 },
    });
  });
});
