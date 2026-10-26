import { describe, it, expect } from 'vitest';
import {
  resolveResourceAccess,
  hasClubPermission,
  canAccessClub,
  resolveClubScope,
  getScopeClubId,
  isOutOfClubScope,
  buildClubScope,
  buildNullableClubScope,
} from './auth';
import { UserPayload } from '../middleware/auth.middleware';

const superAdmin: UserPayload = { id: 'u-1', role: 'SuperAdmin', clubId: null };
const adminClub: UserPayload = { id: 'u-2', role: 'AdminClub', clubId: 'club-1' };
const player: UserPayload = { id: 'u-3', role: 'Player', clubId: 'club-1' };
const freePlayer: UserPayload = { id: 'u-4', role: 'Player', clubId: null };

describe('Alcance de club (api/src/utils/auth.ts)', () => {
  describe('resolveClubScope', () => {
    it('da alcance global al SuperAdmin', () => {
      expect(resolveClubScope(superAdmin)).toEqual({ kind: 'all' });
    });

    it('acota al AdminClub a su club', () => {
      expect(resolveClubScope(adminClub)).toEqual({ kind: 'club', clubId: 'club-1' });
    });

    it('acota al Player con club a su club', () => {
      expect(resolveClubScope(player)).toEqual({ kind: 'club', clubId: 'club-1' });
    });

    it('deja sin alcance al Player sin club asignado', () => {
      expect(resolveClubScope(freePlayer)).toEqual({ kind: 'none' });
    });

    it('deja sin alcance a un usuario ausente', () => {
      expect(resolveClubScope(undefined)).toEqual({ kind: 'none' });
    });
  });

  describe('getScopeClubId', () => {
    it('devuelve el club del usuario acotado', () => {
      expect(getScopeClubId(adminClub)).toBe('club-1');
    });

    it('devuelve null para el SuperAdmin', () => {
      expect(getScopeClubId(superAdmin)).toBeNull();
    });

    it('devuelve null para un usuario sin club', () => {
      expect(getScopeClubId(freePlayer)).toBeNull();
    });
  });

  describe('isOutOfClubScope', () => {
    it('es true para un usuario sin club (no debe ver datos de ningún club)', () => {
      expect(isOutOfClubScope(freePlayer)).toBe(true);
      expect(isOutOfClubScope(undefined)).toBe(true);
    });

    it('es false para SuperAdmin, AdminClub y Player con club', () => {
      expect(isOutOfClubScope(superAdmin)).toBe(false);
      expect(isOutOfClubScope(adminClub)).toBe(false);
      expect(isOutOfClubScope(player)).toBe(false);
    });
  });

  describe('buildClubScope (recursos con clubId obligatorio)', () => {
    it('no filtra para el SuperAdmin', () => {
      expect(buildClubScope(superAdmin)).toEqual({});
    });

    it('filtra por su club para AdminClub y Player', () => {
      expect(buildClubScope(adminClub)).toEqual({ clubId: 'club-1' });
      expect(buildClubScope(player)).toEqual({ clubId: 'club-1' });
    });
  });

  describe('buildNullableClubScope (recursos con clubId opcional)', () => {
    it('no filtra para el SuperAdmin', () => {
      expect(buildNullableClubScope(superAdmin)).toEqual({});
    });

    it('filtra por su club para AdminClub y Player', () => {
      expect(buildNullableClubScope(adminClub)).toEqual({ clubId: 'club-1' });
      expect(buildNullableClubScope(player)).toEqual({ clubId: 'club-1' });
    });

    it('regresión: un usuario sin club NO hereda un alcance global', () => {
      expect(buildNullableClubScope(freePlayer)).toEqual({ clubId: null });
    });
  });

  describe('hasClubPermission (escritura)', () => {
    it('permite al SuperAdmin sobre cualquier club', () => {
      expect(hasClubPermission(superAdmin, 'otro-club')).toBe(true);
      expect(hasClubPermission(superAdmin, null)).toBe(true);
    });

    it('permite al AdminClub solo sobre su propio club', () => {
      expect(hasClubPermission(adminClub, 'club-1')).toBe(true);
      expect(hasClubPermission(adminClub, 'club-2')).toBe(false);
    });

    it('regresión: un AdminClub sin club no tiene permiso sobre recursos sin club', () => {
    const adminWithoutClub: UserPayload = { id: 'u-5', role: 'AdminClub', clubId: null };

    expect(hasClubPermission(adminWithoutClub, null)).toBe(false);
    expect(hasClubPermission(adminWithoutClub, undefined)).toBe(false);
  });

  it('no permite al Player modificar recursos de club', () => {
      expect(hasClubPermission(player, 'club-1')).toBe(false);
    });

    it('no permite nada sin usuario', () => {
      expect(hasClubPermission(undefined, 'club-1')).toBe(false);
    });
  });

  describe('canAccessClub (lectura)', () => {
    it('permite al SuperAdmin leer cualquier club', () => {
      expect(canAccessClub(superAdmin, 'otro-club')).toBe(true);
    });

    it('permite al AdminClub y al Player leer su propio club', () => {
      expect(canAccessClub(adminClub, 'club-1')).toBe(true);
      expect(canAccessClub(player, 'club-1')).toBe(true);
    });

    it('regresión: impide a un Player leer el club de otro', () => {
      expect(canAccessClub(player, 'club-2')).toBe(false);
    });

    it('regresión: impide a un usuario sin club leer el de cualquiera', () => {
      expect(canAccessClub(freePlayer, 'club-1')).toBe(false);
    });
  });
});

describe('resolveResourceAccess (api/src/utils/auth.ts)', () => {
  const resource = { id: 'torneo-1', clubId: 'club-1' };

  it('concede acceso cuando el recurso existe y el SuperAdmin puede tocarlo', () => {
    const access = resolveResourceAccess(resource, { id: 'u1', role: 'SuperAdmin' });

    expect(access.ok).toBe(true);
    if (access.ok) expect(access.resource).toBe(resource);
  });

  it('concede acceso al AdminClub cuando el recurso es de su club', () => {
    const access = resolveResourceAccess(resource, {
      id: 'u1',
      role: 'AdminClub',
      clubId: 'club-1',
    });

    expect(access.ok).toBe(true);
  });

  it('deniega al AdminClub cuando el recurso es de otro club', () => {
    const access = resolveResourceAccess(resource, {
      id: 'u1',
      role: 'AdminClub',
      clubId: 'club-rival',
    });

    expect(access.ok).toBe(false);
    if (!access.ok) expect(access.reason).toBe('forbidden');
  });

  it('distingue "no existe" de "no autorizado"', () => {
    const access = resolveResourceAccess(null, { id: 'u1', role: 'SuperAdmin' });

    expect(access.ok).toBe(false);
    if (!access.ok) expect(access.reason).toBe('notFound');
  });

  it('deniega a un Player aunque sea del mismo club', () => {
    const access = resolveResourceAccess(resource, {
      id: 'u1',
      role: 'Player',
      clubId: 'club-1',
    });

    expect(access.ok).toBe(false);
    if (!access.ok) expect(access.reason).toBe('forbidden');
  });
});
