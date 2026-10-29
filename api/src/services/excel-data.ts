import { randomUUID } from 'crypto';
import { buildGroupsEngine, TournamentSeed } from '../utils/group-engine';
import { createKnockoutDraw, KnockoutSeed } from '../utils/knockout-engine';

/** Plazas de la hoja de llave mas pequena que trae la plantilla maestra. */
const MIN_BRACKET_SIZE = 8;

/** Letra que identifica cada grupo en la hoja de Excel. */
export const GROUP_LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', '\u00d1', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
];

/** Nombre de la hoja-plantilla segun el numero de jugadores de un grupo. */
export const GROUP_TEMPLATE_NAMES: Record<number, string> = {
  3: 'Zona de 3 (01)',
  4: 'Zona de 4(01)',
  5: 'Zona de 5(01)',
};

/** Datos del torneo que necesita la exportacion. */
export interface TournamentExportInfo {
  name: string;
  dateStart?: string | Date;
  levelTournament?: string | null;
  numGroup?: number | null;
  numGroupPlayers?: number | null;
  playersKnockout?: number | null;
}

/** Jugador tal y como lo recibe la exportacion, antes de normalizar. */
export interface PlayerExportInput {
  id?: string;
  name?: string;
  clubName?: string;
  seedValue?: number;
}

/** Jugador normalizado: la exportacion siempre trabaja con estos datos. */
export interface NormalizedPlayer {
  id: string;
  name: string;
  clubName: string;
  seedValue: number;
}

/** Una fila de la lista de jugadores de la hoja 1. */
export interface PlayerRow {
  row: number;
  position: number;
  name: string;
  clubName: string;
}

/** Datos de una hoja de grupo (una pestana clonada de la plantilla maestra). */
export interface GroupSheetData {
  /** Letra del grupo: A, B, C... */
  letter: string;
  /** Nombre de la pestana creada: "Grupo A". */
  sheetName: string;
  /** Nombre de la hoja-plantilla de la que se clona. */
  templateName: string;
  /** Numero de grupo (1, 2, 3...). */
  groupNumber: number;
  /** Jugadores del grupo con su fila en la columna G. */
  playerRows: { row: number; name: string; clubName: string }[];
  /** Cruces de la parte inferior: celda -> nombre del jugador. */
  bracketRows: { row: number; name: string }[];
}

/** Datos de la hoja del cuadro de eliminatorias. */
export interface BracketSheetData {
  /** Nombre de la hoja-plantilla del cuadro. */
  templateName: string;
  /** Tamano del cuadro: 8, 16, 32 o 64. */
  bracketSize: number;
  /** Semillas ordenadas: la posicion N corresponde a la semilla N. */
  drawSlots: string[];
}

/** Todos los datos que la plantilla necesita, ya calculados. */
export interface TournamentExportData {
  tournament: {
    name: string;
    date: string;
    level: string;
    playerCount: number;
  };
  players: NormalizedPlayer[];
  /** Filas de la lista de jugadores de la hoja 1. */
  playerRows: PlayerRow[];
  groups: GroupSheetData[];
  bracket: BracketSheetData;
  /** Pestanas que se conservan de la plantilla maestra. */
  sheetsToKeep: string[];
}

/**
 * Normaliza los jugadores de entrada: ids y nombres siempre presentes, y una
 * semilla por defecto descendente.
 *
 * Modulo PURO: no toca el sistema de ficheros ni genera ningun Excel.
 */
export const normalizePlayers = (playersInput: PlayerExportInput[]): NormalizedPlayer[] =>
  playersInput.map((player, index) => ({
    id: player.id || randomUUID(),
    name: player.name || 'Sin Nombre',
    clubName: player.clubName || '',
    seedValue: player.seedValue !== undefined ? player.seedValue : 10000 - index,
  }));

/**
 * Calcula cuantos grupos hacen falta. Si el torneo no indica el numero de
 * grupos pero si los jugadores por grupo, se deduce de los jugadores.
 *
 * Modulo PURO.
 */
export const resolveGroupCount = (
  tournamentInfo: TournamentExportInfo,
  playerCount: number,
): number => {
  if (tournamentInfo.numGroup) return tournamentInfo.numGroup;
  if (tournamentInfo.numGroupPlayers) {
    return Math.ceil(playerCount / Number(tournamentInfo.numGroupPlayers));
  }

  return 2;
};

/**
 * Calcula el reparto de jugadores en grupos.
 *
 * Modulo PURO: delega en el motor puro de grupos.
 */
export const buildGroups = (players: NormalizedPlayer[], numGroups: number) => {
  const seeds: TournamentSeed[] = players.map((player) => ({
    id: player.id,
    seedValue: player.seedValue,
  }));

  return buildGroupsEngine(seeds, numGroups);
};

