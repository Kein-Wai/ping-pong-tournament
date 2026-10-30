import { describe, it, expect } from 'vitest';
import { calculateEffectiveResults, calculateMatchResults } from './match';
import { computeGroupStandings } from './group-standings';

const walkover = {
  playerOneId: 'a',
  playerTwoId: 'b',
  setOnePlayerOne: 11,
  setOnePlayerTwo: 0,
  setTwoPlayerOne: 11,
  setTwoPlayerTwo: 0,
};

describe('calculateEffectiveResults', () => {
  it('en un partido normal es igual que calculateMatchResults', () => {
    expect(calculateEffectiveResults(walkover)).toEqual(calculateMatchResults(walkover));
  });

  it('en un W.O. conserva la victoria y los sets pero anula los puntos de juego', () => {
    expect(calculateEffectiveResults({ ...walkover, walkover: true })).toMatchObject({
      p1Sets: 2,
      p2Sets: 0,
      p1Points: 0,
      p2Points: 0,
    });
  });
});

describe('computeGroupStandings con un W.O.', () => {
  const standings = computeGroupStandings(
    [
      { id: 'a', playerId: 'a' },
      { id: 'b', playerId: 'b' },
    ],
    [{ ...walkover, walkover: true }],
  );
  const byId = Object.fromEntries(standings.map((s) => [s.playerId, s]));

  it('el ganador suma 2 y el que se retira 0, sin el punto de derrota jugada', () => {
    expect(byId.a.pointsClas).toBe(2);
    expect(byId.b.pointsClas).toBe(0);
  });

  it('cuenta los sets pero no los puntos', () => {
    expect(byId.a).toMatchObject({ setsWon: 2, pointsWon: 0, pointsLost: 0 });
    expect(byId.b).toMatchObject({ setsLost: 2, pointsWon: 0, pointsLost: 0 });
  });
});
