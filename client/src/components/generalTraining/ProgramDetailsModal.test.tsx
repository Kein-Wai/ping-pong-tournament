import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { ProgramDetails } from '../../types/generalTraining';
import { ProgramDetailsModal } from './ProgramDetailsModal';

const DETAILS: ProgramDetails = {
  description: 'Semana de Saques',
  scheduleName: 'Clase Adultos',
  minDate: new Date(2026, 9, 5),
  maxDate: new Date(2026, 9, 7),
  sessionCount: 2,
  activeSkills: [
    { key: 'servicio', label: 'Servicio' },
    { key: 'recepcion', label: 'Recepción' },
  ],
};

describe('ProgramDetailsModal', () => {
  it('cerrado no pinta nada', () => {
    renderWithProviders(<ProgramDetailsModal opened={false} details={DETAILS} onClose={() => {}} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('sin detalles muestra el modal vacío', async () => {
    renderWithProviders(<ProgramDetailsModal opened details={null} onClose={() => {}} />);

    expect(await screen.findByText('Detalles del Programa')).toBeInTheDocument();
    expect(screen.queryByText('Descripción del Bloque')).not.toBeInTheDocument();
  });

  it('resume el bloque: descripción, fechas, horario, sesiones y habilidades', async () => {
    renderWithProviders(<ProgramDetailsModal opened details={DETAILS} onClose={() => {}} />);

    expect(await screen.findByText('Semana de Saques')).toBeInTheDocument();
    expect(screen.getByText('5/10/2026')).toBeInTheDocument();
    expect(screen.getByText('7/10/2026')).toBeInTheDocument();
    expect(screen.getByText('Clase Adultos')).toBeInTheDocument();
    expect(screen.getByText('2 Sesiones Totales')).toBeInTheDocument();
    expect(screen.getByText('Servicio')).toBeInTheDocument();
    expect(screen.getByText('Recepción')).toBeInTheDocument();
  });

  it('usa textos por defecto sin descripción, horario ni habilidades', async () => {
    renderWithProviders(
      <ProgramDetailsModal
        opened
        details={{ ...DETAILS, description: '', scheduleName: undefined, activeSkills: [] }}
        onClose={() => {}}
      />,
    );

    expect(await screen.findByText('Sin descripción especial.')).toBeInTheDocument();
    expect(screen.getByText('Antiguo/Desconocido')).toBeInTheDocument();
    expect(screen.getByText('No se seleccionó ninguna habilidad específica.')).toBeInTheDocument();
  });
});
