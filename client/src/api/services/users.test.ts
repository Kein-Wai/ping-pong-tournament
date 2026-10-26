import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../axios';
import { ENDPOINTS } from '../endpoints';
import { usersService } from './users';

// Se mockea el `api` de bajo nivel (la frontera del sistema): el servicio y el
// adaptador http se prueban de verdad. Los contratos salen de
// api/src/schemas/user.ts y api/src/routes/user/*.
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

describe('usersService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('consultas', () => {
    it('list pide /users y devuelve la lista del sobre', async () => {
      mockedApi.get.mockResolvedValue(envelope([{ id: 'p1' }, { id: 'p2' }]));

      const result = await usersService.list();

      expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.USERS.BASE, undefined);
      expect(result).toHaveLength(2);
    });

    it('list permite a la pantalla tipar el jugador con su propia proyección', async () => {
      interface FilaJugador {
        id: string;
        stats: { elo: number } | null;
      }
      mockedApi.get.mockResolvedValue(envelope([{ id: 'p1', stats: { elo: 800 } }]));

      const result = await usersService.list<FilaJugador>();

      expect(result[0].stats?.elo).toBe(800);
    });

    it('byId pide /users/:id', async () => {
      mockedApi.get.mockResolvedValue(envelope({ id: 'p1', name: 'Ana' }));

      const result = await usersService.byId('p1');

      expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.USERS.BY_ID('p1'), undefined);
      expect(result).toMatchObject({ id: 'p1', name: 'Ana' });
    });

    it('me pide /users/me', async () => {
      mockedApi.get.mockResolvedValue(envelope({ id: 'p1' }));

      await usersService.me();

      expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.USERS.ME, undefined);
    });

    it('propaga el error de la API', async () => {
      mockedApi.get.mockRejectedValue(new Error('403'));

      await expect(usersService.byId('p1')).rejects.toThrow('403');
    });
  });

  describe('create', () => {
    it('envía el jugador con gomas, ELO y habilidades por POST /users', async () => {
      mockedApi.post.mockResolvedValue(envelope({ id: 'p9' }));

      await usersService.create({
        email: 'luis@test.com',
        name: 'Luis',
        surname: 'Pérez',
        level: 'Intermedio',
        dominantHand: 'Diestro',
        playstyle: 'Ofensivo',
        rubberForehand: 'LISA',
        rubberBackhand: 'PICOS_CORTOS',
        elo: 700,
        skills: SKILLS,
      });

      expect(mockedApi.post).toHaveBeenCalledWith(
        ENDPOINTS.USERS.BASE,
        expect.objectContaining({
          email: 'luis@test.com',
          rubberForehand: 'LISA',
          rubberBackhand: 'PICOS_CORTOS',
          elo: 700,
          skills: SKILLS,
        }),
        undefined,
      );
    });
  });

  describe('createGuest', () => {
    it('envía el invitado por POST /users/guest, sin clubId (lo toma la API del token)', async () => {
      mockedApi.post.mockResolvedValue(envelope({ id: 'g1' }));
      const guest = {
        name: 'Invitado',
        surname: '',
        level: 'Iniciacion' as const,
        dominantHand: 'Diestro' as const,
        playstyle: 'Ofensivo' as const,
        rubberForehand: 'LISA' as const,
        rubberBackhand: 'LISA' as const,
        elo: 500,
        skills: SKILLS,
      };

      await usersService.createGuest(guest);

      expect(mockedApi.post).toHaveBeenCalledWith(ENDPOINTS.USERS.CREATE_GUEST, guest, undefined);
    });
  });

  describe('update', () => {
    it('cambia solo el ELO de otro jugador por PUT /users/:id', async () => {
      mockedApi.put.mockResolvedValue(envelope({ id: 'p1' }));

      await usersService.update('p1', { elo: 750 });

      expect(mockedApi.put).toHaveBeenCalledWith(ENDPOINTS.USERS.BY_ID('p1'), { elo: 750 }, undefined);
    });

    it('cambia el correo de un jugador', async () => {
      mockedApi.put.mockResolvedValue(envelope({ id: 'p1' }));

      await usersService.update('p1', { email: 'nuevo@test.com' });

      expect(mockedApi.put).toHaveBeenCalledWith(
        ENDPOINTS.USERS.BY_ID('p1'),
        { email: 'nuevo@test.com' },
        undefined,
      );
    });

    it('edita el perfil completo de otro jugador, con atributos base', async () => {
      mockedApi.put.mockResolvedValue(envelope({ id: 'p1' }));
      const payload = {
        name: 'Luis',
        surname: 'Pérez',
        nickname: 'Luchi',
        avatarUrl: null,
        dominantHand: 'Zurdo' as const,
        playstyle: 'Defensivo' as const,
        birthDate: '2000-05-20T00:00:00.000Z',
        rubberForehand: 'ANTISPIN' as const,
        rubberBackhand: 'LISA' as const,
        skills: SKILLS,
      };

      await usersService.update('p1', payload);

      expect(mockedApi.put).toHaveBeenCalledWith(ENDPOINTS.USERS.BY_ID('p1'), payload, undefined);
    });
  });

  describe('updateProfile', () => {
    it('cambia la contraseña propia con su confirmación por PUT /users/me', async () => {
      mockedApi.put.mockResolvedValue(envelope({ id: 'p1' }));

      await usersService.updateProfile({
        currentPassword: 'Vieja123@',
        newPassword: 'Abcdef1@',
        confirmPassword: 'Abcdef1@',
      });

      expect(mockedApi.put).toHaveBeenCalledWith(
        ENDPOINTS.USERS.ME,
        { currentPassword: 'Vieja123@', newPassword: 'Abcdef1@', confirmPassword: 'Abcdef1@' },
        undefined,
      );
    });

    it('completa el perfil propio (onboarding) con mano, estilo, fecha y gomas', async () => {
      mockedApi.put.mockResolvedValue(envelope({ id: 'p1' }));
      const onboarding = {
        dominantHand: 'Diestro' as const,
        playstyle: 'Ofensivo' as const,
        birthDate: '2000-05-20T00:00:00.000Z',
        rubberForehand: 'LISA' as const,
        rubberBackhand: 'LISA' as const,
      };

      await usersService.updateProfile(onboarding);

      expect(mockedApi.put).toHaveBeenCalledWith(ENDPOINTS.USERS.ME, onboarding, undefined);
    });
  });

  it('no expone resetPassword: el reseteo de contraseña es de authService', () => {
    expect(usersService).not.toHaveProperty('resetPassword');
  });
});
