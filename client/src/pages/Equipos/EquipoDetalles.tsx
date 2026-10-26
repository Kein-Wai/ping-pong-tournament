import { useParams, useNavigate } from 'react-router-dom';
import {
  Text,
  Button,
  Center,
  Loader,
  Stack,
  Tabs,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconUsers,
  IconCalendarEvent,
} from '@tabler/icons-react';
import { APP_ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { useEquipoDetalles } from '../../hooks/useEquipoDetalles';
import { useEquipoInfo } from '../../hooks/useEquipoInfo';
import { useEquipoPlantilla } from '../../hooks/useEquipoPlantilla';
import { useEquipoNuevoPartido } from '../../hooks/useEquipoNuevoPartido';
import { useEquipoPartido } from '../../hooks/useEquipoPartido';
import { TeamCalendarTab } from '../../components/team/TeamCalendarTab';
import { TeamHeader } from '../../components/team/TeamHeader';
import { TeamRosterTab } from '../../components/team/TeamRosterTab';
import { RosterModal } from '../../components/team/RosterModal';
import { EditTeamModal } from '../../components/team/EditTeamModal';
import { NewMatchModal } from '../../components/team/NewMatchModal';
import { EditMatchModal } from '../../components/team/EditMatchModal';

export const EquipoDetalles = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { team, clubPlayers, loading, refetch } = useEquipoDetalles(id, user?.clubId);

  const { isAdmin } = usePermissions();

  const {
    saving: savingTeam,
    editTeamModalOpen,
    setEditTeamModalOpen,
    editTeamName,
    setEditTeamName,
    editTeamCategory,
    setEditTeamCategory,
    editTeamLevel,
    setEditTeamLevel,
    handleOpenEditTeam,
    handleUpdateTeam,
    handleDeleteTeam,
  } = useEquipoInfo({
    id,
    team,
    refetch,
    onTeamDeleted: () => navigate(APP_ROUTES.EQUIPOS.LIST),
  });

  const {
    saving: savingRoster,
    rosterModalOpen,
    setRosterModalOpen,
    checkedPlayers,
    setCheckedPlayers,
    handleOpenRoster,
    handleSaveRoster,
  } = useEquipoPlantilla({ id, team, refetch });

  const {
    saving: savingNewMatch,
    matchModalOpen,
    setMatchModalOpen,
    rivalName,
    setRivalName,
    matchDate,
    setMatchDate,
    isHome,
    setIsHome,
    location,
    setLocation,
    handleSaveMatch,
  } = useEquipoNuevoPartido({ id, refetch });

  const {
    saving: savingMatch,
    editMatchModalOpen,
    setEditMatchModalOpen,
    selectedMatch,
    editStatus,
    setEditStatus,
    ourScore,
    setOurScore,
    rivalScore,
    setRivalScore,
    editRivalName,
    setEditRivalName,
    editDate,
    setEditDate,
    editIsHome,
    setEditIsHome,
    editLocation,
    setEditLocation,
    openEditMatchModal,
    handleUpdateMatchResult,
    handleDeleteMatch,
    handleToggleAttendance,
  } = useEquipoPartido({ refetch });

  const isTeamMember = !!team?.players?.some((p) => p.id === user?.id);
  const canEditMatch = isAdmin || isTeamMember;

  if (loading)
    return (
      <Center h={400}>
        <Loader color="blue" />
      </Center>
    );
  if (!team)
    return (
      <Center h={400}>
        <Text>Equipo no encontrado</Text>
      </Center>
    );

  return (
    <Stack gap="xl">
      <div>
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate(APP_ROUTES.EQUIPOS.LIST)}
        >
          Volver a Equipos
        </Button>
      </div>

      <TeamHeader
        team={team}
        isAdmin={isAdmin}
        onDelete={handleDeleteTeam}
        onEdit={handleOpenEditTeam}
        onOpenRoster={handleOpenRoster}
        onAddMatch={() => setMatchModalOpen(true)}
      />

      <Tabs defaultValue="plantilla" variant="outline" radius="md">
        <Tabs.List>
          <Tabs.Tab value="plantilla" leftSection={<IconUsers size={16} />}>
            Plantilla ({team.players.length})
          </Tabs.Tab>
          <Tabs.Tab value="calendario" leftSection={<IconCalendarEvent size={16} />}>
            Calendario y Resultados
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="plantilla" pt="xl">
          <TeamRosterTab
            players={team.players}
            onPlayerClick={(playerId) => navigate(APP_ROUTES.JUGADORES.PROFILE(playerId))}
          />
        </Tabs.Panel>

        <Tabs.Panel value="calendario" pt="xl">
          <TeamCalendarTab
            matches={team.matches}
            teamName={team.name}
            currentUserId={user?.id}
            isAdmin={isAdmin}
            canEditMatch={canEditMatch}
            isTeamMember={isTeamMember}
            onAddMatch={() => setMatchModalOpen(true)}
            onEditMatch={openEditMatchModal}
            onToggleAttendance={handleToggleAttendance}
          />
        </Tabs.Panel>
      </Tabs>

      <RosterModal
        opened={rosterModalOpen}
        onClose={() => setRosterModalOpen(false)}
        players={clubPlayers}
        checkedPlayers={checkedPlayers}
        onCheckedChange={setCheckedPlayers}
        onSave={handleSaveRoster}
        saving={savingRoster}
      />

      <EditTeamModal
        opened={editTeamModalOpen}
        onClose={() => setEditTeamModalOpen(false)}
        name={editTeamName}
        onNameChange={setEditTeamName}
        category={editTeamCategory}
        onCategoryChange={setEditTeamCategory}
        level={editTeamLevel}
        onLevelChange={setEditTeamLevel}
        onSave={handleUpdateTeam}
        saving={savingTeam}
      />

      <NewMatchModal
        opened={matchModalOpen}
        onClose={() => setMatchModalOpen(false)}
        rivalName={rivalName}
        onRivalNameChange={setRivalName}
        date={matchDate}
        onDateChange={setMatchDate}
        isHome={isHome}
        onIsHomeChange={setIsHome}
        location={location}
        onLocationChange={setLocation}
        onSave={handleSaveMatch}
        saving={savingNewMatch}
      />

      <EditMatchModal
        opened={editMatchModalOpen}
        onClose={() => setEditMatchModalOpen(false)}
        teamName={team.name}
        matchRivalName={selectedMatch?.rivalName}
        rivalName={editRivalName}
        onRivalNameChange={setEditRivalName}
        date={editDate}
        onDateChange={setEditDate}
        isHome={editIsHome}
        onIsHomeChange={setEditIsHome}
        location={editLocation}
        onLocationChange={setEditLocation}
        status={editStatus}
        onStatusChange={setEditStatus}
        ourScore={ourScore}
        onOurScoreChange={setOurScore}
        rivalScore={rivalScore}
        onRivalScoreChange={setRivalScore}
        canDelete={isAdmin}
        onDelete={() => handleDeleteMatch(selectedMatch!.id)}
        onSave={handleUpdateMatchResult}
        saving={savingMatch}
      />
    </Stack>
  );
};
