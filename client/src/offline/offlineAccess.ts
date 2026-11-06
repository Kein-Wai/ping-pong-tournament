import { APP_ROUTES } from '../constants/routes';

/** Rutas que funcionan sin conexión: el inicio reducido y las tres funcionalidades offline. */
const OFFLINE_PREFIXES = [
  APP_ROUTES.ANALISIS.LIST,
  APP_ROUTES.CALENTAMIENTO,
  APP_ROUTES.JUEGOS_REFLEJO.LIST,
];

/** `true` si la pantalla de esa ruta se puede usar sin conexión; el resto muestra «Requiere conexión». */
export const worksOffline = (pathname: string): boolean =>
  pathname === APP_ROUTES.HOME ||
  OFFLINE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
