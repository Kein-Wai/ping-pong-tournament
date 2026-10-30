import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Center, Loader, Stack, Tabs, Text } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { AddLeaguePlayersModal } from '../../components/league/AddLeaguePlayersModal';
import { LeagueCalendarTab } from '../../components/league/LeagueCalendarTab';
import { LeagueHeader } from '../../components/league/LeagueHeader';
import { LeagueParticipantsTab } from '../../components/league/LeagueParticipantsTab';
import { LeagueStandingsTab } from '../../components/league/LeagueStandingsTab';
import { MatchResultModal } from '../../components/tournament/MatchResultModal';
import { useLigaAcciones } from '../../hooks/useLigaAcciones';
import { useLigaDetalles } from '../../hooks/useLigaDetalles';
import { useLigaPartido } from '../../hooks/useLigaPartido';
import { usePermissions } from '../../hooks/usePermissions';
import { APP_ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/authStore';
import { leagueProgress } from '../../utils/leagueView';

export const LigaDetalles = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  // El SuperAdmin ve las ligas pero solo el administrador de su club las gestiona.
  const { isAdminClub } = usePermissions();

  const { league, matches, standings, loading, reload } = useLigaDetalles(id);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const goToList = () => navigate(APP_ROUTES.LIGAS.LIST);

  const acciones = useLigaAcciones({ league, reload, onDeleted: goToList });
  const partido = useLigaPartido({ league, matches, isAdmin: isAdminClub, onMatchSaved: reload });

  const myStatus = useMemo(
    () => league?.participants.find((participant) => participant.playerId === user?.id)?.status ?? null,
    [league, user?.id],
  );
  const confirmedCount = useMemo(
    () => league?.participants.filter((participant) => participant.status === 'Confirmado').length ?? 0,
    [league],
  );

  if (loading) {
    return (
      <Center h={400}>
        <Loader color="blue" type="bars" />
      </Center>
    );
  }

  if (!league) {
    return (
      <Stack align="center" gap="md" py="xl">
        <Text c="dimmed">No se ha podido cargar la liga.</Text>
        <Button variant="light" leftSection={<IconArrowLeft size={16} />} onClick={goToList}>
          Volver a Ligas
        </Button>
      </Stack>
    );
  }

  // Con la liga en marcha lo que se consulta es la tabla; antes de empezar, quién juega.
  const defaultTab = league.status === 'Programado' ? 'jugadores' : 'clasificacion';

  return (
    <Stack gap="lg">
      <div>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={goToList}>
          Volver a Ligas
        </Button>
      </div>

      <LeagueHeader
        league={league}
        progress={leagueProgress(matches)}
        confirmedCount={confirmedCount}
        isAdmin={isAdminClub}
        myStatus={myStatus}
        acting={acciones.acting}
        onStart={acciones.handleStart}
        onCancel={acciones.handleCancel}
        onFinish={acciones.handleFinish}
        onDelete={acciones.handleDelete}
        onRegister={acciones.handleRegister}
        onUnregister={acciones.handleUnregister}
      />

      <Tabs value={activeTab ?? defaultTab} onChange={setActiveTab} keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="jugadores">Jugadores</Tabs.Tab>
          <Tabs.Tab value="calendario">Calendario</Tabs.Tab>
          <Tabs.Tab value="clasificacion">Clasificación</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="jugadores" pt="md">
          <LeagueParticipantsTab
            participants={league.participants}
            leagueStatus={league.status}
            isAdmin={isAdminClub}
            onAdd={acciones.handleOpenAddPlayers}
            onConfirm={acciones.handleConfirmParticipant}
            onRemove={acciones.handleRemoveParticipant}
            onWithdraw={acciones.handleWithdraw}
          />
        </Tabs.Panel>

        <Tabs.Panel value="calendario" pt="md">
          <LeagueCalendarTab
            matches={matches}
            leagueStatus={league.status}
            isAdmin={isAdminClub}
            onEditMatch={partido.openEditMatchModal}
          />
        </Tabs.Panel>

        <Tabs.Panel value="clasificacion" pt="md">
          <LeagueStandingsTab standings={standings} participants={league.participants} />
        </Tabs.Panel>
      </Tabs>

      <AddLeaguePlayersModal
        opened={acciones.addModalOpen}
        onClose={() => acciones.setAddModalOpen(false)}
        players={acciones.availablePlayers}
        checked={acciones.checkedToAdd}
        onChange={acciones.setCheckedToAdd}
        onSubmit={acciones.handleAddPlayers}
        submitting={acciones.acting}
      />

      <MatchResultModal
        opened={!!partido.editMatch}
        onClose={() => partido.setEditMatch(null)}
        match={partido.editMatch}
        submitting={partido.submittingMatch}
        onSave={partido.handleSaveMatch}
        onChange={partido.setEditMatch}
      />
    </Stack>
  );
};
