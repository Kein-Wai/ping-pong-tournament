import { Tabs } from '@mantine/core';
import { KnockoutBracket } from './KnockoutBracket';
import { ParticipantsTable } from './ParticipantsTable';
import { Podium } from './Podium';
import { GroupClassificationsTable } from './GroupClassificationsTable';
import { TournamentInfoCards } from './TournamentInfoCards';
import { TournamentTabsList } from './TournamentTabsList';
import type {
  Tournament,
  TournamentClas,
  TournamentGroupClas,
  KnockoutRound,
  GroupMatch,
  TournamentParticipant,
  BracketMatch,
} from '../../types/tournament';

export interface TournamentTabsProps {
  tournament: Tournament | null;
  participants: TournamentParticipant[] | null;
  groupsClas: TournamentGroupClas[] | null;
  groupMatches: GroupMatch[] | null;
  bracketA: KnockoutRound[] | null;
  bracketB: KnockoutRound[] | null;
  isAdmin: boolean;
  isProgramado: boolean;
  isGrupos: boolean;
  isKnockoutPhase: boolean;
  isCompletado: boolean;
  hasGroupsFormat: boolean;
  hasKnockoutFormat: boolean;
  activeTab: string | null;
  setActiveTab: (tab: string | null) => void;
  selectedGroup: string | null;
  setSelectedGroup: (group: string | null) => void;
  groupOptions: Array<{ value: string; label: string }>;
  podium: {
    firstPlace: TournamentClas | null;
    secondPlace: TournamentClas | null;
    thirdPlace: TournamentClas | null;
    otherResults: TournamentClas[];
  };
  subBracketA: string | null;
  setSubBracketA: (val: string | null) => void;
  subBracketB: string | null;
  setSubBracketB: (val: string | null) => void;
  onMatchClick: (match: BracketMatch, isKnockout: boolean) => void;
  onBracketMatchClick: (match: BracketMatch) => void;
  onParticipantStatusChange: (
    playerId: string,
    playerName: string,
    playerSurname: string | null,
    status: 'Confirmado' | 'NoPresentado',
  ) => void;
}

export const TournamentTabs = ({
  tournament,
  participants,
  groupsClas,
  groupMatches,
  bracketA,
  bracketB,
  isAdmin,
  isProgramado,
  isGrupos,
  isKnockoutPhase,
  isCompletado,
  hasGroupsFormat,
  hasKnockoutFormat,
  activeTab,
  setActiveTab,
  selectedGroup,
  setSelectedGroup,
  groupOptions,
  podium,
  subBracketA,
  setSubBracketA,
  subBracketB,
  setSubBracketB,
  onMatchClick,
  onBracketMatchClick,
  onParticipantStatusChange,
}: TournamentTabsProps) => {
  return (
    <>
      <Tabs value={activeTab} onChange={setActiveTab} variant="outline" radius="md">
        <TournamentTabsList
          tournament={tournament}
          participants={participants}
          isProgramado={isProgramado}
          isGrupos={isGrupos}
          isKnockoutPhase={isKnockoutPhase}
          isCompletado={isCompletado}
          hasGroupsFormat={hasGroupsFormat}
          hasKnockoutFormat={hasKnockoutFormat}
        />

        {/* --- INFO --- */}
        <Tabs.Panel value="info" pt="xl">
          <TournamentInfoCards tournament={tournament} />
        </Tabs.Panel>

        {/* --- INSCRITOS --- */}
        {(isProgramado || isGrupos || isKnockoutPhase) && (
          <Tabs.Panel value="inscritos" pt="xl">
            <ParticipantsTable
              participants={participants}
              isAdmin={isAdmin}
              isProgramado={isProgramado}
              onStatusChange={onParticipantStatusChange}
            />
          </Tabs.Panel>
        )}

        {/* --- RESULTADOS (PODIO) --- */}
        {isCompletado && (
          <Tabs.Panel value="resultados" pt="xl">
            <Podium
              results={[]}
              firstPlace={podium.firstPlace}
              secondPlace={podium.secondPlace}
              thirdPlace={podium.thirdPlace}
              otherResults={podium.otherResults}
            />
          </Tabs.Panel>
        )}

        {/* --- GRUPOS --- */}
        {hasGroupsFormat && (isGrupos || isKnockoutPhase || isCompletado) && (
          <Tabs.Panel value="grupos" pt="xl">
            <GroupClassificationsTable
              groupsClas={groupsClas}
              groupMatches={groupMatches}
              selectedGroup={selectedGroup}
              groupOptions={groupOptions}
              onGroupChange={setSelectedGroup}
              playersKnockout={tournament?.playersKnockout || 2}
              isAdmin={isAdmin}
              tournamentStatus={tournament?.status}
              onEditMatch={onMatchClick}
            />
          </Tabs.Panel>
        )}

        {/* --- BRACKET --- */}
        {tournament?.rounds !== 'TodosvsTodos' &&
          hasKnockoutFormat &&
          (isKnockoutPhase || isCompletado) && (
            <Tabs.Panel value="bracketA" pt="xl">
              <KnockoutBracket
                bracketData={bracketA}
                activeSubKey={subBracketA}
                onSubKeyChange={setSubBracketA}
                isAdmin={isAdmin}
                onEditMatch={onMatchClick}
                onViewMatch={onBracketMatchClick}
              />
            </Tabs.Panel>
          )}

        {/* --- BRACKET B (CONSOLACIÓN) --- */}
        {tournament?.rounds !== 'TodosvsTodos' &&
          hasKnockoutFormat &&
          (isKnockoutPhase || isCompletado) &&
          tournament?.typeKnockout === 'LlaveAB' && (
            <Tabs.Panel value="bracketB" pt="xl">
              <KnockoutBracket
                bracketData={bracketB}
                activeSubKey={subBracketB}
                onSubKeyChange={setSubBracketB}
                isAdmin={isAdmin}
                onEditMatch={onMatchClick}
                onViewMatch={onBracketMatchClick}
              />
            </Tabs.Panel>
          )}
      </Tabs>
    </>
  );
};

export default TournamentTabs;
