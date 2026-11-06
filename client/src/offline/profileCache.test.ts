import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import type { User } from '../store/authStore';
import { resetAppLocalStore, setAppLocalStore } from './appLocalStore';
import { createMemoryLocalStore } from './memoryLocalStore';
import {
  cacheProfile,
  loadCachedProfile,
  startProfileCaching,
  userIdFromToken,
} from './profileCache';

const ANA: User = { id: 'u1', email: 'ana@test.com', name: 'Ana', role: 'Player', clubId: 'club-1' };

const tokenFor = (payload: object) => `h.${btoa(JSON.stringify(payload))}.s`;

describe('userIdFromToken', () => {
  it('lee el id del usuario del token, aunque esté caducado', () => {
    expect(userIdFromToken(tokenFor({ id: 'u1', exp: 1 }))).toBe('u1');
  });

  it('un token mal formado no tiene id', () => {
    expect(userIdFromToken('esto-no-es-un-jwt')).toBeNull();
    expect(userIdFromToken('a.%%%.c')).toBeNull();
    expect(userIdFromToken(tokenFor({ sinId: true }))).toBeNull();
  });
});

describe('perfil guardado en el móvil', () => {
  beforeEach(() => {
    resetAppLocalStore();
    setAppLocalStore(createMemoryLocalStore());
  });

  it('guarda el perfil y lo recupera con el token del mismo usuario', async () => {
    await cacheProfile(ANA);

    expect(await loadCachedProfile(tokenFor({ id: 'u1' }))).toEqual(ANA);
  });

  it('no devuelve el perfil de otro usuario', async () => {
    await cacheProfile(ANA);

    expect(await loadCachedProfile(tokenFor({ id: 'otro' }))).toBeNull();
  });

  it('sin perfil guardado devuelve null', async () => {
    expect(await loadCachedProfile(tokenFor({ id: 'u1' }))).toBeNull();
  });

  it('con un token ilegible devuelve null', async () => {
    expect(await loadCachedProfile('basura')).toBeNull();
  });

  it('guardar de nuevo sustituye al anterior', async () => {
    await cacheProfile(ANA);
    await cacheProfile({ ...ANA, name: 'Ana María' });

    expect((await loadCachedProfile(tokenFor({ id: 'u1' })))?.name).toBe('Ana María');
  });

  it('en el navegador (sin almacén) no hace nada ni falla', async () => {
    setAppLocalStore(null);

    await expect(cacheProfile(ANA)).resolves.toBeUndefined();
    expect(await loadCachedProfile(tokenFor({ id: 'u1' }))).toBeNull();
  });
});

describe('startProfileCaching', () => {
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
  const newAuthStore = () => create<{ user: User | null }>(() => ({ user: null }));

  beforeEach(() => {
    resetAppLocalStore();
    setAppLocalStore(createMemoryLocalStore());
  });

  it('guarda el perfil cada vez que el usuario del store cambia', async () => {
    const authStore = newAuthStore();
    startProfileCaching(authStore);

    authStore.setState({ user: ANA });
    await flush();

    expect(await loadCachedProfile(tokenFor({ id: 'u1' }))).toEqual(ANA);
  });

  it('no vuelve a guardar si cambia otra cosa del store y el usuario es el mismo', async () => {
    const store = createMemoryLocalStore();
    const apply = vi.spyOn(store, 'apply');
    setAppLocalStore(store);
    const authStore = create<{ user: User | null; token: string | null }>(() => ({
      user: null,
      token: null,
    }));
    startProfileCaching(authStore);
    authStore.setState({ user: ANA });
    await flush();

    authStore.setState({ token: 'otro-token' });
    await flush();

    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('cuando el usuario pasa a null no borra lo guardado', async () => {
    const authStore = newAuthStore();
    startProfileCaching(authStore);
    authStore.setState({ user: ANA });
    await flush();

    authStore.setState({ user: null });
    await flush();

    expect(await loadCachedProfile(tokenFor({ id: 'u1' }))).toEqual(ANA);
  });

  it('al parar deja de guardar', async () => {
    const authStore = newAuthStore();
    const stop = startProfileCaching(authStore);
    stop();

    authStore.setState({ user: ANA });
    await flush();

    expect(await loadCachedProfile(tokenFor({ id: 'u1' }))).toBeNull();
  });
});
