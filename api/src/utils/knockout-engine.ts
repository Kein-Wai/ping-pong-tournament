import { MatchStatus, RoundKnockouts, SortKnockout } from '@prisma/client';
import { randomUUID } from 'crypto';
import { BYE_USER_ID, TBD_USER_ID } from '../constants';
import { assignFirstRound } from './knockout-assignment';

/**
 * Semilla de un jugador clasificado: su identificador, su posicion dentro del
 * grupo y el grupo del que viene.
 */
export interface KnockoutSeed {
  id: string;
  position: number;
  groupNumber?: number;
}

/** Partido de una ronda del cuadro de eliminatorias. */
export interface KnockoutMatchNode {
  id: string;
  p1Id: string;
  p2Id: string;
  matchOrder: number;
  winnerGoesToMatchId: string | null;
  loserGoesToMatchId: string | null;
  status: MatchStatus;
  isBye: boolean;
}

/** Ronda del cuadro de eliminatorias. */
export interface KnockoutBracketNode {
  roundIndex: number;
  posStart: number;
  posEnd: number;
  matches: KnockoutMatchNode[];
}

/** Partido de primera ronda: todavia puede contener un bye. */
export interface FirstRoundMatch {
  playerOne: KnockoutSeed | null;
  playerTwo: KnockoutSeed | null;
  isByeMatch: boolean;
}

/** Rondas de eliminatorias, de la mas pequena a la final. */
export const ROUND_PROGRESSION = [
  RoundKnockouts.R128avos,
  RoundKnockouts.R64avos,
  RoundKnockouts.R32avos,
  RoundKnockouts.R16avos,
  RoundKnockouts.Octavos,
  RoundKnockouts.Cuartos,
  RoundKnockouts.Semifinales,
  RoundKnockouts.Final,
];

/** Ronda inicial que corresponde a un numero de partidos de primera ronda. */
const determineInitialRound = (numMatches: number): RoundKnockouts => {
  switch (numMatches) {
    case 1:
      return RoundKnockouts.Final;
    case 2:
      return RoundKnockouts.Semifinales;
    case 4:
      return RoundKnockouts.Cuartos;
    case 8:
      return RoundKnockouts.Octavos;
    case 16:
      return RoundKnockouts.R16avos;
    case 32:
      return RoundKnockouts.R32avos;
    case 64:
      return RoundKnockouts.R64avos;
    case 128:
      return RoundKnockouts.R128avos;
    default:
      throw new Error(`Número de partidos de primera ronda no soportado: ${numMatches}`);
  }
};

const getNextPowerOfTwo = (n: number) => Math.pow(2, Math.ceil(Math.log2(n)));

const shuffle = <T>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/**
 * Crea los partidos de primera ronda a partir de los jugadores clasificados.
 *
 * Modulo PURO: no toca la base de datos. Decide la siembra (por posicion o
 * aleatoria) y despues evita que dos jugadores del mismo grupo se enfrenten
 * en la primera ronda.
 */
/**
 * Ordena a los jugadores por su posicion de clasificacion. En modo aleatorio el
 * orden es un sorteo completo; en modo siembra manda la posicion dentro del
 * grupo, y el reparto en mitades lo decide el sorteo por bloques.
 */
const rankPlayers = (players: KnockoutSeed[], sortType: SortKnockout): KnockoutSeed[] => {
  const ranked = [...players].sort(
    (a, b) =>
      a.position - b.position ||
      (a.groupNumber || 0) - (b.groupNumber || 0) ||
      a.id.localeCompare(b.id),
  );

  return sortType === SortKnockout.Aleatorio ? shuffle(ranked) : ranked;
};

/**
 * Crea los partidos de primera ronda a partir de los jugadores clasificados.
 *
 * Modulo PURO: no toca la base de datos. Decide la siembra (por posicion o
 * aleatoria), reparte los byes entre los cabezas de serie mas altos y evita que
 * dos jugadores del mismo grupo se enfrenten en la primera ronda.
 */
export const createKnockoutDraw = (
  classifiedPlayers: KnockoutSeed[],
  sortType: SortKnockout,
): FirstRoundMatch[] => {
  const numPlayers = classifiedPlayers.length;
  if (numPlayers < 2) throw new Error('No hay suficientes jugadores para eliminatorias');

  const bracketSize = getNextPowerOfTwo(numPlayers);
  const drawSlots = assignFirstRound(rankPlayers(classifiedPlayers, sortType), bracketSize);

  const firstRoundMatches: FirstRoundMatch[] = [];
  for (let i = 0; i < drawSlots.length; i += 2) {
    firstRoundMatches.push({
      playerOne: drawSlots[i],
      playerTwo: drawSlots[i + 1],
      isByeMatch: drawSlots[i] === null || drawSlots[i + 1] === null,
    });
  }

  return firstRoundMatches;
};

