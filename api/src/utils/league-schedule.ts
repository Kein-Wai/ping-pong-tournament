/** Enfrentamiento de una jornada de liga. */
export interface LeagueMatchup {
  playerOneId: string;
  playerTwoId: string;
}

/** Jornada de liga: partidos en los que nadie juega dos veces. Numerada desde 1. */
export interface LeagueRound {
  round: number;
  matches: LeagueMatchup[];
}

/**
 * Genera el calendario de una liga todos contra todos con el metodo del circulo:
 * un jugador queda fijo y el resto rota en cada jornada. Con un numero impar de
 * jugadores se añade un descanso, de modo que cada jornada uno de ellos no juega.
 * Con `doubleRound` la vuelta repite las jornadas de la ida con los lados
 * intercambiados. Es determinista: la misma entrada da siempre el mismo calendario.
 *
 * @param playerIds Identificadores de los jugadores, sin repetir y al menos dos.
 * @param doubleRound `true` para ida y vuelta.
 */
export const generateLeagueSchedule = (
  playerIds: string[],
  doubleRound: boolean,
): LeagueRound[] => {
  if (playerIds.length < 2) {
    throw new Error('Una liga necesita al menos 2 jugadores');
  }
  if (new Set(playerIds).size !== playerIds.length) {
    throw new Error('La lista de jugadores contiene identificadores repetidos');
  }

  // null marca el descanso cuando el numero de jugadores es impar.
  const slots: (string | null)[] = playerIds.length % 2 === 0 ? [...playerIds] : [...playerIds, null];
  const numRounds = slots.length - 1;
  const half = slots.length / 2;

  const firstLeg: LeagueMatchup[][] = [];
  let rotation = slots;

  for (let r = 0; r < numRounds; r++) {
    const matches: LeagueMatchup[] = [];
    for (let i = 0; i < half; i++) {
      const home = rotation[i];
      const away = rotation[rotation.length - 1 - i];
      if (home !== null && away !== null) {
        matches.push({ playerOneId: home, playerTwoId: away });
      }
    }
    firstLeg.push(matches);
    rotation = [rotation[0], rotation[rotation.length - 1], ...rotation.slice(1, -1)];
  }

  const secondLeg = doubleRound
    ? firstLeg.map((matches) =>
        matches.map((m) => ({ playerOneId: m.playerTwoId, playerTwoId: m.playerOneId })),
      )
    : [];

  return [...firstLeg, ...secondLeg].map((matches, index) => ({ round: index + 1, matches }));
};
