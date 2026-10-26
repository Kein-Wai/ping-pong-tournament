import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { prismaMock } from '../testing/prisma-mock';
import { bearer, useTestJwtSecret, CLUB_1 } from '../testing/auth';
import { currentSeasonFixture } from '../testing/fixtures';
import { enviarCorreoGenerico } from '../services/email';

// Solo se mockea la base de datos y el correo: la lógica de membresía es la real.
vi.mock('../db', async () => ({
  default: (await import('../testing/prisma-mock')).prismaMock.client,
}));
vi.mock('../services/email', () => ({ enviarCorreoGenerico: vi.fn().mockResolvedValue(true) }));

let app: Awaited<typeof import('../index')>['app'];

/** Cliente de la transacción: distinto del global para saber quién escribe dentro. */
const tx = {
  club: { create: vi.fn() },
  user: { update: vi.fn(), updateMany: vi.fn() },
  stats: { upsert: vi.fn() },
  playerSkills: { upsert: vi.fn() },
};

const SKILLS = {
  derechaPlano: 50, revesPlano: 50, topspinDerecha: 50, topspinReves: 50, corte: 50, bloqueoDerecha: 50,
  bloqueoReves: 50, servicio: 50, recepcion: 50, movilidad: 50, fortalezaMental: 50, experiencia: 50,
};

describe('Membresía de club: cada operación es atómica', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    ({ app } = await import('./../index'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.reset();
    prismaMock.client.season.findFirst.mockResolvedValue(currentSeasonFixture());
    prismaMock.client.$transaction.mockImplementation(async (callback: (client: unknown) => unknown) =>
      callback(tx),
    );
  });

  describe('POST /api/clubs (solicitar un club)', () => {
    beforeEach(() => {
      prismaMock.client.club.findUnique.mockResolvedValue(null);
      tx.club.create.mockResolvedValue({ id: 'club-nuevo', name: 'Club Norte', status: 'Pendiente' });
      tx.user.updateMany.mockResolvedValue({ count: 1 });
    });

    it('crea el club y asigna a su administrador en la misma transacción (201)', async () => {
      const response = await request(app)
        .post('/api/clubs')
        .set(bearer('adminWithoutClub'))
        .send({ name: 'Club Norte', city: 'Madrid' });

      expect(response.status).toBe(201);
      expect(tx.club.create).toHaveBeenCalledTimes(1);
      expect(tx.user.updateMany.mock.calls[0][0]).toMatchObject({
        where: { id: 'admin-3', clubId: null },
        data: { clubId: 'club-nuevo', clubStatus: 'Aprobado' },
      });
      expect(prismaMock.writes()).toEqual([]);
    });

    it('si el usuario ya tiene club responde 400 y no deja un club huérfano', async () => {
      tx.user.updateMany.mockResolvedValue({ count: 0 });
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const response = await request(app)
        .post('/api/clubs')
        .set(bearer('adminClub1'))
        .send({ name: 'Club Norte', city: 'Madrid' });

      expect(response.status).toBe(400);
      // El error lanzado dentro de la transacción es lo que provoca el rollback del club creado.
      expect(prismaMock.client.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/clubs/:id/join (solicitar ingreso)', () => {
    beforeEach(() => {
      prismaMock.client.club.findUnique.mockResolvedValue({ id: CLUB_1, status: 'Aprobado' });
    });

    it('la solicitud es una escritura condicionada a no tener club (sin carrera entre dos solicitudes)', async () => {
      prismaMock.client.user.updateMany.mockResolvedValue({ count: 1 });

      const response = await request(app).post(`/api/clubs/${CLUB_1}/join`).set(bearer('freePlayer'));

      expect(response.status).toBe(200);
      expect(prismaMock.client.user.updateMany.mock.calls[0][0]).toMatchObject({
        where: { id: 'free-1', clubId: null },
        data: { clubId: CLUB_1, clubStatus: 'Pendiente' },
      });
    });

    it('si otra solicitud ganó la carrera responde 400', async () => {
      prismaMock.client.user.updateMany.mockResolvedValue({ count: 0 });

      const response = await request(app).post(`/api/clubs/${CLUB_1}/join`).set(bearer('freePlayer'));

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/clubs/:id/members/:userId/status (resolver una solicitud)', () => {
    const applicant = { id: 'player-9', email: 'p9@test.com', name: 'Pepe', clubId: CLUB_1 };

    beforeEach(() => {
      prismaMock.client.user.findUnique.mockResolvedValue(applicant);
      prismaMock.client.club.findUnique.mockResolvedValue({ id: CLUB_1, name: 'Club Norte' });
    });

    it('aprobar con ELO y habilidades escribe usuario, estadísticas y habilidades dentro de la transacción', async () => {
      const response = await request(app)
        .put(`/api/clubs/${CLUB_1}/members/player-9/status`)
        .set(bearer('adminClub1'))
        .send({ status: 'Aprobado', level: 'Intermedio', elo: 1200, skills: SKILLS });

      expect(response.status).toBe(200);
      expect(tx.user.update).toHaveBeenCalledTimes(1);
      expect(tx.stats.upsert).toHaveBeenCalledTimes(1);
      expect(tx.playerSkills.upsert).toHaveBeenCalledTimes(1);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('el correo de bienvenida se envía una vez confirmada la transacción', async () => {
      await request(app)
        .put(`/api/clubs/${CLUB_1}/members/player-9/status`)
        .set(bearer('adminClub1'))
        .send({ status: 'Aprobado', skills: SKILLS });

      expect(enviarCorreoGenerico).toHaveBeenCalledTimes(1);
    });

    it('si falla guardar las habilidades responde 500, no envía el correo y no deja a medias al usuario', async () => {
      tx.playerSkills.upsert.mockRejectedValueOnce(new Error('fallo'));
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const response = await request(app)
        .put(`/api/clubs/${CLUB_1}/members/player-9/status`)
        .set(bearer('adminClub1'))
        .send({ status: 'Aprobado', skills: SKILLS });

      expect(response.status).toBe(500);
      expect(enviarCorreoGenerico).not.toHaveBeenCalled();
      expect(prismaMock.writes()).toEqual([]);
    });

    it('rechazar libera al jugador del club y lo saca de sus equipos', async () => {
      const response = await request(app)
        .put(`/api/clubs/${CLUB_1}/members/player-9/status`)
        .set(bearer('adminClub1'))
        .send({ status: 'Rechazado' });

      expect(response.status).toBe(200);
      expect(tx.user.update.mock.calls[0][0].data).toMatchObject({
        clubId: null,
        clubStatus: 'Registrado',
        teams: { set: [] },
      });
    });
  });
});
