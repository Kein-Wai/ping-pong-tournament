import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import prisma from '../../src/db';

vi.mock('../../src/db', () => ({
  default: {
    tournament: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    tournamentParticipant: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    tournamentGroup: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    tournamentGroupClas: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    match: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    tournamentKnockout: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../src/middleware/auth.middleware', () => ({
  verifyToken: (req: any, res: any, next: any) => next(),
  requireAdmin: (req: any, res: any, next: any) => next(),
}));
const MOCK_UUID = '123e4567-e89b-12d3-a456-426614174000';
const MOCK_DATE = '2026-07-13T00:00:00.000Z';

describe('CRUD de Rutas de Torneos (/api/tournaments)', () => {
  const mockTournamentDB = {
    id: MOCK_UUID,
    name: 'Torneo Test',
    dateStart: MOCK_DATE,
    numPlayers: 8,
    numGroup: 2,
    numGroupPlayers: 4,
    typeTournament: 'Interno',
    levelTournament: 'Intermedio',
    rounds: 'Grupos/Llave',
    typeKnockout: 'A',
    playersKnockout: '2',
    sortKnockout: 'Aleatorio',
    allPos: true,
    status: 'PROGRAMADO',
    groupsCreated: false,
    knockoutCreated: false,
  };
  const requestPayload = {
    name: 'Torneo Test',
    dateStart: MOCK_DATE,
    numPlayers: 8,
    numGroup: 2,
    numGroupPlayers: 4,
    typeTournament: 'Interno',
    levelTournament: 'Intermedio',
    rounds: 'GruposKnockout',
    typeKnockout: 'LlaveA',
    playersKnockout: 2,
    sortKnockout: 'Aleatorio',
    allPos: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST / - debería crear un nuevo torneo (201)', async () => {
    vi.mocked(prisma.tournament.create).mockResolvedValue(mockTournamentDB as any);

    const response = await request(app).post('/api/tournaments').send(requestPayload);
    expect(response.status).toBe(201);
    expect(response.body.tournament).toEqual(mockTournamentDB);
    expect(prisma.tournament.create).toHaveBeenCalledOnce();
    expect(prisma.tournament.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'Programado',
        groupsCreated: false,
        knockoutCreated: false,
      }),
    });
  });

  it('POST / - debería fallar (400) si los datos de creación son inválidos (Zod)', async () => {
    const invalidPayload = {
      name: 'To',
      dateStart: 'no-es-una-fecha',
      numPlayers: 1,
    };

    const response = await request(app).post('/api/tournaments').send(invalidPayload);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Datos inválidos');
    expect(response.body.details).toBeDefined();

    expect(prisma.tournament.create).not.toHaveBeenCalled();
  });

  it('POST /:id/register - debería inscribir a un jugador si hay hueco (201)', async () => {
    const tournamentId = '550e8400-e29b-41d4-a716-446655440000';
    const playerId = '123e4567-e89b-12d3-a456-426614174001';

    const validIsoDate = new Date().toISOString();

    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({
      id: tournamentId,
      numPlayers: 8,
      groupsCreated: false,
      _count: { participants: 1 },
    } as any);

    vi.mocked(prisma.tournamentParticipant.findUnique).mockResolvedValue(null);

    const mockCreatedParticipant = {
      id: 'inscripcion-1',
      tournamentId,
      playerId,
      status: 'CONFIRMED',
      registeredAt: new Date(validIsoDate),
    };

    vi.mocked(prisma.tournamentParticipant.create).mockResolvedValue(mockCreatedParticipant as any);

    const response = await request(app).post(`/api/tournaments/${tournamentId}/register`).send({
      playerId,

      registeredAt: validIsoDate,
    });

    expect(response.status).toBe(201);

    expect(response.body.participant).toEqual({
      ...mockCreatedParticipant,
      registeredAt: validIsoDate,
    });

    expect(prisma.tournamentParticipant.create).toHaveBeenCalledOnce();
  });

  it('POST /:id/register - debería dar error (400) si el torneo está lleno', async () => {
    const tournamentId = '550e8400-e29b-41d4-a716-446655440000';
    const playerId = '123e4567-e89b-12d3-a456-426614174001';

    const validIsoDate = new Date().toISOString();

    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({
      id: tournamentId,
      numPlayers: 8,
      groupsCreated: false,
      _count: { participants: 8 },
    } as any);

    const response = await request(app)
      .post(`/api/tournaments/${tournamentId}/register`)
      .send({ playerId });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('El torneo ya ha alcanzado el límite máximo de jugadores');

    expect(prisma.tournamentParticipant.create).not.toHaveBeenCalled();
  });

  describe('POST /:id/generate-groups (Algoritmo de Serpiente)', () => {
    it('Debería fallar (400) si los grupos ya han sido generados', async () => {
      vi.mocked(prisma.tournament.findUnique).mockResolvedValue({
        id: MOCK_UUID,
        groupsCreated: true,
        numGroup: 2,
      } as any);

      const response = await request(app).post(`/api/tournaments/${MOCK_UUID}/generate-groups`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Los grupos ya han sido generados');
      expect(prisma.tournamentParticipant.findMany).not.toHaveBeenCalled();
    });

    it('Debería fallar (400) si hay menos de 2 jugadores confirmados', async () => {
      vi.mocked(prisma.tournament.findUnique).mockResolvedValue({
        id: MOCK_UUID,
        groupsCreated: false,
        numGroup: 2,
      } as any);

      vi.mocked(prisma.tournamentParticipant.findMany).mockResolvedValue([
        { playerId: 'player-1', player: { stats: { elo: 1000 } } },
      ] as any);

      const response = await request(app).post(`/api/tournaments/${MOCK_UUID}/generate-groups`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'No hay suficientes jugadores confirmados para generar los grupos',
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('Debería generar los grupos exitosamente (200) usando el algoritmo', async () => {
      vi.mocked(prisma.tournament.findUnique).mockResolvedValue({
        id: MOCK_UUID,
        groupsCreated: false,
        numGroup: 2,
      } as any);

      vi.mocked(prisma.tournamentParticipant.findMany).mockResolvedValue([
        { playerId: 'p1', player: { stats: { elo: 800 } } },
        { playerId: 'p2', player: { stats: { elo: 1200 } } },
        { playerId: 'p3', player: { stats: { elo: 600 } } },
        { playerId: 'p4', player: { stats: { elo: 1000 } } },
      ] as any);

      vi.mocked(prisma.tournamentGroup.create).mockResolvedValue({ id: 'grupo-falso-123' } as any);

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback(prisma);
      });

      const response = await request(app).post(`/api/tournaments/${MOCK_UUID}/generate-groups`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Grupos y partidos generados mediante Serpiente');

      expect(prisma.$transaction).toHaveBeenCalledOnce();

      expect(prisma.tournament.update).toHaveBeenCalledWith({
        where: { id: MOCK_UUID },
        data: {
          groupsCreated: true,
          status: 'Grupos',
        },
      });

      expect(prisma.tournamentGroup.create).toHaveBeenCalledTimes(2);

      expect(prisma.tournamentGroupClas.create).toHaveBeenCalledTimes(4);

      expect(prisma.match.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('GET /:id/groups/matches', () => {
    it('Debería devolver la lista de partidos de grupos (200)', async () => {
      const mockMatches = [{ id: 'match-1', dateStart: MOCK_DATE, group: { group: 1 } }];
      vi.mocked(prisma.match.findMany).mockResolvedValue(mockMatches as any);

      const response = await request(app).get(`/api/tournaments/${MOCK_UUID}/groups/matches`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockMatches);
      expect(prisma.match.findMany).toHaveBeenCalledOnce();
    });

    it('Debería devolver error interno (500) si falla la base de datos', async () => {
      vi.mocked(prisma.match.findMany).mockRejectedValue(new Error('DB Error'));

      const response = await request(app).get(`/api/tournaments/${MOCK_UUID}/groups/matches`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Error al obtener los partidos del grupo.');
    });
  });

  describe('GET /:id/groups/classifications', () => {
    it('Debería devolver la clasificación de la fase de grupos (200)', async () => {
      const mockClasifications = [
        { id: 'clas-1', position: 1, pointsClas: 6, tournamentGroup: { group: 1 } },
      ];
      vi.mocked(prisma.tournamentGroupClas.findMany).mockResolvedValue(mockClasifications as any);

      const response = await request(app).get(
        `/api/tournaments/${MOCK_UUID}/groups/classifications`,
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockClasifications);
      expect(prisma.tournamentGroupClas.findMany).toHaveBeenCalledOnce();
    });

    it('Debería permitir filtrar por un grupo específico usando query param', async () => {
      vi.mocked(prisma.tournamentGroupClas.findMany).mockResolvedValue([] as any);

      const groupId = 'grupo-123';
      await request(app).get(
        `/api/tournaments/${MOCK_UUID}/groups/classifications?groupId=${groupId}`,
      );

      expect(prisma.tournamentGroupClas.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tournamentGroupId: groupId }),
        }),
      );
    });
  });

  describe('GET /:id/bracket', () => {
    it('Debería devolver el cuadro de eliminatorias (200)', async () => {
      const mockBracket = [
        {
          id: 'knockout-1',
          round: 'Octavos',
          type: 'A',
          matches: [{ id: 'match-1', order: 0, status: 'Programado' }],
        },
      ];
      vi.mocked(prisma.tournamentKnockout.findMany).mockResolvedValue(mockBracket as any);

      const response = await request(app).get(`/api/tournaments/${MOCK_UUID}/bracket`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockBracket);
      expect(prisma.tournamentKnockout.findMany).toHaveBeenCalledOnce();
    });

    it('Debería devolver error (404) si el cuadro aún no se ha generado', async () => {
      vi.mocked(prisma.tournamentKnockout.findMany).mockResolvedValue([] as any);

      const response = await request(app).get(`/api/tournaments/${MOCK_UUID}/bracket`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No se ha generado el cuadro para este torneo todavía.');
    });

    it('Debería permitir solicitar la llave de consolación (Type B)', async () => {
      vi.mocked(prisma.tournamentKnockout.findMany).mockResolvedValue([{ id: 'mock' }] as any);

      await request(app).get(`/api/tournaments/${MOCK_UUID}/bracket?type=B`);

      expect(prisma.tournamentKnockout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'B' }),
        }),
      );
    });
  });
});
