import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import prisma from '../../src/db';

vi.mock('../../src/db', () => ({
  default: {
    tournament: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(), // Añadido para actualizar el status
    },
    tournamentParticipant: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(), // Añadido para traer la lista de jugadores
    },
    tournamentGroup: {
      create: vi.fn(),
    },
    tournamentGroupClas: {
      create: vi.fn(),
    },
    match: {
      create: vi.fn(),
    },
    $transaction: vi.fn(), // Añadido para simular las transacciones
  },
}));

vi.mock('../../src/middleware/auth.middleware', () => ({
  verifyToken: (req: any, res: any, next: any) => next(),
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
    rounds: 'Grupos/Llave',
    typeKnockout: 'A',
    playersKnockout: '2',
    sortKnockout: 'Aleatorio',
    allPos: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST / - debería crear un nuevo torneo (201)', async () => {
    // Simulamos la respuesta de creación exitosa
    vi.mocked(prisma.tournament.create).mockResolvedValue(mockTournamentDB as any);

    const response = await request(app).post('/api/tournaments').send(requestPayload);
    expect(response.status).toBe(201);
    expect(response.body.tournament).toEqual(mockTournamentDB);
    expect(prisma.tournament.create).toHaveBeenCalledOnce();
    expect(prisma.tournament.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'PROGRAMADO',
        groupsCreated: false,
        knockoutCreated: false,
      }),
    });
  });

  it('POST / - debería fallar (400) si los datos de creación son inválidos (Zod)', async () => {
    // Mandamos un nombre muy corto, una fecha que no es fecha y 1 solo jugador (el mínimo es 2)
    const invalidPayload = {
      name: 'To',
      dateStart: 'no-es-una-fecha',
      numPlayers: 1,
    };

    const response = await request(app).post('/api/tournaments').send(invalidPayload);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Datos inválidos');
    expect(response.body.details).toBeDefined(); // Aquí Zod nos escupe el árbol de errores

    // Comprobamos que el servidor cortó la petición ANTES de llamar a la base de datos
    expect(prisma.tournament.create).not.toHaveBeenCalled();
  });

  it('POST /:id/register - debería inscribir a un jugador si hay hueco (201)', async () => {
    const tournamentId = MOCK_UUID;
    const playerId = '123e4567-e89b-12d3-a456-426614174001';

    // 1. Simulamos que el torneo existe y solo tiene 1 participante apuntado de 8 permitidos
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({
      id: tournamentId,
      numPlayers: 8,
      groupsCreated: false,
      _count: { participants: 1 }, // ¡Hay hueco!
    } as any);

    // 2. Simulamos que NO estaba apuntado ya
    vi.mocked(prisma.tournamentParticipant.findUnique).mockResolvedValue(null);

    // 3. Simulamos la creación exitosa
    const mockCreatedParticipant = {
      id: 'inscripcion-1',
      tournamentId,
      playerId,
      status: 'CONFIRMED',
      registeredAt: MOCK_DATE,
    };
    vi.mocked(prisma.tournamentParticipant.create).mockResolvedValue(mockCreatedParticipant as any);

    // Ejecutamos la petición
    const response = await request(app)
      .post(`/api/tournaments/${tournamentId}/register`)
      .send({ playerId });

    expect(response.status).toBe(201);
    expect(response.body.participant).toEqual(mockCreatedParticipant);
    expect(prisma.tournamentParticipant.create).toHaveBeenCalledOnce();
  });

  it('POST /:id/register - debería dar error (400) si el torneo está lleno', async () => {
    const tournamentId = MOCK_UUID;
    const playerId = '123e4567-e89b-12d3-a456-426614174001';

    // Simulamos que el torneo ya tiene 8 participantes de 8 posibles
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({
      id: tournamentId,
      numPlayers: 8,
      groupsCreated: false,
      _count: { participants: 8 }, // ¡LLENO!
    } as any);

    const response = await request(app)
      .post(`/api/tournaments/${tournamentId}/register`)
      .send({ playerId });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('El torneo ya ha alcanzado el límite máximo de jugadores');
    // Verificamos que se aborta y no se crea nada
    expect(prisma.tournamentParticipant.create).not.toHaveBeenCalled();
  });

  describe('POST /:id/generate-groups (Algoritmo de Serpiente)', () => {
    it('Debería fallar (400) si los grupos ya han sido generados', async () => {
      // Simulamos un torneo donde groupsCreated ya es true
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
      // Torneo válido
      vi.mocked(prisma.tournament.findUnique).mockResolvedValue({
        id: MOCK_UUID,
        groupsCreated: false,
        numGroup: 2,
      } as any);

      // Simulamos que findMany solo devuelve 1 pobre jugador
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
      // 1. Torneo listo para la acción
      vi.mocked(prisma.tournament.findUnique).mockResolvedValue({
        id: MOCK_UUID,
        groupsCreated: false,
        numGroup: 2, // Queremos dividir en 2 grupos
      } as any);

      // 2. Simulamos 4 jugadores confirmados con diferentes ELOs (desordenados a propósito)
      vi.mocked(prisma.tournamentParticipant.findMany).mockResolvedValue([
        { playerId: 'p1', player: { stats: { elo: 800 } } },
        { playerId: 'p2', player: { stats: { elo: 1200 } } }, // El mejor
        { playerId: 'p3', player: { stats: { elo: 600 } } }, // El peor
        { playerId: 'p4', player: { stats: { elo: 1000 } } },
      ] as any);

      vi.mocked(prisma.tournamentGroup.create).mockResolvedValue({ id: 'grupo-falso-123' } as any);

      // 3. Un truco vital: Mockeamos $transaction para que simplemente ejecute nuestro código
      // pasándole nuestro 'prisma' mockeado
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback(prisma);
      });

      // ¡Lanzamos la petición!
      const response = await request(app).post(`/api/tournaments/${MOCK_UUID}/generate-groups`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Grupos y partidos generados mediante Serpiente');

      // Validamos que se llamó a la transacción
      expect(prisma.$transaction).toHaveBeenCalledOnce();

      // Validamos que se cerró el torneo
      expect(prisma.tournament.update).toHaveBeenCalledWith({
        where: { id: MOCK_UUID },
        data: {
          groupsCreated: true,
          status: 'Programado',
        },
      });

      // Validamos que se crearon los 2 grupos previstos
      expect(prisma.tournamentGroup.create).toHaveBeenCalledTimes(2);

      // Validamos que se crearon los 4 registros en la clasificación
      expect(prisma.tournamentGroupClas.create).toHaveBeenCalledTimes(4);

      // En grupos de 2 jugadores (2 por grupo en este ejemplo), la matriz es [[1,2]],
      // por lo que debería crearse exactamente 1 partido por grupo (2 en total)
      expect(prisma.match.create).toHaveBeenCalledTimes(2);
    });
  });
});
