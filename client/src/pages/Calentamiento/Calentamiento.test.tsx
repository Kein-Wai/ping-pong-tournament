import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { WARMUP_EXERCISES } from '../../constants/warmupExercises';
import { renderWithProviders } from '../../test/utils';
import { Calentamiento } from './Calentamiento';

const preparado = () => screen.getByRole('button', { name: /preparado/i });
const anadir = (nombre: string) => fireEvent.click(screen.getByRole('button', { name: `Añadir ${nombre}` }));
const nombresDeLaRutina = () =>
  screen.queryAllByRole('listitem').map((item) => within(item).getByTestId('nombre-ejercicio').textContent);

describe('Calentamiento (/calentamiento): constructor', () => {
  it('Debería ofrecer los nueve ejercicios y no dejar empezar sin ninguno', () => {
    renderWithProviders(<Calentamiento />);

    WARMUP_EXERCISES.forEach((exercise) => {
      expect(screen.getByRole('button', { name: `Añadir ${exercise.name}` })).toBeInTheDocument();
    });
    expect(preparado()).toBeDisabled();
    expect(screen.getByText(/añade ejercicios/i)).toBeInTheDocument();
  });

  it('Debería añadir ejercicios a la rutina y mostrar el número de ejercicios y el tiempo total', () => {
    renderWithProviders(<Calentamiento />);

    anadir('Estiramientos');

    expect(nombresDeLaRutina()).toEqual(['Estiramientos']);
    // 5 s de cuenta atrás + 10 s de descanso + 60 s de ejercicio.
    expect(screen.getByText('1 ejercicio · 1 min 15 s')).toBeInTheDocument();
    expect(preparado()).toBeEnabled();
  });

  it('Debería permitir repetir un ejercicio', () => {
    renderWithProviders(<Calentamiento />);

    anadir('Derecha a Derecha');
    anadir('Derecha a Derecha');

    expect(nombresDeLaRutina()).toEqual(['Derecha a Derecha', 'Derecha a Derecha']);
    expect(screen.getByText('2 ejercicios · 3 min 5 s')).toBeInTheDocument();
  });

  it('Debería reordenar y quitar ejercicios con los botones de cada fila', () => {
    renderWithProviders(<Calentamiento />);
    anadir('Estiramientos');
    anadir('Movilidad sin raqueta');
    anadir('Drill en el momento');

    fireEvent.click(screen.getByRole('button', { name: 'Subir ejercicio 3' }));
    expect(nombresDeLaRutina()).toEqual(['Estiramientos', 'Drill en el momento', 'Movilidad sin raqueta']);

    fireEvent.click(screen.getByRole('button', { name: 'Bajar ejercicio 1' }));
    expect(nombresDeLaRutina()).toEqual(['Drill en el momento', 'Estiramientos', 'Movilidad sin raqueta']);

    fireEvent.click(screen.getByRole('button', { name: 'Quitar ejercicio 2' }));
    expect(nombresDeLaRutina()).toEqual(['Drill en el momento', 'Movilidad sin raqueta']);
  });

  it('Debería desactivar subir en el primero y bajar en el último', () => {
    renderWithProviders(<Calentamiento />);
    anadir('Estiramientos');
    anadir('Movilidad sin raqueta');

    expect(screen.getByRole('button', { name: 'Subir ejercicio 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bajar ejercicio 2' })).toBeDisabled();
  });

  it('Debería cambiar la duración y el descanso de un ejercicio y actualizar el total', () => {
    renderWithProviders(<Calentamiento />);
    anadir('Estiramientos');

    const duracion = screen.getByRole('textbox', { name: 'Duración del ejercicio 1' });
    fireEvent.change(duracion, { target: { value: '120' } });
    fireEvent.blur(duracion);
    const descanso = screen.getByRole('textbox', { name: 'Descanso del ejercicio 1' });
    fireEvent.change(descanso, { target: { value: '20' } });
    fireEvent.blur(descanso);

    // 5 + 20 + 120 = 145 s
    expect(screen.getByText('1 ejercicio · 2 min 25 s')).toBeInTheDocument();
  });

  it('Debería ajustar al mínimo una duración demasiado corta al salir del campo', () => {
    renderWithProviders(<Calentamiento />);
    anadir('Estiramientos');

    const duracion = screen.getByRole('textbox', { name: 'Duración del ejercicio 1' });
    fireEvent.change(duracion, { target: { value: '3' } });
    fireEvent.blur(duracion);

    expect(duracion).toHaveValue('15 s');
    // 5 + 10 + 15 = 30 s
    expect(screen.getByText('1 ejercicio · 30 s')).toBeInTheDocument();
  });

  it('Debería dejar de permitir añadir al llegar a 20 ejercicios', () => {
    renderWithProviders(<Calentamiento />);

    for (let i = 0; i < 20; i += 1) anadir('Movilidad sin raqueta');

    expect(nombresDeLaRutina()).toHaveLength(20);
    expect(screen.getByRole('button', { name: 'Añadir Estiramientos' })).toBeDisabled();
    expect(screen.getByText(/máximo de 20 ejercicios/i)).toBeInTheDocument();
  });
});

