import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { prismaMock } from '../testing/prisma-mock';
import { bearer, useTestJwtSecret, CLUB_1, type IdentityName } from '../testing/auth';
import { currentSeasonFixture } from '../testing/fixtures';

// Solo se mockea la base de datos: los guardas de autenticacion son los reales.
vi.mock('../db', async () => ({
  default: (await import('../testing/prisma-mock')).prismaMock.client,
}));

const EVENT_ID = 'event-1';
let app: Awaited<typeof import('../index')>['app'];

const eventOfClub1 = () => ({
  id: EVENT_ID,
  clubId: CLUB_1,
  name: 'Torneo social',
  date: new Date('2030-06-01T10:00:00Z'),
  reminders: [],
});

describe('Eventos de club (/api/events): aislamiento entre clubes', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    ({ app } = await import('../index'));
  });

  beforeEach(() => {
    prismaMock.reset();
    prismaMock.client.season.findFirst.mockResolvedValue(currentSeasonFixture());
    prismaMock.client.clubEvent.findUnique.mockResolvedValue(eventOfClub1());
    prismaMock.client.clubEvent.update.mockResolvedValue(eventOfClub1());
    prismaMock.client.clubEvent.delete.mockResolvedValue(eventOfClub1());
    prismaMock.client.clubEvent.findMany.mockResolvedValue([eventOfClub1()]);
  });

  describe('PUT /api/events/:id', () => {
    it.each<IdentityName>(['playerClub1', 'adminClub2', 'freePlayer'])(
      'deniega a %s y no escribe nada',
      async (identity) => {
        const response = await request(app)
          .put(`/api/events/${EVENT_ID}`)
          .set(bearer(identity))
          .send({ name: 'Cambio' });

        expect(response.status).toBe(403);
        expect(prismaMock.writes()).toEqual([]);
      },
    );

    it.each<IdentityName>(['adminClub1', 'superAdmin'])('permite a %s', async (identity) => {
      const response = await request(app)
        .put(`/api/events/${EVENT_ID}`)
        .set(bearer(identity))
        .send({ name: 'Cambio' });

      expect(response.status).toBe(200);
      expect(prismaMock.writes()).toContain('clubEvent.update');
    });

    it('si el evento no existe responde 404', async () => {
      prismaMock.client.clubEvent.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put(`/api/events/${EVENT_ID}`)
        .set(bearer('adminClub1'))
        .send({ name: 'Cambio' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/events/:id', () => {
    it.each<IdentityName>(['playerClub1', 'adminClub2', 'freePlayer'])(
      'deniega a %s y no borra nada',
      async (identity) => {
        const response = await request(app).delete(`/api/events/${EVENT_ID}`).set(bearer(identity));

        expect(response.status).toBe(403);
        expect(prismaMock.writes()).toEqual([]);
      },
    );

    it.each<IdentityName>(['adminClub1', 'superAdmin'])('permite a %s', async (identity) => {
      const response = await request(app).delete(`/api/events/${EVENT_ID}`).set(bearer(identity));

      expect(response.status).toBe(200);
      expect(prismaMock.writes()).toContain('clubEvent.delete');
    });
  });

  describe('GET /api/events/club/:clubId', () => {
    it.each<IdentityName>(['playerClub2', 'adminClub2', 'freePlayer'])(
      'deniega a %s los eventos de otro club',
      async (identity) => {
        const response = await request(app).get(`/api/events/club/${CLUB_1}`).set(bearer(identity));

        expect(response.status).toBe(403);
      },
    );

    it.each<IdentityName>(['playerClub1', 'adminClub1', 'superAdmin'])(
      'permite a %s',
      async (identity) => {
        const response = await request(app).get(`/api/events/club/${CLUB_1}`).set(bearer(identity));

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
      },
    );
  });

  describe('POST /api/events/:id/reminders', () => {
    it.each<IdentityName>(['playerClub2', 'freePlayer'])(
      'deniega a %s activar avisos de un evento de otro club',
      async (identity) => {
        const response = await request(app)
          .post(`/api/events/${EVENT_ID}/reminders`)
          .set(bearer(identity));

        expect(response.status).toBe(403);
        expect(prismaMock.writes()).toEqual([]);
      },
    );

    it('permite a un jugador del club', async () => {
      const response = await request(app)
        .post(`/api/events/${EVENT_ID}/reminders`)
        .set(bearer('playerClub1'));

      expect(response.status).toBe(201);
    });
  });
});
