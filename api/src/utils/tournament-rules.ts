import { Rounds } from '@prisma/client';

/** Incumplimiento de una regla de formato de torneo. */
export interface TournamentRuleIssue {
  path: string[];
  message: string;
}

/** Datos del torneo que condicionan sus reglas de formato. */
export interface TournamentRulesInput {
  rounds?: Rounds | null;
  numPlayers: number;
  numGroup?: number | null;
  numGroupPlayers?: number | null;
  playersKnockout?: number | null;
}

/**
 * Comprueba las reglas de formato de un torneo segun el tipo de ronda.
 *
 * Modulo PURO: devuelve la lista de incumplimientos y no produce ningun
 * efecto, de modo que se puede testear sin Zod ni base de datos. El adaptador
 * de Zod solo se encarga de volcar esos incumplimientos en el contexto.
 */
export const validateTournamentRules = (
  input: TournamentRulesInput,
): TournamentRuleIssue[] => {
  const issues: TournamentRuleIssue[] = [];
  const { rounds, numPlayers, numGroup, numGroupPlayers, playersKnockout } = input;

  if (!rounds) return issues;

  if (rounds === Rounds.TodosvsTodos) {
    if (numPlayers < 3 || numPlayers > 10) {
      issues.push({
        path: ['numPlayers'],
        message: 'Un torneo de Todos vs Todos debe tener entre 3 y 10 jugadores.',
      });
    }
    if (numGroup === undefined || numGroup !== 1) {
      issues.push({
        path: ['numGroup'],
        message: 'Un torneo de Todos vs Todos es una liga única, debe tener 1 solo grupo.',
      });
    }
  }

  if (rounds === Rounds.GruposKnockout) {
    if (numPlayers < 6 || numPlayers > 128) {
      issues.push({
        path: ['numPlayers'],
        message: 'Un torneo de Grupos y Eliminatorias debe tener entre 6 y 128 jugadores.',
      });
    }
    if (!numGroup || numGroup < 2 || numGroup > 16) {
      issues.push({
        path: ['numGroup'],
        message: 'Para este formato, debes crear entre 2 y 16 grupos.',
      });
    }
    if (!numGroupPlayers || numGroupPlayers < 3) {
      issues.push({
        path: ['numGroupPlayers'],
        message: 'Debe haber al menos 3 jugadores por grupo en este formato.',
      });
    }
    if (!playersKnockout) {
      issues.push({
        path: ['numKnockouts'],
        message: 'Debe especificarse un número para que se clasifiquen a llave en este formato.',
      });
    }
    if (playersKnockout && numGroup && playersKnockout > numPlayers / numGroup) {
      issues.push({
        path: ['numKnockouts'],
        message: 'No pueden haber más clasificados que jugadores en grupos.',
      });
    }
  }

  if (rounds === Rounds.Knockout) {
    if (numPlayers < 4 || numPlayers > 128) {
      issues.push({
        path: ['numPlayers'],
        message: 'Un torneo de solo Eliminatorias debe tener entre 4 y 128 jugadores.',
      });
    }
    if (numGroup && numGroup > 0) {
      issues.push({
        path: ['numGroup'],
        message: 'Un torneo de eliminación directa no puede tener configuración de grupos.',
      });
    }
  }

  return issues;
};
