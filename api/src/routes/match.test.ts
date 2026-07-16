import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import prisma from '../db';

vi.mock('../db', () => ({
  default: {
    match: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../src/middleware/auth.middleware', () => ({
  verifyToken: (req: any, res: any, next: any) => next(),
  requireAdmin: (req: any, res: any, next: any) => next(),
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
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        dateStart: '2026-07-15T10:30:00.000Z',
        tournamentId: null,
        groupId: null,
        knockoutId: null,
        leagueId: 'league-7777-dddd',
        playerOneId: 'user-3333-aaaa',
        playerTwoId: 'user-4444-aaaa',
        setOnePlayerOne: 0,
        setOnePlayerTwo: 0,
        setTwoPlayerOne: 0,
        setTwoPlayerTwo: 0,
        setThreePlayerOne: 0,
        setThreePlayerTwo: 0,
        setFourPlayerOne: 0,
        setFourPlayerTwo: 0,
        setFivePlayerOne: 0,
        setFivePlayerTwo: 0,
        setSixPlayerOne: 0,
        setSixPlayerTwo: 0,
        setSevenPlayerOne: 0,
        setSevenPlayerTwo: 0,
        status: 'SCHEDULED',
        playerOne: {
          id: 'user-3333-aaaa',
          name: 'Jannik',
          surname: 'Sinner',
          email: 'jannik@pingpong.com',
        },
        playerTwo: {
          id: 'user-4444-aaaa',
          name: 'Novak',
          surname: 'Djokovic',
          email: 'novak@pingpong.com',
        },
        tournament: null,
        knockout: null,
        group: null,
        league: {
          id: 'league-7777-dddd',
          name: 'Liga División de Honor',
          season: '2026',
        },
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
