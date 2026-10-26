import {
  Modal,
  Title,
  Stack,
  Text,
  NumberInput,
  Button,
  Select,
} from '@mantine/core';
import type { Tournament } from '../../types/tournament';

export interface EditFormatModalProps {
  opened: boolean;
  onClose: () => void;
  tournament: Tournament | null;
  confirmedPlayersCount: number;
  numGroups: number | string;
  numGroupPlayers: number | string;
  playersKnockout: number | string;
  setsToWinGroup: number | string;
  setsToWinKnockout: number | string;
  onNumGroupsChange: (val: number | string) => void;
  onNumGroupPlayersChange: (val: number | string) => void;
  onPlayersKnockoutChange: (val: number | string) => void;
  onSetsToWinGroupChange: (val: string | null) => void;
  onSetsToWinKnockoutChange: (val: string | null) => void;
  onSaveFormat: () => void;
}

export const EditFormatModal = ({
  opened,
  onClose,
  tournament,
  confirmedPlayersCount,
  numGroups,
  numGroupPlayers,
  playersKnockout,
  setsToWinGroup,
  setsToWinKnockout,
  onNumGroupsChange,
  onNumGroupPlayersChange,
  onPlayersKnockoutChange,
  onSetsToWinGroupChange,
  onSetsToWinKnockoutChange,
  onSaveFormat,
}: EditFormatModalProps) => {
  if (!tournament) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Title order={4}>Ajustar Formato del Torneo</Title>}
      centered
    >
      <Stack gap="md">
        {tournament.rounds === 'GruposKnockout' && (
          <>
            <Text size="sm" c="dimmed">
              Tienes <strong>{confirmedPlayersCount}</strong> jugadores confirmados. Ajusta las
              matemáticas de los grupos para evitar huecos vacíos antes de iniciar el torneo.
            </Text>
            <NumberInput
              label="Cantidad de Grupos"
              required
              min={1}
              value={numGroups}
              onChange={onNumGroupsChange}
            />
            <NumberInput
              label="Jugadores por Grupo"
              required
              min={2}
              value={numGroupPlayers}
              onChange={onNumGroupPlayersChange}
            />
            <NumberInput
              label="Clasificados por Grupo"
              description="Asegúrate de que la multiplicación total cuadre con el cuadro (4, 8, 16...)"
              required
              min={1}
              value={playersKnockout}
              onChange={onPlayersKnockoutChange}
            />
            <Select
              label="Sets para ganar en Grupos"
              data={[
                { value: '2', label: '2 Sets (Al mejor de 3 sets)' },
                { value: '3', label: '3 Sets (Al mejor de 5 sets)' },
                { value: '4', label: '4 Sets (Al mejor de 7 sets)' },
              ]}
              value={String(setsToWinGroup)}
              onChange={onSetsToWinGroupChange}
              allowDeselect={false}
            />
          </>
        )}
        {(tournament.rounds === 'GruposKnockout' || tournament.rounds === 'Knockout') && (
          <Select
            label="Sets para ganar en Knockouts"
            data={[
              { value: '2', label: '2 Sets (Al mejor de 3 sets)' },
              { value: '3', label: '3 Sets (Al mejor de 5 sets)' },
              { value: '4', label: '4 Sets (Al mejor de 7 sets)' },
            ]}
            value={String(setsToWinKnockout)}
            onChange={onSetsToWinKnockoutChange}
            allowDeselect={false}
          />
        )}
        <Button color="blue" onClick={onSaveFormat} mt="md">
          Guardar y Recalcular
        </Button>
      </Stack>
    </Modal>
  );
};

export default EditFormatModal;
