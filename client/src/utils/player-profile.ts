import type { User } from '../types/api';
import type {
  PlayerPendingSkills,
  PlayerProfile,
  PlayerProfileMatch,
  PlayerSkillValues,
  ProfileMatch,
} from '../types/playerProfile';

/**
 * Cálculos puros del perfil de un jugador (JugadorPerfil): resultado de un
 * partido, estadísticas contra rivales, balance, habilidades y calendario de
 * equipos. Sin acceso a datos ni al reloj: la fecha actual se inyecta.
 *
 * Migration: extraídos del cuerpo de JugadorPerfil, donde estaban mezclados con
 * el JSX (y el recuento de sets, duplicado).
 */

export interface MatchResult {
  /** Rival del jugador en este partido. */
  opponent: User;
  didWin: boolean;
  /** Sets ganados por el jugador y por el rival, en ese orden: `"3 - 1"`. */
  setScore: string;
}

/**
 * Resultado de un partido desde el punto de vista del jugador `playerId`.
 * Cuenta los sets jugados (sin `null` ni 0-0); un empate a sets cuenta como derrota.
 */
export const getMatchResult = (match: ProfileMatch, playerId: string): MatchResult => {
  const isPlayerOne = match.playerOneId === playerId;
  const opponent = isPlayerOne ? match.playerTwo : match.playerOne;

  let p1Sets = 0;
  let p2Sets = 0;
  const sets = [
    [match.setOnePlayerOne, match.setOnePlayerTwo],
    [match.setTwoPlayerOne, match.setTwoPlayerTwo],
    [match.setThreePlayerOne, match.setThreePlayerTwo],
    [match.setFourPlayerOne, match.setFourPlayerTwo],
    [match.setFivePlayerOne, match.setFivePlayerTwo],
  ];

  sets.forEach(([s1, s2]) => {
    if (s1 !== null && s2 !== null && !(s1 === 0 && s2 === 0)) {
      if (s1 > s2) p1Sets++;
      else if (s2 > s1) p2Sets++;
    }
  });

  const didWin = isPlayerOne ? p1Sets > p2Sets : p2Sets > p1Sets;
  const setScore = isPlayerOne ? `${p1Sets} - ${p2Sets}` : `${p2Sets} - ${p1Sets}`;

  return { opponent, didWin, setScore };
};

export interface RivalChartRow {
  Rasgo: string;
  Victorias: number;
  Derrotas: number;
}

/**
 * Victorias y derrotas del jugador según la mano dominante y el estilo de juego de
 * sus rivales. Los rivales sin ese dato registrado no cuentan.
 */
export const getRivalChartData = (
  matches: ProfileMatch[],
  playerId: string,
): { mano: RivalChartRow[]; estilo: RivalChartRow[] } => {
  const rivalStats = {
    Diestro: { win: 0, loss: 0 },
    Zurdo: { win: 0, loss: 0 },
    Ofensivo: { win: 0, loss: 0 },
    Defensivo: { win: 0, loss: 0 },
  };

  matches.forEach((m) => {
    const { opponent, didWin } = getMatchResult(m, playerId);

    if (opponent.dominantHand === 'Diestro') {
      if (didWin) rivalStats.Diestro.win++;
      else rivalStats.Diestro.loss++;
    } else if (opponent.dominantHand === 'Zurdo') {
      if (didWin) rivalStats.Zurdo.win++;
      else rivalStats.Zurdo.loss++;
    }

    if (opponent.playstyle === 'Ofensivo') {
      if (didWin) rivalStats.Ofensivo.win++;
      else rivalStats.Ofensivo.loss++;
    } else if (opponent.playstyle === 'Defensivo') {
      if (didWin) rivalStats.Defensivo.win++;
      else rivalStats.Defensivo.loss++;
    }
  });

  return {
    mano: [
      { Rasgo: 'vs Diestros', Victorias: rivalStats.Diestro.win, Derrotas: rivalStats.Diestro.loss },
      { Rasgo: 'vs Zurdos', Victorias: rivalStats.Zurdo.win, Derrotas: rivalStats.Zurdo.loss },
    ],
    estilo: [
      {
        Rasgo: 'vs Ofensivos',
        Victorias: rivalStats.Ofensivo.win,
        Derrotas: rivalStats.Ofensivo.loss,
      },
      {
        Rasgo: 'vs Defensivos',
        Victorias: rivalStats.Defensivo.win,
        Derrotas: rivalStats.Defensivo.loss,
      },
    ],
  };
};

export type PlayerStatsSummary = NonNullable<PlayerProfile['stats']>;

const percent = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

