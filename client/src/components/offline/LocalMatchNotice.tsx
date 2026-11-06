import { Alert, Badge } from '@mantine/core';
import type { TrackedMatch } from '../../types/manualMatch';

type LocalState = NonNullable<TrackedMatch['localState']>;

/** Etiqueta pequeña para las filas del listado: el partido tiene cambios sin enviar o no se pudo enviar. */
export const LocalStateBadge = ({ state }: { state?: LocalState }) => {
  if (!state) return null;
  return state === 'conflicto' ? (
    <Badge color="orange" variant="filled" size="sm">
      Requiere atención
    </Badge>
  ) : (
    <Badge color="blue" variant="light" size="sm">
      Pendiente de enviar
    </Badge>
  );
};

/** Aviso sobre el informe de un partido que aún no está en el servidor (4.6). */
export const LocalMatchNotice = ({ state }: { state?: LocalState }) => {
  if (!state) return null;
  return state === 'conflicto' ? (
    <Alert color="orange" variant="light" mb="sm" title="No se pudo sincronizar">
      El servidor rechazó este partido. Tu copia sigue guardada en este móvil: revisa la lista de
      pendientes para reintentar o guardarlo como partido nuevo.
    </Alert>
  ) : (
    <Alert color="blue" variant="light" mb="sm" title="Pendiente de enviar">
      Este partido está guardado en tu móvil. Sus estadísticas y habilidades se acreditarán cuando
      se sincronice con el servidor.
    </Alert>
  );
};
