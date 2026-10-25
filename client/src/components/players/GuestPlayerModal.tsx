import {
  Button,
  Card,
  Checkbox,
  Divider,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';

import { LEVEL_BASE_STATS } from '../../constants/players';
import { SKILL_FIELDS } from '../../constants/skills';
import type { GuestFormData, SkillInputs } from '../../types/players';

interface GuestPlayerModalProps {
  opened: boolean;
  data: GuestFormData;
  skills: SkillInputs;
  consentConfirmed: boolean;
  creating: boolean;
  onClose: () => void;
  onDataChange: (data: GuestFormData) => void;
  onSkillsChange: (skills: SkillInputs) => void;
  onConsentChange: (confirmed: boolean) => void;
  onSubmit: () => void;
}

/** Modal «Añadir Jugador al Club»: alta de un usuario normal (con correo) o de un invitado (sin él). */
export const GuestPlayerModal = ({
  opened,
  data,
  skills,
  consentConfirmed,
  creating,
  onClose,
  onDataChange,
  onSkillsChange,
  onConsentChange,
  onSubmit,
}: GuestPlayerModalProps) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title={<Text fw={700}>Añadir Jugador al Club</Text>}
    centered
    size="lg"
  >
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Registra a un jugador en tu club de forma instantánea. Si introduces un correo electrónico,
        recibirá un aviso para entrar. Si lo dejas en blanco, el jugador será gestionado
        íntegramente por el club como un usuario invitado ("Guest").
      </Text>

      <SimpleGrid cols={2}>
        <TextInput
          label="Nombre"
          placeholder="Nombre"
          value={data.name}
          onChange={(e) => onDataChange({ ...data, name: e.currentTarget.value })}
          required
        />
        <TextInput
          label="Apellidos"
          placeholder="Apellidos"
          value={data.surname}
          onChange={(e) => onDataChange({ ...data, surname: e.currentTarget.value })}
        />
        <TextInput
          style={{ gridColumn: 'span 2' }}
          label="Correo Electrónico (Opcional)"
          placeholder="ejemplo@email.com"
          value={data.email}
          onChange={(e) => onDataChange({ ...data, email: e.currentTarget.value })}
          description="Si lo dejas en blanco, no podrá hacer login desde el móvil."
        />
      </SimpleGrid>

      <Divider my="sm" />

      <SimpleGrid cols={2}>
        <Select
          label="Mano Dominante"
          data={['Diestro', 'Zurdo']}
          value={data.dominantHand}
          onChange={(val) => onDataChange({ ...data, dominantHand: val! })}
          allowDeselect={false}
          required
        />
        <Select
          label="Estilo de Juego"
          data={['Ofensivo', 'Defensivo']}
          value={data.playstyle}
          onChange={(val) => onDataChange({ ...data, playstyle: val! })}
          allowDeselect={false}
          required
        />
      </SimpleGrid>

      <SimpleGrid cols={2}>
        <Select
          label="Goma Derecha"
          data={['LISA', 'PICOS_CORTOS', 'PICOS_MEDIOS', 'PICOS_LARGOS', 'ANTISPIN']}
          value={data.rubberForehand}
          onChange={(val) => onDataChange({ ...data, rubberForehand: val! })}
          allowDeselect={false}
          required
        />
        <Select
          label="Goma Revés"
          data={['LISA', 'PICOS_CORTOS', 'PICOS_MEDIOS', 'PICOS_LARGOS', 'ANTISPIN']}
          value={data.rubberBackhand}
          onChange={(val) => onDataChange({ ...data, rubberBackhand: val! })}
          allowDeselect={false}
          required
        />
      </SimpleGrid>

      <Divider my="sm" />

      <SimpleGrid cols={2}>
        <Select
          label="Nivel Técnico Base"
          data={['Iniciacion', 'Principiante', 'Intermedio', 'Avanzado', 'Profesional']}
          value={data.level}
          onChange={(val) => onDataChange({ ...data, level: val! })}
          allowDeselect={false}
          required
        />
        <NumberInput
          label="Puntuación ELO Inicial"
          value={data.elo}
          onChange={(val) => onDataChange({ ...data, elo: Number(val) })}
          min={0}
          max={3000}
          required
        />
      </SimpleGrid>

      <Card
        withBorder
        radius="md"
        p="md"
        bg="var(--mantine-color-gray-0)"
        style={{ darkHidden: true }}
      >
        <Text fw={600} size="sm" mb="xs">
          Atributos Especiales (Opcional)
        </Text>
        <Text size="xs" c="dimmed" mb="md">
          Por defecto, todas las habilidades tendrán un valor de {LEVEL_BASE_STATS[data.level]}.
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
          {SKILL_FIELDS.map((field) => (
            <NumberInput
              key={field.key}
              label={field.label}
              placeholder={String(LEVEL_BASE_STATS[data.level])}
              value={skills[field.key]}
              onChange={(val) => onSkillsChange({ ...skills, [field.key]: val as number | '' })}
              min={0}
              max={100}
            />
          ))}
        </SimpleGrid>
      </Card>

      <Checkbox
        checked={consentConfirmed}
        onChange={(e) => onConsentChange(e.currentTarget.checked)}
        label="Confirmo que tengo el consentimiento expreso de esta persona para gestionar sus datos deportivos en esta plataforma."
        mt="sm"
      />

      <Button
        fullWidth
        mt="sm"
        color="blue"
        onClick={onSubmit}
        loading={creating}
        disabled={!data.name || !consentConfirmed}
      >
        Añadir Jugador
      </Button>
    </Stack>
  </Modal>
);
