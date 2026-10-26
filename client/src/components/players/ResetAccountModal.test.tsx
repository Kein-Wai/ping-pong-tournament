import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { PlayerListItem } from '../../types/players';
import { ResetAccountModal } from './ResetAccountModal';

const LUIS: PlayerListItem = {
  id: 'p1',
  email: 'luis@test.com',
  name: 'Luis',
  clubStatus: 'Aprobado',
};
const GUS: PlayerListItem = { ...LUIS, id: 'p5', email: 'gus@guest.pingpong', name: 'Gus' };

const renderModal = (props: Partial<React.ComponentProps<typeof ResetAccountModal>> = {}) => {
  const handlers = { onClose: vi.fn(), onEmailChange: vi.fn(), onSubmit: vi.fn() };
  const view = renderWithProviders(
    <ResetAccountModal
      opened
      player={LUIS}
      email="luis@test.com"
      sending={false}
      {...handlers}
      {...props}
    />,
  );
  return { ...view, ...handlers };
};

describe('ResetAccountModal', () => {
  it('cerrado no pinta nada', () => {
    renderModal({ opened: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  describe('jugador con correo real', () => {
    it('pregunta por el jugador y muestra el correo de su cuenta', async () => {
      renderModal();

      expect(await screen.findByText('Resetear Cuenta')).toBeInTheDocument();
      expect(screen.getByText(/¿El jugador Luis ha olvidado su contraseña/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Correo Electrónico de la Cuenta/)).toHaveValue('luis@test.com');
    });

    it('editar el correo avisa con el texto nuevo', async () => {
      const { onEmailChange } = renderModal();
      await screen.findByRole('dialog');

      fireEvent.change(screen.getByLabelText(/Correo Electrónico de la Cuenta/), {
        target: { value: 'otro@test.com' },
      });

      expect(onEmailChange).toHaveBeenCalledWith('otro@test.com');
    });

    it('«Enviar Enlace de Recuperación» avisa para enviar', async () => {
      const { onSubmit } = renderModal();
      await screen.findByRole('dialog');

      fireEvent.click(screen.getByRole('button', { name: 'Enviar Enlace de Recuperación' }));

      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('no ofrece asignar un correo', async () => {
      renderModal();
      await screen.findByRole('dialog');

      expect(screen.queryByLabelText(/Asignar Correo Electrónico/)).not.toBeInTheDocument();
    });
  });

  describe('invitado sin correo real', () => {
    it('explica que no tiene correo y pide uno', async () => {
      renderModal({ player: GUS, email: '' });

      expect(await screen.findByText(/no tiene un correo real asignado/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Asignar Correo Electrónico/)).toHaveValue('');
    });

    it('«Guardar Correo y Enviar Link» está desactivado hasta que el correo tenga @', async () => {
      const { unmount } = renderModal({ player: GUS, email: 'sin-arroba' });
      await screen.findByRole('dialog');
      expect(screen.getByRole('button', { name: 'Guardar Correo y Enviar Link' })).toBeDisabled();
      unmount();

      renderModal({ player: GUS, email: 'gus@real.com' });
      await screen.findByRole('dialog');
      expect(screen.getByRole('button', { name: 'Guardar Correo y Enviar Link' })).toBeEnabled();
    });

    it('editar el correo avisa y enviar avisa para enviar', async () => {
      const { onEmailChange, onSubmit } = renderModal({ player: GUS, email: 'gus@real.com' });
      await screen.findByRole('dialog');

      fireEvent.change(screen.getByLabelText(/Asignar Correo Electrónico/), {
        target: { value: 'gus@otro.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar Correo y Enviar Link' }));

      expect(onEmailChange).toHaveBeenCalledWith('gus@otro.com');
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });
});
