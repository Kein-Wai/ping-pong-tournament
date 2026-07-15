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
      // <-- Añadido nuevo bloque completo
      findMany: vi.fn(),
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
    // Simulamos la respuesta de creación exitosa
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
    // 1. Usamos UUIDs reales para pasar el filtro estricto de Zod
    const tournamentId = '550e8400-e29b-41d4-a716-446655440000';
    const playerId = '123e4567-e89b-12d3-a456-426614174001';

    // Generamos una fecha válida en formato ISO 8601 (String) para enviarla en el JSON
    const validIsoDate = new Date().toISOString();

    // 2. Simulamos que el torneo existe y solo tiene 1 participante apuntado de 8 permitidos
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({
      id: tournamentId,
      numPlayers: 8,
      groupsCreated: false,
      _count: { participants: 1 },
    } as any);

    // 3. Simulamos que NO estaba apuntado ya
    vi.mocked(prisma.tournamentParticipant.findUnique).mockResolvedValue(null);

    // 4. Simulamos la creación exitosa
    const mockCreatedParticipant = {
      id: 'inscripcion-1',
      tournamentId,
      playerId,
      status: 'CONFIRMED',
      registeredAt: new Date(validIsoDate), // Prisma devuelve objetos Date nativos
    };

    vi.mocked(prisma.tournamentParticipant.create).mockResolvedValue(mockCreatedParticipant as any);

    // 5. Ejecutamos la petición enviando exactamente lo que pide Zod
    const response = await request(app).post(`/api/tournaments/${tournamentId}/register`).send({
      playerId,
      // Lo enviamos por si tu esquema Zod lo valida desde el body
      registeredAt: validIsoDate, // Enviamos la fecha válida
    });

    expect(response.status).toBe(201);

    // Al comparar la respuesta, Supertest parsea las fechas a String (JSON),
    // por lo que debemos comparar contra el string ISO, no contra el objeto Date de Prisma.
    expect(response.body.participant).toEqual({
      ...mockCreatedParticipant,
      registeredAt: validIsoDate,
    });

    expect(prisma.tournamentParticipant.create).toHaveBeenCalledOnce();
  });

  it('POST /:id/register - debería dar error (400) si el torneo está lleno', async () => {
    const tournamentId = '550e8400-e29b-41d4-a716-446655440000';
    const playerId = '123e4567-e89b-12d3-a456-426614174001';

    // Generamos una fecha válida en formato ISO 8601 (String) para enviarla en el JSON
    const validIsoDate = new Date().toISOString();

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
  // ============================================================================
  // LECTURA DE GRUPOS Y ELIMINATORIAS
  // ============================================================================

  describe('GET /:id/groups/matches', () => {
    it('Debería devolver la lista de partidos de grupos (200)', async () => {
      // Simulamos la respuesta de la BD con un partido de prueba
      const mockMatches = [{ id: 'match-1', dateStart: MOCK_DATE, group: { group: 1 } }];
      vi.mocked(prisma.match.findMany).mockResolvedValue(mockMatches as any);

      const response = await request(app).get(`/api/tournaments/${MOCK_UUID}/groups/matches`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockMatches);
      expect(prisma.match.findMany).toHaveBeenCalledOnce();
    });

    it('Debería devolver error interno (500) si falla la base de datos', async () => {
      // Simulamos que la base de datos se cae
      vi.mocked(prisma.match.findMany).mockRejectedValue(new Error('DB Error'));

      const response = await request(app).get(`/api/tournaments/${MOCK_UUID}/groups/matches`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Error al obtener los partidos del grupo.');
    });
  });

  describe('GET /:id/groups/classifications', () => {
    it('Debería devolver la clasificación de la fase de grupos (200)', async () => {
      // Simulamos a un jugador en la clasificación
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

      // Comprobamos que el controlador le pasó el parámetro correcto a la utilidad
      expect(prisma.tournamentGroupClas.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tournamentGroupId: groupId }),
        }),
      );
    });
  });

  describe('GET /:id/bracket', () => {
    it('Debería devolver el cuadro de eliminatorias (200)', async () => {
      // Simulamos un cuadro generado con una ronda de Octavos
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
      // Simulamos que el torneo existe pero la consulta de knockouts devuelve un array vacío
      vi.mocked(prisma.tournamentKnockout.findMany).mockResolvedValue([] as any);

      const response = await request(app).get(`/api/tournaments/${MOCK_UUID}/bracket`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No se ha generado el cuadro para este torneo todavía.');
    });

    it('Debería permitir solicitar la llave de consolación (Type B)', async () => {
      vi.mocked(prisma.tournamentKnockout.findMany).mockResolvedValue([{ id: 'mock' }] as any);

      await request(app).get(`/api/tournaments/${MOCK_UUID}/bracket?type=B`);

      // Comprobamos que se consultó a la BD pidiendo específicamente el type 'B'
      expect(prisma.tournamentKnockout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'B' }),
        }),
      );
    });
  });
});
