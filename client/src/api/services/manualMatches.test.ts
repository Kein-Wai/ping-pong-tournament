import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../axios';
import { ENDPOINTS } from '../endpoints';
import { manualMatchesService } from './manualMatches';

// Se mockea el `api` de bajo nivel (la frontera del sistema): el servicio y el
// adaptador http se prueban de verdad. Los contratos salen de
// api/src/routes/manual-match.ts y api/src/schemas/manualMatch.ts.
vi.mock('../axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

const envelope = <T>(data: T) => ({ data: { success: true, data } });

describe('manualMatchesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('consultas', () => {
    it('list pide los partidos manuales del usuario', async () => {
      mockedApi.get.mockResolvedValue(envelope([{ id: 'm1' }]));

      const result = await manualMatchesService.list();

      expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.MANUAL_MATCHES.BASE, undefined);
      expect(result).toHaveLength(1);
    });

    it('byId pide el partido con sus puntos', async () => {
      mockedApi.get.mockResolvedValue(envelope({ id: 'm1', points: [{ id: 'pt1' }] }));

      const result = await manualMatchesService.byId('m1');

      expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.MANUAL_MATCHES.BY_ID('m1'), undefined);
      expect(result.points).toHaveLength(1);
    });

    it('propaga el error de la API', async () => {
      mockedApi.get.mockRejectedValue(new Error('404'));

      await expect(manualMatchesService.byId('m1')).rejects.toThrow('404');
    });
  });

  describe('create', () => {
    it('envía el partido con el tipo de análisis y los datos del rival', async () => {
      mockedApi.post.mockResolvedValue(envelope({ id: 'm9' }));
      const payload = {
        opponentName: 'Rival',
        matchType: 'Amistoso' as const,
        location: 'Casa' as const,
        format: 'Individual' as const,
        analysisType: 'Rapido' as const,
        opponentHand: 'Zurdo' as const,
        opponentStyle: 'Defensivo' as const,
        opponentLevel: 'Igual' as const,
        opponentRubberForehand: 'LISA' as const,
        opponentRubberBackhand: null,
        status: 'Programado' as const,
        setsToWin: 3,
        date: '2026-10-25T10:00:00.000Z',
      };

      const result = await manualMatchesService.create(payload);

      expect(mockedApi.post).toHaveBeenCalledWith(ENDPOINTS.MANUAL_MATCHES.BASE, payload, undefined);
      expect(result.id).toBe('m9');
    });
  });

  describe('update', () => {
    it('actualiza los datos del rival', async () => {
      mockedApi.put.mockResolvedValue(envelope({ id: 'm1' }));
      const payload = {
        opponentName: 'Nuevo rival',
        opponentHand: 'Diestro' as const,
        opponentStyle: null,
        opponentLevel: 'Mejor' as const,
        opponentRubberForehand: 'PICOS_CORTOS' as const,
        opponentRubberBackhand: 'LISA' as const,
      };

      await manualMatchesService.update('m1', payload);

      expect(mockedApi.put).toHaveBeenCalledWith(ENDPOINTS.MANUAL_MATCHES.UPDATE('m1'), payload, undefined);
    });

    it('guarda las notas de planificación', async () => {
      mockedApi.put.mockResolvedValue(envelope({ id: 'm1' }));

      await manualMatchesService.update('m1', { planningNotes: '{"myServe":"corto"}' });

      expect(mockedApi.put).toHaveBeenCalledWith(
        ENDPOINTS.MANUAL_MATCHES.UPDATE('m1'),
        { planningNotes: '{"myServe":"corto"}' },
        undefined,
      );
    });

    it('inicia el partido cambiando su estado y tipo de análisis', async () => {
      mockedApi.put.mockResolvedValue(envelope({ id: 'm1' }));

      await manualMatchesService.update('m1', { status: 'Iniciado', analysisType: 'Extenso' });

      expect(mockedApi.put).toHaveBeenCalledWith(
        ENDPOINTS.MANUAL_MATCHES.UPDATE('m1'),
        { status: 'Iniciado', analysisType: 'Extenso' },
        undefined,
      );
    });
  });

  describe('puntos', () => {
    it('addPoint envía el punto con su set, su orden y su clasificación', async () => {
      mockedApi.post.mockResolvedValue(envelope({ id: 'pt1', pointOrder: 3 }));
      const point = {
        setNumber: 1,
        pointOrder: 3,
        isWon: true,
        category: 'Ataque' as const,
        subcategory: 'Topeado' as const,
        placement: 'Derecha' as const,
      };

      const result = await manualMatchesService.addPoint('m1', point);

      expect(mockedApi.post).toHaveBeenCalledWith(
        ENDPOINTS.MANUAL_MATCHES.ADD_POINT('m1'),
        point,
        undefined,
      );
      expect(result.id).toBe('pt1');
    });

    it('addPoint admite un punto sin clasificar', async () => {
      mockedApi.post.mockResolvedValue(envelope({ id: 'pt2' }));
      const point = {
        setNumber: 2,
        pointOrder: 1,
        isWon: false,
        category: null,
        subcategory: null,
        placement: null,
      };

      await manualMatchesService.addPoint('m1', point);

      expect(mockedApi.post).toHaveBeenCalledWith(
        ENDPOINTS.MANUAL_MATCHES.ADD_POINT('m1'),
        point,
        undefined,
      );
    });

    it('deletePoint deshace un punto por DELETE', async () => {
      mockedApi.delete.mockResolvedValue({ data: { success: true, message: 'Punto deshecho' } });

      const result = await manualMatchesService.deletePoint('m1', 'pt1');

      expect(mockedApi.delete).toHaveBeenCalledWith(
        ENDPOINTS.MANUAL_MATCHES.DELETE_POINT('m1', 'pt1'),
        undefined,
      );
      expect(result).toBeUndefined();
    });
  });

  describe('complete', () => {
    it('finaliza el partido enviando sets, notas y marcadores por set', async () => {
      mockedApi.put.mockResolvedValue(envelope({ id: 'm1', status: 'Completado' }));
      const payload = {
        mySets: 3,
        opponentSets: 1,
        lightNotes: 'Buen saque',
        setScores: [
          { myScore: 11, oppScore: 7 },
          { myScore: 9, oppScore: 11 },
        ],
      };

      const result = await manualMatchesService.complete('m1', payload);

      expect(mockedApi.put).toHaveBeenCalledWith(
        ENDPOINTS.MANUAL_MATCHES.COMPLETE('m1'),
        payload,
        undefined,
      );
      expect(result.status).toBe('Completado');
    });

    it('permite finalizar sin marcadores por set', async () => {
      mockedApi.put.mockResolvedValue(envelope({ id: 'm1' }));

      await manualMatchesService.complete('m1', { mySets: 2, opponentSets: 0, setScores: null });

      expect(mockedApi.put).toHaveBeenCalledWith(
        ENDPOINTS.MANUAL_MATCHES.COMPLETE('m1'),
        { mySets: 2, opponentSets: 0, setScores: null },
        undefined,
      );
    });
  });
});
