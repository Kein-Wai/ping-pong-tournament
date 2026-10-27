import { Stack, Title } from '@mantine/core';
import { WarmupBuilder } from '../../components/warmup/WarmupBuilder';
import { WarmupFinished } from '../../components/warmup/WarmupFinished';
import { WarmupSession } from '../../components/warmup/WarmupSession';
import { useWakeLock } from '../../hooks/useWakeLock';
import { useWarmupAlerts } from '../../hooks/useWarmupAlerts';
import { useWarmupBuilder } from '../../hooks/useWarmupBuilder';
import { useWarmupSession } from '../../hooks/useWarmupSession';

export const Calentamiento = () => {
  const builder = useWarmupBuilder();
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
        <WarmupBuilder
          entries={builder.entries}
          totalSec={builder.totalSec}
          canAdd={builder.canAdd}
          onAdd={builder.add}
          onRemove={builder.remove}
          onMove={builder.move}
          onChangeDuration={builder.changeDuration}
          onChangeCourtesy={builder.changeCourtesy}
          onStart={handleStart}
        />
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
