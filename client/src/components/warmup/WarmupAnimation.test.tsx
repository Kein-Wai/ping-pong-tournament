import { afterEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { WARMUP_EXERCISES } from '../../constants/warmupExercises';
import { WarmupAnimation, WarmupSceneAnimation } from './WarmupAnimation';

describe('WarmupSceneAnimation', () => {
  it.each(WARMUP_EXERCISES.map((exercise) => [exercise.key, exercise.name] as const))(
    'Debería dibujar una animación accesible para «%s»',
    (key, name) => {
      render(<WarmupSceneAnimation exerciseKey={key} />);

      const svg = screen.getByRole('img', { name });
      expect(svg.tagName.toLowerCase()).toBe('svg');
      // Al menos un elemento animado: si no, el ejercicio saldría como un dibujo estático.
      expect(svg.querySelector('.wu-anim')).not.toBeNull();
    },
  );

  it('Debería incluir la regla que apaga la animación con prefers-reduced-motion', () => {
    const { container } = render(<WarmupSceneAnimation exerciseKey="estiramientos" />);

    expect(container.querySelector('style')?.textContent).toContain('prefers-reduced-motion: reduce');
  });

  it('Debería distinguir el golpe de derecha del de revés por el color de la raqueta', () => {
    const { container: derecha } = render(<WarmupSceneAnimation exerciseKey="top-derecha" />);
    const { container: reves } = render(<WarmupSceneAnimation exerciseKey="top-reves" />);

    expect(derecha.innerHTML).toContain('--mantine-color-red-7');
    expect(reves.innerHTML).toContain('--mantine-color-dark-9');
    expect(reves.innerHTML).not.toContain('--mantine-color-red-7');
  });
});

const mockReducedMotion = (reduce: boolean) => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: reduce && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
};

describe('WarmupAnimation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('Debería reproducir en bucle el vídeo del ejercicio que tiene clip', () => {
    mockReducedMotion(false);
    render(<WarmupAnimation exerciseKey="top-reves" />);

    const video = screen.getByLabelText('Top de Revés') as HTMLVideoElement;
    expect(video.tagName.toLowerCase()).toBe('video');
    expect(video.getAttribute('src')).toBe('/warmup/top-reves.mp4');
    expect(video.loop).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.autoplay).toBe(true);
    expect(video.playsInline).toBe(true);
  });

  it('Debería tener vídeo el juego de sensibilidad', () => {
    mockReducedMotion(false);
    render(<WarmupAnimation exerciseKey="sensibilidad" />);

    const video = screen.getByLabelText('Juego de sensibilidad');
    expect(video.tagName.toLowerCase()).toBe('video');
    expect(video.getAttribute('src')).toBe('/warmup/sensibilidad.mp4');
  });

  it('Debería dibujar la escena SVG si el ejercicio no tiene vídeo', () => {
    mockReducedMotion(false);
    render(<WarmupAnimation exerciseKey="estiramientos" />);

    expect(screen.getByRole('img', { name: 'Estiramientos' }).tagName.toLowerCase()).toBe('svg');
  });

  it('Debería volver a la escena SVG si el vídeo no carga', () => {
    mockReducedMotion(false);
    render(<WarmupAnimation exerciseKey="saque-entrada" />);

    fireEvent.error(screen.getByLabelText('Saque y entrada'));

    expect(screen.getByRole('img', { name: 'Saque y entrada' }).tagName.toLowerCase()).toBe('svg');
  });

  it('Debería usar la escena SVG, que se detiene, con prefers-reduced-motion', () => {
    mockReducedMotion(true);
    const { container } = render(<WarmupAnimation exerciseKey="derecha-derecha" />);

    expect(container.querySelector('video')).toBeNull();
    expect(screen.getByRole('img', { name: 'Derecha a Derecha' }).tagName.toLowerCase()).toBe('svg');
  });
});
