import { describe, it, expect } from 'vitest';
import { assertWipeConfirmed, describeDatabase, requireEnv } from './safety';

describe('describeDatabase', () => {
  it('muestra host, puerto y nombre sin usuario ni contraseña', () => {
    const url = 'postgresql://admin:secreto@db.ejemplo.com:6543/pingpong?sslmode=require';

    const description = describeDatabase(url);

    expect(description).toBe('db.ejemplo.com:6543/pingpong');
    expect(description).not.toContain('secreto');
    expect(description).not.toContain('admin');
  });

  it('usa el puerto 5432 si la URL no lo indica', () => {
    expect(describeDatabase('postgresql://u:p@localhost/pingpong_db')).toBe(
      'localhost:5432/pingpong_db',
    );
  });

  it('avisa si DATABASE_URL no está definida', () => {
    expect(describeDatabase(undefined)).toBe('DATABASE_URL no definida');
  });

  it('avisa si la URL no es válida sin reproducirla', () => {
    const description = describeDatabase('esto-no-es-una-url:contraseña');

    expect(description).toBe('DATABASE_URL no válida');
  });
});

describe('assertWipeConfirmed', () => {
  it('no hace nada con SEED_CONFIRM_WIPE=yes', () => {
    expect(() => assertWipeConfirmed({ SEED_CONFIRM_WIPE: 'yes' })).not.toThrow();
  });

  it.each([undefined, '', 'true', '1', 'YES', 'no'])(
    'se niega a borrar la base con SEED_CONFIRM_WIPE=%s',
    (value) => {
      expect(() => assertWipeConfirmed({ SEED_CONFIRM_WIPE: value })).toThrow(/SEED_CONFIRM_WIPE=yes/);
    },
  );
});

describe('requireEnv', () => {
  it('devuelve el valor definido', () => {
    expect(requireEnv({ SEED_SUPERADMIN_PASSWORD: 'abc' }, 'SEED_SUPERADMIN_PASSWORD')).toBe('abc');
  });

  it.each([undefined, '', '   '])('falla si la variable vale %j', (value) => {
    expect(() => requireEnv({ SEED_SUPERADMIN_PASSWORD: value }, 'SEED_SUPERADMIN_PASSWORD')).toThrow(
      /SEED_SUPERADMIN_PASSWORD/,
    );
  });
});
