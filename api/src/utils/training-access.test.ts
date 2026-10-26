import { describe, it, expect } from 'vitest';
import { canManageTraining, canViewTraining } from './training-access';
import type { UserPayload } from '../middleware/auth.middleware';

const owner = { id: 'player-1', clubId: 'club-1' };

const owner_ = { id: 'player-1', role: 'Player', clubId: 'club-1' } satisfies UserPayload;
const sameClubAdmin = { id: 'admin-1', role: 'AdminClub', clubId: 'club-1' } satisfies UserPayload;
const otherClubAdmin = { id: 'admin-2', role: 'AdminClub', clubId: 'club-2' } satisfies UserPayload;
const sameClubPlayer = { id: 'player-2', role: 'Player', clubId: 'club-1' } satisfies UserPayload;
const superAdmin = { id: 'super-1', role: 'SuperAdmin', clubId: null } satisfies UserPayload;

describe('Acceso a los entrenamientos de un jugador (utils/training-access)', () => {
  describe('canViewTraining', () => {
    it('lo ve el propio jugador, el AdminClub de su club y el SuperAdmin', () => {
      expect(canViewTraining(owner_, owner)).toBe(true);
      expect(canViewTraining(sameClubAdmin, owner)).toBe(true);
      expect(canViewTraining(superAdmin, owner)).toBe(true);
    });

    it('no lo ve otro jugador del mismo club, ni el admin de otro club, ni nadie sin sesión', () => {
      expect(canViewTraining(sameClubPlayer, owner)).toBe(false);
      expect(canViewTraining(otherClubAdmin, owner)).toBe(false);
      expect(canViewTraining(undefined, owner)).toBe(false);
    });

    it('el propio jugador sin club lo ve aunque no tenga club', () => {
      const free = { id: 'free-1', role: 'Player', clubId: null } satisfies UserPayload;

      expect(canViewTraining(free, { id: 'free-1', clubId: null })).toBe(true);
    });
  });

  describe('canManageTraining', () => {
    it('lo gestiona el AdminClub de su club y el SuperAdmin', () => {
      expect(canManageTraining(sameClubAdmin, owner)).toBe(true);
      expect(canManageTraining(superAdmin, owner)).toBe(true);
    });

    it('no lo gestiona el propio jugador, ni otro jugador, ni el admin de otro club', () => {
      expect(canManageTraining(owner_, owner)).toBe(false);
      expect(canManageTraining(sameClubPlayer, owner)).toBe(false);
      expect(canManageTraining(otherClubAdmin, owner)).toBe(false);
      expect(canManageTraining(undefined, owner)).toBe(false);
    });
  });
});
