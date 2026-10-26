import { useParams, useNavigate } from 'react-router-dom';
import {
  Text,
  Button,
  SimpleGrid,
  Title,
  Center,
  Loader,
  Stack,
} from '@mantine/core';
import {
  IconArrowLeft,
} from '@tabler/icons-react';
import { APP_ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { useJugadorPerfil } from '../../hooks/useJugadorPerfil';
import { useJugadorEdicion } from '../../hooks/useJugadorEdicion';
import { useJugadorConsolidacion } from '../../hooks/useJugadorConsolidacion';
import { useJugadorAdministracion } from '../../hooks/useJugadorAdministracion';
import { PlayerProfileHeader } from '../../components/player/PlayerProfileHeader';
import { SkillsPanel } from '../../components/player/SkillsPanel';
import { BalanceCard } from '../../components/player/BalanceCard';
import { RivalsCard } from '../../components/player/RivalsCard';
import { PlayerStatCards } from '../../components/player/PlayerStatCards';
import { TeamCalendarCard } from '../../components/player/TeamCalendarCard';
import { RecentMatchesTable } from '../../components/player/RecentMatchesTable';
import { TrainingPlansCard } from '../../components/player/TrainingPlansCard';
import { TechnicalAnalysisCard } from '../../components/player/TechnicalAnalysisCard';
import { EditProfileModal } from '../../components/player/EditProfileModal';
import { ConsolidateModal } from '../../components/player/ConsolidateModal';
import {
  countAttendances,
  getEfficiencyData,
  getRivalChartData,
  getSkillsData,
  getTeamCalendar,
} from '../../utils/player-profile';

export const JugadorPerfil = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  const { isSuperAdmin, isAdmin } = usePermissions();
  const isOwnProfile = currentUser?.id === id;
  const canViewTrainings = isOwnProfile || isAdmin;

  const {
    player,
    recentMatches,
    trainings,
    currentSeason,
    loading,
    refetch: fetchPlayerInfo,
  } = useJugadorPerfil(id, canViewTrainings);

  const {
    editModalOpened,
    setEditModalOpened,
    saving,
    editData,
    setEditData,
    handleOpenEdit,
    handleSaveProfile,
  } = useJugadorEdicion({ id, player, isOwnProfile, refetch: fetchPlayerInfo });

  const {
    consolidateModalOpened,
    setConsolidateModalOpened,
    approvedGains,
    setApprovedGains,
    consolidating,
    handleOpenConsolidate,
    handleExecuteConsolidate,
  } = useJugadorConsolidacion({ id, player, refetch: fetchPlayerInfo });

  const { handleKickPlayer, handleDeletePlan } = useJugadorAdministracion({
    player,
    refetch: fetchPlayerInfo,
    onKicked: () => navigate(APP_ROUTES.JUGADORES.LIST),
  });

  const {
    all: allTeamMatches,
    nextMatch,
    others: otherTeamMatches,
  } = getTeamCalendar(player?.teams, new Date());

  // Puede expulsar si es Admin, no es su propio perfil, y el jugador pertenece a su club (o es SuperAdmin)
  const canKickPlayer =
    isAdmin &&
    !isOwnProfile &&
    player?.clubId &&
    (isSuperAdmin || player.clubId === currentUser?.clubId);

  if (loading) {
    return (
      <Center h={400}>
        <Loader color="blue" type="bars" />
      </Center>
    );
  }

  if (!player) {
    return (
      <Center h={400}>
        <Text c="dimmed">Jugador no encontrado.</Text>
      </Center>
    );
  }

  const s = Array.isArray(player.stats) ? player.stats[0] : player.stats;
  const currentSkills = Array.isArray(player.skills) ? player.skills[0] : player.skills;
  const totalMatches = (s?.matchWon || 0) + (s?.matchLost || 0);
  const totalTournaments = s?.tournamentPart || 0;
  const { total: totalAsistencias, thisMonth: asistenciasMes } = countAttendances(
    player.generalAttendances,
    new Date(),
  );

  const matchWinRate = totalMatches > 0 ? Math.round(((s?.matchWon || 0) / totalMatches) * 100) : 0;

  const { mano: chartDataMano, estilo: chartDataEstilo } = getRivalChartData(recentMatches, id!);

  const efficiencyData = getEfficiencyData(s);

  const skillsData = getSkillsData(currentSkills, player.pendingSkills);

  const showTrainings = canViewTrainings && (isAdmin || (trainings.length > 0 && isOwnProfile));

  const latestPlan = trainings.length > 0 ? trainings[0] : null;

  const hasPendingSkills =
    player?.pendingSkills &&
    Object.values(player.pendingSkills).some((val) => val !== null && val > 0);

  return (
    <Stack gap="xl">
      {!isOwnProfile && (
        <div>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate(APP_ROUTES.JUGADORES.LIST)}
          >
            Volver a Jugadores
          </Button>
        </div>
      )}

      <PlayerProfileHeader
        player={player}
        season={currentSeason}
        elo={s?.elo}
        showEmail={isAdmin || currentUser?.id === player.id}
        canKick={!!canKickPlayer}
        canEdit={isOwnProfile || isAdmin}
        canConsolidate={isAdmin && !!hasPendingSkills}
        onKick={handleKickPlayer}
        onEdit={handleOpenEdit}
        onConsolidate={handleOpenConsolidate}
      />

      <Title order={3}>Perfil Técnico (Atributos)</Title>

      <SkillsPanel skillsData={skillsData} />

      <Title order={3} mt="md">
        Estadísticas Competitivas
      </Title>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <BalanceCard hasMatches={totalMatches > 0} efficiencyData={efficiencyData} />
        <RivalsCard hasMatches={totalMatches > 0} mano={chartDataMano} estilo={chartDataEstilo} />
      </SimpleGrid>

      <PlayerStatCards
        stats={s}
        matchWinRate={matchWinRate}
        totalTournaments={totalTournaments}
        totalAsistencias={totalAsistencias}
        asistenciasMes={asistenciasMes}
      />

      {allTeamMatches.length > 0 && (
        <TeamCalendarCard nextMatch={nextMatch} otherMatches={otherTeamMatches} />
      )}

      <RecentMatchesTable matches={recentMatches} playerId={id!} />

      {showTrainings && (
        <TrainingPlansCard
          plans={trainings}
          isAdmin={isAdmin}
          onCreatePlan={() => navigate(APP_ROUTES.ENTRENAMIENTOS.NEW(player.id))}
          onOpenPlan={(planId) => navigate(APP_ROUTES.ENTRENAMIENTOS.DETAILS(planId))}
          onDeletePlan={handleDeletePlan}
        />
      )}

      {showTrainings && <TechnicalAnalysisCard latestPlan={latestPlan} />}

      <EditProfileModal
        opened={editModalOpened}
        onClose={() => setEditModalOpened(false)}
        editData={editData}
        onEditDataChange={setEditData}
        showSkills={isAdmin}
        showPasswordSection={currentUser?.authProvider === 'LOCAL' && isOwnProfile}
        saving={saving}
        onSave={handleSaveProfile}
      />

      <ConsolidateModal
        opened={consolidateModalOpened}
        onClose={() => setConsolidateModalOpened(false)}
        skills={player.skills}
        approvedGains={approvedGains}
        onGainsChange={setApprovedGains}
        consolidating={consolidating}
        onConfirm={handleExecuteConsolidate}
      />
    </Stack>
  );
};