describe('Calentamiento (/calentamiento): sesión', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const pasar = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

  // Rutina de prueba: Estiramientos (60 s, descanso 10 s) y Derecha a Derecha (60 s, descanso 30 s).
  const empezar = () => {
    renderWithProviders(<Calentamiento />);
    anadir('Estiramientos');
    anadir('Derecha a Derecha');
    fireEvent.click(preparado());
  };

  it('Debería arrancar con una cuenta atrás de 5 s y ocultar el constructor', () => {
    empezar();

    expect(screen.getByText('¡Prepárate!')).toBeInTheDocument();
    expect(screen.getByTestId('reloj')).toHaveTextContent('5');
    expect(screen.getByText(/empezamos con estiramientos/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Añadir Estiramientos' })).not.toBeInTheDocument();
  });

  it('Debería pasar al descanso del primer ejercicio al acabar la cuenta atrás', () => {
    empezar();

    pasar(5_000);

    expect(screen.getByText('Prepárate para')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Estiramientos' })).toBeInTheDocument();
    expect(screen.getByTestId('reloj')).toHaveTextContent('00:10');
    expect(screen.getByRole('button', { name: 'Ya estoy listo' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Esperar' })).toBeEnabled();
  });

  it('Debería enseñar el ejercicio con su animación, su frase y el reloj bajando', () => {
    empezar();

    pasar(5_000 + 10_000);
    expect(screen.getByRole('img', { name: 'Estiramientos' })).toBeInTheDocument();
    expect(screen.getByText(/estira cuello, hombros/i)).toBeInTheDocument();
    expect(screen.getByTestId('reloj')).toHaveTextContent('01:00');
    expect(screen.queryByRole('button', { name: 'Ya estoy listo' })).not.toBeInTheDocument();

    pasar(20_000);
    expect(screen.getByTestId('reloj')).toHaveTextContent('00:40');
  });

  it('Debería mostrar en qué ejercicio va y cuánto queda de la rutina', () => {
    empezar();

    pasar(5_000 + 10_000);

    // Quedan 60 s de este ejercicio + 30 s de descanso + 60 s del siguiente = 2 min 30 s.
    expect(screen.getByText('Ejercicio 1 de 2 · quedan 2 min 30 s')).toBeInTheDocument();
  });

  it('Debería pasar al siguiente ejercicio con su propio descanso', () => {
    empezar();

    pasar(5_000 + 10_000 + 60_000);

    expect(screen.getByRole('heading', { name: 'Derecha a Derecha' })).toBeInTheDocument();
    expect(screen.getByTestId('reloj')).toHaveTextContent('00:30');
    // Descanso de 30 s + 60 s de ejercicio.
    expect(screen.getByText('Ejercicio 2 de 2 · quedan 1 min 30 s')).toBeInTheDocument();
  });

  it('Debería congelar el reloj al pausar y seguir al reanudar', () => {
    empezar();
    pasar(2_000);

    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));
    pasar(30_000);
    expect(screen.getByTestId('reloj')).toHaveTextContent('3');
    expect(screen.queryByRole('button', { name: 'Pausar' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reanudar' }));
    pasar(1_000);
    expect(screen.getByTestId('reloj')).toHaveTextContent('2');
  });

  it('Debería mantener el descanso mientras el jugador espera y empezar el ejercicio al decir que está listo', () => {
    empezar();
    pasar(5_000);

    fireEvent.click(screen.getByRole('button', { name: 'Esperar' }));
    pasar(120_000);
    expect(screen.getByText(/esperando: pulsa/i)).toBeInTheDocument();
    expect(screen.getByTestId('reloj')).toHaveTextContent('00:10');
    expect(screen.getByRole('button', { name: 'Esperar' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Ya estoy listo' }));
    expect(screen.getByTestId('reloj')).toHaveTextContent('01:00');
    expect(screen.getByText(/estira cuello, hombros/i)).toBeInTheDocument();
  });

  it('Debería saltar el descanso con «Ya estoy listo» sin haber esperado', () => {
    empezar();
    pasar(5_000 + 3_000);

    fireEvent.click(screen.getByRole('button', { name: 'Ya estoy listo' }));

    expect(screen.getByTestId('reloj')).toHaveTextContent('01:00');
  });

  it('Debería saltar al siguiente ejercicio y volver al anterior con los botones', () => {
    empezar();
    pasar(5_000 + 10_000 + 20_000);

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente ejercicio' }));
    expect(screen.getByRole('heading', { name: 'Derecha a Derecha' })).toBeInTheDocument();
    expect(screen.getByTestId('reloj')).toHaveTextContent('00:30');

    fireEvent.click(screen.getByRole('button', { name: 'Ejercicio anterior' }));
    expect(screen.getByRole('heading', { name: 'Estiramientos' })).toBeInTheDocument();
    expect(screen.getByTestId('reloj')).toHaveTextContent('00:10');
  });

  it('Debería desactivar «anterior» durante la cuenta atrás inicial', () => {
    empezar();

    expect(screen.getByRole('button', { name: 'Ejercicio anterior' })).toBeDisabled();
  });

  it('Debería pedir confirmación antes de terminar y poder seguir', () => {
    empezar();

    fireEvent.click(screen.getByRole('button', { name: 'Terminar' }));
    expect(screen.getByText('¿Terminar el calentamiento?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }));
    expect(screen.queryByText('¿Terminar el calentamiento?')).not.toBeInTheDocument();
    expect(screen.getByText('¡Prepárate!')).toBeInTheDocument();
  });

  it('Debería terminar al confirmar y enseñar la pantalla final', () => {
    empezar();

    fireEvent.click(screen.getByRole('button', { name: 'Terminar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí, terminar' }));

    expect(screen.getByText('¡Calentamiento terminado!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Repetir' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver a mi rutina' })).toBeInTheDocument();
  });

  it('Debería terminar solo al acabar el último ejercicio', () => {
    empezar();

    // 5 s de cuenta atrás + (10 + 60) + (30 + 60) = 165 s.
    pasar(164_000);
    expect(screen.queryByText('¡Calentamiento terminado!')).not.toBeInTheDocument();

    pasar(1_000);
    expect(screen.getByText('¡Calentamiento terminado!')).toBeInTheDocument();
    expect(screen.getByText('Rutina de 2 min 45 s')).toBeInTheDocument();
  });

  it('Debería repetir la sesión desde la cuenta atrás con «Repetir»', () => {
    empezar();
    pasar(165_000);

    fireEvent.click(screen.getByRole('button', { name: 'Repetir' }));

    expect(screen.getByText('¡Prepárate!')).toBeInTheDocument();
    expect(screen.getByTestId('reloj')).toHaveTextContent('5');
  });

  it('Debería volver al constructor con la rutina intacta con «Volver a mi rutina»', () => {
    empezar();
    pasar(165_000);

    fireEvent.click(screen.getByRole('button', { name: 'Volver a mi rutina' }));

    expect(nombresDeLaRutina()).toEqual(['Estiramientos', 'Derecha a Derecha']);
    expect(preparado()).toBeEnabled();
  });
});
