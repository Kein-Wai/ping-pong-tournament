import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import prisma from '../../src/db';

vi.mock('../../src/db', () => ({
  default: {
    club: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
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
    it('ÉXITO: Debería devolver SOLO los clubes con estado Aprobado (200)', async () => {
      const mockClubs = [
        { id: '1', name: 'Club PingPong Castellón', createdAt: new Date().toISOString() },
      ];

      vi.mocked(prisma.club.findMany).mockResolvedValue(mockClubs as any);

      const response = await request(app).get('/api/clubs');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockClubs);

      expect(prisma.club.findMany).toHaveBeenCalledWith({
        where: { status: 'Aprobado' },
        select: { id: true, name: true, createdAt: true },
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
    const payload = { name: 'Club Tenis de Mesa Madrid' };

    it('ÉXITO: Debería crear un club con estado Pendiente (201)', async () => {
      vi.mocked(prisma.club.findUnique).mockResolvedValue(null);

      const createdClub = { id: '2', name: payload.name, status: 'Pendiente' };
      vi.mocked(prisma.club.create).mockResolvedValue(createdClub as any);

      const response = await request(app).post('/api/clubs').send(payload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(createdClub);

      expect(prisma.club.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: payload.name, status: 'Pendiente' },
        }),
      );
    });

    it('FALLO: Debería rechazar si el nombre tiene menos de 3 caracteres (Zod - 400)', async () => {
      const response = await request(app).post('/api/clubs').send({ name: 'AB' });

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
});
