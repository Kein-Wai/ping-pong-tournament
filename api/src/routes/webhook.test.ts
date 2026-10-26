import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { prismaMock } from '../testing/prisma-mock';
import { useTestJwtSecret } from '../testing/auth';
import { enviarCorreoGenerico } from '../services/email';

// Solo se mockean la base de datos y el correo: el cron y las plantillas son los reales.
vi.mock('../db', async () => ({
  default: (await import('../testing/prisma-mock')).prismaMock.client,
}));
vi.mock('../services/email', () => ({ enviarCorreoGenerico: vi.fn().mockResolvedValue(true) }));

let app: Awaited<typeof import('../index')>['app'];

const SECRET = 'secreto-cron';
const cron = { 'x-cron-secret': SECRET };

describe('Cron de recordatorios y monitorización (/api/webhooks)', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    process.env.CRON_SECRET = SECRET;
    // El servidor de producción corre en UTC: la prueba debe fallar con el cálculo en hora local del servidor.
    process.env.TZ = 'UTC';
    ({ app } = await import('../index'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.reset();
    prismaMock.client.tournament.findMany.mockResolvedValue([]);
    prismaMock.client.eventReminder.findMany.mockResolvedValue([]);
    prismaMock.client.eventReminder.updateMany.mockResolvedValue({ count: 0 });
    // 23:30 UTC del 10 nov ya es el 11 en Madrid.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-10T23:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('rechaza una llamada sin el secreto del cron (401)', async () => {
    const response = await request(app).post('/api/webhooks/daily-reminders');

    expect(response.status).toBe(401);
  });

  describe('POST /daily-reminders', () => {
    it('«mañana» es el día siguiente en la zona horaria de la app, no en la del servidor', async () => {
      await request(app).post('/api/webhooks/daily-reminders').set(cron);

      const { where } = prismaMock.client.tournament.findMany.mock.calls[0][0];
      expect(where.dateStart.gte.toISOString()).toBe('2026-11-11T23:00:00.000Z');
      expect(where.dateStart.lte.toISOString()).toBe('2026-11-12T22:59:59.999Z');
    });

    it('los recordatorios de evento llegan hasta el final de hoy en esa zona', async () => {
      await request(app).post('/api/webhooks/daily-reminders').set(cron);

      const { where } = prismaMock.client.eventReminder.findMany.mock.calls[0][0];
      expect(where.notifyAt.lte.toISOString()).toBe('2026-11-11T22:59:59.999Z');
    });

    it('lee solo las columnas necesarias: nunca carga la fila entera del usuario', async () => {
      await request(app).post('/api/webhooks/daily-reminders').set(cron);

      const tournamentQuery = prismaMock.client.tournament.findMany.mock.calls[0][0];
      const reminderQuery = prismaMock.client.eventReminder.findMany.mock.calls[0][0];
      expect(tournamentQuery.include).toBeUndefined();
      expect(reminderQuery.include).toBeUndefined();
      expect(JSON.stringify(tournamentQuery.select)).not.toContain('password');
      expect(reminderQuery.select.user).toEqual({ select: { name: true, email: true } });
    });

    it('envía un correo a cada jugador confirmado y marca como enviados los recordatorios de evento', async () => {
      prismaMock.client.tournament.findMany.mockResolvedValue([
        {
          name: 'Open',
          participants: [{ player: { name: 'Ana', email: 'ana@test.com' } }, { player: { name: 'Invitado', email: 'x@club.local' } }],
        },
      ]);
      prismaMock.client.eventReminder.findMany.mockResolvedValue([
        { id: 'r1', user: { name: 'Luis', email: 'luis@test.com' }, event: { name: 'Cena', date: new Date(), location: null } },
      ]);

      const response = await request(app).post('/api/webhooks/daily-reminders').set(cron);

      expect(response.status).toBe(200);
      const recipients = vi.mocked(enviarCorreoGenerico).mock.calls.map((call) => call[0]);
      expect(recipients).toEqual(['ana@test.com', 'luis@test.com']);
      expect(prismaMock.client.eventReminder.updateMany.mock.calls[0][0]).toMatchObject({
        where: { id: { in: ['r1'] } },
        data: { isSent: true },
      });
    });
  });

  describe('GET /health-check', () => {
    it('envía el informe al correo de ADMIN_EMAIL', async () => {
      vi.stubEnv('ADMIN_EMAIL', 'admin@club.test');
      prismaMock.client.user.count.mockResolvedValue(42);

      const response = await request(app).get('/api/webhooks/health-check').set(cron);

      expect(response.status).toBe(200);
      expect(vi.mocked(enviarCorreoGenerico).mock.calls[0][0]).toBe('admin@club.test');
      expect(response.body.data.users).toBe(42);
    });

    it('sin ADMIN_EMAIL comprueba la base de datos pero no manda el correo a una dirección fija', async () => {
      vi.stubEnv('ADMIN_EMAIL', '');
      prismaMock.client.user.count.mockResolvedValue(42);

      const response = await request(app).get('/api/webhooks/health-check').set(cron);

      expect(response.status).toBe(200);
      expect(enviarCorreoGenerico).not.toHaveBeenCalled();
      expect(response.body.message).toContain('ADMIN_EMAIL');
    });
  });
});
