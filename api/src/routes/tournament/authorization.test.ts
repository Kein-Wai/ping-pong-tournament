import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { prismaMock } from '../../testing/prisma-mock';
import { bearer, useTestJwtSecret, CLUB_1, type IdentityName } from '../../testing/auth';

// Solo se mockea la base de datos: los guardas de autenticacion son los reales.
vi.mock('../../db', async () => ({
  default: (await import('../../testing/prisma-mock')).prismaMock.client,
}));
// Esta bateria prueba QUIEN puede generar grupos; el motor tiene sus propios tests.
vi.mock('../../utils/group-generator', () => ({
  generateTournamentGroups: vi.fn().mockResolvedValue({ success: true, message: 'ok' }),
}));

const TOURNAMENT_ID = '123e4567-e89b-42d3-a456-426614174000';
let app: Awaited<typeof import('../../index')>['app'];

const tournament = (typeTournament: 'Interno' | 'Abierto' = 'Interno') => ({
  id: TOURNAMENT_ID,
  clubId: CLUB_1,
  typeTournament,
  status: 'Programado',
  numPlayers: 8,
  groupsCreated: false,
  participants: [],
  _count: { participants: 0 },
});

/** El jugador consulta su estado de club en la base de datos (como hace GET /tournaments). */
const userRowFor = (identity: IdentityName) =>
  identity === 'freePlayer' ? { clubStatus: 'Registrado' } : { clubStatus: 'Aprobado' };

describe('Torneos (/api/tournaments): autorización', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    ({ app } = await import('../../index'));
  });

  beforeEach(() => {
    prismaMock.reset();
    prismaMock.client.tournament.findUnique.mockResolvedValue(tournament());
    prismaMock.client.tournamentParticipant.findMany.mockResolvedValue([]);
    prismaMock.client.tournamentClas.findMany.mockResolvedValue([]);
  });

  describe('GET /api/tournaments (listado)', () => {
    it('un AdminClub sin club no recibe un filtro vacío que le mostraría todos los torneos', async () => {
      prismaMock.client.tournament.findMany.mockResolvedValue([]);
      prismaMock.client.user.findUnique.mockResolvedValue({ clubStatus: 'Registrado' });

      const response = await request(app).get('/api/tournaments').set(bearer('adminWithoutClub'));

      expect(response.status).toBe(200);
      const { where } = prismaMock.client.tournament.findMany.mock.calls[0][0];
      expect(where).not.toEqual({});
    });
  });

  describe('POST /:id/generate-groups', () => {
    it.each<IdentityName>(['playerClub1', 'freePlayer', 'adminClub2'])(
      'deniega a %s',
      async (identity) => {
        const response = await request(app)
          .post(`/api/tournaments/${TOURNAMENT_ID}/generate-groups`)
          .set(bearer(identity));

        expect(response.status).toBe(403);
      },
    );

    it.each<IdentityName>(['adminClub1', 'superAdmin'])('permite a %s', async (identity) => {
      const response = await request(app)
        .post(`/api/tournaments/${TOURNAMENT_ID}/generate-groups`)
        .set(bearer(identity));

      expect(response.status).toBe(200);
    });

    it('si el torneo no existe responde 404', async () => {
      prismaMock.client.tournament.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/tournaments/${TOURNAMENT_ID}/generate-groups`)
        .set(bearer('adminClub1'));

      expect(response.status).toBe(404);
    });
  });

  describe('POST /:id/register-bulk', () => {
    it.each([{}, { playerIds: 'no-es-una-lista' }, { playerIds: [] }, { playerIds: ['no-uuid'] }])(
      'rechaza con 400 un cuerpo inválido (%j)',
      async (body) => {
        const response = await request(app)
          .post(`/api/tournaments/${TOURNAMENT_ID}/register-bulk`)
          .set(bearer('adminClub1'))
          .send(body);

        expect(response.status).toBe(400);
        expect(prismaMock.writes()).toEqual([]);
      },
    );
  });

  describe.each(['', '/participants', '/classifications'])(
    'GET /:id%s: visibilidad del torneo',
    (suffix) => {
      const get = (identity: IdentityName) => {
        prismaMock.client.user.findUnique.mockResolvedValue(userRowFor(identity));
        return request(app).get(`/api/tournaments/${TOURNAMENT_ID}${suffix}`).set(bearer(identity));
      };

      it.each<IdentityName>(['playerClub2', 'freePlayer', 'adminClub2'])(
        'deniega a %s un torneo interno de otro club',
        async (identity) => {
          const response = await get(identity);

          expect(response.status).toBe(403);
        },
      );

      it.each<IdentityName>(['playerClub1', 'adminClub1', 'superAdmin'])(
        'permite a %s un torneo de su ámbito',
        async (identity) => {
          const response = await get(identity);

          expect(response.status).toBe(200);
        },
      );

      it('un torneo abierto lo ve cualquier jugador', async () => {
        prismaMock.client.tournament.findUnique.mockResolvedValue(tournament('Abierto'));

        const response = await get('playerClub2');

        expect(response.status).toBe(200);
      });
    },
  );
});
