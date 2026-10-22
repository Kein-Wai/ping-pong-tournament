import { describe, it, expect } from 'vitest';
import { MatchStatus } from '@prisma/client';
import { validateMatchRules } from './match-rules';

describe('Reglas de negocio de partido (api/src/utils/match-rules.ts)', () => {
  it('ignora los sets sin puntuacion', () => {
    const issues = validateMatchRules({ scores: {} });

    expect(issues).toEqual([]);
  });

  it('ignora los sets a 0-0', () => {
    const issues = validateMatchRules({
      scores: { setOnePlayerOne: 0, setOnePlayerTwo: 0 },
    });

    expect(issues).toEqual([]);
  });

  it('falla si solo se ha enviado la puntuacion de un jugador', () => {
    const issues = validateMatchRules({ scores: { setOnePlayerOne: 11 } });

    expect(issues).toHaveLength(1);
    expect(issues[0].path).toEqual(['setOnePlayerTwo']);
    expect(issues[0].message).toContain('Set 1');
  });

  it('falla si el marcador no es valido en tenis de mesa', () => {
    // 15-10 no es un resultado valido: la diferencia debe ser exactamente 2.
    const issues = validateMatchRules({
      scores: { setOnePlayerOne: 15, setOnePlayerTwo: 10 },
    });

    expect(issues).toHaveLength(1);
    expect(issues[0].path).toEqual(['setOnePlayerOne']);
    expect(issues[0].message).toContain('15-10');
  });

  it('acepta marcadores validos', () => {
    const issues = validateMatchRules({
      scores: {
        setOnePlayerOne: 11,
        setOnePlayerTwo: 5,
        setTwoPlayerOne: 11,
        setTwoPlayerTwo: 9,
      },
    });

    expect(issues).toEqual([]);
  });

  it('exige ganar exactamente los sets indicados para completar el partido', () => {
    const issues = validateMatchRules({
      scores: { setOnePlayerOne: 11, setOnePlayerTwo: 5 },
      status: MatchStatus.Completado,
      setsToWin: 2,
    });

    expect(issues).toHaveLength(1);
    expect(issues[0].path).toEqual(['status']);
    expect(issues[0].message).toContain('1-0');
  });

  it('no exige sets ganados si el partido no esta completado', () => {
    const issues = validateMatchRules({
      scores: { setOnePlayerOne: 11, setOnePlayerTwo: 5 },
      status: MatchStatus.Programado,
      setsToWin: 2,
    });

    expect(issues).toEqual([]);
  });

  it('acepta un partido completado con los sets justos', () => {
    const issues = validateMatchRules({
      scores: {
        setOnePlayerOne: 11,
        setOnePlayerTwo: 5,
        setTwoPlayerOne: 11,
        setTwoPlayerTwo: 7,
      },
      status: MatchStatus.Completado,
      setsToWin: 2,
    });

    expect(issues).toEqual([]);
  });

  it('acumula los incumplimientos de cada set', () => {
    const issues = validateMatchRules({
      scores: {
        setOnePlayerOne: 15,
        setOnePlayerTwo: 10,
        setTwoPlayerOne: 11,
      },
    });

    expect(issues.map((issue) => issue.path)).toEqual([
      ['setOnePlayerOne'],
      ['setTwoPlayerTwo'],
    ]);
  });
});
