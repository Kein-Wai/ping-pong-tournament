import { useState, useMemo, useEffect } from 'react';
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
  /** Pestaña activa controlada (opcional). Cuando se omite el contenedor
   *  gestiona su propio state; cuando se pasa, el padre es el source of
   *  verdad —necesario porque TorneoDetalles usa activeTab en sus handlers. */
  activeTab?: string | null;
  /** Notificación de cambio de pestaña al padre (siempre se dispara,
   *  tanto en modo controlado como interno). */
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
  activeTab: controlledActiveTab,
  onTabChange,
}: TournamentTabsContainerProps) => {
  const [internalActiveTab, setInternalActiveTab] = useState<string | null>('info');
  const activeTab = controlledActiveTab ?? internalActiveTab;

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [subBracketA, setSubBracketA] = useState<string | null>(null);
  const [subBracketB, setSubBracketB] = useState<string | null>(null);

  // Auto-selecciona el primer grupo cuando los datos de clasificación llegan.
  // Reemplaza al setSelectedGroup que antes vivía en fetchLazyData de
  // TorneoDetalles, manteniendo el seam de filtro de grupo internalizado.
  useEffect(() => {
    if (tournamentData.groupClas && tournamentData.groupClas.length > 0 && !selectedGroup) {
      setSelectedGroup(String(tournamentData.groupClas[0].tournamentGroup.group));
    }
  }, [tournamentData.groupClas, selectedGroup]);

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
    if (controlledActiveTab === undefined) {
      setInternalActiveTab(tab);
    }
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
