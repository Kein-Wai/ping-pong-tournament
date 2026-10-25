import { LEVEL_BASE_STATS } from '../constants/players';
import { SKILL_FIELDS } from '../constants/skills';
import type { PlayerLevel } from '../types/enums';
import type { PlayerListItem, PlayerListStats, SkillInputs } from '../types/players';

/** Formulario de habilidades sin rellenar: cada clave de SKILL_FIELDS vacía. */
export const EMPTY_SKILL_INPUTS: SkillInputs = Object.fromEntries(
  SKILL_FIELDS.map((field) => [field.key, '' as const]),
);

/** La API entrega las estadísticas como objeto o como array de uno; se queda con el objeto. */
export const getPlayerStats = (player: PlayerListItem): PlayerListStats | undefined =>
  Array.isArray(player.stats) ? player.stats[0] : player.stats;

/** Porcentaje de partidos ganados, redondeado; cero si no hay partidos. */
export const getWinRate = (stats: PlayerListStats | undefined): number => {
  const totalMatches = (stats?.matchWon || 0) + (stats?.matchLost || 0);
  return totalMatches > 0 ? Math.round(((stats?.matchWon || 0) / totalMatches) * 100) : 0;
};

/** Jugadores del estado pedido cuyo nombre completo contiene la búsqueda. */
export const filterPlayers = (
  players: PlayerListItem[],
  search: string,
  statusFilter: string,
): PlayerListItem[] =>
  players.filter((player) => {
    const fullName = `${player.name} ${player.surname || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(search.toLowerCase());
    const matchesStatus = player.clubStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

/** Habilidades que se envían: lo rellenado a mano, y el valor base del nivel en el resto. */
export const buildFinalSkills = (
  level: PlayerLevel,
  inputs: SkillInputs,
): Record<string, number> => {
  const baseStat = LEVEL_BASE_STATS[level] || 0;
  const finalSkills: Record<string, number> = {};
  SKILL_FIELDS.forEach((field) => {
    const val = inputs[field.key];
    finalSkills[field.key] = val !== '' ? Number(val) : baseStat;
  });
  return finalSkills;
};

/** Un invitado sin correo real tiene un correo ficticio del dominio `guest.pingpong`. */
export const isGuestEmail = (email: string): boolean => email.endsWith('@guest.pingpong');
