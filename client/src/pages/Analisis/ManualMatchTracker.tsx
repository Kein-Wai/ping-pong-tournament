import { useParams, useNavigate } from 'react-router-dom';
import { Stack, Group, Button, Center, Loader } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { APP_ROUTES } from '../../constants/routes';
import { useManualMatch } from '../../hooks/useManualMatch';
import { usePlanificacionPartido } from '../../hooks/usePlanificacionPartido';
import { useRegistroPuntos } from '../../hooks/useRegistroPuntos';
import { useRivalEdicion } from '../../hooks/useRivalEdicion';
import { useSetsPartido } from '../../hooks/useSetsPartido';
import { useCierrePartido } from '../../hooks/useCierrePartido';
import { DeepScoreboard } from '../../components/manualMatch/DeepScoreboard';
import { EndMatchModal } from '../../components/manualMatch/EndMatchModal';
import { EndSetModal } from '../../components/manualMatch/EndSetModal';
import { MatchReport } from '../../components/manualMatch/MatchReport';
import { PlanningAccordion } from '../../components/manualMatch/PlanningAccordion';
import { PlanningView } from '../../components/manualMatch/PlanningView';
import { PointSelector } from '../../components/manualMatch/PointSelector';
import { QuickMatchView } from '../../components/manualMatch/QuickMatchView';
import { RivalEditModal } from '../../components/manualMatch/RivalEditModal';
import { SetHistory } from '../../components/manualMatch/SetHistory';
import { SetSummaryModal } from '../../components/manualMatch/SetSummaryModal';
import { getReportSetScores, getSetSummary } from '../../utils/manual-match';

