import { describe, it, expect } from 'vitest';
import { LEVEL_BASE_STATS } from '../constants/players';
import type { PlayerListItem, PlayerListStats } from '../types/players';
import {
  EMPTY_SKILL_INPUTS,
  buildFinalSkills,
  filterPlayers,
  getPlayerStats,
  getWinRate,
  isGuestEmail,
} from './players';

const player = (overrides: Partial<PlayerListItem> = {}): PlayerListItem => ({
  id: 'p',
  email: 'p@test.com',
  name: 'Nombre',
  clubStatus: 'Aprobado',
  ...overrides,
});

const STATS: PlayerListStats = { elo: 1200, matchWon: 3, matchLost: 1, setWon: 9, setLost: 4 };

describe('LEVEL_BASE_STATS', () => {
  it('sube de veinte en veinte desde la iniciación', () => {
    expect(LEVEL_BASE_STATS).toEqual({
      Iniciacion: 0,
      Principiante: 20,
      Intermedio: 40,
      Avanzado: 60,
      Profesional: 80,
    });
  });
});

describe('getPlayerStats', () => {
  it('devuelve las estadísticas tal cual cuando llegan como objeto', () => {
    expect(getPlayerStats(player({ stats: STATS }))).toBe(STATS);
  });

  it('toma el primer elemento cuando llegan como array', () => {
    const asArray = [STATS] as unknown as PlayerListStats;

    expect(getPlayerStats(player({ stats: asArray }))).toBe(STATS);
  });

  it('sin estadísticas devuelve undefined', () => {
    expect(getPlayerStats(player())).toBeUndefined();
  });
});

describe('getWinRate', () => {
  it('redondea el porcentaje de victorias', () => {
    expect(getWinRate({ ...STATS, matchWon: 1, matchLost: 2 })).toBe(33);
    expect(getWinRate(STATS)).toBe(75);
  });

  it('sin partidos o sin estadísticas es cero', () => {
    expect(getWinRate({ ...STATS, matchWon: 0, matchLost: 0 })).toBe(0);
    expect(getWinRate(undefined)).toBe(0);
  });
});

describe('filterPlayers', () => {
  const ana = player({ id: '1', name: 'Ana', surname: 'Pérez' });
  const luis = player({ id: '2', name: 'Luis' });
  const pedro = player({ id: '3', name: 'Pedro', clubStatus: 'Pendiente' });
  const all = [ana, luis, pedro];

  it('deja solo los del estado pedido', () => {
    expect(filterPlayers(all, '', 'Pendiente')).toEqual([pedro]);
  });

  it('busca en el nombre completo sin distinguir mayúsculas', () => {
    expect(filterPlayers(all, 'ana PÉREZ', 'Aprobado')).toEqual([ana]);
  });

  it('un jugador sin apellidos se busca solo por el nombre', () => {
    expect(filterPlayers(all, 'luis', 'Aprobado')).toEqual([luis]);
  });

  it('combina búsqueda y estado', () => {
    expect(filterPlayers(all, 'pedro', 'Aprobado')).toEqual([]);
  });
});

describe('buildFinalSkills', () => {
  it('sin nada rellenado todas las habilidades valen la base del nivel', () => {
    const skills = buildFinalSkills('Intermedio', EMPTY_SKILL_INPUTS);

    expect(Object.keys(skills)).toHaveLength(12);
    expect(Object.values(skills).every((value) => value === 40)).toBe(true);
  });

  it('una habilidad rellenada sustituye a la base, también si es cero', () => {
    const skills = buildFinalSkills('Avanzado', {
      ...EMPTY_SKILL_INPUTS,
      derechaPlano: 90,
      corte: 0,
    });

    expect(skills.derechaPlano).toBe(90);
    expect(skills.corte).toBe(0);
    expect(skills.servicio).toBe(60);
  });
});

describe('isGuestEmail', () => {
  it('reconoce el correo ficticio de un invitado', () => {
    expect(isGuestEmail('gus@guest.pingpong')).toBe(true);
  });

  it('un correo real no lo es', () => {
    expect(isGuestEmail('gus@real.com')).toBe(false);
  });
});
