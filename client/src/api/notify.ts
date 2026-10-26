/**
 * Deduplicacion de notificaciones de error.
 *
 * Una pantalla puede disparar varias peticiones a la vez (perfil + temporada +
 * partidos + equipos). Si todas fallan con el mismo motivo, el usuario no
 * deberia ver cuatro toasts identicos superpuestos: basta con uno.
 *
 * La ventana de deduplicacion es por mensaje: dos errores distintos en el
 * mismo instante se muestran los dos.
 */

/** Tiempo durante el que se ignora un mensaje de error ya notificado. */
export const DEDUPE_WINDOW_MS = 3000;

/**
 * Crea un notificador que recuerda los ultimos mensajes mostrados.
 *
 * @param windowMs Ventana de deduplicacion en milisegundos.
 */
export interface ErrorNotifier {
  /** Devuelve true si el mensaje debe notificarse (es decir, no es repetido). */
  (key: string): boolean;
  /** Olvida los mensajes ya notificados. */
  reset: () => void;
}

export const createErrorNotifier = (windowMs: number = DEDUPE_WINDOW_MS): ErrorNotifier => {
  const shown = new Map<string, number>();

  const notify = (key: string): boolean => {
    const now = Date.now();
    const lastShown = shown.get(key);

    if (lastShown !== undefined && now - lastShown < windowMs) {
      return false;
    }

    shown.set(key, now);
    return true;
  };

  notify.reset = () => shown.clear();

  return notify;
};

/** Notificador por defecto, compartido por el interceptor de axios. */
export const errorNotifier = createErrorNotifier();

/** Vacia la memoria del notificador (util en tests). */
export const resetErrorNotifier = (): void => errorNotifier.reset();
