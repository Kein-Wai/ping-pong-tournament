import { Text, Badge } from '@mantine/core';
import type { GroupMatch, BracketMatch } from '../types/tournament';

/**
 * Renderiza los sets de un partido o un badge de estado.
 *
 * Funcion pura compartida por GroupClassificationsTable y GroupMatchesTable
 * (extraida para evitar copy-paste entre ambos componentes).
 */
export const formatSets = (match: GroupMatch | BracketMatch) => {
  if (match.status !== 'Completado')
    return (
      <Badge color="gray" variant="light">
        {match.status}
      </Badge>
    );

  const sets: string[] = [];
  if (match.setOnePlayerOne !== null || match.setOnePlayerTwo !== null)
    sets.push(`${match.setOnePlayerOne}-${match.setOnePlayerTwo}`);
  if (match.setTwoPlayerOne !== null || match.setTwoPlayerTwo !== null)
    sets.push(`${match.setTwoPlayerOne}-${match.setTwoPlayerTwo}`);
  if (match.setThreePlayerOne !== null || match.setThreePlayerTwo !== null)
    sets.push(`${match.setThreePlayerOne}-${match.setThreePlayerTwo}`);
  if (match.setFourPlayerOne !== null || match.setFourPlayerTwo !== null)
    sets.push(`${match.setFourPlayerOne}-${match.setFourPlayerTwo}`);
  if (match.setFivePlayerOne !== null || match.setFivePlayerTwo !== null)
    sets.push(`${match.setFivePlayerOne}-${match.setFivePlayerTwo}`);

  return (
    <Text fw={600} size="sm" c="blue.7">
      {sets.filter((s) => s !== '0-0').join(' | ')}
    </Text>
  );
};
