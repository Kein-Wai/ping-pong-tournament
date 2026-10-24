import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { NextFunction, Request, Response } from 'express';
import { app } from '../../../src/index';
import prisma from '../../../src/db';

vi.mock('../../../src/db', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    playerSkillUpdate: {
      aggregate: vi.fn(),
    },
  },
}));

// Usuario autenticado de cada test; los guardas de rol se limitan a inyectarlo.
const auth = vi.hoisted(() => ({
  user: { id: 'viewer-1', email: 'v@test.com', role: 'SuperAdmin', clubId: 'club-1' } as {
    id: string;
    email: string;
    role: string;
    clubId: string | null;
  },
}));

vi.mock('../../../src/middleware/auth.middleware', () => {
  const injectUser = (req: Request, _res: Response, next: NextFunction) => {
    req.user = auth.user;
    next();
  };

  return {
    verifyToken: injectUser,
    requireSuperAdmin: injectUser,
    requireAdminClub: injectUser,
  };
});

describe('Ficha de jugador (GET /api/users/:id)', () => {
  const PLAYER_ID = '123e4567-e89b-12d3-a456-426614174000';

  const storedPlayer = {
    id: PLAYER_ID,
    name: 'Carlos',
    surname: 'Alcaraz',
    email: 'carlos@test.com',
    clubId: 'club-1',
    password: 'hash-bcrypt',
    googleId: 'google-123',
    verificationToken: 'verif-token',
    resetPasswordToken: 'reset-token',
    resetPasswordExpires: new Date('2030-01-01'),
    stats: [{ elo: 1200 }],
  };

  const viewAs = (role: string, clubId: string | null, id = 'viewer-1') => {
    auth.user = { id, email: 'v@test.com', role, clubId };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    viewAs('SuperAdmin', 'club-1');
    vi.mocked(prisma.user.findUnique).mockResolvedValue(storedPlayer as never);
    vi.mocked(prisma.playerSkillUpdate.aggregate).mockResolvedValue({
      _sum: { derechaPlano: 2 },
    } as never);
  });

  describe('contrato de respuesta', () => {
    // El cliente (JugadorPerfil, Dashboard, PlanNuevo) lee `response.data.data`:
    // si la ruta devuelve el jugador sin el sobre, esas pantallas no ven nada.
    it('devuelve el jugador dentro del sobre { success, data } con sus mejoras pendientes', async () => {
      const response = await request(app).get(`/api/users/${PLAYER_ID}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: PLAYER_ID,
        name: 'Carlos',
        stats: [{ elo: 1200 }],
        pendingSkills: { derechaPlano: 2 },
      });
    });

    it('responde 404 con el sobre de error si el jugador no existe', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const response = await request(app).get(`/api/users/${PLAYER_ID}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ success: false, error: 'Usuario no encontrado' });
    });
  });

  describe('datos sensibles', () => {
    it('no expone credenciales ni tokens del jugador', async () => {
      const response = await request(app).get(`/api/users/${PLAYER_ID}`);

      expect(response.body.data).not.toHaveProperty('password');
      expect(response.body.data).not.toHaveProperty('googleId');
      expect(response.body.data).not.toHaveProperty('verificationToken');
      expect(response.body.data).not.toHaveProperty('resetPasswordToken');
      expect(response.body.data).not.toHaveProperty('resetPasswordExpires');
    });
  });

  describe('alcance por club', () => {
    it.each([
      ['SuperAdmin de cualquier club', 'SuperAdmin', 'otro-club'],
      ['AdminClub del mismo club', 'AdminClub', 'club-1'],
      ['Player del mismo club', 'Player', 'club-1'],
    ])('permite ver el perfil a un %s', async (_label, role, clubId) => {
      viewAs(role, clubId);

      const response = await request(app).get(`/api/users/${PLAYER_ID}`);

      expect(response.status).toBe(200);
    });

    it('permite a un Player ver su propio perfil aunque no tenga club', async () => {
      viewAs('Player', null, PLAYER_ID);

      const response = await request(app).get(`/api/users/${PLAYER_ID}`);

      expect(response.status).toBe(200);
    });

    it.each([
      ['AdminClub de otro club', 'AdminClub', 'otro-club'],
      ['Player de otro club', 'Player', 'otro-club'],
      ['usuario sin club', 'Player', null],
    ])('prohibe ver el perfil a un %s', async (_label, role, clubId) => {
      viewAs(role, clubId);

      const response = await request(app).get(`/api/users/${PLAYER_ID}`);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        error: 'No tienes permiso para ver este jugador',
      });
    });

    it('no calcula las mejoras pendientes si el acceso esta prohibido', async () => {
      viewAs('Player', 'otro-club');

      await request(app).get(`/api/users/${PLAYER_ID}`);

      expect(prisma.playerSkillUpdate.aggregate).not.toHaveBeenCalled();
    });
  });
});
