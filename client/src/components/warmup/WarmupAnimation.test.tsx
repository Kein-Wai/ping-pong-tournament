import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WARMUP_EXERCISES } from '../../constants/warmupExercises';
import { WarmupAnimation } from './WarmupAnimation';

describe('WarmupAnimation', () => {
  it.each(WARMUP_EXERCISES.map((exercise) => [exercise.key, exercise.name] as const))(
    'Debería dibujar una animación accesible para «%s»',
    (key, name) => {
      render(<WarmupAnimation exerciseKey={key} />);

      const svg = screen.getByRole('img', { name });
      expect(svg.tagName.toLowerCase()).toBe('svg');
      // Al menos un elemento animado: si no, el ejercicio saldría como un dibujo estático.
      expect(svg.querySelector('.wu-anim')).not.toBeNull();
    },
  );

  it('Debería incluir la regla que apaga la animación con prefers-reduced-motion', () => {
    const { container } = render(<WarmupAnimation exerciseKey="estiramientos" />);

    expect(container.querySelector('style')?.textContent).toContain('prefers-reduced-motion: reduce');
  });

  it('Debería distinguir el golpe de derecha del de revés por el color de la raqueta', () => {
    const { container: derecha } = render(<WarmupAnimation exerciseKey="top-derecha" />);
    const { container: reves } = render(<WarmupAnimation exerciseKey="top-reves" />);

    expect(derecha.innerHTML).toContain('--mantine-color-red-7');
    expect(reves.innerHTML).toContain('--mantine-color-dark-9');
    expect(reves.innerHTML).not.toContain('--mantine-color-red-7');
  });
});
