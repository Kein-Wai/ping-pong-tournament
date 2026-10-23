import { useState, useCallback } from 'react';
import type { Tournament } from '../types/tournament';

/**
 * useTournamentTabs - Hook para el estado de UI de las tabs del torneo.
 *
 * Responsabilidad unica: gestionar el estado de las tabs (tab activa,
 * grupo seleccionado, sub-brackets). No contiene logica de datos ni mutaciones.
 */
export interface UseTournamentTabsResult {
  activeTab: string | null;
  setActiveTab: (tab: string | null) => void;
  selectedGroup: string | null;
  setSelectedGroup: (group: string | null) => void;
  subBracketA: string | null;
  setSubBracketA: (key: string | null) => void;
  subBracketB: string | null;
  setSubBracketB: (key: string | null) => void;
  groupOptions: Array<{ value: string; label: string }>;
  setGroupOptions: (options: Array<{ value: string; label: string }>) => void;
  /** Derivado: tabs visibles segun estado del torneo. */
  visibleTabs: Array<{ value: string; label: string; icon: string }>;
}

/** Mapa de iconos para cada tab (se importa en el componente). */
export interface TabConfig {
  value: string;
  label: string;
  icon: string; // nombre del icono de @tabler/icons-react
  condition?: (tournament: Tournament | null, state: TabState) => boolean;
}

export interface TabState {
  isAdmin: boolean;
  isProgramado: boolean;
  isGrupos: boolean;
  isKnockoutPhase: boolean;
  isCompletado: boolean;
  hasGroupsFormat: boolean;
  hasKnockoutFormat: boolean;
  tournament: Tournament | null;
}

const DEFAULT_TABS: TabConfig[] = [
  { value: 'info', label: 'Información', icon: 'IconInfoCircle', condition: () => true },
  {
    value: 'inscritos',
    label: 'Inscritos',
    icon: 'IconUsers',
    condition: (_t, s) => s.isProgramado || s.isGrupos || s.isKnockoutPhase,
  },
  {
    value: 'resultados',
    label: 'Resultados Finales',
    icon: 'IconMedal',
    condition: (_, s) => s.isCompletado,
  },
  {
    value: 'grupos',
    label: 'Fase de Grupos',
    icon: 'IconListNumbers',
    condition: (_t, s) => s.hasGroupsFormat && (s.isGrupos || s.isKnockoutPhase || s.isCompletado),
  },
  {
    value: 'bracketA',
    label: 'Cuadro Llave A',
    icon: 'IconTournament',
    condition: (t, s) => t?.rounds !== 'TodosvsTodos' && s.hasKnockoutFormat && (s.isKnockoutPhase || s.isCompletado),
  },
  {
    value: 'bracketB',
    label: 'Cuadro Llave B',
    icon: 'IconMedal',
    condition: (t, s) => t?.rounds !== 'TodosvsTodos' && s.hasKnockoutFormat && (s.isKnockoutPhase || s.isCompletado) && t?.typeKnockout === 'LlaveAB',
  },
];

export function useTournamentTabs(
  tournament: Tournament | null,
  isAdmin: boolean,
  isProgramado: boolean,
  isGrupos: boolean,
  isKnockoutPhase: boolean,
  isCompletado: boolean,
  hasGroupsFormat: boolean,
  hasKnockoutFormat: boolean
): UseTournamentTabsResult {
  const [activeTab, setActiveTab] = useState<string | null>('info');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [subBracketA, setSubBracketA] = useState<string | null>(null);
  const [subBracketB, setSubBracketB] = useState<string | null>(null);
  const [groupOptions, setGroupOptions] = useState<Array<{ value: string; label: string }>>([]);

  const tabState: TabState = {
    isAdmin,
    isProgramado,
    isGrupos,
    isKnockoutPhase,
    isCompletado,
    hasGroupsFormat,
    hasKnockoutFormat,
    tournament,
  };

  const visibleTabs = useCallback(() => {
    return DEFAULT_TABS.filter((tab) => tab.condition?.(tournament, tabState) ?? true);
  }, [tournament, tabState]);

  return {
    activeTab,
    setActiveTab,
    selectedGroup,
    setSelectedGroup,
    subBracketA,
    setSubBracketA,
    subBracketB,
    setSubBracketB,
    groupOptions,
    setGroupOptions,
    visibleTabs: visibleTabs(),
  };
}

export default useTournamentTabs;
