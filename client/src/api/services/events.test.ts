import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../axios';
import { ENDPOINTS } from '../endpoints';
import { eventsService } from './events';

// Se mockea el `api` de bajo nivel (la frontera del sistema): el servicio y el
// adaptador http se prueban de verdad. Los contratos salen de
// api/src/routes/event.ts y api/src/schemas/event.ts.
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
const onlyMessage = (message: string) => ({ data: { success: true, message } });

describe('eventsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('byClub devuelve los eventos del club con los recordatorios del usuario', async () => {
    mockedApi.get.mockResolvedValue(
      envelope([
        {
          id: 'e1',
          name: 'Torneo social',
          date: '2026-11-20T10:00:00.000Z',
          region: 'Local',
          reminders: [{ id: 'r1', notifyAt: '2026-11-13T10:00:00.000Z', isSent: false }],
        },
      ]),
    );

    const result = await eventsService.byClub('c1');

    expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.EVENTS.BY_CLUB('c1'), undefined);
    expect(result[0].reminders).toHaveLength(1);
  });

  it('propaga el error de la API', async () => {
    mockedApi.get.mockRejectedValue(new Error('500'));

    await expect(eventsService.byClub('c1')).rejects.toThrow('500');
  });

  it('create envía el evento por POST /events y devuelve el evento creado', async () => {
    mockedApi.post.mockResolvedValue(envelope({ id: 'e9' }));
    const payload = {
      name: 'Torneo social',
      date: '2026-11-20T10:00:00.000Z',
      endDate: null,
      region: 'Provincial' as const,
      location: 'Pabellón Norte',
      color: 'teal',
    };

    const result = await eventsService.create(payload);

    expect(mockedApi.post).toHaveBeenCalledWith(ENDPOINTS.EVENTS.BASE, payload, undefined);
    expect(result.id).toBe('e9');
  });

  it('update edita el evento por PUT /events/:id', async () => {
    mockedApi.put.mockResolvedValue(envelope({ id: 'e1' }));

    await eventsService.update('e1', { date: '2026-11-25T10:00:00.000Z' });

    expect(mockedApi.put).toHaveBeenCalledWith(
      ENDPOINTS.EVENTS.UPDATE('e1'),
      { date: '2026-11-25T10:00:00.000Z' },
      undefined,
    );
  });

  it('remove borra el evento por DELETE /events/:id y no devuelve datos', async () => {
    mockedApi.delete.mockResolvedValue(onlyMessage('Evento eliminado'));

    const result = await eventsService.remove('e1');

    expect(mockedApi.delete).toHaveBeenCalledWith(ENDPOINTS.EVENTS.DELETE('e1'), undefined);
    expect(result).toBeUndefined();
  });

  describe('recordatorios', () => {
    it('addReminder activa los recordatorios por POST, sin cuerpo', async () => {
      mockedApi.post.mockResolvedValue(onlyMessage('Recordatorios activados'));

      const result = await eventsService.addReminder('e1');

      expect(mockedApi.post).toHaveBeenCalledWith(ENDPOINTS.EVENTS.REMINDERS('e1'), undefined, undefined);
      expect(result).toBeUndefined();
    });

    it('removeReminder cancela los recordatorios por DELETE', async () => {
      mockedApi.delete.mockResolvedValue(onlyMessage('Recordatorios cancelados'));

      const result = await eventsService.removeReminder('e1');

      expect(mockedApi.delete).toHaveBeenCalledWith(ENDPOINTS.EVENTS.REMINDERS('e1'), undefined);
      expect(result).toBeUndefined();
    });
  });

  it('no expone reminders: la API no tiene una ruta de lectura de recordatorios', () => {
    expect(eventsService).not.toHaveProperty('reminders');
  });
});
