import type { TeamMatch } from '../types/api';

/**
 * Siguiente compromiso de un equipo: el partido «Programado» más próximo cuya
 * fecha no ha pasado. Devuelve `null` si no hay ninguno.
 *
 * Migration: extraído del cálculo inline de EquipoDetalles; `now` se inyecta
 * para poder probarlo sin depender del reloj.
 */
export const getNextMatch = (matches: TeamMatch[], now: Date = new Date()): TeamMatch | null => {
  const upcomingMatches = matches
    .filter((m) => m.status === 'Programado' && new Date(m.date).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return upcomingMatches[0] || null;
};

/**
 * Resultado de un partido de equipo desde nuestro punto de vista y color de su
 * estado: programado azul, cancelado rojo y, si está completado, verde/rojo/amarillo
 * según gane, pierda o empate (amarillo también si no consta el marcador).
 */
export const getTeamMatchOutcome = (
  match: Pick<TeamMatch, 'ourScore' | 'rivalScore'> & { status: string },
) => {
  const hasScore = match.ourScore != null && match.rivalScore != null;
  const isWin = hasScore && match.ourScore! > match.rivalScore!;
  const isLoss = hasScore && match.ourScore! < match.rivalScore!;

  let statusColor = 'gray';
  if (match.status === 'Programado') statusColor = 'blue';
  if (match.status === 'Cancelado') statusColor = 'red';
  if (match.status === 'Completado') {
    if (isWin) statusColor = 'green';
    else if (isLoss) statusColor = 'red';
    else statusColor = 'yellow';
  }

  return { hasScore, isWin, isLoss, statusColor };
};
