import { describe, it, expect } from 'vitest';
import { worksOffline } from './offlineAccess';

describe('worksOffline', () => {
  it.each(['/', '/analisis', '/analisis/tracker/abc', '/calentamiento', '/juegos-reflejo', '/juegos-reflejo/reaccion'])(
    '%s funciona sin conexión',
    (path) => expect(worksOffline(path)).toBe(true),
  );

  it.each(['/torneos', '/ligas', '/jugadores/u1', '/historial', '/analisis-otra-cosa', '/sugerencias'])(
    '%s requiere conexión',
    (path) => expect(worksOffline(path)).toBe(false),
  );
});