export const ManualMatchTracker = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { match, setMatch, loaded } = useManualMatch(id);

  const {
    editRivalModal,
    setEditRivalModal,
    editOppName,
    setEditOppName,
    editOppHand,
    setEditOppHand,
    editOppStyle,
    setEditOppStyle,
    editOppLevel,
    setEditOppLevel,
    editOppRubberForehand,
    setEditOppRubberForehand,
    editOppRubberBackhand,
    setEditOppRubberBackhand,
    handleUpdateRival,
  } = useRivalEdicion({ id, match, setMatch, loaded });

  const {
    planMyServe,
    setPlanMyServe,
    planTheirServe,
    setPlanTheirServe,
    planStrategy,
    setPlanStrategy,
    savingPlan,
    startAnalysisType,
    setStartAnalysisType,
    handleSavePlan,
    handleStartMatchNow,
  } = usePlanificacionPartido({
    id,
    match,
    setMatch,
    loaded,
    onSaved: () => navigate(APP_ROUTES.ANALISIS.LIST),
  });

  const {
    pointHistory,
    currentSet,
    setCurrentSet,
    currentSetPoints,
    myScore,
    oppScore,
    isWonState,
    currentNodes,
    resetFlow,
    handleStartPoint,
    handleNodeClick,
    handleUndoPoint,
  } = useRegistroPuntos({ id, loaded });

  const {
    mySetsWon,
    setMySetsWon,
    oppSetsWon,
    setOppSetsWon,
    showEndSetModal,
    showEndMatchModal,
    setShowEndMatchModal,
    viewingSetSummary,
    setViewingSetSummary,
    handleUndoFromEndSet,
    handleConfirmSetEnd,
  } = useSetsPartido({
    match,
    loaded,
    myScore,
    oppScore,
    currentSet,
    setCurrentSet,
    onUndoPoint: handleUndoPoint,
  });

  const {
    totalSetsPlayed,
    setScores,
    handleScoreChange,
    strChecked,
    toggleStrength,
    strDetails,
    setStrDetails,
    weakChecked,
    toggleWeakness,
    weakDetails,
    setWeakDetails,
    deepNotes,
    setDeepNotes,
    executeCompleteMatch,
  } = useCierrePartido({
    id,
    match,
    setMatch,
    loaded,
    mySetsWon,
    oppSetsWon,
    setShowEndMatchModal,
  });

  const activeSummary = getSetSummary(pointHistory, currentSet);
  const viewSummary = viewingSetSummary ? getSetSummary(pointHistory, viewingSetSummary) : null;

  if (!match)
    return (
      <Center h="100vh">
        <Loader color="blue" />
      </Center>
    );

  // --- 1. REPORTE FINAL ---
  if (match.status === 'Completado') {
    return (
      <MatchReport
        match={match}
        mySets={mySetsWon}
        oppSets={oppSetsWon}
        setScores={getReportSetScores(match, pointHistory)}
        points={pointHistory}
        onBack={() => navigate(APP_ROUTES.ANALISIS.LIST)}
      />
    );
  }

  // --- 2. FLUJO PLANIFICACIÓN PRE-PARTIDO ---
  if (match.status === 'Programado') {
    return (
      <>
        <PlanningView
          opponentName={match.opponentName}
          myServe={planMyServe}
          theirServe={planTheirServe}
          strategy={planStrategy}
          analysisType={startAnalysisType}
          saving={savingPlan}
          onMyServeChange={setPlanMyServe}
          onTheirServeChange={setPlanTheirServe}
          onStrategyChange={setPlanStrategy}
          onAnalysisTypeChange={setStartAnalysisType}
          onSave={handleSavePlan}
          onStart={handleStartMatchNow}
          onEditRival={() => setEditRivalModal(true)}
          onBack={() => navigate(APP_ROUTES.ANALISIS.LIST)}
        />
        <RivalEditModal
          opened={editRivalModal}
          name={editOppName}
          hand={editOppHand}
          style={editOppStyle}
          level={editOppLevel}
          rubberForehand={editOppRubberForehand}
          rubberBackhand={editOppRubberBackhand}
          onClose={() => setEditRivalModal(false)}
          onNameChange={setEditOppName}
          onHandChange={setEditOppHand}
          onStyleChange={setEditOppStyle}
          onLevelChange={setEditOppLevel}
          onRubberForehandChange={setEditOppRubberForehand}
          onRubberBackhandChange={setEditOppRubberBackhand}
          onSave={handleUpdateRival}
        />
      </>
    );
  }

  // --- 3. FLUJO LIGHT ---
  if (match.analysisType === 'Rapido') {
    return (
      <>
        <QuickMatchView
          match={match}
          mySets={mySetsWon}
          oppSets={oppSetsWon}
          totalSetsPlayed={totalSetsPlayed}
          setScores={setScores}
          strChecked={strChecked}
          strDetails={strDetails}
          weakChecked={weakChecked}
          weakDetails={weakDetails}
          onMySetsChange={setMySetsWon}
          onOppSetsChange={setOppSetsWon}
          onScoreChange={handleScoreChange}
          onToggleStrength={toggleStrength}
          onStrDetailsChange={setStrDetails}
          onToggleWeakness={toggleWeakness}
          onWeakDetailsChange={setWeakDetails}
          onComplete={executeCompleteMatch}
          onEditRival={() => setEditRivalModal(true)}
          onBack={() => navigate(APP_ROUTES.ANALISIS.LIST)}
        />
        <RivalEditModal
          opened={editRivalModal}
          name={editOppName}
          hand={editOppHand}
          style={editOppStyle}
          level={editOppLevel}
          rubberForehand={editOppRubberForehand}
          rubberBackhand={editOppRubberBackhand}
          onClose={() => setEditRivalModal(false)}
          onNameChange={setEditOppName}
          onHandChange={setEditOppHand}
          onStyleChange={setEditOppStyle}
          onLevelChange={setEditOppLevel}
          onRubberForehandChange={setEditOppRubberForehand}
          onRubberBackhandChange={setEditOppRubberBackhand}
          onSave={handleUpdateRival}
        />
      </>
    );
  }

  // --- 4. FLUJO DEEP ---
  return (
    <Stack gap="md" style={{ maxWidth: 800, margin: '0 auto', touchAction: 'manipulation' }}>
      <Group>
        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate(APP_ROUTES.ANALISIS.LIST)}
        >
          Salir del Árbitro
        </Button>
      </Group>

      {match.planningNotes && <PlanningAccordion planningNotes={match.planningNotes} mb="sm" />}

      <DeepScoreboard
        opponentName={match.opponentName}
        currentSet={currentSet}
        mySets={mySetsWon}
        oppSets={oppSetsWon}
        myScore={myScore}
        oppScore={oppScore}
        onSelectSet={setViewingSetSummary}
        onUndo={handleUndoPoint}
        onEditRival={() => setEditRivalModal(true)}
      />

      <PointSelector
        isWon={isWonState}
        nodes={currentNodes}
        onStartPoint={handleStartPoint}
        onNodeClick={handleNodeClick}
        onCancel={resetFlow}
      />

      <SetHistory currentSet={currentSet} points={currentSetPoints} />

      <RivalEditModal
        opened={editRivalModal}
        name={editOppName}
        hand={editOppHand}
        style={editOppStyle}
        level={editOppLevel}
        rubberForehand={editOppRubberForehand}
        rubberBackhand={editOppRubberBackhand}
        onClose={() => setEditRivalModal(false)}
        onNameChange={setEditOppName}
        onHandChange={setEditOppHand}
        onStyleChange={setEditOppStyle}
        onLevelChange={setEditOppLevel}
        onRubberForehandChange={setEditOppRubberForehand}
        onRubberBackhandChange={setEditOppRubberBackhand}
        onSave={handleUpdateRival}
      />

      <EndSetModal
        opened={showEndSetModal}
        summary={activeSummary}
        onUndo={handleUndoFromEndSet}
        onConfirm={handleConfirmSetEnd}
      />

      <SetSummaryModal
        setNumber={viewingSetSummary}
        summary={viewSummary}
        onClose={() => setViewingSetSummary(null)}
      />

      <EndMatchModal
        opened={showEndMatchModal}
        mySets={mySetsWon}
        oppSets={oppSetsWon}
        notes={deepNotes}
        onClose={() => navigate(APP_ROUTES.ANALISIS.LIST)}
        onNotesChange={setDeepNotes}
        onSave={executeCompleteMatch}
      />
    </Stack>
  );
};
