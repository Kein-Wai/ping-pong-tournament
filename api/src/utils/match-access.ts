/**
 * Datos mínimos de un partido para saber a qué club pertenece.
 */
export interface MatchOwnership {
  tournament?: { clubId: string | null } | null;
  playerOne?: { clubId: string | null } | null;
}

/**
 * Club propietario de un partido: el del torneo en el que se juega; si no
 * pertenece a ningún torneo, el del primer jugador. Devuelve null cuando no
 * hay club (partido entre jugadores libres): solo el SuperAdmin puede tocarlo.
 *
 * La decisión de quién puede escribir la toma hasClubPermission (utils/auth)
 * con este club; aquí solo se resuelve de quién es el recurso.
 */
export const getMatchOwnerClubId = (match: MatchOwnership): string | null =>
  match.tournament?.clubId ?? match.playerOne?.clubId ?? null;
