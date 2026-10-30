import { describe, it, expect } from 'vitest';
import { getMatchOwnerClubId } from './match-access';

describe('getMatchOwnerClubId', () => {
  it('el club del torneo manda sobre todo lo demás', () => {
    expect(
      getMatchOwnerClubId({
        tournament: { clubId: 'club-torneo' },
        league: { clubId: 'club-liga' },
        playerOne: { clubId: 'club-jugador' },
      }),
    ).toBe('club-torneo');
  });

  it('un partido de liga pertenece al club de la liga, no al del primer jugador', () => {
    expect(
      getMatchOwnerClubId({ league: { clubId: 'club-liga' }, playerOne: { clubId: 'club-jugador' } }),
    ).toBe('club-liga');
  });

  it('sin torneo ni liga pertenece al club del primer jugador', () => {
    expect(getMatchOwnerClubId({ playerOne: { clubId: 'club-jugador' } })).toBe('club-jugador');
  });

  it('sin ningún club devuelve null', () => {
    expect(getMatchOwnerClubId({ playerOne: { clubId: null } })).toBeNull();
  });
});
