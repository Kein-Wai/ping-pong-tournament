import { describe, it, expect, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { issueToken } from './session';

describe('issueToken', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'secreto-de-pruebas';
  });

  it('firma id, rol y club del usuario con el JWT_SECRET y una caducidad', () => {
    const token = issueToken({ id: 'u1', clubId: 'club-1', userType: { name: 'AdminClub' } });

    const claims = jwt.verify(token, 'secreto-de-pruebas') as jwt.JwtPayload;
    expect(claims).toMatchObject({ id: 'u1', role: 'AdminClub', clubId: 'club-1' });
    expect(claims.exp).toBeGreaterThan(claims.iat as number);
  });
});
