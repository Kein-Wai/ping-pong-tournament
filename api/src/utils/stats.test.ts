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
        matchWon: 1,
        matchLost: 0,
        setWon: 2,
        setLost: 0,
        pointWon: 22, // 11 + 11
        pointLost: 14, // 5 + 9
        score: 0,
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
        score: 0,
        tournamentWon: 0,
        tournamentLost: 0,
      },
    });
  });

  it('Debería INCREMENTAR las estadísticas si los jugadores ya tenían partidos guardados', async () => {
    // Simulamos que findFirst SÍ encuentra registros previos en la base de datos
    mockPrisma.stats.findFirst
      .mockResolvedValueOnce({ id: 'stats-id-p1', userId: 'uuid-p1' }) // Primera llamada (P1)
      .mockResolvedValueOnce({ id: 'stats-id-p2', userId: 'uuid-p2' }); // Segunda llamada (P2)

    // Simulamos un partido reñido al mejor de 3 donde gana el Jugador 2 (Resultado: 1-2 en sets)
    const matchPayload = {
      status: STATUS.COMPLETED,
      playerOneId: 'uuid-p1',
      playerTwoId: 'uuid-p2',
      setOnePlayerOne: 11,
      setOnePlayerTwo: 8, // Set 1 para P1
      setTwoPlayerOne: 9,
      setTwoPlayerTwo: 11, // Set 2 para P2
      setThreePlayerOne: 11,
      setThreePlayerTwo: 13, // Set 3 para P2 (por diferencia de 2)
    };

    await updateMatchStats(mockPrisma, matchPayload);

    // No debe crear nada nuevo, debe actualizar
    expect(mockPrisma.stats.create).not.toHaveBeenCalled();
    expect(mockPrisma.stats.update).toHaveBeenCalledTimes(2);

    // Verificamos que al Jugador 1 (Perdedor en este caso) se le inyectan los "increment" correctamente
    expect(mockPrisma.stats.update).toHaveBeenCalledWith({
      where: { id: 'stats-id-p1' },
      data: {
        matchWon: { increment: 0 },
        matchLost: { increment: 1 },
        setWon: { increment: 1 }, // Ganó 1 set
        setLost: { increment: 2 }, // Perdió 2 sets
        pointWon: { increment: 31 }, // 11 + 9 + 11
        pointLost: { increment: 32 }, // 8 + 11 + 13
      },
    });
  });
});
