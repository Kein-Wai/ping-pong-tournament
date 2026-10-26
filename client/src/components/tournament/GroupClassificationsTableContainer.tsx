import { useMemo, useState } from 'react';
import { GroupClassificationsTable } from './GroupClassificationsTable';
import type { TournamentGroupClas, GroupMatch } from '../../types/tournament';
import { computeGroupOptions } from '../../utils/tournament-flags';

/** Datos de la clasificacion de grupos. */
export interface GroupClasTableData {
  groupsClas: TournamentGroupClas[] | null;
  groupMatches: GroupMatch[] | null;
  playersKnockout: number | null;
}

export interface GroupClassificationsTableContainerProps {
  /** Datos de clasificacion. */
  data: GroupClasTableData;
  /** Si el usuario actual es admin. */
  isAdmin: boolean;
  /** Estado del torneo (controla el boton Actualizar). */
  tournamentStatus: string | null | undefined;
  /** Abre el modal de edicion de partido. */
  onEditMatch: (match: GroupMatch, isKnockout: boolean) => void;
  /**
   * Seleccion controlada de grupo. Si se omite, el contenedor gestiona el
   * estado internamente (uncontrolled): el page no necesita driblarlo.
   */
  selectedGroup?: string | null;
  onGroupChange?: (group: string | null) => void;
}

/**
 * Contenedor de la tabla de clasificacion de grupos.
 *
 * Internaliza la derivacion de groupOptions (a partir de groupsClas) y gestiona
 * internamente el estado de filtro de grupo (a menos que se pase selectedGroup
 * controlado), reduciendo el contrato de GroupClassificationsTable de 9 a 4 props
 * en el uso tipico de la página.
 *
 * Deletion test: borrar este contenedor deja la logica de filtro de grupo
 * huérfana del árbol de componentes.
 */
export const GroupClassificationsTableContainer = ({
  data,
  isAdmin,
  tournamentStatus,
  onEditMatch,
  selectedGroup: controlledGroup,
  onGroupChange,
}: GroupClassificationsTableContainerProps) => {
  const [internalGroup, setInternalGroup] = useState<string | null>(null);
  const selectedGroup = controlledGroup ?? internalGroup;

  const handleGroupChange = (group: string | null) => {
    onGroupChange?.(group);
    setInternalGroup(group);
  };

  const groupOptions = useMemo(() => computeGroupOptions(data.groupsClas), [data.groupsClas]);

  return (
    <GroupClassificationsTable
      groupsClas={data.groupsClas}
      groupMatches={data.groupMatches}
      selectedGroup={selectedGroup}
      groupOptions={groupOptions}
      onGroupChange={handleGroupChange}
      playersKnockout={data.playersKnockout}
      isAdmin={isAdmin}
      tournamentStatus={tournamentStatus}
      onEditMatch={onEditMatch}
    />
  );
};

export default GroupClassificationsTableContainer;
