/** Documento guardado en el móvil, tal como lo devuelve el almacén. */
export interface StoredDocument<T> {
  id: string;
  /** Etiqueta libre para filtrar (p. ej. el estado de un pendiente); `null` si no se puso. */
  status: string | null;
  /** Milisegundos desde la época de la última escritura. */
  updatedAt: number;
  value: T;
}

/** Una escritura dentro de `apply`. `put` crea el documento o sustituye el existente. */
export type StoreOperation =
  | { type: 'put'; collection: string; id: string; value: unknown; status?: string | null }
  | { type: 'remove'; collection: string; id: string };

/**
 * Almacén local del modo sin conexión: documentos agrupados en colecciones y siempre ligados a un
 * usuario, de modo que en un mismo móvil nadie ve ni envía los datos de otro.
 *
 * `list` devuelve los documentos por orden de creación; reescribir uno no lo cambia de sitio. Eso
 * da el orden de envío de la cola de pendientes.
 */
export interface LocalStore {
  get<T>(userId: string, collection: string, id: string): Promise<StoredDocument<T> | null>;
  list<T>(
    userId: string,
    collection: string,
    filter?: { status?: string },
  ): Promise<StoredDocument<T>[]>;
  /** Aplica todas las operaciones o ninguna (p. ej. guardar un cambio y encolarlo a la vez). */
  apply(userId: string, operations: StoreOperation[]): Promise<void>;
}
