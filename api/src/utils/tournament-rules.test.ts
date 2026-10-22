import { describe, it, expect } from 'vitest';
import { Rounds } from '@prisma/client';
import { validateTournamentRules } from './tournament-rules';

describe('Reglas de formato de torneo (api/src/utils/tournament-rules.ts)', () => {
  it('no devuelve incumplimientos si el tipo de ronda no esta definido', () => {
    const issues = validateTournamentRules({
      rounds: undefined,
      numPlayers: 3,
    });

    expect(issues).toEqual([]);
  });

  describe('Todos vs Todos', () => {
    it('exige entre 3 y 10 jugadores', () => {
      const tooFew = validateTournamentRules({
        rounds: Rounds.TodosvsTodos,
        numPlayers: 2,
        numGroup: 1,
      });
      const tooMany = validateTournamentRules({
        rounds: Rounds.TodosvsTodos,
        numPlayers: 11,
        numGroup: 1,
      });

      expect(tooFew[0].path).toEqual(['numPlayers']);
      expect(tooMany[0].path).toEqual(['numPlayers']);
    });

    it('exige exactamente un grupo', () => {
      const issues = validateTournamentRules({
        rounds: Rounds.TodosvsTodos,
        numPlayers: 5,
        numGroup: 2,
      });

      expect(issues).toHaveLength(1);
      expect(issues[0].path).toEqual(['numGroup']);
    });

    it('acepta un torneo valido', () => {
      const issues = validateTournamentRules({
        rounds: Rounds.TodosvsTodos,
        numPlayers: 5,
        numGroup: 1,
      });

      expect(issues).toEqual([]);
    });
  });

  describe('Grupos y Eliminatorias', () => {
    const valid = {
      rounds: Rounds.GruposKnockout,
      numPlayers: 16,
      numGroup: 4,
      numGroupPlayers: 4,
      playersKnockout: 2,
    };

    it('exige entre 6 y 128 jugadores', () => {
      const issues = validateTournamentRules({ ...valid, numPlayers: 4 });

      expect(issues[0].path).toEqual(['numPlayers']);
    });

    it('exige entre 2 y 16 grupos', () => {
      const issues = validateTournamentRules({ ...valid, numGroup: 1 });

      expect(issues[0].path).toEqual(['numGroup']);
    });

    it('exige al menos 3 jugadores por grupo', () => {
      const issues = validateTournamentRules({ ...valid, numGroupPlayers: 2 });

      expect(issues[0].path).toEqual(['numGroupPlayers']);
    });

    it('exige especificar cuantos clasifican a llave', () => {
      const issues = validateTournamentRules({ ...valid, playersKnockout: undefined });

      expect(issues[0].path).toEqual(['numKnockouts']);
    });

    it('no admite mas clasificados que jugadores hay en los grupos', () => {
      // 8 jugadores en 2 grupos son 4 por grupo: no pueden clasificar 5.
      const issues = validateTournamentRules({
        ...valid,
        numPlayers: 8,
        numGroup: 2,
        numGroupPlayers: 4,
        playersKnockout: 5,
      });

      expect(issues[0].path).toEqual(['numKnockouts']);
      expect(issues[0].message).toContain('más clasificados');
    });

    it('acepta un torneo valido', () => {
      expect(validateTournamentRules(valid)).toEqual([]);
    });
  });

  describe('Solo Eliminatorias', () => {
    it('exige entre 4 y 128 jugadores', () => {
      const issues = validateTournamentRules({ rounds: Rounds.Knockout, numPlayers: 2 });

      expect(issues[0].path).toEqual(['numPlayers']);
    });

    it('no admite configuracion de grupos', () => {
      const issues = validateTournamentRules({
        rounds: Rounds.Knockout,
        numPlayers: 8,
        numGroup: 2,
      });

      expect(issues[0].path).toEqual(['numGroup']);
    });

    it('acepta un torneo valido', () => {
      expect(validateTournamentRules({ rounds: Rounds.Knockout, numPlayers: 8 })).toEqual([]);
    });
  });

  it('acumula todos los incumplimientos de un torneo invalido', () => {
    const issues = validateTournamentRules({
      rounds: Rounds.GruposKnockout,
      numPlayers: 2,
      numGroup: 1,
      numGroupPlayers: 1,
      playersKnockout: undefined,
    });

    expect(issues.map((issue) => issue.path)).toEqual([
      ['numPlayers'],
      ['numGroup'],
      ['numGroupPlayers'],
      ['numKnockouts'],
    ]);
  });
});
