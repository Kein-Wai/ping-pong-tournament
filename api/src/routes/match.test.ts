import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import prisma from '../db';

vi.mock('../db', () => ({
  default: {
    match: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    tournamentGroupClas: {
      findMany: vi.fn(),
    },
    tournamentGroup: {
      findUnique: vi.fn(),
    },
    stats: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('../../src/middleware/auth.middleware', () => ({
  verifyToken: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', role: 'Player' };
    next();
  },
  requireSuperAdmin: (req: any, res: any, next: any) => next(),
  requireAdminClub: (req: any, res: any, next: any) => next(),
}));

describe('GET /api/matches', () => {
  it('debería devolver una lista de tipos de partidos con status 200', async () => {
    const mockMatches = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        dateStart: '2026-07-10T18:00:00.000Z',
        tournamentId: 'tour-9999-bbbb',
        groupId: null,
        knockoutId: 'knock-8888-cccc',
        leagueId: null,
        playerOneId: 'user-1111-aaaa',
        playerTwoId: 'user-2222-aaaa',
        setOnePlayerOne: 11,
        setOnePlayerTwo: 8,
        setTwoPlayerOne: 9,
        setTwoPlayerTwo: 11,
        setThreePlayerOne: 12,
        setThreePlayerTwo: 10,
        setFourPlayerOne: 11,
        setFourPlayerTwo: 5,
        setFivePlayerOne: 0,
        setFivePlayerTwo: 0,
        setSixPlayerOne: 0,
        setSixPlayerTwo: 0,
        setSevenPlayerOne: 0,
        setSevenPlayerTwo: 0,
        status: 'FINISHED',
        playerOne: {
          id: 'user-1111-aaaa',
          name: 'Carlos',
          surname: 'Alcaraz',
          email: 'carlos@pingpong.com',
        },
        playerTwo: {
          id: 'user-2222-aaaa',
          name: 'Rafa',
          surname: 'Nadal',
          email: 'rafa@pingpong.com',
        },
        tournament: {
          id: 'tour-9999-bbbb',
          name: 'Torneo de Verano 2026',
          location: 'Pista Central',
        },
        knockout: {
          id: 'knock-8888-cccc',
          round: 'FINAL',
        },
        group: null,
        league: null,
      },
    ];

    vi.mocked(prisma.match.findMany).mockResolvedValue(mockMatches as any);

    const response = await request(app).get('/api/matches');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockMatches);
    expect(prisma.match.findMany).toHaveBeenCalledOnce();
  });

  it('debería devolver un error 500 si la base de datos falla', async () => {
    vi.mocked(prisma.match.findMany).mockRejectedValue('Error de conexión a la DB');

    const response = await request(app).get('/api/matches');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error', 'Error interno al obtener los partidos');
  });
});

describe('PUT /api/matches/:id (Actualizar Marcador)', () => {
  // 👇 Usamos UUIDs válidos para que Zod no se queje
  const mockMatchDB = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    status: 'Programado',
    groupId: '123e4567-e89b-12d3-a456-426614174001',
    playerOneId: '123e4567-e89b-12d3-a456-426614174002',
    playerTwoId: '123e4567-e89b-12d3-a456-426614174003',
    dateStart: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Debería actualizar un partido y devolver 200', async () => {
    vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatchDB as any);
    vi.mocked(prisma.match.update).mockResolvedValue({
      ...mockMatchDB,
      status: 'Completado',
    } as any);

    vi.mocked(prisma.tournamentGroupClas.findMany).mockResolvedValue([]);
    vi.mocked(prisma.match.findMany).mockResolvedValue([]);
    vi.mocked(prisma.tournamentGroup.findUnique).mockResolvedValue({ tournamentId: 't-1' } as any);
    vi.mocked(prisma.match.count).mockResolvedValue(0);

    const response = await request(app)
      .put('/api/matches/123e4567-e89b-12d3-a456-426614174000')
      .send({
        status: 'Completado',
        setsToWin: 2, // 👈 Le pasamos los sets a ganar para que la regla de negocio evalúe la victoria
        setOnePlayerOne: 11,
        setOnePlayerTwo: 8,
        setTwoPlayerOne: 11,
        setTwoPlayerTwo: 9,
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Partido actualizado con éxito');
    expect(prisma.match.update).toHaveBeenCalledOnce();
  });

  it('Debería rechazar un marcador imposible en ping-pong (ej. 15-1) devolviendo 400', async () => {
    vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatchDB as any);

    const response = await request(app)
      .put('/api/matches/123e4567-e89b-12d3-a456-426614174000')
      .send({
        status: 'Completado',
        setsToWin: 2,
        setOnePlayerOne: 15,
        setOnePlayerTwo: 1,
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('El marcador no cumple las reglas del partido');
    expect(prisma.match.update).not.toHaveBeenCalled();
  });
});
