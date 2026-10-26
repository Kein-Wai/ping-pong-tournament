import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../axios';
import { ENDPOINTS } from '../endpoints';
import { skillsService } from './skills';

// Se mockea el `api` de bajo nivel (la frontera del sistema): el servicio y el
// adaptador http se prueban de verdad. Contrato: PUT /skills/:playerId/consolidate
// con las doce habilidades (api/src/routes/skill.ts).
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

const SKILLS = {
  derechaPlano: 71,
  revesPlano: 65,
  topspinDerecha: 60,
  topspinReves: 55,
  corte: 50,
  bloqueoDerecha: 45,
  bloqueoReves: 40,
  servicio: 35,
  recepcion: 30,
  movilidad: 25,
  fortalezaMental: 20,
  experiencia: 15,
};

describe('skillsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consolidate envía las habilidades finales por PUT y no devuelve datos', async () => {
    mockedApi.put.mockResolvedValue({
      data: { success: true, message: 'Progresión consolidada con éxito' },
    });

    const result = await skillsService.consolidate('p1', SKILLS);

    expect(mockedApi.put).toHaveBeenCalledWith(ENDPOINTS.SKILLS.CONSOLIDATE('p1'), SKILLS, undefined);
    expect(mockedApi.post).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('consolidate propaga el error si el jugador es de otro club', async () => {
    mockedApi.put.mockRejectedValue(new Error('403'));

    await expect(skillsService.consolidate('p1', SKILLS)).rejects.toThrow('403');
  });
});
