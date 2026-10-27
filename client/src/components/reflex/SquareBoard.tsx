import type { ReactNode } from 'react';
import { Box } from '@mantine/core';
import { fitWidth } from './fitWidth';

interface SquareBoardProps {
  /** Casillas por lado: el tablero siempre es cuadrado. */
  columns: number;
  label: string;
  children: ReactNode;
}

const MAX_SIDE_PX = 560;

/** Tablero cuadrado que se adapta a la ventana: nunca más ancho que su contenedor ni más alto que la pantalla. */
export const SquareBoard = ({ columns, label, children }: SquareBoardProps) => (
  <Box
    role="group"
    aria-label={label}
    data-columns={columns}
    style={{
      width: fitWidth(1, MAX_SIDE_PX),
      aspectRatio: '1',
      marginInline: 'auto',
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gridTemplateRows: `repeat(${columns}, 1fr)`,
      gap: 8,
    }}
  >
    {children}
  </Box>
);