/** Construye los nodos de la primera ronda a partir de los partidos de siembra. */
const buildFirstRound = (
  firstRoundMatches: FirstRoundMatch[],
  initialRoundIndex: number,
  bracketSize: number,
): KnockoutBracketNode[] => [
  {
    matches: firstRoundMatches.map((match, index) => {
      const isBye = !match.playerOne || !match.playerTwo;

      return {
        id: randomUUID(),
        p1Id: match.playerOne ? match.playerOne.id : BYE_USER_ID,
        p2Id: match.playerTwo ? match.playerTwo.id : BYE_USER_ID,
        matchOrder: index,
        winnerGoesToMatchId: null,
        loserGoesToMatchId: null,
        status: isBye ? MatchStatus.Completado : MatchStatus.Programado,
        isBye,
      };
    }),
    posStart: 1,
    posEnd: bracketSize,
    roundIndex: initialRoundIndex,
  },
];

/**
 * Expande el cuadro: cada ronda genera los partidos de la siguiente, enlazando
 * al ganador con la ronda siguiente y al perdedor con la ronda de perdedores
 * (si el torneo tiene posiciones para todos).
 */
const expandRounds = (
  currentBrackets: KnockoutBracketNode[],
  allPos: boolean,
): KnockoutBracketNode[] => {
  const allGeneratedBrackets: KnockoutBracketNode[] = [];

  while (currentBrackets.length > 0) {
    const nextBrackets: KnockoutBracketNode[] = [];

    for (const bracket of currentBrackets) {
      allGeneratedBrackets.push(bracket);

      if (bracket.matches.length === 1) continue;

      const midPos = Math.floor((bracket.posStart + bracket.posEnd) / 2);
      const winnerMatches: KnockoutMatchNode[] = [];
      const loserMatches: KnockoutMatchNode[] = [];

      let nextMatchOrder = 0;
      for (let i = 0; i < bracket.matches.length; i += 2) {
        const m1 = bracket.matches[i];
        const m2 = bracket.matches[i + 1];

        const wMatch: KnockoutMatchNode = {
          id: randomUUID(),
          p1Id: TBD_USER_ID,
          p2Id: TBD_USER_ID,
          matchOrder: nextMatchOrder,
          winnerGoesToMatchId: null,
          loserGoesToMatchId: null,
          status: MatchStatus.Programado,
          isBye: false,
        };
        const lMatch: KnockoutMatchNode = {
          id: randomUUID(),
          p1Id: TBD_USER_ID,
          p2Id: TBD_USER_ID,
          matchOrder: nextMatchOrder,
          winnerGoesToMatchId: null,
          loserGoesToMatchId: null,
          status: MatchStatus.Programado,
          isBye: false,
        };

        m1.winnerGoesToMatchId = wMatch.id;
        m1.loserGoesToMatchId = lMatch.id;
        m2.winnerGoesToMatchId = wMatch.id;
        m2.loserGoesToMatchId = lMatch.id;

        winnerMatches.push(wMatch);
        loserMatches.push(lMatch);
        nextMatchOrder++;
      }

      nextBrackets.push({
        matches: winnerMatches,
        posStart: bracket.posStart,
        posEnd: midPos,
        roundIndex: bracket.roundIndex + 1,
      });

      if (allPos || (bracket.posStart === 1 && bracket.posEnd === 4)) {
        nextBrackets.push({
          matches: loserMatches,
          posStart: midPos + 1,
          posEnd: bracket.posEnd,
          roundIndex: bracket.roundIndex + 1,
        });
      } else {
        for (let i = 0; i < bracket.matches.length; i++) {
          bracket.matches[i].loserGoesToMatchId = null;
        }
      }
    }
    currentBrackets = nextBrackets;
  }

  return allGeneratedBrackets;
};

/**
 * Construye la estructura completa del cuadro de eliminatorias.
 *
 * Modulo PURO: no toca la base de datos. Devuelve las rondas generadas y el
 * indice de la ronda inicial, para que el adaptador sepa en que ronda esta el
 * torneo.
 */
export const buildKnockoutBracketEngine = (
  firstRoundMatches: FirstRoundMatch[],
  allPos: boolean,
): { brackets: KnockoutBracketNode[]; initialRoundIndex: number } => {
  const bracketSize = firstRoundMatches.length * 2;
  const initialRoundIndex = ROUND_PROGRESSION.indexOf(
    determineInitialRound(firstRoundMatches.length),
  );

  const firstRound = buildFirstRound(firstRoundMatches, initialRoundIndex, bracketSize);

  return { brackets: expandRounds(firstRound, allPos), initialRoundIndex };
};