export interface EfficiencyRow {
  metric: string;
  Victorias: number;
  Derrotas?: number;
  Participaciones?: number;
}

/**
 * Porcentajes de victorias y derrotas en partidos, sets y puntos, y de campeonatos
 * sobre torneos jugados, para el gráfico de balance. Vacío si no ha jugado partidos.
 */
export const getEfficiencyData = (s: PlayerStatsSummary | undefined): EfficiencyRow[] => {
  const totalMatches = (s?.matchWon || 0) + (s?.matchLost || 0);
  const totalSets = (s?.setWon || 0) + (s?.setLost || 0);
  const totalPoints = (s?.pointWon || 0) + (s?.pointLost || 0);
  const totalTournaments = s?.tournamentPart || 0;

  if (totalMatches === 0) return [];

  return [
    {
      metric: 'Partidos',
      Victorias: percent(s?.matchWon || 0, totalMatches),
      Derrotas: percent(s?.matchLost || 0, totalMatches),
    },
    {
      metric: 'Sets',
      Victorias: percent(s?.setWon || 0, totalSets),
      Derrotas: percent(s?.setLost || 0, totalSets),
    },
    {
      metric: 'Puntos',
      Victorias: percent(s?.pointWon || 0, totalPoints),
      Derrotas: percent(s?.pointLost || 0, totalPoints),
    },
    {
      metric: 'Campeon Torneos',
      Victorias: percent(s?.tournamentWon || 0, totalTournaments),
      Participaciones: percent(s?.tournamentPart || 0, totalTournaments),
    },
  ];
};

/** Etiqueta corta de cada habilidad en el desglose y el radar, en el orden en que se muestran. */
const SKILL_CHART_LABELS: Array<{ key: keyof PlayerSkillValues; attribute: string }> = [
  { key: 'derechaPlano', attribute: 'Plano Der.' },
  { key: 'revesPlano', attribute: 'Plano Rev.' },
  { key: 'topspinDerecha', attribute: 'Top Der.' },
  { key: 'topspinReves', attribute: 'Top Rev.' },
  { key: 'corte', attribute: 'Corte' },
  { key: 'bloqueoDerecha', attribute: 'Bloqueo Der.' },
  { key: 'bloqueoReves', attribute: 'Bloqueo Rev.' },
  { key: 'servicio', attribute: 'Servicio' },
  { key: 'recepcion', attribute: 'Recepción' },
  { key: 'movilidad', attribute: 'Movilidad' },
  { key: 'fortalezaMental', attribute: 'Mentalidad' },
  { key: 'experiencia', attribute: 'Experiencia' },
];

export interface SkillChartRow {
  attribute: string;
  value: number;
  pending: number;
  potential: number;
}

/**
 * Habilidades del jugador con su mejora pendiente y su potencial (valor + mejora),
 * para el desglose y el radar. Vacío si el jugador no tiene habilidades.
 */
export const getSkillsData = (
  skills: PlayerSkillValues | undefined,
  pendingSkills: PlayerPendingSkills | undefined,
): SkillChartRow[] =>
  skills
    ? SKILL_CHART_LABELS.map(({ key, attribute }) => ({
        attribute,
        value: skills[key],
        pending: pendingSkills?.[key] || 0,
        potential: skills[key] + (pendingSkills?.[key] || 0),
      }))
    : [];

export type TeamCalendarMatch = PlayerProfileMatch & { teamName: string };

/**
 * Partidos de todos los equipos del jugador: el siguiente compromiso (el programado
 * más próximo que no ha pasado) y el resto, del más reciente al más antiguo.
 */
export const getTeamCalendar = (teams: PlayerProfile['teams'], now: Date) => {
  const all: TeamCalendarMatch[] =
    teams?.flatMap((t) => t.matches.map((m) => ({ ...m, teamName: t.name }))) || [];

  const upcoming = all
    .filter((m) => m.status === 'Programado' && new Date(m.date).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const nextMatch = upcoming.length > 0 ? upcoming[0] : null;

  const others = all
    .filter((m) => m.id !== nextMatch?.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { all, nextMatch, others };
};

/** Asistencias a entrenamientos generales: total y las del mes y año de `now`. */
export const countAttendances = (
  attendances: PlayerProfile['generalAttendances'],
  now: Date,
) => {
  const month = now.getMonth();
  const year = now.getFullYear();

  return {
    total: attendances?.length || 0,
    thisMonth:
      attendances?.filter((a) => {
        const d = new Date(a.generalTraining.date);
        return d.getMonth() === month && d.getFullYear() === year;
      }).length || 0,
  };
};
