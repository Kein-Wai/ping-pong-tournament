# Cliente — TM Evolve (Ping Pong App)

Aplicación web y móvil (iOS/Android con Capacitor) para gestionar torneos, jugadores,
entrenamientos y analítica de tenis de mesa. Habla con la API de `../api`.

React 19 · TypeScript 6 · Vite 8 · Mantine 9 · Zustand 5 · React Router 7 · Capacitor 8 · Vitest.

> La descripción completa (arquitectura, estructura, funcionalidades, decisiones de
> diseño) está en **[ARQUITECTURA.md](./ARQUITECTURA.md)**. Este fichero es solo la guía
> rápida para arrancar.

## Arranque rápido

```bash
cd client
npm install --legacy-peer-deps   # el flag lo usan también el Dockerfile y el CI
# crea client/.env con las variables de la tabla de abajo (no hay .env.example)
npm run dev                      # http://localhost:5173
```

Con todo el sistema (API + base de datos + cliente) desde la raíz del repositorio:

```bash
docker compose up        # db :5432, api :3000, client :5173
```

## Variables de entorno

| Variable | Para qué |
|---|---|
| `VITE_API_URL` | URL base de la API (p. ej. `http://localhost:3000/api`) |
| `VITE_GOOGLE_CLIENT_ID` | ID de cliente web de Google (login con Google en el navegador) |
| `VITE_GOOGLE_IOS_CLIENT_ID` | ID de cliente iOS de Google (login nativo; llega con la rama `chore/seguridad-client`). En CI es un *secret* de GitHub |

Las variables `VITE_*` se incrustan en el *bundle* al compilar: **no pongas secretos aquí**.

## Comandos

```bash
npm run dev              # servidor de desarrollo (Vite)
npm run build            # tsc -b && vite build  → dist/
npm run preview          # sirve dist/ en local
npm run lint             # ESLint
npm run format           # Prettier sobre src/
npx vitest run           # todos los tests, una pasada
npx vitest run src/hooks/useTorneoFormato.test.ts   # un fichero
npx vitest run -t "texto del test"                  # por nombre
npx vitest run --coverage                           # cobertura (v8, informe en coverage/)
```

(No hay script `npm test`; los tests se lanzan con `npx vitest`.)

## App móvil (Capacitor)

```bash
npm run build            # genera dist/
npx cap sync ios         # copia dist/ y los plugins al proyecto nativo de iOS
npx cap open ios         # abre Xcode
```

`appId`: `com.keinwaicheung.tttournamentapp`. La compilación firmada y la subida a
TestFlight las hace el workflow `.github/workflows/ios-build.yml` en cada *push* a `main`
y en cada PR que toque `client/**`.

## Mapa de carpetas (resumen)

```
client/
├── src/
│   ├── api/          Acceso a datos: adapter http, servicios por dominio, sesión
│   ├── components/   Piezas de interfaz reutilizables, agrupadas por dominio
│   ├── constants/    Rutas (APP_ROUTES), diccionarios, listas de habilidades
│   ├── hooks/        Lógica de pantalla (un hook por responsabilidad, con su test)
│   ├── pages/        Una carpeta por dominio; cada pantalla es una composición fina
│   ├── store/        Estado global (Zustand): sesión y usuario
│   ├── types/        Tipos de dominio y del contrato de la API
│   ├── utils/        Funciones puras (fechas, avatares, reglas de marcador, formato)
│   ├── test/         Utilidades de test (renderWithProviders, normalizeIds)
│   ├── App.tsx       Rutas y arranque de sesión
│   └── main.tsx      Proveedores (Mantine, Google OAuth) y enlaces de sesión
├── ios/ android/     Proyectos nativos de Capacitor
├── capacitor.config.ts
└── vitest.config.ts  Tests (jsdom, TZ=UTC)
```

## Reglas del proyecto que conviene conocer

- Toda llamada HTTP pasa por `src/api/services/*`; las URLs se declaran antes en
  `src/api/endpoints.ts`. ESLint **prohíbe** importar `api/axios` desde páginas, hooks y componentes.
- Las rutas de navegación salen de `APP_ROUTES` (`src/constants/routes.ts`); hay un test que
  detecta rutas escritas a mano.
- Cero `any` en `src/` (hay un test sobre la regla).
- Los errores de red se notifican una sola vez en el interceptor de axios: los componentes
  **no** duplican el `notifications.show`.
- Cada hook y cada pieza nueva lleva su test colocado al lado (`*.test.ts(x)`).
