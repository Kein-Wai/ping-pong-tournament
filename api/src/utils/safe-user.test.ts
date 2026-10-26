import { describe, it, expect } from 'vitest';
import { toSafeUser } from './safe-user';

describe('toSafeUser', () => {
  const fullUser = {
    id: 'u1',
    email: 'ana@test.com',
    name: 'Ana',
    clubId: 'club-1',
    password: 'hash-bcrypt',
    googleId: 'google-123',
    verificationToken: 'verif-token',
    resetPasswordToken: 'reset-token',
    resetPasswordExpires: new Date('2030-01-01'),
  };

  it('elimina las credenciales y los tokens del usuario', () => {
    const safe = toSafeUser(fullUser);

    expect(safe).not.toHaveProperty('password');
    expect(safe).not.toHaveProperty('googleId');
    expect(safe).not.toHaveProperty('verificationToken');
    expect(safe).not.toHaveProperty('resetPasswordToken');
    expect(safe).not.toHaveProperty('resetPasswordExpires');
  });

  it('conserva el resto de campos y las relaciones cargadas', () => {
    const safe = toSafeUser({ ...fullUser, stats: [{ elo: 1200 }] });

    expect(safe).toEqual({
      id: 'u1',
      email: 'ana@test.com',
      name: 'Ana',
      clubId: 'club-1',
      stats: [{ elo: 1200 }],
    });
  });

  it('no muta el usuario original', () => {
    toSafeUser(fullUser);

    expect(fullUser.password).toBe('hash-bcrypt');
    expect(fullUser.resetPasswordToken).toBe('reset-token');
  });

  it('acepta un usuario que ya no tiene campos sensibles', () => {
    expect(toSafeUser({ id: 'u1', name: 'Ana' })).toEqual({ id: 'u1', name: 'Ana' });
  });
});
