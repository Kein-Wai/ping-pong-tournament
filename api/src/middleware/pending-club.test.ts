import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { prismaMock } from '../testing/prisma-mock';
import { bearer, useTestJwtSecret, CLUB_1 } from '../testing/auth';

// Solo se mockea la base de datos: verifyToken y los guardas de rol son los reales.
vi.mock('../db', async () => ({
  default: (await import('../testing/prisma-mock')).prismaMock.client,
}));

let app: Awaited<typeof import('../index')>['app'];

const adminOfClub = (status: 'Pendiente' | 'Aprobado') => ({
  id: 'admin-1',
  active: true,
  clubId: CLUB_1,
  userType: { name: 'AdminClub' },
  club: { status },
});

describe('Club pendiente de aprobación: el AdminClub solo gestiona su club', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    ({ app } = await import('../index'));
  });

  beforeEach(() => {
    prismaMock.reset();
  });

  it.each([
    ['crear un torneo', 'post', '/api/tournaments'],
    ['programar un partido', 'post', '/api/matches'],
    ['crear un equipo', 'post', '/api/teams'],
    ['crear un evento', 'post', '/api/events'],
    ['crear un jugador invitado', 'post', '/api/users/guest'],
    ['resolver una solicitud de ingreso', 'put', `/api/clubs/${CLUB_1}/members/player-1/status`],
  ] as const)('un club Pendiente no puede %s (403)', async (_name, method, path) => {
    prismaMock.client.user.findUniqueOrThrow.mockResolvedValue(adminOfClub('Pendiente'));

    const response = await request(app)[method](path).set(bearer('adminClub1')).send({});

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('pendiente');
    expect(prismaMock.writes()).toEqual([]);
  });

  it('un club Pendiente sí puede editar los datos de su club', async () => {
    prismaMock.client.user.findUniqueOrThrow.mockResolvedValue(adminOfClub('Pendiente'));
    prismaMock.client.club.update.mockResolvedValue({ id: CLUB_1, name: 'Mi club' });

    const response = await request(app)
      .put(`/api/clubs/${CLUB_1}`)
      .set(bearer('adminClub1'))
      .send({ city: 'Valencia' });

    expect(response.status).toBe(200);
  });

  it('un AdminClub no puede aprobar su propio club desde PUT /clubs/:id', async () => {
    prismaMock.client.user.findUniqueOrThrow.mockResolvedValue(adminOfClub('Pendiente'));
    prismaMock.client.club.update.mockResolvedValue({ id: CLUB_1 });

    const response = await request(app)
      .put(`/api/clubs/${CLUB_1}`)
      .set(bearer('adminClub1'))
      .send({ status: 'Aprobado' });

    expect(response.status).toBe(403);
    expect(prismaMock.writes()).toEqual([]);
  });

  it('el SuperAdmin sí puede cambiar el estado del club', async () => {
    prismaMock.client.club.update.mockResolvedValue({ id: CLUB_1, status: 'Aprobado' });

    const response = await request(app)
      .put(`/api/clubs/${CLUB_1}`)
      .set(bearer('superAdmin'))
      .send({ status: 'Aprobado' });

    expect(response.status).toBe(200);
    expect(prismaMock.client.club.update.mock.calls[0][0].data).toMatchObject({ status: 'Aprobado' });
  });

  it('un club Aprobado no se ve afectado: la petición llega a la validación (400)', async () => {
    prismaMock.client.user.findUniqueOrThrow.mockResolvedValue(adminOfClub('Aprobado'));

    const response = await request(app).post('/api/tournaments').set(bearer('adminClub1')).send({});

    expect(response.status).toBe(400);
  });

  it('el SuperAdmin no depende del estado de ningún club', async () => {
    const response = await request(app).post('/api/tournaments').set(bearer('superAdmin')).send({});

    expect(response.status).toBe(400);
  });
});
