/**
 * Generador pseudoaleatorio con semilla (mulberry32). El seed demo usa siempre
 * la misma semilla para que los datos sean reproducibles entre ejecuciones y un
 * fallo visto en el cliente se pueda volver a encontrar.
 */
export const createRng = (seed: number) => {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));
  const chance = (probability: number): boolean => next() < probability;
  const pick = <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)];

  const shuffle = <T>(items: readonly T[]): T[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  return { next, int, chance, pick, shuffle };
};

export type Rng = ReturnType<typeof createRng>;

/** Fecha (solo día, en UTC) desplazada `days` respecto a hoy. */
export const daysFromToday = (days: number): Date => {
  const today = new Date();
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + days));
};
