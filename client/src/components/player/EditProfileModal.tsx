import {
  Button,
  Card,
  Modal,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import '@mantine/dates/styles.css';
import { PROFILE_SKILL_KEYS } from '../../constants/skills';
import type { ProfileEditData } from '../../types/playerProfile';

/**
 * Modal «Editar Mis Datos» del perfil de un jugador: datos personales, rasgos de
 * juego y, según los permisos, los atributos técnicos base y el cambio de contraseña.
 *
 * Migration: extracción del modal de JugadorPerfil; el estado y el guardado siguen
 * en useJugadorEdicion.
 */
export interface EditProfileModalProps {
  opened: boolean;
  onClose: () => void;
  editData: ProfileEditData;
  onEditDataChange: (data: ProfileEditData) => void;
  /** Un administrador puede modificar a mano los atributos técnicos base. */
  showSkills: boolean;
  /** El propio jugador con cuenta local puede cambiar su contraseña. */
  showPasswordSection: boolean;
  saving: boolean;
  onSave: () => void;
}

export const EditProfileModal = ({
  opened,
  onClose,
  editData,
  onEditDataChange,
  showSkills,
  showPasswordSection,
  saving,
  onSave,
}: EditProfileModalProps) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title={
      <Text fw={700} size="lg">
        Editar Mis Datos
      </Text>
    }
    centered
  >
    <Stack gap="md">
      <TextInput
        label="Nombre"
        required
        value={editData.name}
        onChange={(e) => onEditDataChange({ ...editData, name: e.currentTarget.value })}
      />
      <TextInput
        label="Apellidos"
        value={editData.surname}
        onChange={(e) => onEditDataChange({ ...editData, surname: e.currentTarget.value })}
      />
      <TextInput
        label="Nickname / Mote (Opcional)"
        placeholder="Ej. El Muro"
        value={editData.nickname}
        onChange={(e) => onEditDataChange({ ...editData, nickname: e.currentTarget.value })}
      />
      <TextInput
        label="URL de Foto de Perfil (Opcional)"
        placeholder="https://ejemplo.com/mi-foto.jpg"
        value={editData.avatarUrl || ''}
        onChange={(e) => onEditDataChange({ ...editData, avatarUrl: e.currentTarget.value })}
      />
      <DateInput
        label="Fecha de Nacimiento"
        placeholder="Opcional"
        value={editData.birthDate}
        onChange={(val) => onEditDataChange({ ...editData, birthDate: val ? new Date(val) : null })}
        clearable
      />
      <SimpleGrid cols={2}>
        <Select
          label="Mano Dominante"
          data={['Diestro', 'Zurdo']}
          value={editData.dominantHand}
          onChange={(val) => onEditDataChange({ ...editData, dominantHand: val || '' })}
        />
        <Select
          label="Estilo de Juego"
          data={['Ofensivo', 'Defensivo']}
          value={editData.playstyle}
          onChange={(val) => onEditDataChange({ ...editData, playstyle: val || '' })}
        />
      </SimpleGrid>
      <SimpleGrid cols={2}>
        <Select
          label="Goma Derecha"
          data={['LISA', 'PICOS_CORTOS', 'PICOS_MEDIOS', 'PICOS_LARGOS', 'ANTISPIN']}
          value={editData.rubberForehand}
          onChange={(val) => onEditDataChange({ ...editData, rubberForehand: val || '' })}
        />
        <Select
          label="Goma Revés"
          data={['LISA', 'PICOS_CORTOS', 'PICOS_MEDIOS', 'PICOS_LARGOS', 'ANTISPIN']}
          value={editData.rubberBackhand}
          onChange={(val) => onEditDataChange({ ...editData, rubberBackhand: val || '' })}
        />
      </SimpleGrid>
      {showSkills && (
        <Card
          withBorder
          radius="md"
          p="md"
          bg="var(--mantine-color-gray-0)"
          style={{ darkHidden: true }}
        >
          <Text fw={600} size="sm" mb="xs">
            Atributos Técnicos Base (Modificación Manual)
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
            {PROFILE_SKILL_KEYS.map((field) => (
              <NumberInput
                key={field.key}
                label={field.label}
                value={editData.skills?.[field.key] || 0}
                onChange={(val) =>
                  onEditDataChange({
                    ...editData,
                    skills: { ...editData.skills, [field.key]: Number(val) || 0 },
                  })
                }
                min={0}
                max={100}
              />
            ))}
          </SimpleGrid>
        </Card>
      )}

      {showPasswordSection && (
        <Paper withBorder p="sm" radius="md" mt="sm">
          <Title order={6} mb="sm" c="dimmed">
            Cambiar Contraseña (Opcional)
          </Title>
          <Stack gap="xs">
            <TextInput
              type="password"
              label="Contraseña Actual"
              value={editData.currentPassword}
              onChange={(e) =>
                onEditDataChange({ ...editData, currentPassword: e.currentTarget.value })
              }
            />
            <TextInput
              type="password"
              label="Nueva Contraseña"
              value={editData.newPassword}
              onChange={(e) => onEditDataChange({ ...editData, newPassword: e.currentTarget.value })}
            />
            <TextInput
              type="password"
              label="Confirmar Nueva Contraseña"
              value={editData.confirmPassword}
              onChange={(e) =>
                onEditDataChange({ ...editData, confirmPassword: e.currentTarget.value })
              }
            />
          </Stack>
        </Paper>
      )}
      <Button color="blue" fullWidth mt="md" loading={saving} onClick={onSave}>
        Guardar Cambios
      </Button>
    </Stack>
  </Modal>
);
