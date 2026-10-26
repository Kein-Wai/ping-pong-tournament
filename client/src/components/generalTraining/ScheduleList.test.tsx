import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { GeneralTrainingSchedule } from '../../types/api';
import { ScheduleList } from './ScheduleList';

const ADULTOS: GeneralTrainingSchedule = {
  id: 's1',
  name: 'Clase Adultos',
  startTime: '17:00',
  endTime: '19:00',
  daysOfWeek: [1, 3],
};
const NINOS: GeneralTrainingSchedule = {
  id: 's2',
  name: 'Clase Niños',
  startTime: '10:00',
  endTime: '11:30',
  daysOfWeek: [6],
};

const renderList = (props: Partial<React.ComponentProps<typeof ScheduleList>> = {}) => {
  const handlers = { onAdd: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
  const view = renderWithProviders(
    <ScheduleList
      schedules={[ADULTOS, NINOS]}
      getScheduleColor={(id) => (id === 's1' ? 'blue' : 'teal')}
      {...handlers}
      {...props}
    />,
  );
  return { ...view, ...handlers };
};

const cardOf = (name: string) =>
  screen.getByText(name).closest('[class*="mantine-Paper-root"]') as HTMLElement;

const clickIcon = (scope: HTMLElement, icon: string) =>
  fireEvent.click(scope.querySelector(`.tabler-icon-${icon}`)?.closest('button') as HTMLElement);

describe('ScheduleList', () => {
  it('lista cada horario con su franja y solo sus días', () => {
    renderList();

    const adultos = within(cardOf('Clase Adultos'));
    expect(adultos.getByText('17:00 - 19:00')).toBeInTheDocument();
    expect(adultos.getByText('L')).toBeInTheDocument();
    expect(adultos.getByText('X')).toBeInTheDocument();
    expect(adultos.queryByText('M')).not.toBeInTheDocument();
    expect(within(cardOf('Clase Niños')).getByText('S')).toBeInTheDocument();
  });

  it('pinta el punto de cada horario con su color', () => {
    renderList();

    const dot = screen.getByText('Clase Adultos').previousElementSibling as HTMLElement;
    expect(dot.style.backgroundColor).toBe('var(--mantine-color-blue-5)');
  });

  it('sin horarios avisa de que no hay ninguno', () => {
    renderList({ schedules: [] });

    expect(screen.getByText('No hay horarios configurados.')).toBeInTheDocument();
  });

  it('el + avisa para crear un horario', () => {
    const { onAdd, container } = renderList();

    clickIcon(container, 'plus');

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('editar avisa con el horario completo', () => {
    const { onEdit } = renderList();

    clickIcon(cardOf('Clase Niños'), 'edit');

    expect(onEdit).toHaveBeenCalledWith(NINOS);
  });

  it('eliminar avisa con el id y el nombre', () => {
    const { onDelete } = renderList();

    clickIcon(cardOf('Clase Adultos'), 'trash');

    expect(onDelete).toHaveBeenCalledWith('s1', 'Clase Adultos');
  });
});