/**
 * Prepara los datos de las hojas de grupo: jugadores con su fila y los cruces
 * de la parte inferior.
 *
 * Modulo PURO.
 */
export const buildGroupSheets = (
  tournamentInfo: TournamentExportInfo,
  players: NormalizedPlayer[],
  groups: ReturnType<typeof buildGroups>,
): GroupSheetData[] =>
  groups.map((group, index) => {
    const numPlayers = group.players.length;
    const templateName = GROUP_TEMPLATE_NAMES[numPlayers];
    if (!templateName) {
      throw new Error(`No hay plantilla para un grupo de ${numPlayers} jugadores`);
    }

    const letter = GROUP_LETTERS[index];
    const playerRows = group.players.map((playerId, playerIndex) => {
      const player = players.find((candidate) => candidate.id === playerId);

      return {
        row: 18 + playerIndex * 2,
        name: player?.name || 'Desconocido',
        clubName: player?.clubName || '',
      };
    });

    // Los cruces de abajo van numerados del 1 al numero de jugadores.
    const bracketRows = Array.from({ length: numPlayers }, (_, seedIndex) => {
      const player = players.find((candidate) => candidate.id === group.players[seedIndex]);

      return { row: 29 + seedIndex, name: player?.name || '' };
    });

    return {
      letter,
      sheetName: `Grupo ${letter}`,
      templateName,
      groupNumber: index + 1,
      playerRows,
      bracketRows,
    };
  });

/**
 * Calcula el cuadro de eliminatorias a partir de los grupos.
 *
 * Modulo PURO: delega en el motor puro de eliminatorias.
 */
export const buildBracket = (
  tournamentInfo: TournamentExportInfo,
  groups: ReturnType<typeof buildGroups>,
): BracketSheetData => {
  const playersKnockout = tournamentInfo.playersKnockout || 2;

  const classifiedPlayers: KnockoutSeed[] = [];
  groups.forEach((group, index) => {
    for (let position = 1; position <= playersKnockout; position++) {
      classifiedPlayers.push({
        id: `${position}\u00ba Grupo ${GROUP_LETTERS[index]}`,
        position,
        groupNumber: index + 1,
      });
    }
  });

  const firstRoundMatches = createKnockoutDraw(classifiedPlayers, 'Siembra');

  const drawSlots: string[] = [];
  firstRoundMatches.forEach((match) => {
    drawSlots.push(match.playerOne ? match.playerOne.id : 'EXENTO');
    drawSlots.push(match.playerTwo ? match.playerTwo.id : 'EXENTO');
  });

  // La plantilla maestra no tiene hoja de menos de 8 plazas: se usa la de 8 y
  // cada clasificado se empareja con un EXENTO para saltar los cuartos.
  if (drawSlots.length < MIN_BRACKET_SIZE) {
    const spread = MIN_BRACKET_SIZE / drawSlots.length;
    const padded = drawSlots.flatMap((slot) => [slot, ...Array(spread - 1).fill('EXENTO')]);
    drawSlots.splice(0, drawSlots.length, ...padded);
  }

  const bracketSize = drawSlots.length;
  // Excepcion: la plantilla de 32 tiene otro nombre.
  const templateName = bracketSize === 32 ? 'LlaveSEx32 C' : `LlaveSEx${bracketSize}`;

  return { templateName, bracketSize, drawSlots };
};

/**
 * Calcula TODOS los datos que la plantilla de Excel necesita.
 *
 * Modulo PURO: no lee ficheros, no escribe celdas y no genera ningun Excel.
 * Es el seam entre el dominio del torneo y el formato de la plantilla.
 */
export const buildTournamentExportData = (
  tournamentInfo: TournamentExportInfo,
  playersInput: PlayerExportInput[],
): TournamentExportData => {
  const players = normalizePlayers(playersInput);
  const numGroups = resolveGroupCount(tournamentInfo, players.length);
  const groups = buildGroups(players, numGroups);
  const groupSheets = buildGroupSheets(tournamentInfo, players, groups);
  const bracket = buildBracket(tournamentInfo, groups);

  const playerRows: PlayerRow[] = players.map((player, index) => ({
    row: 7 + index,
    position: index + 1,
    name: player.name,
    clubName: player.clubName,
  }));

  return {
    tournament: {
      name: tournamentInfo.name,
      date: new Date(tournamentInfo.dateStart || new Date()).toLocaleDateString('es-ES'),
      level: tournamentInfo.levelTournament || 'General',
      playerCount: players.length,
    },
    players,
    playerRows,
    groups: groupSheets,
    bracket,
    sheetsToKeep: ['Hoja1', 'Llave Final', ...groupSheets.map((group) => group.sheetName)],
  };
};
