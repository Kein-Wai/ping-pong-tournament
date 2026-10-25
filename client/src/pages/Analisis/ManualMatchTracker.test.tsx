import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { chooseOption, normalizeIds, renderWithProviders } from '../../test/utils';
import { ManualMatchTracker } from './ManualMatchTracker';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
vi.mock('../../api/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const envelope = <T,>(data: T) => ({ data: { success: true, data } });

type Fixture = Record<string, unknown>;

const makeMatch = (overrides: Fixture = {}): Fixture => ({
  id: 'm1',
  opponentName: 'Carlos',
  opponentHand: 'Diestro',
  opponentStyle: 'Ofensivo',
  opponentLevel: 'Igual',
  status: 'Iniciado',
  analysisType: 'Extenso',
  setsToWin: 3,
  mySets: 0,
  opponentSets: 0,
  points: [],
  planningNotes: null,
  lightNotes: null,
  setScores: null,
  ...overrides,
});

const point = (
  setNumber: number,
  pointOrder: number,
  isWon: boolean,
  extra: Fixture = {},
): Fixture => ({
  id: `pt-${setNumber}-${pointOrder}`,
  setNumber,
  pointOrder,
  isWon,
  category: null,
  subcategory: null,
  placement: null,
  ...extra,
});

/** Puntos de un set con el marcador indicado: primero los míos y luego los del rival. */
const setPoints = (setNumber: number, mine: number, theirs: number, extra: Fixture = {}) => [
  ...Array.from({ length: mine }, (_, i) => point(setNumber, i + 1, true, extra)),
  ...Array.from({ length: theirs }, (_, i) => point(setNumber, mine + i + 1, false, extra)),
];

const serve = (match: Fixture) => {
  vi.mocked(api.get).mockResolvedValue(envelope(match) as never);
};

const renderTracker = async (match: Fixture) => {
  serve(match);
  const view = renderWithProviders(
    <Routes>
      <Route path={APP_ROUTES.ANALISIS.TRACKER_PATH} element={<ManualMatchTracker />} />
      <Route path={APP_ROUTES.ANALISIS.LIST} element={<div>Pantalla de análisis</div>} />
    </Routes>,
    { initialEntries: [APP_ROUTES.ANALISIS.TRACKER('m1')] },
  );
  await waitFor(() =>
    expect(document.querySelector('.mantine-Loader-root')).not.toBeInTheDocument(),
  );
  return view;
};

const clickIcon = (scope: HTMLElement | Document, icon: string) => {
  const button = scope.querySelector(`.tabler-icon-${icon}`)?.closest('button');
  if (!button) throw new Error(`No hay botón con el icono ${icon}`);
  fireEvent.click(button);
};

// El estilo en línea de la raíz del diálogo es el de la transición de Mantine y depende del tiempo.
const stableDialog = (element: HTMLElement) =>
  normalizeIds(element.outerHTML)
    .replace(/mantine-[a-z0-9]{9,}/g, 'mantine-id')
    .replace(/^(<[^>]*?) style="[^"]*"/, '$1');

const PLAN_JSON = JSON.stringify({
  myServe: 'Saque corto al revés',
  theirServe: 'Abrir cruzado',
  strategy: 'Jugar al revés',
});

describe('ManualMatchTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let sequence = 0;
    vi.mocked(api.post).mockImplementation((async (_url: string, body: object) =>
      envelope({ id: `new-${++sequence}`, ...body })) as never);
    vi.mocked(api.put).mockResolvedValue(envelope({}) as never);
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } } as never);
  });

  describe('carga', () => {
    it('muestra un loader mientras llega el partido', () => {
      vi.mocked(api.get).mockReturnValue(new Promise(() => {}));

      renderWithProviders(<ManualMatchTracker />, {
        initialEntries: [APP_ROUTES.ANALISIS.TRACKER('m1')],
      });

      expect(document.querySelector('.mantine-Loader-root')).toBeInTheDocument();
    });

    it('pide el partido por id', async () => {
      await renderTracker(makeMatch());

      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.MANUAL_MATCHES.BY_ID('m1'), undefined);
    });
  });

  describe('planificación (partido programado)', () => {
    const programado = (overrides: Fixture = {}) =>
      makeMatch({ status: 'Programado', analysisType: null, ...overrides });

    it('muestra el plan contra el rival con los campos vacíos', async () => {
      await renderTracker(programado());

      expect(screen.getByText('Plan vs Carlos')).toBeInTheDocument();
      expect(screen.getByLabelText('¿Qué voy a hacer cuando saque yo?')).toHaveValue('');
      expect(screen.getByLabelText('¿Cuál será mi estrategia de partido?')).toHaveValue('');
    });

    it('carga las notas guardadas en JSON en cada campo', async () => {
      await renderTracker(programado({ planningNotes: PLAN_JSON }));

      expect(screen.getByLabelText('¿Qué voy a hacer cuando saque yo?')).toHaveValue(
        'Saque corto al revés',
      );
      expect(screen.getByLabelText('¿Qué voy a hacer cuando saque él?')).toHaveValue(
        'Abrir cruzado',
      );
      expect(screen.getByLabelText('¿Cuál será mi estrategia de partido?')).toHaveValue(
        'Jugar al revés',
      );
    });

    it('unas notas que no son JSON van enteras a la estrategia', async () => {
      await renderTracker(programado({ planningNotes: 'Notas antiguas en texto' }));

      expect(screen.getByLabelText('¿Cuál será mi estrategia de partido?')).toHaveValue(
        'Notas antiguas en texto',
      );
    });

    it('guardar las notas las envía como JSON y vuelve a la lista', async () => {
      await renderTracker(programado());
      fireEvent.change(screen.getByLabelText('¿Qué voy a hacer cuando saque yo?'), {
        target: { value: 'Saque largo' },
      });
      fireEvent.change(screen.getByLabelText('¿Qué voy a hacer cuando saque él?'), {
        target: { value: 'Bloquear' },
      });
      fireEvent.change(screen.getByLabelText('¿Cuál será mi estrategia de partido?'), {
        target: { value: 'Ritmo alto' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Guardar Notas' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(
          ENDPOINTS.MANUAL_MATCHES.UPDATE('m1'),
          {
            planningNotes: JSON.stringify({
              myServe: 'Saque largo',
              theirServe: 'Bloquear',
              strategy: 'Ritmo alto',
            }),
          },
          undefined,
        ),
      );
      expect(await screen.findByText('Pantalla de análisis')).toBeInTheDocument();
    });

    it('si falla el guardado se queda en la pantalla y registra el error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.put).mockRejectedValue(new Error('red caída'));
      await renderTracker(programado());

      fireEvent.click(screen.getByRole('button', { name: 'Guardar Notas' }));

      await waitFor(() => expect(consoleError).toHaveBeenCalled());
      expect(screen.queryByText('Pantalla de análisis')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Guardar Notas' })).toBeEnabled();
    });

    it('ofrece el tipo de análisis con «Rápido» por defecto', async () => {
      await renderTracker(programado());

      expect(screen.getByRole('combobox', { name: 'Tipo de Análisis' })).toHaveValue(
        'Rápido (Rapido)',
      );
    });

    it('empezar el partido lo marca iniciado con el tipo elegido y pasa al modo profundo', async () => {
      await renderTracker(programado());
      chooseOption(/Tipo de Análisis/, 'Profundo (Extenso)');

      fireEvent.click(screen.getByRole('button', { name: 'Empezar Partido' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(
          ENDPOINTS.MANUAL_MATCHES.UPDATE('m1'),
          {
            status: 'Iniciado',
            analysisType: 'Extenso',
          },
          undefined,
        ),
      );
      expect(await screen.findByRole('button', { name: 'PUNTO MÍO' })).toBeInTheDocument();
    });

    it('empezar con «Rápido» pasa al modo de resultado por sets', async () => {
      await renderTracker(programado());

      fireEvent.click(screen.getByRole('button', { name: 'Empezar Partido' }));

      expect(await screen.findByLabelText('Tus Sets Ganados')).toBeInTheDocument();
    });

    it('volver lleva a la lista de análisis', async () => {
      await renderTracker(programado());

      fireEvent.click(screen.getByRole('button', { name: 'Volver a Análisis' }));

      expect(await screen.findByText('Pantalla de análisis')).toBeInTheDocument();
    });
  });

  describe('editar el rival', () => {
    const openEditRival = async () => {
      clickIcon(document.body, 'edit');
      await screen.findByText('Actualizar Datos del Rival');
    };

    it('abre el formulario con los datos actuales del rival', async () => {
      await renderTracker(makeMatch({ status: 'Programado', analysisType: null }));

      await openEditRival();

      expect(screen.getByLabelText('Nombre Real')).toHaveValue('Carlos');
      expect(screen.getByRole('combobox', { name: 'Mano' })).toHaveValue('Diestro');
      expect(screen.getByRole('combobox', { name: 'Estilo' })).toHaveValue('Ofensivo');
      expect(screen.getByRole('combobox', { name: 'Nivel' })).toHaveValue('Igual');
    });

    it('guarda los cambios, cierra el formulario y actualiza el nombre', async () => {
      await renderTracker(makeMatch({ status: 'Programado', analysisType: null }));
      await openEditRival();
      fireEvent.change(screen.getByLabelText('Nombre Real'), { target: { value: 'Carlos Ruiz' } });
      chooseOption(/Mano/, 'Zurdo');

      fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(
          ENDPOINTS.MANUAL_MATCHES.UPDATE('m1'),
          {
            opponentName: 'Carlos Ruiz',
            opponentHand: 'Zurdo',
            opponentStyle: 'Ofensivo',
            opponentLevel: 'Igual',
            opponentRubberForehand: null,
            opponentRubberBackhand: null,
          },
          undefined,
        ),
      );
      expect(await screen.findByText('Plan vs Carlos Ruiz')).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.queryByText('Actualizar Datos del Rival')).not.toBeInTheDocument(),
      );
    });

    it('si falla deja el formulario abierto y registra el error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.put).mockRejectedValue(new Error('red caída'));
      await renderTracker(makeMatch({ status: 'Programado', analysisType: null }));
      await openEditRival();

      fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

      await waitFor(() => expect(consoleError).toHaveBeenCalled());
      expect(screen.getByText('Actualizar Datos del Rival')).toBeInTheDocument();
    });
  });

  describe('modo rápido (resultado por sets)', () => {
    const rapido = (overrides: Fixture = {}) => makeMatch({ analysisType: 'Rapido', ...overrides });

    it('muestra el rival, el formato y los sets que ya llevaba', async () => {
      await renderTracker(rapido({ mySets: 2, opponentSets: 1 }));

      expect(screen.getByText('vs Carlos')).toBeInTheDocument();
      expect(screen.getByText('Al mejor de 3 Sets')).toBeInTheDocument();
      expect(screen.getByLabelText('Tus Sets Ganados')).toHaveValue('2');
      expect(screen.getByLabelText('Sets de Carlos')).toHaveValue('1');
    });

    it('sin sets jugados no pide tanteos', async () => {
      await renderTracker(rapido());

      expect(screen.queryByText('Tanteo por Set (Opcional)')).not.toBeInTheDocument();
    });

    it('pide un tanteo por cada set jugado', async () => {
      await renderTracker(rapido({ mySets: 2, opponentSets: 1 }));

      expect(screen.getByText('Tanteo por Set (Opcional)')).toBeInTheDocument();
      expect(screen.getByLabelText('Set 1 (Tú)')).toBeInTheDocument();
      expect(screen.getByLabelText('Set 3 (Carlos)')).toBeInTheDocument();
      expect(screen.queryByLabelText('Set 4 (Tú)')).not.toBeInTheDocument();
    });

    it('al cambiar los sets ajusta la cantidad de tanteos', async () => {
      await renderTracker(rapido({ mySets: 1, opponentSets: 0 }));
      expect(screen.queryByLabelText('Set 2 (Tú)')).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Sets de Carlos'), { target: { value: '1' } });

      expect(await screen.findByLabelText('Set 2 (Tú)')).toBeInTheDocument();
    });

    it('no se puede finalizar hasta que uno de los dos llegue exactamente a los sets necesarios', async () => {
      await renderTracker(rapido({ mySets: 2, opponentSets: 1 }));

      expect(screen.getByRole('button', { name: 'Guardar y Finalizar Partido' })).toBeDisabled();
      expect(screen.getByText(/debe ganar exactamente 3 sets para finalizar/)).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Tus Sets Ganados'), { target: { value: '3' } });

      expect(screen.getByRole('button', { name: 'Guardar y Finalizar Partido' })).toBeEnabled();
      expect(screen.queryByText(/debe ganar exactamente/)).not.toBeInTheDocument();
    });

    it('con los dos en los sets necesarios tampoco se puede finalizar', async () => {
      await renderTracker(rapido({ mySets: 3, opponentSets: 3 }));

      expect(screen.getByRole('button', { name: 'Guardar y Finalizar Partido' })).toBeDisabled();
    });

    it('ofrece las diez habilidades dos veces: fortalezas y fallos', async () => {
      await renderTracker(rapido());

      expect(screen.getByText('✅ Qué fortalezas tuve en el partido')).toBeInTheDocument();
      expect(screen.getByText('❌ Qué fallé durante el partido')).toBeInTheDocument();
      expect(screen.getAllByRole('checkbox', { name: 'Servicio' })).toHaveLength(2);
      expect(screen.getAllByRole('checkbox')).toHaveLength(20);
    });

    it('finalizar sin marcar nada envía las notas por defecto y los tanteos a cero', async () => {
      await renderTracker(rapido({ mySets: 3, opponentSets: 1 }));

      fireEvent.click(screen.getByRole('button', { name: 'Guardar y Finalizar Partido' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(
          ENDPOINTS.MANUAL_MATCHES.COMPLETE('m1'),
          {
            mySets: 3,
            opponentSets: 1,
            lightNotes:
              'Fortalezas durante el partido:\nNinguna\nDetalles:\nSin detalles\n\nCosas a mejorar:\nNinguna\nDetalles:\nSin detalles',
            setScores: [
              { myScore: 0, oppScore: 0 },
              { myScore: 0, oppScore: 0 },
              { myScore: 0, oppScore: 0 },
              { myScore: 0, oppScore: 0 },
            ],
          },
          undefined,
        ),
      );
    });

    it('finalizar con fortalezas, fallos, detalles y tanteos válidos los incluye', async () => {
      await renderTracker(rapido({ mySets: 3, opponentSets: 0 }));
      const [strengthServe] = screen.getAllByRole('checkbox', { name: 'Servicio' });
      const [, weakReceive] = screen.getAllByRole('checkbox', { name: 'Recepción' });
      fireEvent.click(strengthServe);
      fireEvent.click(weakReceive);
      const [strDetails, weakDetails] = screen.getAllByLabelText('Más Detalles');
      fireEvent.change(strDetails, { target: { value: 'Saque muy sólido' } });
      fireEvent.change(weakDetails, { target: { value: 'Recepción lenta' } });
      fireEvent.change(screen.getByLabelText('Set 1 (Tú)'), { target: { value: '11' } });
      fireEvent.change(screen.getByLabelText('Set 1 (Carlos)'), { target: { value: '7' } });

      fireEvent.click(screen.getByRole('button', { name: 'Guardar y Finalizar Partido' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(
          ENDPOINTS.MANUAL_MATCHES.COMPLETE('m1'),
          {
            mySets: 3,
            opponentSets: 0,
            lightNotes:
              'Fortalezas durante el partido:\n- Servicio\nDetalles:\nSaque muy sólido\n\nCosas a mejorar:\n- Recepción\nDetalles:\nRecepción lenta',
            setScores: [
              { myScore: 11, oppScore: 7 },
              { myScore: 0, oppScore: 0 },
              { myScore: 0, oppScore: 0 },
            ],
          },
          undefined,
        ),
      );
    });

    it('un tanteo imposible avisa y no envía nada', async () => {
      await renderTracker(rapido({ mySets: 3, opponentSets: 0 }));
      fireEvent.change(screen.getByLabelText('Set 2 (Tú)'), { target: { value: '5' } });
      fireEvent.change(screen.getByLabelText('Set 2 (Carlos)'), { target: { value: '3' } });

      fireEvent.click(screen.getByRole('button', { name: 'Guardar y Finalizar Partido' }));

      expect(await screen.findByText('Marcador Inválido')).toBeInTheDocument();
      expect(screen.getByText(/El resultado del Set 2 \(5-3\) es imposible/)).toBeInTheDocument();
      expect(api.put).not.toHaveBeenCalled();
    });

    it('al terminar muestra el reporte con las conclusiones', async () => {
      await renderTracker(rapido({ mySets: 3, opponentSets: 1 }));

      fireEvent.click(screen.getByRole('button', { name: 'Guardar y Finalizar Partido' }));

      expect(await screen.findByText('Reporte del Partido')).toBeInTheDocument();
      expect(screen.getByText('Conclusiones del Partido:')).toBeInTheDocument();
    });

    it('si falla el envío no cambia de pantalla y registra el error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.put).mockRejectedValue(new Error('red caída'));
      await renderTracker(rapido({ mySets: 3, opponentSets: 0 }));

      fireEvent.click(screen.getByRole('button', { name: 'Guardar y Finalizar Partido' }));

      await waitFor(() => expect(consoleError).toHaveBeenCalled());
      expect(screen.queryByText('Reporte del Partido')).not.toBeInTheDocument();
    });

    it('con planificación guardada ofrece verla', async () => {
      await renderTracker(rapido({ planningNotes: PLAN_JSON }));

      fireEvent.click(screen.getByText('Ver Planificación del Partido'));

      const plan = await screen.findByText(/MI SAQUE/);
      expect(plan.textContent).toBe(
        '🎯 MI SAQUE:\nSaque corto al revés\n\n🛡️ SU SAQUE:\nAbrir cruzado\n\n🧠 ESTRATEGIA:\nJugar al revés',
      );
    });

    it('una planificación en texto plano se muestra tal cual', async () => {
      await renderTracker(rapido({ planningNotes: 'Notas antiguas en texto' }));

      fireEvent.click(screen.getByText('Ver Planificación del Partido'));

      expect(await screen.findByText('Notas antiguas en texto')).toBeInTheDocument();
    });

    it('sin planificación no ofrece verla', async () => {
      await renderTracker(rapido());

      expect(screen.queryByText('Ver Planificación del Partido')).not.toBeInTheDocument();
    });
  });

  describe('modo profundo (punto a punto)', () => {
    it('empieza 0 a 0 con los dos botones de punto y el set 1 vacío', async () => {
      await renderTracker(makeMatch());

      expect(screen.getByRole('button', { name: 'PUNTO MÍO' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'PUNTO RIVAL' })).toBeInTheDocument();
      expect(screen.getByText('CARLOS')).toBeInTheDocument();
      expect(screen.getByText('0 Sets a 0')).toBeInTheDocument();
      expect(screen.getByText('Historial del Set 1')).toBeInTheDocument();
      expect(screen.getByText('El set acaba de empezar.')).toBeInTheDocument();
    });

    it('recorta a diez letras el nombre del rival en el marcador', async () => {
      await renderTracker(makeMatch({ opponentName: 'Maximiliano Pérez' }));

      expect(screen.getByText('MAXIMILIAN')).toBeInTheDocument();
    });

    it('«Punto mío» ofrece las categorías de un punto ganado', async () => {
      await renderTracker(makeMatch());

      fireEvent.click(screen.getByRole('button', { name: 'PUNTO MÍO' }));

      expect(screen.getByText('Selecciona Categoría')).toBeInTheDocument();
      ['Servicio', 'Ataque', 'Defensa', 'Error No Forzado (del Rival)', 'Punto Sin Razón'].forEach(
        (label) => expect(screen.getByRole('button', { name: label })).toBeInTheDocument(),
      );
    });

    it('«Punto rival» ofrece las categorías de un punto perdido', async () => {
      await renderTracker(makeMatch());

      fireEvent.click(screen.getByRole('button', { name: 'PUNTO RIVAL' }));

      [
        'Fallo Saque',
        'Fallo Resto',
        'Error No Forzado',
        'Error Forzado (Buen tiro rival)',
        'Mala Movilidad',
        'Punto Sin Razón',
      ].forEach((label) => expect(screen.getByRole('button', { name: label })).toBeInTheDocument());
    });

    it('elegir una categoría con subnivel muestra sus opciones y luego la colocación', async () => {
      await renderTracker(makeMatch());
      fireEvent.click(screen.getByRole('button', { name: 'PUNTO MÍO' }));

      fireEvent.click(screen.getByRole('button', { name: 'Servicio' }));
      expect(screen.getByRole('button', { name: 'Cortado' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Topeado' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sin Efecto' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Cortado' }));
      expect(screen.getByRole('button', { name: 'Derecha' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Revés' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Centro/Codo' })).toBeInTheDocument();
    });

    it('un punto ganado con servicio completo registra categoría, subcategoría y colocación', async () => {
      await renderTracker(makeMatch());
      fireEvent.click(screen.getByRole('button', { name: 'PUNTO MÍO' }));
      fireEvent.click(screen.getByRole('button', { name: 'Servicio' }));
      fireEvent.click(screen.getByRole('button', { name: 'Cortado' }));

      fireEvent.click(screen.getByRole('button', { name: 'Derecha' }));

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(
          ENDPOINTS.MANUAL_MATCHES.ADD_POINT('m1'),
          {
            setNumber: 1,
            pointOrder: 1,
            isWon: true,
            category: 'Servicio',
            subcategory: 'Cortado',
            placement: 'Derecha',
          },
          undefined,
        ),
      );
      expect(await screen.findByText('#1')).toBeInTheDocument();
      expect(screen.getByText('Cortado (Derecha)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'PUNTO MÍO' })).toBeInTheDocument();
    });

    it('una categoría sin subniveles registra el punto al instante, con el resto a null', async () => {
      await renderTracker(makeMatch());
      fireEvent.click(screen.getByRole('button', { name: 'PUNTO MÍO' }));

      fireEvent.click(screen.getByRole('button', { name: 'Punto Sin Razón' }));

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(
          ENDPOINTS.MANUAL_MATCHES.ADD_POINT('m1'),
          {
            setNumber: 1,
            pointOrder: 1,
            isWon: true,
            category: 'SinRazon',
            subcategory: null,
            placement: null,
          },
          undefined,
        ),
      );
    });

    it('un fallo de resto recorre saque y colocación a mi lado y suma al rival', async () => {
      await renderTracker(makeMatch());
      fireEvent.click(screen.getByRole('button', { name: 'PUNTO RIVAL' }));
      fireEvent.click(screen.getByRole('button', { name: 'Fallo Resto' }));
      fireEvent.click(screen.getByRole('button', { name: 'Saque Topeado' }));
      expect(screen.getByRole('button', { name: 'A Mi Derecha' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'A Mi Revés' }));

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(
          ENDPOINTS.MANUAL_MATCHES.ADD_POINT('m1'),
          {
            setNumber: 1,
            pointOrder: 1,
            isWon: false,
            category: 'Resto',
            subcategory: 'Topeado',
            placement: 'Reves',
          },
          undefined,
        ),
      );
      expect(await screen.findByText('Topeado (Reves)')).toBeInTheDocument();
    });

    it('cancelar vuelve a los botones de punto sin registrar nada', async () => {
      await renderTracker(makeMatch());
      fireEvent.click(screen.getByRole('button', { name: 'PUNTO MÍO' }));
      fireEvent.click(screen.getByRole('button', { name: 'Servicio' }));

      fireEvent.click(screen.getByRole('button', { name: 'Cancelar (Volver a Punto Mío/Rival)' }));

      expect(screen.getByRole('button', { name: 'PUNTO MÍO' })).toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('si falla el registro no se añade el punto y se registra el error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.post).mockRejectedValue(new Error('red caída'));
      await renderTracker(makeMatch());
      fireEvent.click(screen.getByRole('button', { name: 'PUNTO MÍO' }));

      fireEvent.click(screen.getByRole('button', { name: 'Punto Sin Razón' }));

      await waitFor(() => expect(consoleError).toHaveBeenCalled());
      expect(screen.getByText('El set acaba de empezar.')).toBeInTheDocument();
    });

    it('retoma el set en curso con su marcador y su historial, el último punto primero', async () => {
      await renderTracker(
        makeMatch({
          points: [
            point(1, 1, true, { category: 'Ataque', subcategory: 'Derecha', placement: 'Centro' }),
            point(1, 2, false, { category: 'Movilidad' }),
          ],
        }),
      );

      expect(screen.getByText('Historial del Set 1')).toBeInTheDocument();
      const rows = screen.getAllByText(/^#\d$/).map((element) => element.textContent);
      expect(rows).toEqual(['#2', '#1']);
      expect(screen.getByText('Derecha (Centro)')).toBeInTheDocument();
    });

    it('si el último set ya estaba terminado retoma en el siguiente', async () => {
      await renderTracker(makeMatch({ mySets: 1, points: setPoints(1, 11, 3) }));

      expect(screen.getByText('Historial del Set 2')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Set 1' })).toBeInTheDocument();
    });

    it('si el último set estaba a medias lo retoma', async () => {
      await renderTracker(makeMatch({ points: setPoints(1, 7, 3) }));

      expect(screen.getByText('Historial del Set 1')).toBeInTheDocument();
    });

    it('un punto sin categoría se rotula «Rapido» en el historial', async () => {
      await renderTracker(makeMatch({ points: [point(1, 1, true)] }));

      expect(screen.getByText('Rapido')).toBeInTheDocument();
    });

    it('deshacer borra el último punto y quita su fila', async () => {
      await renderTracker(makeMatch({ points: [point(1, 1, true), point(1, 2, false)] }));

      clickIcon(document.body, 'arrow-back-up');

      await waitFor(() =>
        expect(api.delete).toHaveBeenCalledWith(
          ENDPOINTS.MANUAL_MATCHES.DELETE_POINT('m1', 'pt-1-2'),
          undefined,
        ),
      );
      await waitFor(() => expect(screen.queryByText('#2')).not.toBeInTheDocument());
      expect(screen.getByText('#1')).toBeInTheDocument();
    });

    it('deshacer sin puntos no llama a la API', async () => {
      await renderTracker(makeMatch());

      clickIcon(document.body, 'arrow-back-up');

      expect(api.delete).not.toHaveBeenCalled();
    });

    it('si falla el borrado conserva el punto y registra el error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.delete).mockRejectedValue(new Error('red caída'));
      await renderTracker(makeMatch({ points: [point(1, 1, true)] }));

      clickIcon(document.body, 'arrow-back-up');

      await waitFor(() => expect(consoleError).toHaveBeenCalled());
      expect(screen.getByText('#1')).toBeInTheDocument();
    });

    it('«Salir del Árbitro» vuelve a la lista', async () => {
      await renderTracker(makeMatch());

      fireEvent.click(screen.getByRole('button', { name: 'Salir del Árbitro' }));

      expect(await screen.findByText('Pantalla de análisis')).toBeInTheDocument();
    });

    it('con planificación guardada ofrece verla', async () => {
      await renderTracker(makeMatch({ planningNotes: PLAN_JSON }));

      fireEvent.click(screen.getByText('Ver Planificación del Partido'));

      expect(await screen.findByText(/MI SAQUE/)).toBeInTheDocument();
    });

    it('pinchar el nombre del rival abre su edición', async () => {
      await renderTracker(makeMatch());

      fireEvent.click(screen.getByText('CARLOS'));

      expect(await screen.findByText('Actualizar Datos del Rival')).toBeInTheDocument();
    });
  });

  describe('final de set y de partido', () => {
    // 10 puntos míos: el siguiente deja el set en 11-0.
    const almostSet = (overrides: Fixture = {}) =>
      makeMatch({
        points: Array.from({ length: 10 }, (_, i) =>
          point(1, i + 1, true, { category: 'Servicio' }),
        ),
        ...overrides,
      });

    const winLastPoint = async () => {
      fireEvent.click(screen.getByRole('button', { name: 'PUNTO MÍO' }));
      fireEvent.click(screen.getByRole('button', { name: 'Punto Sin Razón' }));
      return screen.findByText('¡Set Finalizado!');
    };

    it('al cerrar un set válido avisa del ganador y del marcador', async () => {
      await renderTracker(almostSet());

      await winLastPoint();

      expect(screen.getByText('Has ganado (11 - 0)')).toBeInTheDocument();
    });

    it('resume los puntos del set ordenados de más a menos frecuentes', async () => {
      await renderTracker(almostSet());

      await winLastPoint();

      const dialog = within(screen.getByRole('dialog'));
      expect(dialog.getByText('Tus Fortalezas (Ganados)')).toBeInTheDocument();
      expect(dialog.getByText('Servicio')).toBeInTheDocument();
      expect(dialog.getByText('10')).toBeInTheDocument();
      expect(dialog.getByText('SinRazon')).toBeInTheDocument();
      expect(dialog.getByText('Ninguno')).toBeInTheDocument();
    });

    it('si pierdo el set dice que gana el rival', async () => {
      await renderTracker(
        makeMatch({
          points: Array.from({ length: 10 }, (_, i) =>
            point(1, i + 1, false, { category: 'Resto' }),
          ),
        }),
      );
      fireEvent.click(screen.getByRole('button', { name: 'PUNTO RIVAL' }));
      fireEvent.click(screen.getByRole('button', { name: 'Punto Sin Razón' }));

      expect(await screen.findByText('Rival gana (0 - 11)')).toBeInTheDocument();
    });

    it('avanzar suma el set a quien lo ganó y pasa al siguiente', async () => {
      await renderTracker(almostSet());
      await winLastPoint();

      fireEvent.click(screen.getByRole('button', { name: 'Avanzar al Siguiente Set' }));

      expect(await screen.findByText('Historial del Set 2')).toBeInTheDocument();
      expect(screen.getByText('1 Sets a 0')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Set 1' })).toBeInTheDocument();
    });

    it('deshacer desde el aviso cierra el aviso y borra el último punto', async () => {
      await renderTracker(almostSet());
      await winLastPoint();

      fireEvent.click(screen.getByRole('button', { name: 'Deshacer Último Punto' }));

      await waitFor(() =>
        expect(api.delete).toHaveBeenCalledWith(
          ENDPOINTS.MANUAL_MATCHES.DELETE_POINT('m1', 'new-1'),
          undefined,
        ),
      );
      await waitFor(() => expect(screen.queryByText('¡Set Finalizado!')).not.toBeInTheDocument());
    });

    it('al llegar a los sets necesarios avanzar abre el cierre del partido', async () => {
      await renderTracker(almostSet({ setsToWin: 1 }));
      await winLastPoint();

      fireEvent.click(screen.getByRole('button', { name: 'Avanzar al Siguiente Set' }));

      expect(await screen.findByText('¡Partido Finalizado!')).toBeInTheDocument();
      expect(screen.getByText('Resultado Final: 1 - 0')).toBeInTheDocument();
    });

    it('guardar las conclusiones completa el partido y muestra el reporte', async () => {
      await renderTracker(almostSet({ setsToWin: 1 }));
      await winLastPoint();
      fireEvent.click(screen.getByRole('button', { name: 'Avanzar al Siguiente Set' }));
      await screen.findByText('¡Partido Finalizado!');
      fireEvent.change(screen.getByLabelText('Conclusiones rápidas'), {
        target: { value: 'Buen partido' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Guardar Conclusiones y Cerrar' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(
          ENDPOINTS.MANUAL_MATCHES.COMPLETE('m1'),
          {
            mySets: 1,
            opponentSets: 0,
            lightNotes: 'Buen partido',
            setScores: undefined,
          },
          undefined,
        ),
      );
      expect(await screen.findByText('Reporte del Partido')).toBeInTheDocument();
      expect(screen.getByText('Buen partido')).toBeInTheDocument();
      expect(screen.getByText('Desglose Punto a Punto')).toBeInTheDocument();
    });

    it('cerrar el aviso del partido lleva a la lista', async () => {
      await renderTracker(almostSet({ setsToWin: 1 }));
      await winLastPoint();
      fireEvent.click(screen.getByRole('button', { name: 'Avanzar al Siguiente Set' }));
      await screen.findByText('¡Partido Finalizado!');

      fireEvent.keyDown(screen.getAllByRole('dialog').pop() as HTMLElement, { key: 'Escape' });

      expect(await screen.findByText('Pantalla de análisis')).toBeInTheDocument();
    });
  });

  describe('resumen de un set anterior', () => {
    const withFinishedSet = () =>
      makeMatch({
        mySets: 1,
        points: [
          ...Array.from({ length: 8 }, (_, i) =>
            point(1, i + 1, true, {
              category: 'Servicio',
              subcategory: 'Cortado',
              placement: 'Derecha',
            }),
          ),
          ...Array.from({ length: 3 }, (_, i) => point(1, 9 + i, true, { category: 'Ataque' })),
          ...Array.from({ length: 2 }, (_, i) =>
            point(1, 12 + i, false, { category: 'FalloSaque' }),
          ),
        ],
      });

    it('abre el resumen con el resultado y los puntos agrupados', async () => {
      await renderTracker(withFinishedSet());

      fireEvent.click(screen.getByRole('button', { name: 'Set 1' }));

      expect(await screen.findByText('Resumen del Set 1')).toBeInTheDocument();
      expect(screen.getByText(/Resultado: Ganaste/)).toBeInTheDocument();
      const dialog = within(screen.getByRole('dialog'));
      expect(dialog.getByText('Servicio > Cortado (Derecha)')).toBeInTheDocument();
      expect(dialog.getByText('8')).toBeInTheDocument();
      expect(dialog.getByText('Ataque')).toBeInTheDocument();
      expect(dialog.getByText('FalloSaque')).toBeInTheDocument();
    });

    it('«Cerrar Resumen» lo cierra', async () => {
      await renderTracker(withFinishedSet());
      fireEvent.click(screen.getByRole('button', { name: 'Set 1' }));
      await screen.findByText('Resumen del Set 1');

      fireEvent.click(screen.getByRole('button', { name: 'Cerrar Resumen' }));

      await waitFor(() => expect(screen.queryByText('Resumen del Set 1')).not.toBeInTheDocument());
    });

    it('el botón del set en curso no abre nada', async () => {
      await renderTracker(withFinishedSet());

      fireEvent.click(screen.getByRole('button', { name: 'Set 2' }));

      expect(screen.queryByText('Resumen del Set 2')).not.toBeInTheDocument();
    });
  });

  describe('reporte de un partido completado', () => {
    const completado = (overrides: Fixture = {}) =>
      makeMatch({ status: 'Completado', mySets: 2, opponentSets: 1, ...overrides });

    it('muestra el marcador de sets y el rival en mayúsculas', async () => {
      await renderTracker(completado({ analysisType: 'Rapido' }));

      expect(screen.getByText('Reporte del Partido')).toBeInTheDocument();
      expect(screen.getByText('TÚ')).toBeInTheDocument();
      expect(screen.getByText('SETS')).toBeInTheDocument();
      expect(screen.getByText('CARLOS')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('en modo rápido muestra los tanteos guardados', async () => {
      await renderTracker(
        completado({
          analysisType: 'Rapido',
          setScores: [
            { myScore: 11, oppScore: 7 },
            { myScore: 8, oppScore: 11 },
            { myScore: 11, oppScore: 9 },
          ],
        }),
      );

      expect(screen.getByText('SET 1')).toBeInTheDocument();
      expect(screen.getByText('11 - 7')).toBeInTheDocument();
      expect(screen.getByText('8 - 11')).toBeInTheDocument();
      expect(screen.getByText('SET 3')).toBeInTheDocument();
    });

    it('en modo rápido sin tanteos no muestra la sección', async () => {
      await renderTracker(completado({ analysisType: 'Rapido' }));

      expect(screen.queryByText('SET 1')).not.toBeInTheDocument();
    });

    it('en modo profundo deduce los tanteos de los puntos y los lista', async () => {
      await renderTracker(
        completado({
          points: [...setPoints(1, 11, 4, { category: 'Ataque' }), ...setPoints(2, 6, 11)],
        }),
      );

      expect(screen.getByText('11 - 4')).toBeInTheDocument();
      expect(screen.getByText('6 - 11')).toBeInTheDocument();
      expect(screen.getByText('Desglose Punto a Punto')).toBeInTheDocument();
      expect(screen.getAllByText('Set 1').length).toBeGreaterThan(0);
    });

    it('muestra las conclusiones cuando las hay', async () => {
      await renderTracker(completado({ analysisType: 'Rapido', lightNotes: 'Muy buen partido' }));

      expect(screen.getByText('Conclusiones del Partido:')).toBeInTheDocument();
      expect(screen.getByText('Muy buen partido')).toBeInTheDocument();
    });

    it('sin conclusiones no muestra el recuadro', async () => {
      await renderTracker(completado({ analysisType: 'Rapido' }));

      expect(screen.queryByText('Conclusiones del Partido:')).not.toBeInTheDocument();
    });

    it('en el desglose un punto sin categoría muestra un guion', async () => {
      await renderTracker(completado({ points: [point(1, 1, true)] }));

      expect(screen.getByText('-')).toBeInTheDocument();
      expect(screen.getByText('Mío')).toBeInTheDocument();
    });

    it('volver lleva a la lista', async () => {
      await renderTracker(completado({ analysisType: 'Rapido' }));

      fireEvent.click(screen.getByRole('button', { name: 'Volver a Análisis' }));

      expect(await screen.findByText('Pantalla de análisis')).toBeInTheDocument();
    });
  });

  describe('estructura del DOM', () => {
    // Verificador mecánico de la regla de oro del JSX: si una extracción cambia
    // el HTML renderizado, estos snapshots fallan. Los ids de Mantine se
    // normalizan porque se generan en cada render.
    it('la planificación conserva su estructura', async () => {
      const { container } = await renderTracker(
        makeMatch({ status: 'Programado', analysisType: null, planningNotes: PLAN_JSON }),
      );

      expect(normalizeIds(container.innerHTML)).toMatchSnapshot();
    });

    it('el modo rápido conserva su estructura', async () => {
      const { container } = await renderTracker(
        makeMatch({ analysisType: 'Rapido', mySets: 2, opponentSets: 1 }),
      );

      expect(normalizeIds(container.innerHTML)).toMatchSnapshot();
    });

    it('el modo profundo conserva su estructura', async () => {
      const { container } = await renderTracker(
        makeMatch({
          mySets: 1,
          points: [
            ...setPoints(1, 11, 3, {
              category: 'Servicio',
              subcategory: 'Cortado',
              placement: 'Derecha',
            }),
            point(2, 1, true, { category: 'Ataque', subcategory: 'Reves', placement: 'Centro' }),
            point(2, 2, false, { category: 'Movilidad' }),
          ],
        }),
      );

      expect(normalizeIds(container.innerHTML)).toMatchSnapshot();
    });

    it('el reporte de un partido profundo conserva su estructura', async () => {
      const { container } = await renderTracker(
        makeMatch({
          status: 'Completado',
          mySets: 1,
          opponentSets: 0,
          lightNotes: 'Buen partido',
          points: setPoints(1, 11, 3, {
            category: 'Ataque',
            subcategory: 'Derecha',
            placement: 'Centro',
          }),
        }),
      );

      expect(normalizeIds(container.innerHTML)).toMatchSnapshot();
    });

    it('el reporte de un partido rápido conserva su estructura', async () => {
      const { container } = await renderTracker(
        makeMatch({
          status: 'Completado',
          analysisType: 'Rapido',
          mySets: 2,
          opponentSets: 1,
          lightNotes: 'Conclusiones',
          setScores: [
            { myScore: 11, oppScore: 7 },
            { myScore: 8, oppScore: 11 },
            { myScore: 11, oppScore: 9 },
          ],
        }),
      );

      expect(normalizeIds(container.innerHTML)).toMatchSnapshot();
    });

    it('el modal de editar el rival conserva su estructura', async () => {
      await renderTracker(makeMatch());
      fireEvent.click(screen.getByText('CARLOS'));

      expect(stableDialog(await screen.findByRole('dialog'))).toMatchSnapshot();
    });

    it('el aviso de set finalizado conserva su estructura', async () => {
      await renderTracker(
        makeMatch({
          points: Array.from({ length: 10 }, (_, i) =>
            point(1, i + 1, true, {
              category: 'Servicio',
              subcategory: 'Cortado',
              placement: 'Derecha',
            }),
          ),
        }),
      );
      fireEvent.click(screen.getByRole('button', { name: 'PUNTO MÍO' }));
      fireEvent.click(screen.getByRole('button', { name: 'Punto Sin Razón' }));
      await screen.findByText('¡Set Finalizado!');

      expect(stableDialog(screen.getByRole('dialog'))).toMatchSnapshot();
    });

    it('el resumen de un set conserva su estructura', async () => {
      await renderTracker(
        makeMatch({
          mySets: 1,
          points: [
            ...setPoints(1, 11, 2, {
              category: 'Ataque',
              subcategory: 'Derecha',
              placement: 'Centro',
            }),
          ],
        }),
      );
      fireEvent.click(screen.getByRole('button', { name: 'Set 1' }));
      await screen.findByText('Resumen del Set 1');

      expect(stableDialog(screen.getByRole('dialog'))).toMatchSnapshot();
    });

    it('el aviso de partido finalizado conserva su estructura', async () => {
      await renderTracker(
        makeMatch({
          setsToWin: 1,
          points: Array.from({ length: 10 }, (_, i) =>
            point(1, i + 1, true, { category: 'Servicio' }),
          ),
        }),
      );
      fireEvent.click(screen.getByRole('button', { name: 'PUNTO MÍO' }));
      fireEvent.click(screen.getByRole('button', { name: 'Punto Sin Razón' }));
      await screen.findByText('¡Set Finalizado!');
      fireEvent.click(screen.getByRole('button', { name: 'Avanzar al Siguiente Set' }));
      await screen.findByText('¡Partido Finalizado!');

      const dialogs = screen.getAllByRole('dialog');
      expect(stableDialog(dialogs[dialogs.length - 1])).toMatchSnapshot();
    });
  });
});
