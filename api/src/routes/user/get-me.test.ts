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

vi.mock('../../../src/middleware/auth.middleware', () => {
  const injectUser = (req: Request, _res: Response, next: NextFunction) => {
    req.user = { id: 'me-1', email: 'me@test.com', role: 'Player', clubId: 'club-1' };
    next();
  };

  return {
    verifyToken: injectUser,
    requireSuperAdmin: injectUser,
    requireAdminClub: injectUser,
  };
});

describe('Perfil propio (GET /api/users/me)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'me-1',
      name: 'Ana',
      email: 'me@test.com',
      password: 'hash-bcrypt',
      googleId: 'google-123',
      verificationToken: 'verif-token',
      resetPasswordToken: 'reset-token',
      resetPasswordExpires: new Date('2030-01-01'),
      userType: { name: 'Player' },
      stats: [],
      skills: [],
    } as never);
    vi.mocked(prisma.playerSkillUpdate.aggregate).mockResolvedValue({
      _sum: { derechaPlano: 1 },
    } as never);
  });

  it('devuelve el perfil dentro del sobre con las mejoras pendientes', async () => {
    const response = await request(app).get('/api/users/me');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      id: 'me-1',
      name: 'Ana',
      userType: { name: 'Player' },
      pendingSkills: { derechaPlano: 1 },
    });
  });

  it('no expone credenciales ni tokens del propio usuario', async () => {
    const response = await request(app).get('/api/users/me');

    expect(response.body.data).not.toHaveProperty('password');
    expect(response.body.data).not.toHaveProperty('googleId');
    expect(response.body.data).not.toHaveProperty('verificationToken');
    expect(response.body.data).not.toHaveProperty('resetPasswordToken');
    expect(response.body.data).not.toHaveProperty('resetPasswordExpires');
  });
});
