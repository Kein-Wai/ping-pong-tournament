import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { formatSets } from './match-format';
import type { GroupMatch } from '../types/tournament';

const renderSet = (match: Partial<GroupMatch>) => {
  const full = {
    id: 'm1',
    status: 'Completado',
    setOnePlayerOne: null,
    setOnePlayerTwo: null,
    setTwoPlayerOne: null,
    setTwoPlayerTwo: null,
    setThreePlayerOne: null,
    setThreePlayerTwo: null,
    setFourPlayerOne: null,
    setFourPlayerTwo: null,
    setFivePlayerOne: null,
    setFivePlayerTwo: null,
    playerOne: null,
    playerTwo: null,
    group: null,
    ...match,
  };
  return render(
    <MantineProvider defaultColorScheme="light">{formatSets(full as GroupMatch)}</MantineProvider>,
  );
};

describe('formatSets', () => {
  it('muestra un Badge con el status cuando no esta Completado', () => {
    const { container } = renderSet({ status: 'Programado' });
    expect(container.textContent).toContain('Programado');
  });

  it('muestra los sets completados separados por |', () => {
    const { container } = renderSet({
      status: 'Completado',
      setOnePlayerOne: 11,
      setOnePlayerTwo: 9,
      setTwoPlayerOne: 8,
      setTwoPlayerTwo: 11,
      setThreePlayerOne: 11,
      setThreePlayerTwo: 7,
    });
    expect(container.textContent).toContain('11-9');
    expect(container.textContent).toContain('8-11');
    expect(container.textContent).toContain('11-7');
  });

  it('filtra los sets 0-0', () => {
    const { container } = renderSet({
      status: 'Completado',
      setOnePlayerOne: 11,
      setOnePlayerTwo: 9,
      setThreePlayerOne: 0,
      setThreePlayerTwo: 0,
    });
    expect(container.textContent).toContain('11-9');
    expect(container.textContent).not.toContain('0-0');
  });

  it('muestra vacio cuando todos los sets son 0-0', () => {
    const { container } = renderSet({
      status: 'Completado',
      setOnePlayerOne: 0,
      setOnePlayerTwo: 0,
    });
    expect(container.textContent).not.toContain('0-0');
  });
});
