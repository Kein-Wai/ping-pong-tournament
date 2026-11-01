import { describe, it, expect } from 'vitest';
import { canManageManualMatch, isApprovedClubAdmin } from './manual-match-access';

const match = (
  ownerClubId: string | null,
  ownerClubStatus: string | null = 'Aprobado',
  ownerType = 'Player',
) => ({
  userId: 'player-1',
  user: { clubId: ownerClubId, clubStatus: ownerClubStatus, userType: { name: ownerType } },
});

const admin = (overrides: Record<string, unknown> = {}) => ({
  id: 'admin-1',
  role: 'AdminClub',
  clubId: 'club-1',
  clubStatus: 'Aprobado',
  ...overrides,
});

describe('isApprovedClubAdmin', () => {
  it('acepta a un AdminClub con club aprobado', () => {
    expect(isApprovedClubAdmin(admin())).toBe(true);
  });

  it.each([
    ['sin usuario', undefined],
    ['un jugador', admin({ role: 'Player' })],
    ['un SuperAdmin', admin({ role: 'SuperAdmin', clubId: null })],
    ['un AdminClub sin club', admin({ clubId: null })],
    ['un AdminClub con club pendiente', admin({ clubStatus: 'Pendiente' })],
    ['un AdminClub sin estado de club', admin({ clubStatus: undefined })],
  ])('rechaza %s', (_name, actor) => {
    expect(isApprovedClubAdmin(actor)).toBe(false);
  });
});

describe('canManageManualMatch', () => {
  it('permite al dueño aunque no tenga club', () => {
    const owner = { id: 'player-1', role: 'Player', clubId: null };

    expect(canManageManualMatch(match(null), owner)).toBe(true);
  });

  it('permite al AdminClub del club actual del dueño', () => {
    expect(canManageManualMatch(match('club-1'), admin())).toBe(true);
  });

  it('niega al AdminClub de otro club', () => {
    expect(canManageManualMatch(match('club-2'), admin())).toBe(false);
  });

  it('niega al AdminClub si el dueño ya no está en ningún club', () => {
    expect(canManageManualMatch(match(null), admin())).toBe(false);
  });

  it.each(['Pendiente', 'Rechazado', 'Registrado', null])(
    'niega al AdminClub si el dueño figura como %s en el club',
    (ownerClubStatus) => {
      expect(canManageManualMatch(match('club-1', ownerClubStatus), admin())).toBe(false);
    },
  );

  it('niega al AdminClub sobre el análisis personal de otro AdminClub del club', () => {
    expect(canManageManualMatch(match('club-1', 'Aprobado', 'AdminClub'), admin())).toBe(false);
  });

  it('permite al dueño aunque aún esté pendiente de aprobación', () => {
    const owner = { id: 'player-1', role: 'Player', clubId: 'club-1' };

    expect(canManageManualMatch(match('club-1', 'Pendiente'), owner)).toBe(true);
  });

  it('niega al AdminClub cuyo club no está aprobado', () => {
    expect(canManageManualMatch(match('club-1'), admin({ clubStatus: 'Pendiente' }))).toBe(false);
  });

  it('niega a otro jugador del mismo club', () => {
    const other = { id: 'player-9', role: 'Player', clubId: 'club-1', clubStatus: 'Aprobado' };

    expect(canManageManualMatch(match('club-1'), other)).toBe(false);
  });

  it('niega al SuperAdmin', () => {
    const superAdmin = { id: 'super-1', role: 'SuperAdmin', clubId: null };

    expect(canManageManualMatch(match('club-1'), superAdmin)).toBe(false);
  });

  it('niega si no hay usuario autenticado', () => {
    expect(canManageManualMatch(match('club-1'), undefined)).toBe(false);
  });
});
