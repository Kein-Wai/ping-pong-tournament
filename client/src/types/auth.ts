/** Forma mínima del error que lanza el interceptor de `api/axios` y que las pantallas de acceso leen. */
export interface ApiErrorLike {
  message?: string;
  response?: {
    data: {
      error?: string;
      message?: string;
    };
  };
}

/** Tipo de cuenta que se elige al registrarse: jugador libre o fundador de club. */
export type RegisterRole = 'Player' | 'AdminClub';

/** Resultado del plugin nativo de Google: el `idToken` llega en la raíz o dentro de `authentication`. */
export interface NativeGoogleResult {
  idToken?: string;
  authentication?: {
    idToken?: string;
  };
}
