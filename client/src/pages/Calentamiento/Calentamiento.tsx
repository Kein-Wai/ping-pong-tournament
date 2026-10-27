import { Stack, Title } from '@mantine/core';
import { WarmupBuilder } from '../../components/warmup/WarmupBuilder';
import { WarmupFinished } from '../../components/warmup/WarmupFinished';
import { WarmupRoutinesPanel } from '../../components/warmup/WarmupRoutinesPanel';
import { WarmupSession } from '../../components/warmup/WarmupSession';
import { useWakeLock } from '../../hooks/useWakeLock';
import { useWarmupAlerts } from '../../hooks/useWarmupAlerts';
import { useWarmupBuilder } from '../../hooks/useWarmupBuilder';
import { useWarmupRoutines } from '../../hooks/useWarmupRoutines';
import { useWarmupSession } from '../../hooks/useWarmupSession';
import { areSameItems } from '../../utils/warmupRoutine';

export const Calentamiento = () => {
  const builder = useWarmupBuilder();
  const routines = useWarmupRoutines({ onSelect: (routine) => builder.load(routine.items) });
  const session = useWarmupSession(builder.items);
  const alerts = useWarmupAlerts(session.view);
  const { view } = session;
  useWakeLock(view !== null && view.phase !== 'finished');

  // «Preparado» es el gesto del usuario que los navegadores exigen para poder sonar.
  const handleStart = () => {
    alerts.unlock();
    session.start();
  };

  return (
    <Stack gap="lg">
      <Title order={2}>Calentamiento</Title>
      {view === null && (
        <>
          <WarmupRoutinesPanel
            routines={routines.routines}
            selectedId={routines.selectedId}
            isLoading={routines.isLoading}
            isSaving={routines.isSaving}
            isDirty={
              routines.selected !== null && !areSameItems(builder.items, routines.selected.items)
            }
            hasEntries={builder.entries.length > 0}
            canCreate={routines.canCreate}
            onSelect={routines.select}
            onSave={() => void routines.save(builder.items)}
            onSaveAsNew={async (name) => (await routines.saveAsNew(name, builder.items)) !== null}
            onRename={async (name) => (await routines.rename(name)) !== null}
            onRemove={() => void routines.remove()}
          />
          <WarmupBuilder
            entries={builder.entries}
            totalSec={builder.totalSec}
            canAdd={builder.canAdd}
            onAdd={builder.add}
            onRemove={builder.remove}
            onMove={builder.move}
            onChangeDuration={builder.changeDuration}
            onChangeRest={builder.changeRest}
            onStart={handleStart}
          />
        </>
      )}
      {view?.phase === 'finished' && (
        <WarmupFinished totalSec={builder.totalSec} onRepeat={handleStart} onBack={session.reset} />
      )}
      {view !== null && view.phase !== 'finished' && (
        <WarmupSession
          view={view}
          items={builder.items}
          onPause={session.pause}
          onResume={session.resume}
          onHold={session.hold}
          onSkip={session.skip}
          onNext={session.next}
          onPrevious={session.previous}
          onFinish={session.finish}
        />
      )}
    </Stack>
  );
};
