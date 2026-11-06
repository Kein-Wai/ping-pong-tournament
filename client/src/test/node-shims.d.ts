// Lo único de Node que usa un ayudante de tests (`sqlJsDatabase.ts`): leer el WASM de sql.js.
// Se declara aquí a mano en lugar de cargar `@types/node`, que cambiaría los tipos globales
// (p. ej. `setTimeout`) de todo el proyecto.
declare module 'node:fs' {
  export function readFileSync(path: string): Uint8Array;
}

declare module 'node:module' {
  export function createRequire(url: string): { resolve(id: string): string };
}
