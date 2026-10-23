import { useMemo, useState } from 'react';
import GroupMatchesTable from './GroupMatchesTable';
import type { GroupMatch } from '../../types/tournament';
import { groupNumbersToOptions } from '../../utils/tournament-flags';

export interface GroupMatchesTableContainerProps {
  /** Partidos a renderizar. */
  matches: GroupMatch[] | null;
  /** Si el usuario actual es admin. */
  isAdmin: boolean;
  /** Estado del torneo (controla el boton Actualizar). */
  tournamentStatus: string | null | undefined;
  /** Abre el modal de edicion de partido. */
  onEditMatch: (match: GroupMatch, isKnockout: boolean) => void;
}

/**
 * Contenedor de la tabla de partidos de grupos.
 *
 * Internaliza el state de filtro (grupo seleccionado) y la derivacion de las
 * opciones de grupo (a partir de los propios partidos), reduciendo el contrato
 * de GroupMatchesTable de 7 a 4 props.
 *
 * Deletion test: borrar este contenedor deja la logica de filtro de grupo
 * huérfana del árbol de componentes.
 */
export const GroupMatchesTableContainer = ({
  matches,
  isAdmin,
  tournamentStatus,
  onEditMatch,
}: GroupMatchesTableContainerProps) => {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const groupOptions = useMemo(() => {
    if (!matches) return [];
    return groupNumbersToOptions(
      matches.map((m) => m.group?.group).filter((g): g is number => g != null),
    );
  }, [matches]);

  return (
    <GroupMatchesTable
      matches={matches}
      selectedGroup={selectedGroup}
      groupOptions={groupOptions}
      onGroupChange={setSelectedGroup}
      isAdmin={isAdmin}
      tournamentStatus={tournamentStatus}
      onEditMatch={onEditMatch}
    />
  );
};

export default GroupMatchesTableContainer;
