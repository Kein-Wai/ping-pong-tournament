import { KNOCKOUT_STAGES } from '../types/tournament';
import type {
  Tournament,
  TournamentClas,
  TournamentGroupClas,
  TournamentPodium,
  GroupOption,
} from '../types/tournament';

/** Flags de fase derivados del estado del torneo. */
export interface TournamentFlags {
  isProgramado: boolean;
  isGrupos: boolean;
  isKnockoutPhase: boolean;
  isCompletado: boolean;
  hasGroupsFormat: boolean;
  hasKnockoutFormat: boolean;
}

/**
 * Deriva los flags de fase a partir del estado del torneo.
 *
 * Es el unico lugar que conoce el mapping status/rounds → flag, de modo
 * que los componentes presentacionales solo reciben valores booleanos.
 */
export function computeTournamentFlags(tournament: Tournament | null): TournamentFlags {
  const currentStatus = tournament?.status || '';
  return {
    isProgramado: currentStatus === 'Programado',
    isGrupos: currentStatus === 'Grupos',
    isKnockoutPhase: KNOCKOUT_STAGES.includes(currentStatus),
    isCompletado: currentStatus === 'Completado',
    hasGroupsFormat:
      tournament?.rounds === 'GruposKnockout' || tournament?.rounds === 'TodosvsTodos',
    hasKnockoutFormat:
      tournament?.rounds === 'GruposKnockout' || tournament?.rounds === 'Knockout',
  };
}

/**
 * Calcula el podium (1º, 2º, 3º y resto) a partir de los resultados.
 */
export function computePodium(results: TournamentClas[] | null): TournamentPodium {
  const empty: TournamentPodium = {
    firstPlace: null,
    secondPlace: null,
    thirdPlace: null,
    otherResults: [],
  };
  if (!results) return empty;

  let firstPlace: TournamentClas | null = null;
  let secondPlace: TournamentClas | null = null;
  let thirdPlace: TournamentClas | null = null;
  const otherResults: TournamentClas[] = [];

  results.forEach((p) => {
    if (p.position === 1) {
      firstPlace = p;
    } else if (p.position === 2) {
      secondPlace = p;
    } else if (p.position === 3 && !thirdPlace) {
      thirdPlace = p;
    } else {
      otherResults.push(p);
    }
  });

  otherResults.sort((a, b) => (a.position || 0) - (b.position || 0));
  return { firstPlace, secondPlace, thirdPlace, otherResults };
}

/**
 * Deriva las opciones de grupo a partir de una lista de numeros de grupo.
 *
 * Logica compartida por computeGroupOptions (clasificaciones) y el contenedor
 * de GroupMatchesTable (partidos): evita duplicar el sort + mapeo a {value,label}.
 */
export function groupNumbersToOptions(groups: number[]): GroupOption[] {
  return Array.from(new Set(groups))
    .sort((a, b) => a - b)
    .map((g) => ({ value: String(g), label: `Grupo ${g}` }));
}

/**
 * Genera las opciones de grupo para el select a partir de las clasificaciones.
 */
export function computeGroupOptions(groupsClas: TournamentGroupClas[] | null): GroupOption[] {
  if (!groupsClas) return [];
  return groupNumbersToOptions(groupsClas.map((c) => c.tournamentGroup.group));
}
