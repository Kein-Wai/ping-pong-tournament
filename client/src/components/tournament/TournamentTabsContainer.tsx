import { useState, useMemo } from 'react';
import { TournamentTabs } from './TournamentTabs';
import type { Tournament } from '../../types/tournament';
import type {
  TournamentTabsData,
  TournamentTabsActions,
} from '../../types/tournament';
import {
  computeTournamentFlags,
  computePodium,
  computeGroupOptions,
} from '../../utils/tournament-flags';

export interface TournamentTabsContainerProps {
  /** Torneo principal: source of truth para los flags derivados. */
  tournament: Tournament | null;
  /** Datos agrupados (participantes, grupos, brackets, resultados). */
  tournamentData: TournamentTabsData;
  /** Callbacks de negocio (abrir modal de partido, cambiar estado jugador). */
  actions: TournamentTabsActions;
  /** Si el usuario actual es admin. */
  isAdmin: boolean;
  /** Notificacion de cambio de pestaña activa al padre (carga perezosa). */
  onTabChange?: (tab: string | null) => void;
}

/**
 * Contenedor de las pestañas del detalle de torneo.
 *
 * Encapsula el estado derivado (flags de fase, podium, opciones de grupo)
 * y el state de UI (pestana activa, grupo seleccionado, brackets) que antes
 * se hacian 28 props. El contrato se reduce a 5 props estructuradas; el JSX
 * de TournamentTabs se mantiene intacto (Regla de Oro del JSX).
 *
 * Deletion test: borrar este contenedor elimina por completo la logica de
 * flags/podium/setters del arbol de componentes.
 */
export const TournamentTabsContainer = ({
  tournament,
  tournamentData,
  actions,
  isAdmin,
  onTabChange,
}: TournamentTabsContainerProps) => {
  const [activeTab, setActiveTab] = useState<string | null>('info');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [subBracketA, setSubBracketA] = useState<string | null>(null);
  const [subBracketB, setSubBracketB] = useState<string | null>(null);

  const flags = useMemo(() => computeTournamentFlags(tournament), [tournament]);
  const podium = useMemo(
    () => computePodium(tournamentData.results),
    [tournamentData.results],
  );
  const groupOptions = useMemo(
    () => computeGroupOptions(tournamentData.groupClas),
    [tournamentData.groupClas],
  );

  const handleTabChange = (tab: string | null) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <TournamentTabs
      tournament={tournament}
      participants={tournamentData.participants}
      groupsClas={tournamentData.groupClas}
      groupMatches={tournamentData.groupMatches}
      bracketA={tournamentData.bracketA}
      bracketB={tournamentData.bracketB}
      isAdmin={isAdmin}
      isProgramado={flags.isProgramado}
      isGrupos={flags.isGrupos}
      isKnockoutPhase={flags.isKnockoutPhase}
      isCompletado={flags.isCompletado}
      hasGroupsFormat={flags.hasGroupsFormat}
      hasKnockoutFormat={flags.hasKnockoutFormat}
      activeTab={activeTab}
      setActiveTab={handleTabChange}
      selectedGroup={selectedGroup}
      setSelectedGroup={setSelectedGroup}
      groupOptions={groupOptions}
      podium={podium}
      subBracketA={subBracketA}
      setSubBracketA={setSubBracketA}
      subBracketB={subBracketB}
      setSubBracketB={setSubBracketB}
      onMatchClick={actions.onMatchClick}
      onBracketMatchClick={actions.onBracketMatchClick}
      onParticipantStatusChange={actions.onParticipantStatusChange}
    />
  );
};

export default TournamentTabsContainer;
