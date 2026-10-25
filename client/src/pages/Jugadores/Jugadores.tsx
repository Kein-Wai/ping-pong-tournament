import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Center, Loader, Pagination, Stack } from '@mantine/core';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { useJugadoresLista } from '../../hooks/useJugadoresLista';
import { useJugadorAprobacion } from '../../hooks/useJugadorAprobacion';
import { useJugadorElo } from '../../hooks/useJugadorElo';
import { useJugadorInvitado } from '../../hooks/useJugadorInvitado';
import { useJugadorResetCuenta } from '../../hooks/useJugadorResetCuenta';
import { ApprovePlayerModal } from '../../components/players/ApprovePlayerModal';
import { EditEloModal } from '../../components/players/EditEloModal';
import { GuestPlayerModal } from '../../components/players/GuestPlayerModal';
import { PlayersHeader } from '../../components/players/PlayersHeader';
import { PlayersTable } from '../../components/players/PlayersTable';
import { ResetAccountModal } from '../../components/players/ResetAccountModal';
import { filterPlayers } from '../../utils/players';
import { APP_ROUTES } from '../../constants/routes';

const ITEMS_PER_PAGE = 10;

export const Jugadores = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  const { players, loading, refetch: fetchPlayers } = useJugadoresLista();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Aprobado');
  const [page, setPage] = useState(1);

  const { editEloModal, newElo, setNewElo, openEditElo, closeEditElo, handleUpdateElo } =
    useJugadorElo({ refetch: fetchPlayers });

  const {
    guestModal,
    setGuestModal,
    creatingGuest,
    adminConsentConfirmed,
    setAdminConsentConfirmed,
    guestData,
    setGuestData,
    guestSkills,
    setGuestSkills,
    handleCreateGuest,
  } = useJugadorInvitado({ refetch: fetchPlayers });

  const {
    resetAccountModal,
    recoveryEmail,
    setRecoveryEmail,
    sendingReset,
    handleOpenResetAccount,
    closeResetAccount,
    handleSendResetEmail,
  } = useJugadorResetCuenta({ refetch: fetchPlayers });

  const { isAdmin: canManage, isSuperAdmin } = usePermissions();

  const {
    approveModal,
    playerLevel,
    setPlayerLevel,
    startingElo,
    setStartingElo,
    skills,
    setSkills,
    approving,
    handleProcessRequest,
    closeApproveModal,
    handleConfirmApproval,
  } = useJugadorAprobacion({
    players,
    clubId: currentUser?.clubId,
    isSuperAdmin,
    refetch: fetchPlayers,
  });

  const filteredPlayers = filterPlayers(players, search, statusFilter);

  const totalPages = Math.ceil(filteredPlayers.length / ITEMS_PER_PAGE);
  const paginatedPlayers = filteredPlayers.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.currentTarget.value);
    setPage(1);
  };

  const handleStatusChange = (value: string | null) => {
    setStatusFilter(value || 'Aprobado');
    setPage(1);
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader color="blue" type="bars" />
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <PlayersHeader
        canManage={canManage}
        search={search}
        statusFilter={statusFilter}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onAddPlayer={() => setGuestModal(true)}
      />

      <PlayersTable
        players={paginatedPlayers}
        canManage={canManage}
        isSuperAdmin={isSuperAdmin}
        onProcessRequest={handleProcessRequest}
        onEditElo={openEditElo}
        onResetAccount={handleOpenResetAccount}
        onViewProfile={(playerId) => navigate(APP_ROUTES.JUGADORES.PROFILE(playerId))}
      />

      {totalPages > 1 && (
        <Center mt="md">
          <Pagination total={totalPages} value={page} onChange={setPage} color="blue" withEdges />
        </Center>
      )}

      <EditEloModal
        opened={editEloModal.opened}
        playerName={editEloModal.player?.name}
        elo={newElo}
        onClose={closeEditElo}
        onEloChange={setNewElo}
        onSave={handleUpdateElo}
      />

      <ApprovePlayerModal
        opened={approveModal.opened}
        level={playerLevel}
        elo={startingElo}
        skills={skills}
        approving={approving}
        onClose={closeApproveModal}
        onLevelChange={setPlayerLevel}
        onEloChange={setStartingElo}
        onSkillsChange={setSkills}
        onConfirm={handleConfirmApproval}
      />

      <GuestPlayerModal
        opened={guestModal}
        data={guestData}
        skills={guestSkills}
        consentConfirmed={adminConsentConfirmed}
        creating={creatingGuest}
        onClose={() => setGuestModal(false)}
        onDataChange={setGuestData}
        onSkillsChange={setGuestSkills}
        onConsentChange={setAdminConsentConfirmed}
        onSubmit={handleCreateGuest}
      />

      <ResetAccountModal
        opened={resetAccountModal.opened}
        player={resetAccountModal.player}
        email={recoveryEmail}
        sending={sendingReset}
        onClose={closeResetAccount}
        onEmailChange={setRecoveryEmail}
        onSubmit={handleSendResetEmail}
      />
    </Stack>
  );
};
