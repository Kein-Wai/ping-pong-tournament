import { Badge } from '@mantine/core';
import type { MatchStatus } from '../../types/enums';

const STATUS_COLOR: Record<string, string> = {
  Programado: 'blue',
  Iniciado: 'orange',
  Completado: 'green',
  Cancelado: 'red',
};

interface LeagueStatusBadgeProps {
  status?: MatchStatus | null;
}

/** Estado de una liga con el color que corresponde a cada fase. */
export const LeagueStatusBadge = ({ status }: LeagueStatusBadgeProps) => (
  <Badge color={(status && STATUS_COLOR[status]) || 'gray'} variant="light">
    {status || 'Desconocido'}
  </Badge>
);
