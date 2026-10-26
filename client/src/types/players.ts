import type { DominantHand, PlayerLevel, Playstyle, RubberType, UserClubStatus } from './enums';

/** Habilidades del formulario: vacías hasta que el administrador rellena una a mano. */
export type SkillInputs = Record<string, number | ''>;

/** Estadísticas que consume el listado de la plantilla. */
export interface PlayerListStats {
  elo: number;
  matchWon: number;
  matchLost: number;
  setWon: number;
  setLost: number;
}

/** Jugador tal como lo muestra la pantalla de la plantilla (proyección de GET /users). */
export interface PlayerListItem {
  id: string;
  email: string;
  name: string;
  surname?: string;
  nickname?: string;
  avatarUrl?: string;
  clubId?: string;
  clubStatus: UserClubStatus | null;
  stats?: PlayerListStats;
  club?: { name: string } | null;
}

/** Formulario del modal «Añadir Jugador al Club». */
export interface GuestFormData {
  email: string;
  name: string;
  surname: string;
  level: PlayerLevel;
  dominantHand: DominantHand;
  playstyle: Playstyle;
  rubberForehand: RubberType;
  rubberBackhand: RubberType;
  elo: number;
}
