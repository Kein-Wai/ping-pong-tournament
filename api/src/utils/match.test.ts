import { describe, it, expect } from 'vitest';
import { calculateMatchResults } from './match';
import { MatchStatus } from '@prisma/client';

describe('Utility: calculate Match', () => {
  const matchPayload1 = {
    status: MatchStatus.Completado,
    playerOneId: 'uuid-player-1',
    playerTwoId: 'uuid-player-2',
    setOnePlayerOne: 11,
    setOnePlayerTwo: 5,
    setTwoPlayerOne: 11,
    setTwoPlayerTwo: 9,
  };
  const matchPayload2 = {
    status: MatchStatus.Completado,
    playerOneId: 'uuid-player-1',
    playerTwoId: 'uuid-player-2',
    setOnePlayerOne: 12,
    setOnePlayerTwo: 14,
    setTwoPlayerOne: 1,
    setTwoPlayerTwo: 11,
    setThreePlayerOne: 1,
    setThreePlayerTwo: 11,
  };
  it('Pass: player 1 wins', () => {
    const result = calculateMatchResults(matchPayload1);
    expect(result).toEqual({
      p1Sets: 2,
      p2Sets: 0,
      p1Points: 22,
      p2Points: 14,
      p1WinsMatch: true,
      p2WinsMatch: false,
    });
  });

  it('Pass: player 2 wins', () => {
    const result = calculateMatchResults(matchPayload2);
    expect(result).toEqual({
      p1Sets: 0,
      p2Sets: 3,
      p1Points: 14,
      p2Points: 36,
      p1WinsMatch: false,
      p2WinsMatch: true,
    });
  });
});
