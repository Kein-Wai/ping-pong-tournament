import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import prisma from '../../src/db';

vi.mock('../../src/db', () => ({
  default: {
    season: {
      findFirst: vi
        .fn()
        .mockResolvedValue({ id: 'season-1', name: 'Temporada 2026/2027', isCurrent: true }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi
        .fn()
        .mockResolvedValue({ id: 'season-1', name: 'Temporada 2026/2027', isCurrent: true }),
    },
    club: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    stats: { upsert: vi.fn() },
    playerSkills: { upsert: vi.fn() },
  },
}));

vi.mock('../../src/middleware/auth.middleware', () => ({
  verifyToken: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', role: 'Player' };
    next();
  },
  requireAdminClub: (req: any, res: any, next: any) => {
    req.user = { id: 'admin-id', role: 'AdminClub', clubId: '1' };
    next();
  },
  requireSuperAdmin: (req: any, res: any, next: any) => next(),
}));

describe('CRUD de Rutas de Clubes (/api/clubs)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/clubs (Listado Público)', () => {
    it('ÉXITO: Debería devolver los clubes con estado Aprobado y su memberCount (200)', async () => {
      // Simula exactamente lo que devuelve findMany() con la estructura de Prisma
      const mockDbClubs = [
        {
          id: '1',
          name: 'Club PingPong Castellón',
          city: 'Castellon de la Plana',
          address: 'Calle Falsa 123',
          foundedAt: null,
          createdAt: new Date().toISOString(),
          _count: { users: 60 },
        },
      ];

      // Lo que el controlador procesa y le devuelve al cliente final formateado
      const expectedResponseData = [
        {
          id: '1',
          name: 'Club PingPong Castellón',
          city: 'Castellon de la Plana',
          address: 'Calle Falsa 123',
          foundedAt: null,
          createdAt: mockDbClubs[0].createdAt,
          memberCount: 60,
        },
      ];

      vi.mocked(prisma.club.findMany).mockResolvedValue(mockDbClubs as any);

      const response = await request(app).get('/api/clubs');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expectedResponseData);

      // Verificamos que el select tenga la estructura del nuevo controlador
      expect(prisma.club.findMany).toHaveBeenCalledWith({
        where: { status: 'Aprobado' },
        select: {
          id: true,
          name: true,
          city: true,
          address: true,
          foundedAt: true,
          createdAt: true,
          _count: {
            select: { users: true },
          },
        },
      });
    });

    it('FALLO: Debería devolver 500 si la base de datos falla', async () => {
      vi.mocked(prisma.club.findMany).mockRejectedValue(new Error('DB Fallo'));

      const response = await request(app).get('/api/clubs');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Error al obtener los clubes');
    });
  });

  describe('POST /api/clubs (Solicitar Club Nuevo)', () => {
    // Payload actualizado con el campo obligatorio "city"
    const payload = {
      name: 'Club Tenis de Mesa Madrid',
      city: 'Madrid',
    };

    it('ÉXITO: Debería crear un club con estado Pendiente y campos geográficos (201)', async () => {
      vi.mocked(prisma.club.findUnique).mockResolvedValue(null);

      const createdClub = {
        id: '2',
        name: payload.name,
        city: payload.city,
        address: null,
        status: 'Pendiente',
      };
      vi.mocked(prisma.club.create).mockResolvedValue(createdClub as any);

      const response = await request(app).post('/api/clubs').send(payload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(createdClub);

      expect(prisma.club.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            name: payload.name,
            city: payload.city,
            status: 'Pendiente',
          },
        }),
      );
    });

    it('FALLO: Debería rechazar si el nombre tiene menos de 3 caracteres (Zod - 400)', async () => {
      const response = await request(app).post('/api/clubs').send({ name: 'AB', city: 'Valencia' }); // Nombre inválido

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Datos inválidos');
      expect(prisma.club.create).not.toHaveBeenCalled();
    });

    it('FALLO: Debería rechazar si la ciudad es inválida o vacía (Zod - 400)', async () => {
      const response = await request(app)
        .post('/api/clubs')
        .send({ name: 'Club Valencia', city: '' }); // Ciudad vacía

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Datos inválidos');
      expect(prisma.club.create).not.toHaveBeenCalled();
    });

    it('FALLO: Debería rechazar si el club ya existe (400)', async () => {
      vi.mocked(prisma.club.findUnique).mockResolvedValue({ id: '1', name: payload.name } as any);

      const response = await request(app).post('/api/clubs').send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Ya existe un club con este nombre');
      expect(prisma.club.create).not.toHaveBeenCalled();
    });
  });

  describe('Gestión de Miembros', () => {
    it('POST /:id/join - Jugador debería poder solicitar acceso a un club Aprobado (200)', async () => {
      vi.mocked(prisma.club.findUnique).mockResolvedValue({
        id: 'club-1',
        status: 'Aprobado',
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'test-user-id',
        clubId: null,
      } as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      const response = await request(app).post('/api/clubs/club-1/join');

      expect(response.status).toBe(200);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { clubId: 'club-1', clubStatus: 'Pendiente' } }),
      );
    });

    it('PUT /:id/members/:userId/status - Admin debería aprobar inyectando nivel y skills (200)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-to-approve',
        clubId: '1',
      } as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);
      vi.mocked(prisma.stats.upsert).mockResolvedValue({} as any);
      vi.mocked(prisma.playerSkills.upsert).mockResolvedValue({} as any);

      const payload = {
        status: 'Aprobado',
        level: 'Avanzado',
        elo: 800,
        skills: {
          derechaPlano: 60,
          revesPlano: 60,
          topspinDerecha: 60,
          topspinReves: 60,
          corte: 60,
          bloqueoDerecha: 60,
          bloqueoReves: 60,
          servicio: 60,
          recepcion: 60,
          movilidad: 60,
          fortalezaMental: 60,
          experiencia: 60,
        },
      };

      const response = await request(app)
        .put('/api/clubs/1/members/user-to-approve/status')
        .send(payload);

      expect(response.status).toBe(200);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { clubStatus: 'Aprobado', level: 'Avanzado' } }),
      );
      expect(prisma.playerSkills.upsert).toHaveBeenCalledOnce();
    });
  });
});
