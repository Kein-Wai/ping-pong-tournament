import { vi, describe, it, expect, beforeEach } from 'vitest';
import { updateMatchStats } from '../../src/utils/stats';
import { STATUS } from '../../src/constants';

describe('Utility: updateMatchStats', () => {
  // 1. Creamos un "Espía/Mock" local de Prisma muy ligero
  // Así no dependemos de la base de datos real en este test unitario
  const mockPrisma = {
    stats: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  } as any;

  beforeEach(() => {
    // Limpiamos el historial de los mocks antes de cada test
    vi.clearAllMocks();
  });

  it('Debería ignorar el partido y salir rápido si el estado NO es "Completado"', async () => {
    const openMatch = {
      status: STATUS.OPEN,
      playerOneId: 'player-1',
      playerTwoId: 'player-2',
    };

    await updateMatchStats(mockPrisma, openMatch);

    // Verificamos que no ha intentado buscar ni tocar nada en la tabla de stats
    expect(mockPrisma.stats.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.stats.create).not.toHaveBeenCalled();
    expect(mockPrisma.stats.update).not.toHaveBeenCalled();
  });

  it('Debería CREAR nuevas filas de estadísticas si es el primer partido de los jugadores', async () => {
    // Simulamos que findFirst devuelve null (los jugadores no tienen historial aún)
    mockPrisma.stats.findFirst.mockResolvedValue(null);

    // Simulamos un partido donde gana el Jugador 1 (2 sets a 0)
    const matchPayload = {
      status: STATUS.COMPLETED,
      playerOneId: 'uuid-player-1',
      playerTwoId: 'uuid-player-2',
      setOnePlayerOne: 11,
      setOnePlayerTwo: 5,
      setTwoPlayerOne: 11,
      setTwoPlayerTwo: 9,
      // Los demás sets no se enviaron o son 0
    };

    await updateMatchStats(mockPrisma, matchPayload);

    // Se debe buscar a ambos jugadores
    expect(mockPrisma.stats.findFirst).toHaveBeenCalledTimes(2);
    // Se deben crear registros nuevos para ambos
    expect(mockPrisma.stats.create).toHaveBeenCalledTimes(2);

    // Verificamos que al Jugador 1 (Ganador) se le crean las stats perfectas
    expect(mockPrisma.stats.create).toHaveBeenCalledWith({
      data: {
        userId: 'uuid-player-1',
        elo: 509,
        matchWon: 1,
        matchLost: 0,
        setWon: 2,
        setLost: 0,
        pointWon: 22, // 11 + 11
        pointLost: 14, // 5 + 9
        tournamentWon: 0,
        tournamentLost: 0,
      },
    });

    // Verificamos que al Jugador 2 (Perdedor) se le crean sus stats correspondientes
    expect(mockPrisma.stats.create).toHaveBeenCalledWith({
      data: {
        userId: 'uuid-player-2',
        matchWon: 0,
        matchLost: 1,
        setWon: 0,
        setLost: 2,
        pointWon: 14,
        pointLost: 22,
        elo: 491,
        tournamentWon: 0,
        tournamentLost: 0,
      },
    });
  });

  it('Debería INCREMENTAR las estadísticas si los jugadores ya tenían partidos guardados', async () => {
    // Simulamos que findFirst encuentra registros previos
    // Les damos un elo base de 500 a ambos para que la lógica funcione predeciblemente
    mockPrisma.stats.findFirst
      .mockResolvedValueOnce({ id: 'stats-id-p1', userId: 'uuid-p1', elo: 500 })
      .mockResolvedValueOnce({ id: 'stats-id-p2', userId: 'uuid-p2', elo: 500 });

    // Partido reñido: P1 gana el primero (11-8), P2 remonta (9-11, 11-13)
    const matchPayload = {
      status: STATUS.COMPLETED,
      playerOneId: 'uuid-p1',
      playerTwoId: 'uuid-p2',
      setOnePlayerOne: 11,
      setOnePlayerTwo: 8,
      setTwoPlayerOne: 9,
      setTwoPlayerTwo: 11,
      setThreePlayerOne: 11,
      setThreePlayerTwo: 13,
    };

    await updateMatchStats(mockPrisma, matchPayload);

    // No debe crear nada, solo actualizar
    expect(mockPrisma.stats.create).not.toHaveBeenCalled();
    expect(mockPrisma.stats.update).toHaveBeenCalledTimes(2);

    // 1. Verificamos al Jugador 1 (Perdedor)
    // Matemáticas Elo: diff=0 -> gana/pierde 12 pts (bucket['24'][1]) -> P1 pierde 12
    expect(mockPrisma.stats.update).toHaveBeenCalledWith({
      where: { id: 'stats-id-p1' },
      data: {
        elo: { increment: -12 }, // <-- ¡Añadido el delta de Elo!
        matchWon: { increment: 0 },
        matchLost: { increment: 1 },
        setWon: { increment: 1 },
        setLost: { increment: 2 },
        pointWon: { increment: 31 }, // 11 + 9 + 11
        pointLost: { increment: 32 }, // 8 + 11 + 13
      },
    });

    // 2. Verificamos al Jugador 2 (Ganador)
    expect(mockPrisma.stats.update).toHaveBeenCalledWith({
      where: { id: 'stats-id-p2' },
      data: {
        elo: { increment: 12 },
        matchWon: { increment: 1 },
        matchLost: { increment: 0 },
        setWon: { increment: 2 },
        setLost: { increment: 1 },
        pointWon: { increment: 32 }, // 8 + 11 + 13
        pointLost: { increment: 31 }, // 11 + 9 + 11
      },
    });
  });
});
