import { vi, describe, it, expect, beforeEach } from 'vitest';
// Ajusta las rutas de importación según la estructura de tus carpetas
import { updateTournamentGroupClas } from '../../src/utils/tournament';
import { STATUS, GROUP_WIN_POINTS } from '../../src/constants';
import { calculateMatchResults } from '../../src/utils/match';

// 1. Mockeamos la dependencia externa
// Así controlamos lo que devuelve sin tener que enviarle un partido con todos los sets perfectos
vi.mock('../../src/utils/match', () => ({
  calculateMatchResults: vi.fn(),
}));

describe('Utility: updateTournamentGroupClas', () => {
  // 2. Mock de Prisma
  const mockPrisma = {
    tournament: {
      findUnique: vi.fn(),
    },
    tournamentGroup: {
      findUnique: vi.fn(),
    },
    tournamentGroupClas: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Debería salir inmediatamente si el partido no está COMPLETADO o no tiene tournamentId', async () => {
    const match = { status: STATUS.OPEN, tournamentId: null };

    await updateTournamentGroupClas(mockPrisma, match);

    expect(mockPrisma.tournament.findUnique).not.toHaveBeenCalled();
    expect(calculateMatchResults).not.toHaveBeenCalled();
  });

  it('Debería lanzar error si el torneo no existe en la base de datos', async () => {
    const match = { status: STATUS.COMPLETED, tournamentId: 'torneo-falso' };

    mockPrisma.tournament.findUnique.mockResolvedValue(null);

    await expect(updateTournamentGroupClas(mockPrisma, match)).rejects.toThrow(
      'El torneo asignado al partido no existe.',
    );
  });

  it('Debería salir silenciosamente si el torneo existe pero no hay groupId (ej. eliminatoria)', async () => {
    const match = { status: STATUS.COMPLETED, tournamentId: 'torneo-real', groupId: null };

    mockPrisma.tournament.findUnique.mockResolvedValue({ id: 'torneo-real' });

    await updateTournamentGroupClas(mockPrisma, match);

    // Buscó el torneo, pero no debería buscar el grupo ni actualizar clasificaciones
    expect(mockPrisma.tournament.findUnique).toHaveBeenCalled();
    expect(mockPrisma.tournamentGroup.findUnique).not.toHaveBeenCalled();
  });

  it('Debería lanzar error si el grupo no existe en la base de datos', async () => {
    const match = { status: STATUS.COMPLETED, tournamentId: 't1', groupId: 'grupo-falso' };

    mockPrisma.tournament.findUnique.mockResolvedValue({ id: 't1' });
    mockPrisma.tournamentGroup.findUnique.mockResolvedValue(null);

    await expect(updateTournamentGroupClas(mockPrisma, match)).rejects.toThrow(
      'El grupo asignado al partido no existe en este torneo.',
    );
  });

  it('Debería CREAR la clasificación si los jugadores no existían (Gana Jugador 1)', async () => {
    const match = {
      status: STATUS.COMPLETED,
      tournamentId: 't1',
      groupId: 'g1',
      playerOneId: 'p1',
      playerTwoId: 'p2',
    };

    mockPrisma.tournament.findUnique.mockResolvedValue({ id: 't1' });
    mockPrisma.tournamentGroup.findUnique.mockResolvedValue({ id: 'g1' });
    mockPrisma.tournamentGroupClas.findFirst.mockResolvedValue(null); // No hay clasificaciones previas

    // Forzamos la respuesta de nuestra función mockeada
    vi.mocked(calculateMatchResults).mockReturnValue({
      p1Sets: 3,
      p2Sets: 1,
      p1Points: 44,
      p2Points: 30,
      p1WinsMatch: true,
      p2WinsMatch: false,
    });

    await updateTournamentGroupClas(mockPrisma, match);

    expect(mockPrisma.tournamentGroupClas.create).toHaveBeenCalledTimes(2);

    // Comprobamos la inserción del Jugador 1 (Ganador)
    expect(mockPrisma.tournamentGroupClas.create).toHaveBeenCalledWith({
      data: {
        tournamentGroupId: 'g1',
        playerId: 'p1',
        gamesWon: 1,
        gamesLost: 0,
        setsWon: 3,
        setsLost: 1,
        pointsWon: 44,
        pointsLost: 30,
        pointsClas: GROUP_WIN_POINTS, // Usa la constante
        position: 0,
      },
    });

    // Comprobamos la inserción del Jugador 2 (Perdedor)
    expect(mockPrisma.tournamentGroupClas.create).toHaveBeenCalledWith({
      data: {
        tournamentGroupId: 'g1',
        playerId: 'p2',
        gamesWon: 0,
        gamesLost: 1,
        setsWon: 1,
        setsLost: 3,
        pointsWon: 30,
        pointsLost: 44,
        pointsClas: 0, // Perdedor = 0
        position: 0,
      },
    });
  });

  it('Debería ACTUALIZAR la clasificación (incrementos) si ya existían (Gana Jugador 2)', async () => {
    const match = {
      status: STATUS.COMPLETED,
      tournamentId: 't1',
      groupId: 'g1',
      playerOneId: 'p1',
      playerTwoId: 'p2',
    };

    mockPrisma.tournament.findUnique.mockResolvedValue({ id: 't1' });
    mockPrisma.tournamentGroup.findUnique.mockResolvedValue({ id: 'g1' });

    // Simulamos que ya existen en la base de datos
    mockPrisma.tournamentGroupClas.findFirst
      .mockResolvedValueOnce({ id: 'clas-p1' })
      .mockResolvedValueOnce({ id: 'clas-p2' });

    // Forzamos la respuesta: esta vez gana el Jugador 2
    vi.mocked(calculateMatchResults).mockReturnValue({
      p1Sets: 0,
      p2Sets: 3,
      p1Points: 20,
      p2Points: 33,
      p1WinsMatch: false,
      p2WinsMatch: true,
    });

    await updateTournamentGroupClas(mockPrisma, match);

    expect(mockPrisma.tournamentGroupClas.update).toHaveBeenCalledTimes(2);

    // Comprobamos el UPDATE del Jugador 1 (Perdedor)
    expect(mockPrisma.tournamentGroupClas.update).toHaveBeenCalledWith({
      where: { id: 'clas-p1' },
      data: {
        gamesWon: { increment: 0 },
        gamesLost: { increment: 1 },
        setsWon: { increment: 0 },
        setsLost: { increment: 3 },
        pointsWon: { increment: 20 },
        pointsLost: { increment: 33 },
        pointsClas: { increment: 0 },
      },
    });

    // Comprobamos el UPDATE del Jugador 2 (Ganador)
    expect(mockPrisma.tournamentGroupClas.update).toHaveBeenCalledWith({
      where: { id: 'clas-p2' },
      data: {
        gamesWon: { increment: 1 },
        gamesLost: { increment: 0 },
        setsWon: { increment: 3 },
        setsLost: { increment: 0 },
        pointsWon: { increment: 33 },
        pointsLost: { increment: 20 },
        pointsClas: { increment: GROUP_WIN_POINTS }, // El ganador suma los puntos de la constante
      },
    });
  });
});
