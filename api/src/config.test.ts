import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getRequiredEnv, assertRequiredEnv, REQUIRED_ENV_VARS } from './config';

const TEST_VAR = 'TT_TEST_VAR';

describe('Configuracion de variables de entorno (api/src/config.ts)', () => {
  let previous: string | undefined;

  beforeEach(() => {
    previous = process.env[TEST_VAR];
  });

  afterEach(() => {
    if (previous === undefined) {
      delete process.env[TEST_VAR];
    } else {
      process.env[TEST_VAR] = previous;
    }
  });

  it('getRequiredEnv devuelve el valor de la variable', () => {
    process.env[TEST_VAR] = 'valor-secreto';

    expect(getRequiredEnv(TEST_VAR)).toBe('valor-secreto');
  });

  it('getRequiredEnv recorta los espacios del valor', () => {
    process.env[TEST_VAR] = '  valor  ';

    expect(getRequiredEnv(TEST_VAR)).toBe('valor');
  });

  it('getRequiredEnv lanza un error critico si la variable no existe', () => {
    delete process.env[TEST_VAR];

    expect(() => getRequiredEnv(TEST_VAR)).toThrow(/TT_TEST_VAR/);
  });

  it('getRequiredEnv lanza un error critico si la variable esta vacia', () => {
    process.env[TEST_VAR] = '   ';

    expect(() => getRequiredEnv(TEST_VAR)).toThrow(/TT_TEST_VAR/);
  });

  it('assertRequiredEnv no lanza si todas las variables estan presentes', () => {
    expect(() => assertRequiredEnv({ A: '1', B: '2' }, ['A', 'B'])).not.toThrow();
  });

  it('assertRequiredEnv enumera las variables que faltan en el error', () => {
    expect(() => assertRequiredEnv({ A: '1' }, ['A', 'B'])).toThrow(/B/);
  });

  it('assertRequiredEnv detecta variables vacias', () => {
    expect(() => assertRequiredEnv({ A: '  ' }, ['A'])).toThrow(/A/);
  });

  it('exige JWT_SECRET, CRON_SECRET y CLIENT_URL', () => {
    expect(REQUIRED_ENV_VARS).toContain('JWT_SECRET');
    expect(REQUIRED_ENV_VARS).toContain('CRON_SECRET');
    expect(REQUIRED_ENV_VARS).toContain('CLIENT_URL');
  });
});