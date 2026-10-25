import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../axios';
import { ENDPOINTS } from '../endpoints';
import { clubsService } from './clubs';

// Se mockea el `api` de bajo nivel (la frontera del sistema): el servicio y el
// adaptador http se prueban de verdad. Los contratos salen de api/src/routes/club.ts
// y api/src/schemas/club.ts.
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

const SKILLS = {
  derechaPlano: 40,
  revesPlano: 40,
  topspinDerecha: 40,
  topspinReves: 40,
  corte: 40,
  bloqueoDerecha: 40,
  bloqueoReves: 40,
  servicio: 40,
  recepcion: 40,
  movilidad: 40,
  fortalezaMental: 40,
  experiencia: 40,
};

describe('clubsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('consultas', () => {
    it('list devuelve los clubes públicos con su recuento de miembros', async () => {
      mockedApi.get.mockResolvedValue(
        envelope([{ id: 'c1', name: 'Club Norte', city: 'Madrid', memberCount: 12, createdAt: '2021-06-15' }]),
      );

      const result = await clubsService.list();

      expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.CLUBS.BASE, undefined);
      expect(result[0].memberCount).toBe(12);
    });

    it('adminList devuelve todos los clubes con sus administradores', async () => {
      mockedApi.get.mockResolvedValue(
        envelope([
          {
            id: 'c1',
            name: 'Club Norte',
            city: 'Madrid',
            status: 'Pendiente',
            createdAt: '2021-06-15',
            _count: { users: 3 },
            users: [{ name: 'Ana', surname: null, email: 'ana@test.com' }],
          },
        ]),
      );

      const result = await clubsService.adminList();

      expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.CLUBS.ADMIN_ALL, undefined);
      expect(result[0]._count.users).toBe(3);
      expect(result[0].users[0].email).toBe('ana@test.com');
    });

    it('byId devuelve el club con sus miembros aprobados', async () => {
      mockedApi.get.mockResolvedValue(
        envelope({ id: 'c1', name: 'Club Norte', _count: { users: 2 }, users: [{ birthDate: null }] }),
      );

      const result = await clubsService.byId('c1');

      expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.CLUBS.BY_ID('c1'), undefined);
      expect(result._count.users).toBe(2);
    });

    it('notifications devuelve los contadores pendientes', async () => {
      mockedApi.get.mockResolvedValue(
        envelope({ pendingMembers: 2, pendingTournaments: 1, total: 3 }),
      );

      const result = await clubsService.notifications('c1');

      expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.CLUBS.NOTIFICATIONS('c1'), undefined);
      expect(result).toEqual({ pendingMembers: 2, pendingTournaments: 1, total: 3 });
    });

    it('propaga el error de la API', async () => {
      mockedApi.get.mockRejectedValue(new Error('403'));

      await expect(clubsService.byId('c1')).rejects.toThrow('403');
    });
  });

  describe('escritura', () => {
    it('create envía nombre y ciudad por POST y devuelve el club creado', async () => {
      mockedApi.post.mockResolvedValue(envelope({ id: 'c9', name: 'Club Sur', status: 'Pendiente' }));

      const result = await clubsService.create({ name: 'Club Sur', city: 'Sevilla' });

      expect(mockedApi.post).toHaveBeenCalledWith(
        ENDPOINTS.CLUBS.BASE,
        { name: 'Club Sur', city: 'Sevilla' },
        undefined,
      );
      expect(result.id).toBe('c9');
    });

    it('update cambia solo el estado de un club (panel de administración)', async () => {
      mockedApi.put.mockResolvedValue(envelope({ id: 'c1' }));

      await clubsService.update('c1', { status: 'Aprobado' });

      expect(mockedApi.put).toHaveBeenCalledWith(
        ENDPOINTS.CLUBS.UPDATE('c1'),
        { status: 'Aprobado' },
        undefined,
      );
    });

    it('update admite null para vaciar dirección, fecha de fundación y logo', async () => {
      mockedApi.put.mockResolvedValue(envelope({ id: 'c1' }));
      const payload = {
        name: 'Club Norte',
        city: 'Madrid',
        address: null,
        foundedAt: null,
        logoUrl: null,
      };

      await clubsService.update('c1', payload);

      expect(mockedApi.put).toHaveBeenCalledWith(ENDPOINTS.CLUBS.UPDATE('c1'), payload, undefined);
    });

    it('join solicita el ingreso por POST sin cuerpo y no devuelve datos', async () => {
      mockedApi.post.mockResolvedValue({
        data: { success: true, message: 'Solicitud enviada al administrador del club' },
      });

      const result = await clubsService.join('c1');

      expect(mockedApi.post).toHaveBeenCalledWith(ENDPOINTS.CLUBS.JOIN('c1'), undefined, undefined);
      expect(result).toBeUndefined();
    });

    it('join propaga el error si el usuario ya tiene club', async () => {
      mockedApi.post.mockRejectedValue(new Error('400'));

      await expect(clubsService.join('c1')).rejects.toThrow('400');
    });
  });

  describe('updateMemberStatus', () => {
    it('rechaza a un miembro enviando solo el estado', async () => {
      mockedApi.put.mockResolvedValue({ data: { success: true, message: 'Usuario rechazado con éxito' } });

      const result = await clubsService.updateMemberStatus('c1', 'p1', { status: 'Rechazado' });

      expect(mockedApi.put).toHaveBeenCalledWith(
        ENDPOINTS.CLUBS.MEMBER_STATUS('c1', 'p1'),
        { status: 'Rechazado' },
        undefined,
      );
      expect(result).toBeUndefined();
    });

    it('aprueba a un miembro con nivel, ELO inicial y habilidades', async () => {
      mockedApi.put.mockResolvedValue({ data: { success: true, message: 'Usuario aprobado con éxito' } });
      const payload = {
        status: 'Aprobado' as const,
        level: 'Intermedio' as const,
        elo: 700,
        skills: SKILLS,
      };

      await clubsService.updateMemberStatus('c1', 'p1', payload);

      expect(mockedApi.put).toHaveBeenCalledWith(
        ENDPOINTS.CLUBS.MEMBER_STATUS('c1', 'p1'),
        payload,
        undefined,
      );
    });
  });

  it('no expone members: ninguna pantalla lo usa', () => {
    expect(clubsService).not.toHaveProperty('members');
  });
});
