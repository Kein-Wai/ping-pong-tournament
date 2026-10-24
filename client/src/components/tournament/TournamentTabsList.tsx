import { Tabs } from '@mantine/core';
import {
  IconInfoCircle,
  IconUsers,
  IconListNumbers,
  IconMedal,
  IconTournament,
} from '@tabler/icons-react';
import type {
  Tournament,
  TournamentParticipant,
} from '../../types/tournament';

export interface TournamentTabsListProps {
  tournament: Tournament | null;
  participants: TournamentParticipant[] | null;
  isProgramado: boolean;
  isGrupos: boolean;
  isKnockoutPhase: boolean;
  isCompletado: boolean;
  hasGroupsFormat: boolean;
  hasKnockoutFormat: boolean;
}

/**
 * Navegación de pestañas del detalle de torneo.
 *
 * Extraída de TournamentTabs para reducir su tamaño y aislar la lógica de
 * visibilidad condicional de cada pestaña (info, inscritos, resultados,
 * grupos, bracketA, bracketB). El JSX se mantiene idéntico al original
 * (Regla de Oro del JSX: cero cambios en clases, iconos, márgenes o textos).
 *
 * Deletion test: borrar este componente elimina la lógica de visibilidad
 * de pestañas, por lo que no es un pass-through — gana el derecho a existir.
 */
export const TournamentTabsList = ({
  tournament,
  participants,
  isProgramado,
  isGrupos,
  isKnockoutPhase,
  isCompletado,
  hasGroupsFormat,
  hasKnockoutFormat,
}: TournamentTabsListProps) => {
  return (
    <Tabs.List>
      <Tabs.Tab value="info" leftSection={<IconInfoCircle size={16} />}>
        Información
      </Tabs.Tab>
      {(isProgramado || isGrupos || isKnockoutPhase) && (
        <Tabs.Tab value="inscritos" leftSection={<IconUsers size={16} />}>
          Inscritos ({participants?.length || 0})
        </Tabs.Tab>
      )}
      {isCompletado && (
        <Tabs.Tab value="resultados" leftSection={<IconMedal size={16} />}>
          Resultados Finales
        </Tabs.Tab>
      )}
      {hasGroupsFormat && (isGrupos || isKnockoutPhase || isCompletado) && (
        <Tabs.Tab value="grupos" leftSection={<IconListNumbers size={16} />}>
          {tournament?.rounds === 'TodosvsTodos'
            ? 'Clasificación y Partidos'
            : 'Fase de Grupos'}
        </Tabs.Tab>
      )}
      {tournament?.rounds !== 'TodosvsTodos' &&
        hasKnockoutFormat &&
        (isKnockoutPhase || isCompletado) && (
          <Tabs.Tab value="bracketA" leftSection={<IconTournament size={16} />}>
            Cuadro Llave A
          </Tabs.Tab>
        )}
      {tournament?.rounds !== 'TodosvsTodos' &&
        hasKnockoutFormat &&
        (isKnockoutPhase || isCompletado) &&
        tournament?.typeKnockout === 'LlaveAB' && (
          <Tabs.Tab value="bracketB" leftSection={<IconMedal size={16} />}>
            Cuadro Llave B
          </Tabs.Tab>
        )}
    </Tabs.List>
  );
};

export default TournamentTabsList;